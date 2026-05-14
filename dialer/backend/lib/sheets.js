import { google } from 'googleapis';

const auth = new google.auth.JWT({
  email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });
const SHEET_ID = process.env.GOOGLE_SHEET_ID;

export const SHEET_TABS = ['Ready for Call', 'Second Attempt'];

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
  let res;
  try {
    res = await sheets.spreadsheets.values.get({ spreadsheetId: SHEET_ID, range });
  } catch (err) {
    // Sheet doesn't exist yet — return empty list
    if (err.code === 400 || err.message?.includes('Unable to parse range')) return [];
    throw err;
  }
  const rows = res.data.values || [];
  return rows.slice(1).map((row, i) => ({
    rowIndex: i + 2,
    sheet: sheetName,
    name: row[1] || row[0] || '',
    phone: normalizePhone(row[4]),
    website: row[5] || '',
    email: row[6] || '',
    category: row[2] || '',
    address: row[3] || '',
    operating_hours: row[7] || '',
    rating: row[8] || '',
    review_count: row[9] || '',
    notes: row[10] || '',
    details: row[11] || '',
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

// Full update: status + timestamp + notes (col V, W, X) — used by Save & Next
export async function updateLead(rowIndex, status, notes, sheetName = 'Ready for Call') {
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

// Status-only update: status + timestamp (col V, W) — used by auto-log (no-answer, busy, voicemail)
// Does NOT touch col X (dialer_notes) so user notes are never overwritten automatically
export async function updateLeadStatus(rowIndex, status, sheetName = 'Ready for Call') {
  const now = new Date().toISOString();
  const s = `'${sheetName}'`;
  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: SHEET_ID,
    requestBody: {
      valueInputOption: 'USER_ENTERED',
      data: [
        { range: `${s}!V${rowIndex}`, values: [[status]] },
        { range: `${s}!W${rowIndex}`, values: [[now]] },
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

// Move all "No Answer" leads from Ready for Call → Second Attempt (creates tab if needed)
export async function archiveNoAnswer() {
  const SOURCE_TAB = 'Ready for Call';
  const DEST_TAB = 'Second Attempt';

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `'${SOURCE_TAB}'!A:X`,
  });
  const rows = res.data.values || [];
  if (rows.length < 2) return { moved: 0 };

  const header = rows[0];
  const dataRows = rows.slice(1);

  const noAnswerIndices = [];
  const noAnswerRows = [];
  dataRows.forEach((row, i) => {
    if ((row[21] || '').trim() === 'No Answer') {
      noAnswerIndices.push(i);
      noAnswerRows.push(row);
    }
  });

  if (noAnswerRows.length === 0) return { moved: 0 };

  // Create Second Attempt sheet if it doesn't exist
  const meta = await sheets.spreadsheets.get({ spreadsheetId: SHEET_ID });
  const existingTitles = meta.data.sheets.map(s => s.properties.title);

  if (!existingTitles.includes(DEST_TAB)) {
    const addRes = await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SHEET_ID,
      requestBody: { requests: [{ addSheet: { properties: { title: DEST_TAB } } }] },
    });
    const newSheetId = addRes.data.replies[0].addSheet.properties.sheetId;

    // Write header row
    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range: `'${DEST_TAB}'!A1`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [header] },
    });

    // Apply same formatting as Ready for Call sheet
    const blue  = { red: 0.067, green: 0.302, blue: 0.533 }; // #114D88 header blue
    const white = { red: 1, green: 1, blue: 1 };
    const bandLight = { red: 0.863, green: 0.902, blue: 0.953 }; // #DCE6F3 alternating band

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SHEET_ID,
      requestBody: {
        requests: [
          // Freeze header row
          {
            updateSheetProperties: {
              properties: { sheetId: newSheetId, gridProperties: { frozenRowCount: 1 } },
              fields: 'gridProperties.frozenRowCount',
            },
          },
          // Header: blue background + white bold text
          {
            repeatCell: {
              range: { sheetId: newSheetId, startRowIndex: 0, endRowIndex: 1 },
              cell: {
                userEnteredFormat: {
                  backgroundColor: blue,
                  textFormat: { bold: true, foregroundColor: white },
                  verticalAlignment: 'MIDDLE',
                },
              },
              fields: 'userEnteredFormat(backgroundColor,textFormat,verticalAlignment)',
            },
          },
          // Alternating row banding for data rows
          {
            addBanding: {
              bandedRange: {
                range: { sheetId: newSheetId, startRowIndex: 1 },
                rowProperties: {
                  firstBandColor: white,
                  secondBandColor: bandLight,
                },
              },
            },
          },
          // Compact row height: 21px for all rows
          {
            updateDimensionProperties: {
              range: { sheetId: newSheetId, dimension: 'ROWS', startIndex: 0 },
              properties: { pixelSize: 21 },
              fields: 'pixelSize',
            },
          },
        ],
      },
    });

    console.log(`[archive] Created and formatted sheet "${DEST_TAB}"`);
  }

  // Append No Answer rows to Second Attempt
  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: `'${DEST_TAB}'!A:X`,
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: noAnswerRows },
  });

  // Delete from Ready for Call in reverse order to keep row indices stable
  const sourceSheetId = meta.data.sheets.find(s => s.properties.title === SOURCE_TAB).properties.sheetId;
  const deleteRequests = [...noAnswerIndices].reverse().map(i => ({
    deleteDimension: {
      range: { sheetId: sourceSheetId, dimension: 'ROWS', startIndex: i + 1, endIndex: i + 2 },
    },
  }));

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SHEET_ID,
    requestBody: { requests: deleteRequests },
  });

  console.log(`[archive] Moved ${noAnswerRows.length} No Answer leads to "${DEST_TAB}"`);
  return { moved: noAnswerRows.length };
}
