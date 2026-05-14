import 'dotenv/config';
import { google } from 'googleapis';

const SHEET_ID = process.env.GOOGLE_SHEET_ID;
const TABS = ['New Leads', 'Initial Email Sent', 'Needs Follow Up', 'No Reply/Declined'];

// Columns the dialer reads or writes — keyed by letter
const REQUIRED_HEADERS = {
  A: 'name',
  B: 'business_name',
  E: 'phone',
  F: 'website',
  J: 'notes',
  V: 'call_status',
  W: 'last_called',
  X: 'dialer_notes',
};

const auth = new google.auth.JWT({
  email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });

function colLetter(letter) {
  return letter.charCodeAt(0) - 65; // A=0, B=1 ...
}

async function updateTab(tabName) {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `'${tabName}'!A1:Z1`,
  });
  const headers = res.data.values?.[0] || [];

  const updates = [];
  for (const [col, expected] of Object.entries(REQUIRED_HEADERS)) {
    const idx = colLetter(col);
    const current = headers[idx] || '';
    if (current !== expected) {
      updates.push({ range: `'${tabName}'!${col}1`, values: [[expected]] });
      console.log(`  ${col}1: "${current || '(empty)'}" → "${expected}"`);
    }
  }

  if (updates.length === 0) {
    console.log('  All headers correct — no changes needed.');
    return;
  }

  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: SHEET_ID,
    requestBody: { valueInputOption: 'USER_ENTERED', data: updates },
  });
}

async function run() {
  for (const tab of TABS) {
    console.log(`\nTab: "${tab}"`);
    await updateTab(tab);
  }
  console.log('\nDone.');
}

run().catch(err => {
  console.error('Failed:', err.message);
  process.exit(1);
});
