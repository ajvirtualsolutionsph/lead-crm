import { google } from 'googleapis';

const auth = new google.auth.JWT({
  email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });
const SHEET_ID = process.env.GOOGLE_SHEET_ID;

// Single tab in the Ready for Call dialer sheet
export const SHEET_TABS = ['Ready for Call'];

// Column layout (0-indexed, A=0):
// A(0)  name          B(1)  business_name   C(2)  category       D(3)  address
// E(4)  phone         F(5)  website         G(6)  email          H(7)  operating_hours
// I(8)  rating        J(9)  review_count    K(10) notes          L(11) details
// M(12) subject       N(13) email_body      O(14) followup       P(15) date_drafted
// Q(16) sent          R(17) followup_sent   S(18) status         T(19) thread_id
// U(20) message_id    V(21) call_status     W(22) last_called    X(23) dialer_notes

function normalizePhone(raw) {
  if (!raw) return '';
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits[0] === '1') return `+${digits}`;
  return raw;
}

export async function getLeads(sheetName = 'Ready for Call') {
  const range = `'${sheetName}'!A:X`;
  const res = await sheets.spreadsheets.values.get({ spreadsheetId: SHEET_ID, range });
  const rows = res.data.values || [];
  return rows.slice(1).map((row, i) => ({
    rowIndex: i + 2,
    sheet: sheetName,
    name: row[1] || row[0] || '',
    phone: normalizePhone(row[4]),
    website: row[5] || '',
    email: row[6] || '',
    notes: row[10] || '',
    status: row[21] || 'New',     // col V: call_status
    lastCalled: row[22] || '',    // col W: last_called
    dialer_notes: row[23] || '',  // col X: dialer_notes
  }));
}

export async function updateDialerNotes(rowIndex, notes, sheetName = 'Ready for Call') {
  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: SHEET_ID,
    requestBody: {
      valueInputOption: 'USER_ENTERED',
      data: [{ range: `'${sheetName}'!X${rowIndex}`, values: [[notes]] }],
    },
  });
}

export async function updateLead(rowIndex, status, notes, sheetName = 'Ready for Call') {
  const now = new Date().toISOString();
  const s = `'${sheetName}'`;
  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: SHEET_ID,
    requestBody: {
      valueInputOption: 'USER_ENTERED',
      data: [
        { range: `${s}!V${rowIndex}`, values: [[status]] },  // call_status
        { range: `${s}!W${rowIndex}`, values: [[now]] },      // last_called
        { range: `${s}!X${rowIndex}`, values: [[notes]] },    // dialer_notes
      ],
    },
  });
}

export async function syncFromLeadGen() {
  const SOURCE_ID = process.env.LEAD_GEN_SHEET_ID;
  if (!SOURCE_ID) return { added: 0 };

  const SOURCE_TAB = 'Ready for Call';
  const DEST_TAB = 'Ready for Call';

  // Read source rows (Lead Gen Pipeline — columns A:U only, no dialer cols)
  const srcRes = await sheets.spreadsheets.values.get({
    spreadsheetId: SOURCE_ID,
    range: `'${SOURCE_TAB}'!A:U`,
  });
  const srcRows = (srcRes.data.values || []).slice(1);
  if (srcRows.length === 0) return { added: 0 };

  // Read destination rows for dedup check
  const destRes = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `'${DEST_TAB}'!A:U`,
  });
  const destRows = (destRes.data.values || []).slice(1);

  const existingPhones = new Set(destRows.map(r => normalizePhone(r[4] || '')).filter(Boolean));
  const existingNames = new Set(destRows.map(r => (r[1] || r[0] || '').toLowerCase().trim()).filter(Boolean));

  const newRows = srcRows.filter(row => {
    const phone = normalizePhone(row[4] || '');
    const bizName = (row[1] || row[0] || '').toLowerCase().trim();
    return !(phone && existingPhones.has(phone)) && !(bizName && existingNames.has(bizName));
  });

  if (newRows.length === 0) return { added: 0 };

  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: `'${DEST_TAB}'!A:U`,
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: newRows },
  });

  console.log(`[sync] "${DEST_TAB}": +${newRows.length} new leads`);
  return { added: newRows.length };
}
