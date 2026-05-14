import 'dotenv/config';
import { google } from 'googleapis';

const SHEET_ID = process.env.GOOGLE_SHEET_ID;
const ROW_HEIGHT = 21; // compact — Google Sheets minimum

const auth = new google.auth.JWT({
  email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });

async function run() {
  const meta = await sheets.spreadsheets.get({ spreadsheetId: SHEET_ID });
  const sheetList = meta.data.sheets;

  const requests = sheetList.map(s => ({
    updateDimensionProperties: {
      range: {
        sheetId: s.properties.sheetId,
        dimension: 'ROWS',
        startIndex: 0,
        endIndex: 1000,
      },
      properties: { pixelSize: ROW_HEIGHT },
      fields: 'pixelSize',
    },
  }));

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SHEET_ID,
    requestBody: { requests },
  });

  console.log(`Compacted row height to ${ROW_HEIGHT}px on ${sheetList.length} tabs.`);
}

run().catch(err => {
  console.error('Failed:', err.message);
  process.exit(1);
});
