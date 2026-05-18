import { google } from 'googleapis';

const auth = new google.auth.JWT({
  email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });
const SHEET_ID = process.env.GOOGLE_SHEET_ID;

export const SHEET_TABS = ['Ready for Call', 'Second Attempt', 'Rejects'];

// Column layout (0-indexed, A=0):
// A(0)  name          B(1)  business_name   C(2)  category       D(3)  address
// E(4)  phone         F(5)  website         G(6)  email          H(7)  operating_hours
// I(8)  rating        J(9)  review_count    K(10) notes          L(11) details
// M(12) subject       N(13) email_body      O(14) followup       P(15) date_drafted
// Q(16) sent          R(17) followup_sent   S(18) status         T(19) thread_id
// U(20) message_id    V(21) call_status     W(22) dialer_notes   [X dropped]

function normalizePhone(raw) {
  if (!raw) return '';
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits[0] === '1') return `+${digits}`;
  return raw;
}

export async function getLeads(sheetName = 'Ready for Call') {
  const range = `'${sheetName}'!A:W`;
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
    dialer_notes: row[22] || '',  // col W: dialer_notes (CRM Notes)
  }));
}

const FIELD_COL = {
  name: 'A', business_name: 'B', category: 'C', address: 'D',
  phone: 'E', website: 'F', email: 'G', operating_hours: 'H',
};

