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
  const range = `'${sheetName}'!A:Y`;
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
    status: row[24] || 'New',    // col Y (moved from V to avoid aging-days formula)
    lastCalled: row[22] || '',   // col W
    dialer_notes: row[23] || '', // col X
  }));
}

export async function updateDialerNotes(rowIndex, notes, sheetName = 'No Reply/Declined') {
  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: SHEET_ID,
    requestBody: {
      valueInputOption: 'USER_ENTERED',
      data: [{ range: `'${sheetName}'!X${rowIndex}`, values: [[notes]] }],
    },
  });
}

export async function syncFromLeadGen() {
  const SOURCE_ID = process.env.LEAD_GEN_SHEET_ID;
  if (!SOURCE_ID) return { added: 0 };

  let totalAdded = 0;

  for (const tab of SHEET_TABS) {
    // Read source rows (Lead Gen Pipeline)
    const srcRes = await sheets.spreadsheets.values.get({
      spreadsheetId: SOURCE_ID,
      range: `'${tab}'!A:U`,
    });
    const srcRows = (srcRes.data.values || []).slice(1); // skip header
    if (srcRows.length === 0) continue;

    // Read destination rows (Phone Dialer - Leads)
    const destRes = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: `'${tab}'!A:U`,
    });
    const destRows = (destRes.data.values || []).slice(1); // skip header

    // Build duplicate sets from destination
    const existingPhones = new Set(destRows.map(r => normalizePhone(r[4] || '')).filter(Boolean));
    const existingNames = new Set(destRows.map(r => (r[1] || r[0] || '').toLowerCase().trim()).filter(Boolean));

    // Filter: skip if phone OR business name already exists
    const newRows = srcRows.filter(row => {
      const phone = normalizePhone(row[4] || '');
      const bizName = (row[1] || row[0] || '').toLowerCase().trim();
      const phoneMatch = phone && existingPhones.has(phone);
      const nameMatch = bizName && existingNames.has(bizName);
      return !phoneMatch && !nameMatch;
    });

    if (newRows.length === 0) continue;

    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: `'${tab}'!A:U`,
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values: newRows },
    });

    console.log(`[sync] "${tab}": +${newRows.length} new leads`);
    totalAdded += newRows.length;
  }

  return { added: totalAdded };
}

export async function updateLead(rowIndex, status, notes, sheetName = 'No Reply/Declined') {
  const now = new Date().toISOString();
  const s = `'${sheetName}'`;
  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: SHEET_ID,
    requestBody: {
      valueInputOption: 'USER_ENTERED',
      data: [
        { range: `${s}!Y${rowIndex}`, values: [[status]] }, // call_status moved from V to Y
        { range: `${s}!W${rowIndex}`, values: [[now]] },
        { range: `${s}!X${rowIndex}`, values: [[notes]] },
      ],
    },
  });
}
