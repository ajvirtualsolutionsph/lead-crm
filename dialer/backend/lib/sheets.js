import { google } from 'googleapis';

const auth = new google.auth.JWT({
  email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });
const SHEET_ID = process.env.GOOGLE_SHEET_ID;

export const SHEET_TABS = ['New Leads', 'Initial Email Sent', 'Needs Follow Up', 'No Reply/Declined'];

export async function initDialerColumns() {
  const data = SHEET_TABS.map(tab => ({
    range: `'${tab}'!X1`,
    values: [['dialer_notes']],
  }));
  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: SHEET_ID,
    requestBody: { valueInputOption: 'USER_ENTERED', data },
  });
  console.log('Sheet headers initialized: dialer_notes (col X) on all tabs');
}

function normalizePhone(raw) {
  if (!raw) return '';
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits[0] === '1') return `+${digits}`;
  return raw;
}

export async function getLeads(sheetName = 'No Reply/Declined') {
  const range = `'${sheetName}'!A:X`;
  const res = await sheets.spreadsheets.values.get({ spreadsheetId: SHEET_ID, range });
  const rows = res.data.values || [];
  // Skip header row (index 0). Use business_name (B/1) as display name.
  return rows.slice(1).map((row, i) => ({
    rowIndex: i + 2,
    sheet: sheetName,
    name: row[1] || row[0] || '',
    phone: normalizePhone(row[4]),
    website: row[5] || '',
    notes: row[9] || '',
    status: row[21] || 'New',
    lastCalled: row[22] || '',
  }));
}

export async function updateLead(rowIndex, status, notes, sheetName = 'No Reply/Declined') {
  const now = new Date().toISOString();
  const s = `'${sheetName}'`;
  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: SHEET_ID,
    requestBody: {
      valueInputOption: 'USER_ENTERED',
      data: [
        { range: `${s}!V${rowIndex}`, values: [[status]] },
        { range: `${s}!W${rowIndex}`, values: [[now]] },
        { range: `${s}!X${rowIndex}`, values: [[notes]] },
      ],
    },
  });
}