export async function updateLeadField(rowIndex, field, value, sheetName = 'Ready for Call') {
  const col = FIELD_COL[field];
  if (!col) throw new Error(`Unknown field: ${field}`);
  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: `'${sheetName}'!${col}${rowIndex}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [[value]] },
  });
}

export async function updateDialerNotes(rowIndex, notes, sheetName = 'Ready for Call') {
  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: SHEET_ID,
    requestBody: {
      valueInputOption: 'USER_ENTERED',
      data: [{ range: `'${sheetName}'!W${rowIndex}`, values: [[notes]] }],
    },
  });
}

// Full update: status + notes (col V, W) — used by Save & Next
export async function updateLead(rowIndex, status, notes, sheetName = 'Ready for Call') {
  const s = `'${sheetName}'`;
  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: SHEET_ID,
    requestBody: {
      valueInputOption: 'USER_ENTERED',
      data: [
        { range: `${s}!V${rowIndex}`, values: [[status]] },
        { range: `${s}!W${rowIndex}`, values: [[notes]] },
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

  // Read ALL dialer tabs for dedup — prevents archived leads from being re-synced
  // regardless of how many archive sheets exist (Second Attempt, Third Attempt, etc.)
  const meta = await sheets.spreadsheets.get({ spreadsheetId: SHEET_ID });
  const allTabs = meta.data.sheets.map(s => s.properties.title);
  const tabReads = await Promise.all(
    allTabs.map(tab =>
      sheets.spreadsheets.values.get({ spreadsheetId: SHEET_ID, range: `'${tab}'!A:U` })
        .catch(() => ({ data: { values: [] } }))
    )
  );
  const destRows = tabReads.flatMap(r => (r.data.values || []).slice(1));

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

  // Create Second Attempt sheet if it doesn't exist, then always apply formatting
  const meta = await sheets.spreadsheets.get({ spreadsheetId: SHEET_ID });
  const existingSheets = meta.data.sheets;
  const existingTitles = existingSheets.map(s => s.properties.title);

  let destSheetId;

  if (!existingTitles.includes(DEST_TAB)) {
    const addRes = await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SHEET_ID,
      requestBody: { requests: [{ addSheet: { properties: { title: DEST_TAB } } }] },
    });
    destSheetId = addRes.data.replies[0].addSheet.properties.sheetId;
    // Write header row on new sheet
    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range: `'${DEST_TAB}'!A1`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [header] },
    });
    console.log(`[archive] Created sheet "${DEST_TAB}"`);
  } else {
    destSheetId = existingSheets.find(s => s.properties.title === DEST_TAB).properties.sheetId;
  }

  // Always apply formatting (idempotent except addBanding — skip if already present)
  const blue      = { red: 0.22745098, green: 0.46666667, blue: 0.84705883 }; // #3A77D8 matches Ready for Call
  const white     = { red: 1, green: 1, blue: 1 };
  const bandLight = { red: 0.92941177, green: 0.9490196,  blue: 0.9764706  }; // #EDF2FA matches Ready for Call

  const destSheetMeta = existingSheets.find(s => s.properties.title === DEST_TAB);
  const hasBanding = destSheetMeta?.bandedRanges?.length > 0;

  const formatRequests = [
    {
      updateSheetProperties: {
        properties: { sheetId: destSheetId, gridProperties: { frozenRowCount: 1 } },
        fields: 'gridProperties.frozenRowCount',
      },
    },
    {
      repeatCell: {
        range: { sheetId: destSheetId, startRowIndex: 0, endRowIndex: 1 },
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
    {
      updateDimensionProperties: {
        range: { sheetId: destSheetId, dimension: 'ROWS', startIndex: 0 },
        properties: { pixelSize: 21 },
        fields: 'pixelSize',
      },
    },
  ];

  if (!hasBanding) {
    formatRequests.push({
      addBanding: {
        bandedRange: {
          range: { sheetId: destSheetId, startRowIndex: 1 },
          rowProperties: { firstBandColor: white, secondBandColor: bandLight },
        },
      },
    });
  }

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SHEET_ID,
    requestBody: { requests: formatRequests },
  });
  console.log(`[archive] Formatted sheet "${DEST_TAB}" (banding ${hasBanding ? 'already present' : 'added'})`);

  if (noAnswerRows.length === 0) return { moved: 0 };

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

// Move a single lead (by rowIndex) from any source tab → any destination tab
async function moveLeadToTab(rowIndex, sourceSheet, destTab) {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `'${sourceSheet}'!A:X`,
  });
  const rows = res.data.values || [];
  if (rows.length < 2) throw new Error('No data in source sheet');

  const header = rows[0];
  const dataIndex = rowIndex - 2; // rowIndex is 1-based sheet row; subtract 1 for header, 1 for 0-based
  const targetRow = rows[dataIndex + 1];
  if (!targetRow) throw new Error(`Row ${rowIndex} not found in "${sourceSheet}"`);

  const meta = await sheets.spreadsheets.get({ spreadsheetId: SHEET_ID });
  const existingSheets = meta.data.sheets;
  const existingTitles = existingSheets.map(s => s.properties.title);

  const blue      = { red: 0.22745098, green: 0.46666667, blue: 0.84705883 };
  const white     = { red: 1, green: 1, blue: 1 };
  const bandLight = { red: 0.92941177, green: 0.9490196,  blue: 0.9764706  };

  let destSheetId;
  if (!existingTitles.includes(destTab)) {
    const addRes = await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SHEET_ID,
      requestBody: { requests: [{ addSheet: { properties: { title: destTab } } }] },
    });
    destSheetId = addRes.data.replies[0].addSheet.properties.sheetId;
    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range: `'${destTab}'!A1`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [header] },
    });
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SHEET_ID,
      requestBody: {
        requests: [
          { updateSheetProperties: { properties: { sheetId: destSheetId, gridProperties: { frozenRowCount: 1 } }, fields: 'gridProperties.frozenRowCount' } },
          { repeatCell: { range: { sheetId: destSheetId, startRowIndex: 0, endRowIndex: 1 }, cell: { userEnteredFormat: { backgroundColor: blue, textFormat: { bold: true, foregroundColor: white }, verticalAlignment: 'MIDDLE' } }, fields: 'userEnteredFormat(backgroundColor,textFormat,verticalAlignment)' } },
          { updateDimensionProperties: { range: { sheetId: destSheetId, dimension: 'ROWS', startIndex: 0 }, properties: { pixelSize: 21 }, fields: 'pixelSize' } },
          { addBanding: { bandedRange: { range: { sheetId: destSheetId, startRowIndex: 1 }, rowProperties: { firstBandColor: white, secondBandColor: bandLight } } } },
        ],
      },
    });
    console.log(`[move] Created sheet "${destTab}"`);
  } else {
    destSheetId = existingSheets.find(s => s.properties.title === destTab).properties.sheetId;
  }

  const appendRes = await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: `'${destTab}'!A:X`,
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: [targetRow] },
  });

  // Clear any carried-over background/text formatting on the newly appended row
  const updatedRange = appendRes.data.updates?.updatedRange || '';
  const rowMatch = updatedRange.match(/:([A-Z]+)(\d+)$/);
  if (rowMatch) {
    const newRowIndex = parseInt(rowMatch[2], 10) - 1; // 0-based
    const black = { red: 0, green: 0, blue: 0 };
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SHEET_ID,
      requestBody: {
        requests: [
          {
            updateCells: {
              range: { sheetId: destSheetId, startRowIndex: newRowIndex, endRowIndex: newRowIndex + 1 },
              rows: [{ values: Array(meta.data.sheets.find(s => s.properties.title === destTab)?.properties?.gridProperties?.columnCount || 26).fill({ userEnteredFormat: {} }) }],
              fields: 'userEnteredFormat.backgroundColor',
            },
          },
          {
            repeatCell: {
              range: { sheetId: destSheetId, startRowIndex: newRowIndex, endRowIndex: newRowIndex + 1 },
              cell: { userEnteredFormat: { textFormat: { foregroundColor: black } } },
              fields: 'userEnteredFormat.textFormat.foregroundColor',
            },
          },
        ],
      },
    });
  }

  const sourceSheetId = meta.data.sheets.find(s => s.properties.title === sourceSheet).properties.sheetId;
  const sheetRowIndex = dataIndex + 1;
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SHEET_ID,
    requestBody: {
      requests: [{ deleteDimension: { range: { sheetId: sourceSheetId, dimension: 'ROWS', startIndex: sheetRowIndex, endIndex: sheetRowIndex + 1 } } }],
    },
  });

  console.log(`[move] Moved row ${rowIndex} from "${sourceSheet}" → "${destTab}"`);
  return { moved: 1 };
}

export async function moveLeadToSecondAttempt(rowIndex, sheetName = 'Ready for Call') {
  return moveLeadToTab(rowIndex, sheetName, 'Second Attempt');
}

export async function moveLeadToRejects(rowIndex, sheetName) {
  return moveLeadToTab(rowIndex, sheetName, 'Rejects');
}

// One-time setup: migrate dialer_notes X→W across all tabs, create Rejects sheet
export async function setupSheets() {
  const meta = await sheets.spreadsheets.get({ spreadsheetId: SHEET_ID });
  const existingSheets = meta.data.sheets;
  const existingTitles = existingSheets.map(s => s.properties.title);

  // Migrate X → W for every existing tab
  const migrationResults = [];
  for (const tab of existingTitles) {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: `'${tab}'!A:X`,
    });
    const rows = res.data.values || [];
    if (rows.length < 2) { migrationResults.push({ tab, migrated: 0 }); continue; }

    const updates = [];
    const clears = [];
    rows.forEach((row, i) => {
      if (i === 0) return; // skip header
      const rowNum = i + 1;
      const xVal = row[23] || '';
      if (xVal) {
        updates.push({ range: `'${tab}'!W${rowNum}`, values: [[xVal]] });
        clears.push({ range: `'${tab}'!X${rowNum}`, values: [['']] });
      }
    });

    if (updates.length > 0) {
      await sheets.spreadsheets.values.batchUpdate({
        spreadsheetId: SHEET_ID,
        requestBody: { valueInputOption: 'USER_ENTERED', data: [...updates, ...clears] },
      });
    }
    migrationResults.push({ tab, migrated: updates.length });
    console.log(`[setup] "${tab}": migrated ${updates.length} rows X→W`);
  }

  // Create Rejects tab if missing
  const blue      = { red: 0.22745098, green: 0.46666667, blue: 0.84705883 };
  const white     = { red: 1, green: 1, blue: 1 };
  const bandLight = { red: 0.92941177, green: 0.9490196,  blue: 0.9764706  };

  let rejectsCreated = false;
  if (!existingTitles.includes('Rejects')) {
    // Get header from Ready for Call
    const headerRes = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: `'Ready for Call'!A1:X1`,
    });
    const header = headerRes.data.values?.[0] || [];

    const addRes = await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SHEET_ID,
      requestBody: { requests: [{ addSheet: { properties: { title: 'Rejects' } } }] },
    });
    const rejectsSheetId = addRes.data.replies[0].addSheet.properties.sheetId;

    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range: `'Rejects'!A1`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [header] },
    });

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SHEET_ID,
      requestBody: {
        requests: [
          { updateSheetProperties: { properties: { sheetId: rejectsSheetId, gridProperties: { frozenRowCount: 1 } }, fields: 'gridProperties.frozenRowCount' } },
          { repeatCell: { range: { sheetId: rejectsSheetId, startRowIndex: 0, endRowIndex: 1 }, cell: { userEnteredFormat: { backgroundColor: blue, textFormat: { bold: true, foregroundColor: white }, verticalAlignment: 'MIDDLE' } }, fields: 'userEnteredFormat(backgroundColor,textFormat,verticalAlignment)' } },
          { updateDimensionProperties: { range: { sheetId: rejectsSheetId, dimension: 'ROWS', startIndex: 0 }, properties: { pixelSize: 21 }, fields: 'pixelSize' } },
          { addBanding: { bandedRange: { range: { sheetId: rejectsSheetId, startRowIndex: 1 }, rowProperties: { firstBandColor: white, secondBandColor: bandLight } } } },
        ],
      },
    });
    rejectsCreated = true;
    console.log('[setup] Created Rejects sheet');
  }

  return { migrationResults, rejectsCreated };
}
