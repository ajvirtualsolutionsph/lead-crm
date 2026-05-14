import 'dotenv/config';
import { google } from 'googleapis';

const OLD_SHEET_ID = '1Zq7muXisE8QywVGXtRE6OqyDRl84UKWy37HoorjxO3s';
const NEW_SHEET_ID = process.env.GOOGLE_SHEET_ID;

const TABS = ['New Leads', 'Initial Email Sent', 'Needs Follow Up', 'No Reply/Declined'];

const auth = new google.auth.JWT({
  email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });

async function ensureTab(tabName) {
  const meta = await sheets.spreadsheets.get({ spreadsheetId: NEW_SHEET_ID });
  const exists = meta.data.sheets.some(s => s.properties.title === tabName);
  if (!exists) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: NEW_SHEET_ID,
      requestBody: { requests: [{ addSheet: { properties: { title: tabName } } }] },
    });
    console.log(`  → Created tab "${tabName}"`);
  }
}

async function migrateTab(tabName) {
  console.log(`\nCopying tab: "${tabName}"...`);

  // Read all data from old sheet
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: OLD_SHEET_ID,
    range: `'${tabName}'!A:Z`,
  });

  const rows = res.data.values || [];
  if (rows.length === 0) {
    console.log(`  → Empty tab, skipping.`);
    return;
  }

  console.log(`  → Read ${rows.length} rows from old sheet`);

  // Ensure tab exists in new sheet, then clear it
  await ensureTab(tabName);
  await sheets.spreadsheets.values.clear({
    spreadsheetId: NEW_SHEET_ID,
    range: `'${tabName}'!A:Z`,
  });

  // Write all rows to new sheet
  await sheets.spreadsheets.values.update({
    spreadsheetId: NEW_SHEET_ID,
    range: `'${tabName}'!A1`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: rows },
  });

  console.log(`  → Written ${rows.length} rows to new sheet`);
}

async function run() {
  console.log('Starting sheet migration...');
  console.log(`  Old: ${OLD_SHEET_ID}`);
  console.log(`  New: ${NEW_SHEET_ID}`);

  for (const tab of TABS) {
    await migrateTab(tab);
  }

  console.log('\nMigration complete. All tabs copied.');
}

run().catch(err => {
  console.error('Migration failed:', err.message);
  process.exit(1);
});
