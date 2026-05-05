// One-time script: logs test leads as "Answered / test call" in Supabase + Google Sheets
const BACKEND = 'https://phone-dialer-shl2.onrender.com';
const SHEET = 'No Reply/Declined';
const TARGET_NAMES = [
  'Brick and Spoon - Texas City',
  'Adriatic Cafe Italian Grill',
  'Marais',
  "Gator's Family Restaurant",
  'Dumpling World',
  'Sawa Restaurant & Grill',
];

const leads = await fetch(`${BACKEND}/leads?sheet=${encodeURIComponent(SHEET)}`).then(r => r.json());
const targets = leads.filter(l => TARGET_NAMES.some(n => l.name?.includes(n.split(' ')[0]) || l.businessName?.includes(n.split(' ')[0])));

console.log(`Found ${targets.length} matching leads`);

for (const lead of targets) {
  const name = lead.businessName || lead.name;
  const res = await fetch(`${BACKEND}/calls`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      leadName: name,
      phone: lead.phone,
      durationSeconds: 30,
      status: 'Answered',
      notes: 'test call',
      rowIndex: lead.rowIndex,
      sheetName: SHEET,
    }),
  });
  const data = await res.json();
  console.log(`Logged: ${name} (row ${lead.rowIndex}) →`, res.ok ? 'OK' : data);
}

console.log('Done.');
