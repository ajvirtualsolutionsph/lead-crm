import { useState, useEffect } from 'react';
import axios from 'axios';
import { T } from '../theme.js';

const SCRIPT = [
  {
    title: '🎯 FIRST 30 SECONDS — Hook + Permission',
    content: `"Hey, is this [First Name]? — Hi, it's just AJ an AI Automation Expert from the Philippines. I was wondering if you could help me out for a moment?"

⏸️ PAUSE. Wait for them to say "sure" or laugh. Don't skip the pause.

"Thank you, well I am not sure who I should be talking to. I am trying to reach the person whose responsible for overseeing any possible hidden gaps in maintaining your business website, client follow ups and back-end admin tasks that could be causing missed follow ups and business opportunity with customers. Who should I be talking to about that?"

If the person you're speaking to is not the right person:
"Should I have you transfer me over to him/her to leave a voicemail and she can call me back if she needs help?"

Why This Works:
• "22 seconds" is oddly specific — forces them to actually listen
• "9pm emails" and "Sundays" are specific — they recognize themselves
• "Business stops depending on them being awake" = the dream they rarely hear
• Honesty disarms — removes their #1 objection before they raise it`,
  },
  {
    title: '🔍 QUALIFYING — 3 Questions Only (60–90s)',
    content: `"Mind if I ask three quick questions to see if this is even worth your time? Cool —"

Q1 – PAIN DISCOVERY: "What's eating the most hours in your week right now — is it inbox and admin stuff, chasing leads, or content and marketing?"
Listen for emotion. "Honestly, all of it" = GREEN FLAG

Q2 – CURRENT SETUP: "And right now, are you handling that yourself, or do you have a VA, an agency, or some tools doing it?"
This tells you budget reality. Has a VA = perfect upgrade target

Q3 – THE MONEY QUESTION: "If a system handled even 70% of that for you — running on its own, no hand-holding — would that be a 'nice to have' for you, or a 'thank god' moment?"
"Thank god" or laugh = QUALIFIED → Move to pitch`,
  },
  {
    title: '🎤 THE PITCH — Only if qualified (30s)',
    content: `"Okay, based on what you just told me — you're exactly who I built this for. Let me tell you what it actually is in 30 seconds, then I'll stop talking."

"It's called the AI Admin & Marketing Agent. One system, two jobs. On the admin side: it triages your inbox, drafts your replies in your voice, respond to customer inquiries, and books calls straight to your calendar. On the marketing side: it generates content, schedules your posts, and tracks what's actually getting engagement so you stop guessing."

"Three things people are usually surprised by:"
1. One-time build around $2,000 to $2,500. You own it. No fuss about sick days, holidays and day offs. Compared to a roughly $58,000/yr hire for the admin piece alone, most break even before month two.
2. You don't need to be technical. I build it to run in the background. Anyone can use it.
3. I only take 4 builds a month, and I've got 3 slots left this month.

"The way I figure out if it's a real fit is a 30-minute Zoom — I show you a live demo of one already running, you ask whatever you want, and you decide. No pressure pitch at the end."`,
  },
  {
    title: '📅 SOFT CLOSE → BOOK',
    content: `"Two ways we can do this — I can text or email you my Calendly link and you pick a slot, or I can read you a couple of times right now and we lock it in. Which is easier for you?"

📌 Giving a choice between two yeses is more effective than "want to book?"

IF LINK: "Done. What's the best email? — Great, sending it now from aj.virtualsolutionsph@gmail.com. Quick favor: book within 48 hours if you can, slots go fast. And [Name] — if it's not a fit after the demo, just tell me. I'd rather hear no than chase a maybe."

IF TIMES: "Cool — I've got [Day] at [Time] or [Day] at [Time], both your timezone. Which works?" → Confirm → "Perfect. Calendar invite coming now."`,
  },
  {
    title: '🟡 OBJECTIONS',
    content: `"I'm too small"
→ "Honestly that's backwards. Big companies have teams to absorb busywork. You're the one doing all of it personally — which means you're the one who gets the most hours back."

"Can't afford $2K"
→ "Payment's 50/50, so $1K upfront. But if cash flow's the concern, the lead-gen piece usually pays for the build. Want me to walk you through that on the demo?"

"Already use ChatGPT"
→ "Good — means you get the idea. The difference is you're prompting every time. What I build prompts itself. It reads, decides, drafts, and acts — without you opening anything."

"Have a VA already"
→ "Perfect actually — your VA isn't going anywhere. The system handles repetitive stuff so your VA does thinking work. Most clients keep their VA and run the AI together."

"Send me email"
→ "Will do. Quick thing — based on what you said about [reference Q1 answer], should I send Admin, Marketing, or both? Sending within the hour with Calendly link." THEN ACTUALLY DO IT.`,
  },
  {
    title: '📋 PRE-CALL 60-SECOND CHECKLIST',
    content: `☐ Look at their website/social for 30 seconds — find ONE thing to reference
☐ Pull up Calendly link in a tab, ready to paste
☐ Have a notes doc open — capture Q1/Q2 answers for follow-up
☐ Stand up and SMILE before you dial — it changes your voice`,
  },
  {
    title: '🎯 DAILY TARGETS',
    content: `Dials per day:            20–30
Actual conversations:     5–8
Qualified prospects:      2–3
Demos booked (good day):  1`,
  },
  {
    title: '⚡ QUICK PERSONALIZATION TIPS',
    content: `Swap these in instead of the generic opener:

For agencies: "I build AI systems that handle the prospecting and follow-ups your account managers hate doing."
For e-commerce: "I build AI systems that replace the customer service and order admin work eating your team's afternoons."
For coaches/consultants: "I build AI systems that handle inbox triage and discovery-call scheduling so you stop being your own assistant."

Remember: You're not selling. You're qualifying. If they don't have the pain, move on.`,
  },
];

