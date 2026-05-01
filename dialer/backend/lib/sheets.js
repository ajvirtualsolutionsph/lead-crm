import { google } from 'googleapis';

const auth = new google.auth.JWT({
  email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });
const SHEET_ID = process.env.GOOGLE_SHEET_ID;
const RANGE = 'A:F';

export async function getLeads() {
  const res = await sheets.spreadsheets.values.get({ spreadsheetId: SHEET_ID, range: RANGE });
  const rows = res.data.values || [];
  // Skip header row (index 0)
  return rows.slice(1).map((row, i) => ({
    rowIndex: i + 2, // 1-based sheet row, data starts at row 2
    name: row[0] || '',
    phone: row[1] || '',
    website: row[2] || '',
    status: row[3] || 'New',
    notes: row[4] || '',
    lastCalled: row[5] || '',
  }));
}

export async function updateLead(rowIndex, status, notes) {
  const now = new Date().toISOString();
  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: `D${rowIndex}:F${rowIndex}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [[status, notes, now]] },
  });
}
