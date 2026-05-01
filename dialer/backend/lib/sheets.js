import { google } from 'googleapis';

const auth = new google.auth.JWT({
  email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });
const SHEET_ID = process.env.GOOGLE_SHEET_ID;
const RANGE = 'A:W';

function normalizePhone(raw) {
  if (!raw) return '';
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits[0] === '1') return `+${digits}`;
  return raw; // return as-is if unrecognizable
}

export async function getLeads() {
  const res = await sheets.spreadsheets.values.get({ spreadsheetId: SHEET_ID, range: RANGE });
  const rows = res.data.values || [];
  // Skip header row (index 0). Use business_name (B/1) as display name.
  return rows.slice(1).map((row, i) => ({
    rowIndex: i + 2, // 1-based sheet row, data starts at row 2
    name: row[1] || row[0] || '',
    phone: normalizePhone(row[4]),
    website: row[5] || '',
    notes: row[9] || '',
    status: row[21] || 'New',
    lastCalled: row[22] || '',
  }));
}

export async function updateLead(rowIndex, status, notes) {
  const now = new Date().toISOString();
  // J=notes, U=call_status, V=last_called — non-contiguous so use batchUpdate
  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: SHEET_ID,
    requestBody: {
      valueInputOption: 'USER_ENTERED',
      data: [
        { range: `J${rowIndex}`, values: [[notes]] },
        { range: `V${rowIndex}`, values: [[status]] },
        { range: `W${rowIndex}`, values: [[now]] },
      ],
    },
  });
}
