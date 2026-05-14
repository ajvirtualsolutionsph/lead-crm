import { google } from 'googleapis';

const SHEET_ID = process.env.GOOGLE_SHEET_ID;
const TABS = ['New Leads', 'Initial Email Sent', 'Needs Follow Up', 'No Reply/Declined'];

const auth = new google.auth.JWT({
  email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });

async function resetSheet() {
  // 1. Get current sheets
  const meta = await sheets.spreadsheets.get({ spreadsheetId: SHEET_ID });
  const existing = meta.data.sheets.map(s => ({
    id: s.properties.sheetId,
    title: s.properties.title,
  }));
  console.log('Current sheets:', existing.map(s => s.title));

  const requests = [];

  // 2. Add a temp sheet so we always have at least one
  requests.push({ addSheet: { properties: { title: '__temp__' } } });

  // 3. Delete all existing sheets
  for (const s of existing) {
    requests.push({ deleteSheet: { sheetId: s.id } });
  }

  // 4. Add the 4 standard tabs (in reverse so they end up in correct order)
  for (let i = TABS.length - 1; i >= 0; i--) {
    requests.push({ addSheet: { properties: { title: TABS[i], index: 0 } } });
  }

  // Execute all at once
  const res = await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SHEET_ID,
    requestBody: { requests },
  });

  // 5. Find and delete the temp sheet (its sheetId is in the response replies)
  const replies = res.data.replies;
  // First reply is the addSheet for __temp__
  const tempSheetId = replies[0].addSheet.properties.sheetId;
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SHEET_ID,
    requestBody: { requests: [{ deleteSheet: { sheetId: tempSheetId } }] },
  });

  console.log('All existing sheets deleted. Created 4 fresh tabs:', TABS);

  // 6. Add header row to each tab
  const headerValues = [
    ['name', 'business_name', 'col_c', 'col_d', 'phone', 'website',
     'col_g', 'col_h', 'col_i', 'notes', 'col_k', 'col_l', 'col_m',
     'col_n', 'col_o', 'col_p', 'col_q', 'col_r', 'col_s', 'col_t',
     'col_u', 'col_v', 'last_called', 'dialer_notes', 'call_status'],
  ];

  const headerData = TABS.map(tab => ({
    range: `'${tab}'!A1`,
    values: headerValues,
  }));

  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: SHEET_ID,
    requestBody: { valueInputOption: 'USER_ENTERED', data: headerData },
  });

  console.log('Headers written to all 4 tabs. Reset complete.');
}

resetSheet().catch(err => {
  console.error('Reset failed:', err.message);
  process.exit(1);
});