const EDITABLE_FIELDS = [
  { label: 'Business', key: 'name',             apiField: 'business_name' },
  { label: 'Phone',    key: 'phone',            apiField: 'phone' },
  { label: 'Email',    key: 'email',            apiField: 'email' },
  { label: 'Category', key: 'category',         apiField: 'category' },
  { label: 'Address',  key: 'address',          apiField: 'address' },
  { label: 'Hours',    key: 'operating_hours',  apiField: 'operating_hours' },
];

const READONLY_FIELDS = [
  { label: 'Rating',   key: 'rating' },
  { label: 'Reviews',  key: 'review_count' },
  { label: 'Notes',    key: 'notes' },
  { label: 'Details',  key: 'details' },
  { label: 'Status',   key: 'status' },
  { label: 'Called',   key: 'lastCalled' },
];

const inputStyle = {
  width: '100%',
  padding: '3px 6px',
  fontSize: 11,
  border: `1px solid ${T.borderStrong}`,
  borderRadius: 4,
  background: T.inputBg,
  color: T.textPrimary,
  boxSizing: 'border-box',
  fontFamily: 'system-ui, sans-serif',
};

export default function NotesPanel({ notes, setNotes, selectedLead }) {
  const [fieldValues, setFieldValues] = useState({});
  const [website, setWebsite] = useState('');
  const [openSection, setOpenSection] = useState(0);

  useEffect(() => {
    if (!selectedLead) { setFieldValues({}); setWebsite(''); return; }
    const vals = {};
    EDITABLE_FIELDS.forEach(f => { vals[f.key] = selectedLead[f.key] || ''; });
    setFieldValues(vals);
    setWebsite(selectedLead.website || '');
  }, [selectedLead?.rowIndex, selectedLead?.sheet]);

  function handleFieldBlur(apiField, currentValue, originalValue) {
    if (currentValue === originalValue || !selectedLead?.rowIndex) return;
    axios.patch(`/leads/${selectedLead.rowIndex}/info`, {
      field: apiField,
      value: currentValue,
      sheet: selectedLead.sheet,
    }).catch(err => console.error('Field save error:', err));
  }

  function handleWebsiteBlur(currentValue) {
    const original = selectedLead?.website || '';
    if (currentValue === original || !selectedLead?.rowIndex) return;
    axios.patch(`/leads/${selectedLead.rowIndex}/info`, {
      field: 'website',
      value: currentValue,
      sheet: selectedLead.sheet,
    }).catch(err => console.error('Website save error:', err));
  }

  return (
    <div style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      borderLeft: `1px solid ${T.borderMuted}`,
      borderRight: `1px solid ${T.borderMuted}`,
      background: T.appBg,
      overflow: 'hidden',
    }}>
      {/* Notes section */}
      <div style={{ padding: '10px 14px', borderBottom: `1px solid ${T.borderMuted}`, flexShrink: 0 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: T.textMuted, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 6 }}>
          Notes
        </div>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Type notes here… auto-saved"
          style={{
            width: '100%',
            height: 180,
            padding: 8,
            borderRadius: 4,
            border: `1px solid ${T.borderStrong}`,
            resize: 'none',
            boxSizing: 'border-box',
            background: T.inputBg,
            color: T.textPrimary,
            fontSize: 14,
            lineHeight: 1.7,
            fontFamily: 'system-ui, sans-serif',
          }}
        />
      </div>

      {/* Lead details header */}
      <div style={{ padding: '6px 14px', borderBottom: `1px solid ${T.borderMuted}`, background: T.sidebarBg, flexShrink: 0 }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: T.textMuted, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Lead Details</span>
      </div>

      {/* Editable + read-only fields */}
      <div style={{ flexShrink: 0, padding: '8px 14px', borderBottom: `1px solid ${T.borderStrong}`, overflowY: 'auto', maxHeight: 200 }}>
        {!selectedLead ? (
          <span style={{ color: T.textMuted, fontStyle: 'italic', fontSize: 12 }}>Select a lead to view details</span>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 12px' }}>
            {EDITABLE_FIELDS.map(f => (
              <div key={f.key} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{f.label}</span>
                <input
                  type="text"
                  value={fieldValues[f.key] ?? ''}
                  onChange={e => setFieldValues(v => ({ ...v, [f.key]: e.target.value }))}
                  onBlur={e => handleFieldBlur(f.apiField, e.target.value, selectedLead[f.key] || '')}
                  style={inputStyle}
                />
              </div>
            ))}
            {READONLY_FIELDS.filter(f => selectedLead[f.key]).map(f => (
              <div key={f.key} style={{ display: 'flex', gap: 4, alignItems: 'baseline', minWidth: 0 }}>
                <span style={{ flex: '0 0 52px', color: T.textMuted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', fontSize: 10 }}>{f.label}</span>
                <span style={{ color: T.textPrimary, fontSize: 11, lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selectedLead[f.key]}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Website bar — editable input + open in new tab button only */}
      <div style={{ flexShrink: 0, padding: '5px 12px', borderBottom: `1px solid ${T.borderStrong}`, background: T.sidebarBg, display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 11, color: '#94a3b8', flexShrink: 0 }}>Website:</span>
        {selectedLead ? (
          <>
            <input
              type="text"
              value={website}
              onChange={e => setWebsite(e.target.value)}
              onBlur={e => handleWebsiteBlur(e.target.value)}
              placeholder="https://…"
              style={{ ...inputStyle, flex: 1, fontSize: 11 }}
            />
            {website && (
              <a
                href={website}
                target="_blank"
                rel="noreferrer"
                style={{
                  fontSize: 12,
                  color: '#38bdf8',
                  textDecoration: 'none',
                  flexShrink: 0,
                  padding: '2px 8px',
                  border: '1px solid #38bdf8',
                  borderRadius: 4,
                  whiteSpace: 'nowrap',
                }}
              >
                Open ↗
              </a>
            )}
          </>
        ) : (
          <span style={{ fontSize: 11, color: T.textMuted, fontStyle: 'italic' }}>No lead selected</span>
        )}
      </div>

      {/* Cold Calling Script — accordion */}
      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
        <div style={{ padding: '6px 14px', background: T.sidebarBg, borderBottom: `1px solid ${T.borderMuted}` }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: T.textMuted, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Cold Calling Script</span>
        </div>
        {SCRIPT.map((section, i) => (
          <div key={i} style={{ borderBottom: `1px solid ${T.borderMuted}` }}>
            <button
              onClick={() => setOpenSection(openSection === i ? -1 : i)}
              style={{
                width: '100%',
                textAlign: 'left',
                padding: '7px 14px',
                background: openSection === i ? '#1e293b' : 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: openSection === i ? '#f1f5f9' : T.textSecondary,
                fontSize: 12,
                fontWeight: 600,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span>{section.title}</span>
              <span style={{ color: T.textMuted, fontSize: 10 }}>{openSection === i ? '▲' : '▼'}</span>
            </button>
            {openSection === i && (
              <div style={{
                padding: '8px 14px 12px',
                background: '#0f172a',
                color: '#cbd5e1',
                fontSize: 12,
                lineHeight: 1.7,
                whiteSpace: 'pre-wrap',
                fontFamily: 'system-ui, sans-serif',
              }}>
                {section.content}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
