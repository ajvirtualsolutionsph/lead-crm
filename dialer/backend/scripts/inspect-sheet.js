import { google } from 'googleapis';

const SHEET_ID = process.env.LEAD_GEN_SHEET_ID;

const auth = new google.auth.JWT({
  email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });

const meta = await sheets.spreadsheets.get({ spreadsheetId: SHEET_ID });
const tabs = meta.data.sheets.map(s => s.properties.title);
console.log('Tabs:', tabs);

for (const tab of tabs) {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `'${tab}'!A1:AZ3`,
  });
  const rows = res.data.values || [];
  console.log(`\n--- ${tab} ---`);
  if (rows[0]) {
    rows[0].forEach((h, i) => {
      const col = i < 26 ? String.fromCharCode(65 + i) : 'A' + String.fromCharCode(65 + i - 26);
      console.log(`  Col ${col} (${i}): ${h}`);
    });
  }
  if (rows[1]) console.log('\n  Sample row:', rows[1]);
}
