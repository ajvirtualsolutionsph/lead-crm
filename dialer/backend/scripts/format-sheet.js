import { google } from 'googleapis';

const DEST_ID = process.env.GOOGLE_SHEET_ID;
const TAB     = 'Ready for Call';

const auth = new google.auth.JWT({
  email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });

// Get sheet metadata
const meta = await sheets.spreadsheets.get({ spreadsheetId: DEST_ID });
const sheetMeta = meta.data.sheets.find(s => s.properties.title === TAB);
const sheetId = sheetMeta.properties.sheetId;
const rowCount = sheetMeta.properties.gridProperties.rowCount;

// Remove any existing banding before re-applying
const existingBands = sheetMeta.bandedRanges || [];
const removeBandingRequests = existingBands.map(b => ({
  deleteBanding: { bandedRangeId: b.bandedRangeId },
}));
if (removeBandingRequests.length > 0) {
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: DEST_ID,
    requestBody: { requests: removeBandingRequests },
  });
  console.log(`Removed ${removeBandingRequests.length} existing banding(s)`);
}

await sheets.spreadsheets.batchUpdate({
  spreadsheetId: DEST_ID,
  requestBody: {
    requests: [
      // 1. Freeze header row
      {
        updateSheetProperties: {
          properties: { sheetId, gridProperties: { frozenRowCount: 1 } },
          fields: 'gridProperties.frozenRowCount',
        },
      },
      // 2. Compact row height for all rows
      {
        updateDimensionProperties: {
          range: { sheetId, dimension: 'ROWS', startIndex: 0, endIndex: rowCount },
          properties: { pixelSize: 21 },
          fields: 'pixelSize',
        },
      },
      // 3. Clip text (no wrapping) for all cells
      {
        repeatCell: {
          range: { sheetId, startRowIndex: 0, endRowIndex: rowCount },
          cell: { userEnteredFormat: { wrapStrategy: 'CLIP' } },
          fields: 'userEnteredFormat.wrapStrategy',
        },
      },
      // 4. Bold blue header row
      {
        repeatCell: {
          range: { sheetId, startRowIndex: 0, endRowIndex: 1 },
          cell: {
            userEnteredFormat: {
              textFormat: { bold: true, foregroundColorStyle: { rgbColor: { red: 1, green: 1, blue: 1 } } },
              backgroundColor: { red: 0.23, green: 0.47, blue: 0.85 },
            },
          },
          fields: 'userEnteredFormat(textFormat,backgroundColor)',
        },
      },
      // 5. Column widths
      ...([80,180,100,160,110,150,160,130,55,55,200,80,80,80,80,80,80,80,80,80,80,100,140,200]
        .map((px, i) => ({
          updateDimensionProperties: {
            range: { sheetId, dimension: 'COLUMNS', startIndex: i, endIndex: i + 1 },
            properties: { pixelSize: px },
            fields: 'pixelSize',
          },
        }))),
      // 6. Alternating row bands — no headerColor so no extra blue rows
      {
        addBanding: {
          bandedRange: {
            range: { sheetId, startRowIndex: 1, endRowIndex: rowCount },
            rowProperties: {
              firstBandColor:  { red: 1,    green: 1,    blue: 1    },
              secondBandColor: { red: 0.93, green: 0.95, blue: 0.98 },
            },
          },
        },
      },
    ],
  },
});

console.log('Formatting applied. No blue data rows — only header is blue.');
