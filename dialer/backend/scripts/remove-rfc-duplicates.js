// One-off script: delete RFC rows 92–101 (duplicates already in Second Attempt)
// Run: node scripts/remove-rfc-duplicates.js
import 'dotenv/config';
import { google } from 'googleapis';

const auth = new google.auth.JWT({
  email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});
const sheets = google.sheets({ version: 'v4', auth });
const SHEET_ID = process.env.GOOGLE_SHEET_ID;

const meta = await sheets.spreadsheets.get({ spreadsheetId: SHEET_ID });
const rfcSheet = meta.data.sheets.find(s => s.properties.title === 'Ready for Call');
if (!rfcSheet) throw new Error('Ready for Call sheet not found');
const sheetId = rfcSheet.properties.sheetId;

// Rows 92–101 (1-indexed with header = row 1).
// API uses 0-indexed: row 92 → startRowIndex 91.
// Delete highest first so indices stay stable.
const rowsToDelete = [101, 100, 99, 98, 97, 96, 95, 94, 93, 92];
const deleteRequests = rowsToDelete.map(r => ({
  deleteDimension: {
    range: { sheetId, dimension: 'ROWS', startIndex: r - 1, endIndex: r },
  },
}));

await sheets.spreadsheets.batchUpdate({
  spreadsheetId: SHEET_ID,
  requestBody: { requests: deleteRequests },
});

console.log(`Deleted rows 92–101 from Ready for Call (${rowsToDelete.length} rows).`);
