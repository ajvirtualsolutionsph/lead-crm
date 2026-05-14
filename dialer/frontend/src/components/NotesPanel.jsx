import { useState, useEffect } from 'react';
import { T } from '../theme.js';

const SCRIPT = [
  {
    title: '🎯 FIRST 30 SECONDS — Hook + Permission',
    content: `"Hey, is this [First Name]? — Hi, my name's AJ. Real quick, I know I'm calling out of the blue, so I'll keep this to 22 seconds and you can hang up if it's not relevant. Can I have those 22 seconds?"

⏸️ PAUSE. Wait for them to say "sure" or laugh. Don't skip the pause.

"Appreciate it. So — I work with solo founders and small business owners who are still personally answering emails at 9pm and writing their own social posts on Sundays. I build them one AI system that runs the inbox, the lead follow-ups, and the marketing content — so the business stops depending on them being awake. Before I pitch anything though — is that even a real problem for you, or have you already got that handled?"

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

"It's called the AI Admin & Marketing Agent. One system, two jobs. On the admin side: it triages your inbox, drafts your replies in your voice, researches and qualifies leads, and books calls straight to your calendar. On the marketing side: it generates content, schedules your posts, and tracks what's actually getting engagement so you stop guessing."

"Three things people are usually surprised by:"
1. One-time build around $2,000 to $2,500. No subscription. You own it. Compared to $58,000/yr hire for the admin piece alone, most break even before month two.
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

const DETAIL_FIELDS = [
  { label: 'Business', key: 'name' },
  { label: 'Phone', key: 'phone' },
  { label: 'Email', key: 'email' },
  { label: 'Website', key: 'website' },
  { label: 'Category', key: 'category' },
  { label: 'Address', key: 'address' },
  { label: 'Hours', key: 'operating_hours' },
  { label: 'Rating', key: 'rating' },
  { label: 'Reviews', key: 'review_count' },
  { label: 'Details', key: 'details' },
  { label: 'Notes', key: 'notes' },
  { label: 'Status', key: 'status' },
  { label: 'Last Called', key: 'lastCalled' },
];

export default function NotesPanel({
  notes, setNotes,
  outcome, setOutcome,
  showOutcome, saving, autoToast,
  onSaveAndNext,
  transcript, interimText,
  status,
  selectedLead,
}) {
  const [webPreviewError, setWebPreviewError] = useState(false);
  useEffect(() => { setWebPreviewError(false); }, [selectedLead?.rowIndex]);

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
      <div style={{ padding: '12px 16px', borderBottom: `1px solid ${T.borderMuted}` }}>
        <h2 style={{ margin: 0, fontSize: 16, color: T.textPrimary }}>Notes</h2>
      </div>

      {/* Top half — call notes */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 16, overflowY: 'auto', gap: 12, minHeight: 0 }}>

        {status === 'in-call' && (
          <div style={{
            background: T.transcriptBg,
            border: `1px solid ${T.transcriptBorder}`,
            borderRadius: 6,
            padding: '8px 10px',
            maxHeight: 180,
            overflowY: 'auto',
            fontSize: 12,
            lineHeight: 1.5,
            flexShrink: 0,
          }}>
            <div style={{ marginBottom: 4, fontSize: 11, color: T.textMuted, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              Live Transcription (your voice only)
            </div>
            {(!transcript || transcript.length === 0) && !interimText && (
              <div style={{ color: T.textMuted, fontStyle: 'italic' }}>Listening…</div>
            )}
            {transcript && transcript.map((entry, i) => (
              <div key={i} style={{ marginBottom: 3 }}>
                <span style={{ color: T.transcriptTime, marginRight: 6 }}>{entry.time}</span>
                <span style={{ color: T.transcriptLabel, fontWeight: 600, marginRight: 4 }}>You:</span>
                <span style={{ color: T.transcriptText }}>{entry.text}</span>
              </div>
            ))}
            {interimText && (
              <div style={{ color: T.textMuted, fontStyle: 'italic' }}>
                <span style={{ color: T.transcriptLabel, fontWeight: 600, marginRight: 4 }}>You:</span>
                {interimText}
                <span style={{ animation: 'blink 1s step-start infinite' }}>▋</span>
              </div>
            )}
          </div>
        )}

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <div style={{ marginBottom: 4, fontSize: 11, color: T.textMuted, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            Notes
          </div>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Type notes here…"
            style={{
              flex: 1,
              width: '100%',
              padding: 10,
              borderRadius: 4,
              border: `1px solid ${T.borderStrong}`,
              resize: 'none',
              boxSizing: 'border-box',
              background: T.inputBg,
              color: T.textPrimary,
              fontSize: 13,
              lineHeight: 1.6,
              fontFamily: 'system-ui, sans-serif',
            }}
          />
        </div>

        {autoToast && (
          <div style={{
            padding: '10px 14px',
            background: '#1a2f1a',
            border: '1px solid #4ade80',
            borderRadius: 6,
            color: '#4ade80',
            fontSize: 13,
            textAlign: 'center',
            flexShrink: 0,
          }}>
            {autoToast}
          </div>
        )}

        {showOutcome && (
          <div style={{ padding: 14, background: T.inputBg, borderRadius: 6, border: `1px solid ${T.borderStrong}`, flexShrink: 0 }}>
            <p style={{ margin: '0 0 8px', fontWeight: 600, fontSize: 13, color: T.textPrimary }}>Call outcome</p>
            <select
              value={outcome}
              onChange={e => setOutcome(e.target.value)}
              style={{ width: '100%', padding: 8, marginBottom: 8, borderRadius: 4, border: `1px solid ${T.borderStrong}`, background: T.inputBg, color: T.textPrimary }}
            >
              <option>Answered</option>
              <option>No Answer</option>
              <option>Busy</option>
              <option>Callback Requested</option>
            </select>
            <button
              onClick={onSaveAndNext}
              disabled={saving}
              style={{ width: '100%', padding: 10, background: T.saveBlue, color: T.textInverted, border: 'none', borderRadius: 6, fontSize: 14, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1 }}
            >
              {saving ? 'Saving…' : 'Save & next lead'}
            </button>
          </div>
        )}
      </div>

      {/* Divider with column headers */}
      <div style={{ borderTop: `2px solid ${T.borderStrong}`, display: 'flex', flexShrink: 0, background: T.sidebarBg }}>
        <div style={{ flex: '0 0 35%', padding: '6px 16px', borderRight: `1px solid ${T.borderStrong}` }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: T.textMuted, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Cold Calling Script</span>
        </div>
        <div style={{ flex: 1, padding: '6px 16px' }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: T.textMuted, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Lead Details</span>
        </div>
      </div>

      {/* Bottom half — script (35%) + lead details (65%) */}
      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>

        {/* Left pane — script */}
        <div style={{ flex: '0 0 35%', overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 14, borderRight: `1px solid ${T.borderStrong}` }}>
          {SCRIPT.map((section, i) => (
            <div key={i}>
              <div style={{ fontSize: 11, fontWeight: 700, color: T.textPrimary, marginBottom: 5 }}>{section.title}</div>
              <pre style={{ margin: 0, fontFamily: 'system-ui, sans-serif', fontSize: 11, lineHeight: 1.55, color: T.textMuted, whiteSpace: 'pre-wrap', wordBreak: 'break-word', background: T.inputBg, border: `1px solid ${T.borderMuted}`, borderRadius: 6, padding: '6px 8px' }}>
                {section.content}
              </pre>
            </div>
          ))}
        </div>

        {/* Right pane — lead details (flex column) */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {/* Compact fields — 2-column grid */}
          <div style={{ flexShrink: 0, padding: '6px 12px', borderBottom: `1px solid ${T.borderStrong}` }}>
            {!selectedLead ? (
              <span style={{ color: T.textMuted, fontStyle: 'italic', fontSize: 12 }}>No lead selected</span>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3px 8px' }}>
                {DETAIL_FIELDS.filter(f => f.key !== 'website' && selectedLead[f.key]).map(f => (
                  <div key={f.key} style={{ display: 'flex', gap: 4, alignItems: 'baseline', minWidth: 0 }}>
                    <span style={{ flex: '0 0 52px', color: T.textMuted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', fontSize: 10 }}>{f.label}</span>
                    <span style={{ color: T.textPrimary, fontSize: 11, lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selectedLead[f.key]}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Website iframe — fills remaining space */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <div style={{ flexShrink: 0, padding: '4px 10px', borderBottom: `1px solid ${T.borderStrong}`, background: T.sidebarBg, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 11, color: '#94a3b8', flexShrink: 0 }}>Website:</span>
              {selectedLead?.website ? (
                <a href={selectedLead.website} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: '#38bdf8', textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {selectedLead.website} ↗
                </a>
              ) : (
                <span style={{ fontSize: 11, color: T.textMuted, fontStyle: 'italic' }}>No website on file</span>
              )}
            </div>
            <div style={{ flex: 1, position: 'relative', background: '#0f172a' }}>
              {!selectedLead?.website ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: T.textMuted, fontSize: 12, fontStyle: 'italic' }}>No website on file</div>
              ) : webPreviewError ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', padding: 16, textAlign: 'center', fontSize: 12, color: T.textMuted, flexDirection: 'column', gap: 8 }}>
                  <span>This site blocks embedded previews.</span>
                  <a href={selectedLead.website} target="_blank" rel="noreferrer" style={{ color: '#38bdf8', textDecoration: 'none' }}>Open in new tab ↗</a>
                </div>
              ) : (
                <iframe key={selectedLead.website} src={selectedLead.website} title="Website Preview" style={{ width: '100%', height: '100%', border: 'none', display: 'block' }} sandbox="allow-scripts allow-same-origin allow-forms" onError={() => setWebPreviewError(true)} />
              )}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
