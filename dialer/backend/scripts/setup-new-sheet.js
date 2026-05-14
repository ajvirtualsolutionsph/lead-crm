import { google } from 'googleapis';

const NEW_SHEET_ID = '11-QP3JSPd2KS-8zWP4az1ZTR-qRSx4fciRVbYaZucnk';
const TAB_NAME = 'Ready for Call';

const auth = new google.auth.JWT({
  email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });

// 1. Get current sheets
const meta = await sheets.spreadsheets.get({ spreadsheetId: NEW_SHEET_ID });
const existing = meta.data.sheets.map(s => ({
  id: s.properties.sheetId,
  title: s.properties.title,
}));
console.log('Current sheets:', existing.map(s => s.title));

// 2. Rename Sheet1 → "Ready for Call"
const sheet1 = existing.find(s => s.title === 'Sheet1');
if (sheet1) {
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: NEW_SHEET_ID,
    requestBody: {
      requests: [{
        updateSheetProperties: {
          properties: { sheetId: sheet1.id, title: TAB_NAME },
          fields: 'title',
        },
      }],
    },
  });
  console.log(`Renamed Sheet1 → "${TAB_NAME}"`);
} else if (existing.find(s => s.title === TAB_NAME)) {
  console.log(`Tab "${TAB_NAME}" already exists, skipping rename`);
} else {
  console.log('No Sheet1 found — creating tab from scratch');
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: NEW_SHEET_ID,
    requestBody: { requests: [{ addSheet: { properties: { title: TAB_NAME } } }] },
  });
}

// 3. Write header row (A–X, matching Lead Gen Pipeline columns A-U + dialer cols V-X)
const headers = [
  'name', 'business_name', 'category', 'address', 'phone', 'website',
  'email', 'operating_hours', 'rating', 'review_count', 'notes', 'details',
  'subject', 'email_body', 'followup', 'date_drafted', 'sent', 'followup_sent',
  'status', 'thread_id', 'message_id',
  'call_status', 'last_called', 'dialer_notes',
];

await sheets.spreadsheets.values.update({
  spreadsheetId: NEW_SHEET_ID,
  range: `'${TAB_NAME}'!A1`,
  valueInputOption: 'USER_ENTERED',
  requestBody: { values: [headers] },
});

console.log('Header row written:', headers.join(', '));
console.log('New sheet setup complete.');
