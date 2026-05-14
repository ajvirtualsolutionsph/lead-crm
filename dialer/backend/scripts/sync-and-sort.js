import { google } from 'googleapis';

const SOURCE_ID = process.env.LEAD_GEN_SHEET_ID;
const DEST_ID   = process.env.GOOGLE_SHEET_ID;
const TAB       = 'Ready for Call';

const auth = new google.auth.JWT({
  email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });

// Read source rows (A:U — 21 columns, skip header)
const srcRes = await sheets.spreadsheets.values.get({
  spreadsheetId: SOURCE_ID,
  range: `'${TAB}'!A:U`,
});
const [, ...rows] = srcRes.data.values || [];

console.log(`Fetched ${rows.length} leads from Lead Gen Pipeline "${TAB}"`);

// Sort: rows with name (A or B) AND operating_hours (H) → top; rest → bottom
const hasNameAndHours = r => !!(r[0] || r[1]) && !!r[7];

const priority = rows.filter(hasNameAndHours);
const rest     = rows.filter(r => !hasNameAndHours(r));

console.log(`  Priority (name + hours): ${priority.length}`);
console.log(`  Rest:                    ${rest.length}`);

const sorted = [...priority, ...rest];

// Clear everything below the header row in the dialer sheet
await sheets.spreadsheets.values.clear({
  spreadsheetId: DEST_ID,
  range: `'${TAB}'!A2:X`,
});

// Write sorted rows starting at A2 (columns A–U; V/W/X stay blank for dialer use)
await sheets.spreadsheets.values.update({
  spreadsheetId: DEST_ID,
  range: `'${TAB}'!A2`,
  valueInputOption: 'USER_ENTERED',
  requestBody: { values: sorted },
});

console.log(`Written ${sorted.length} rows to Ready for Call dialer sheet.`);
