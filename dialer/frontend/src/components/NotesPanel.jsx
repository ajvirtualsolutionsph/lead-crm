import { useState, useEffect } from 'react';
import axios from 'axios';
import { T } from '../theme.js';

const SCRIPT = [
  {
    title: '01 — The Opener',
    content: `First 20 seconds — pattern interrupt. No greetings. No "How are you today?" No company intro. Sound like a slightly disorganized human, not a script.

YOUR LINE:
"Hey [First Name] — I know I'm calling out of the blue, so I'll be quick. Real fast — are you the person handling [lead follow-ups / the books / the admin side] over there, or does someone else take care of all that stuff for you?"

WHY THIS WORKS:
The blunt "out of the blue" admission disarms them. The "or someone else" phrasing lowers their defense.

BRANCHING:
If they say "That's me":
→ "Oh perfect — okay, this'll be quick then." → Move to Section 02.

If they say "That's [other person]":
→ "Got it. Honestly real quick before you transfer me — does that side of things actually run smoothly for you guys, or is it kind of the usual mess most businesses deal with?"
→ They'll either vent (gold) or transfer you (also fine — you got past gatekeeping).`,
  },
  {
    title: '02 — The Confused Man Pitch',
    content: `The frame: you're not selling. You're trying to understand if their setup is like the others you've seen. Lower your energy — slow down, sound like you're thinking out loud.

YOUR LINE:
"So — and forgive me if this is a dumb question — I've been talking to a bunch of [their industry] this week, and almost all of them told me the same weird thing… they've got someone on payroll, sometimes a couple people, basically just doing the same repetitive stuff every single day. Like answering the same emails, chasing the same leads, entering the same data into spreadsheets… Is that kind of how it works on your end too, or have you guys figured out a better way?"

CRITICAL: Then shut up. Do not fill the silence. Whatever they say next is your roadmap for the entire rest of the call.

INDUSTRY-SPECIFIC SWAPS — replace [their industry] with:
• Agencies: "agency owners"
• E-commerce: "e-comm folks running Shopify stores"
• Real estate: "realtors and brokers"
• Coaching/consulting: "coaches and consultants"
• Default: "small business owners in your space"`,
  },
  {
    title: '03 — The Probing Questions',
    content: `Use these to dig deeper based on their answer. Stay in the "I'm just trying to understand" energy — never sound like a salesperson connecting dots. Pick the one that fits what they just said.

PROBE 01 — TIME:
"Huh — okay, that's interesting. So like… how many hours a week would you say you or your team spend on that stuff? Just ballpark."

PROBE 02 — COST:
"Wait, hold on — so you're paying someone basically full-time just to do that? I'm not judging, I just genuinely want to understand how that works financially for you."

PROBE 03 — LEAKAGE:
"And the lead follow-up side — does anything ever slip through? Like leads that just… never get a response because everyone's busy?"

PROBE 04 — THE KILL SHOT:
"Okay so I'm trying to picture this — if that whole process just ran itself in the background, like 24/7, no sick days, no Mondays… what would that actually change for you?"

WHY PROBE 04 IS THE KILL SHOT: This question makes them describe their dream outcome in their own words. They're now selling themselves on the value before you've named a single price.`,
  },
  {
    title: '04 — The Pivot',
    content: `Once they've described their pain, drop the confused act. Shift tone — slightly faster, slightly more confident. Stop being a curious stranger and become a specific solution.

YOUR LINE — THE REVEAL:
"Okay — so the reason I'm asking all this is because that's literally what I build. I'm AJ, I run a small operation out of the Philippines, and what I do is build one-time AI systems that handle exactly what you just described — lead follow-up, inbox triage, the repetitive admin stuff — and you pay for it once. Not monthly. Once. And it just runs.

The reason I'm calling instead of emailing is I only take on 3 to 4 builds a month, so I actually have to talk to people to know if it's a fit. Can I ask you maybe two more questions to see if it even makes sense for me to send you anything?"

WHY THIS WORKS:
"Two more questions" sounds tiny — almost free. "See if it even makes sense" sounds like you're qualifying them. The scarcity ("3 to 4 builds a month") is delivered as a casual fact, not a sales tactic.`,
  },
  {
    title: '05 — The Qualify & Book',
    content: `Two questions. If both come back green, you book. The goal of a cold call is a booked demo, not a closed deal.

QUALIFYING QUESTION 01 — DESIRE:
"First one — if I could take [the specific pain they mentioned] and basically delete it from your week, is that something you'd actually want to see in action, or is it not really a priority right now?"

QUALIFYING QUESTION 02 — AUTHORITY:
"Second — and this is the honest one — when something like this comes up, are you the person who'd make the call on it, or would you need to loop someone else in?"

IF BOTH GREEN — THE CLOSE:
"Cool — here's what I'll do. I'll send you a calendar link, you pick any 30-minute slot this week that works, and I'll do a live screen-share showing you exactly what I'd build for [their use case]. No slides, no pitch deck — just the actual thing running. What's the best email to send the link to?"

WHY THIS CLOSE LANDS: You're not asking for a yes — you're asking for an email. "No slides, no pitch deck" preemptively kills the fear of a sales meeting.`,
  },
  {
    title: '06 — Objection Counters',
    content: `Use these verbatim until they're muscle memory, then adapt to your voice.

✕ "I'm not interested."
→ "Yeah totally fair — and honestly most people say that in the first ten seconds because they assume I'm selling them software or something. I'm not. Can I ask one question and if the answer's no, I'll get off the phone — does your team spend more than like 5 hours a week on repetitive manual tasks?"

✕ "We already have a VA / someone who does this."
→ "Oh nice, that's actually great — most of my best clients had a VA first. Quick question though — what happens to all that work when your VA takes a day off, or when they eventually leave? That's actually the gap I fill. Worth a 30-minute look?"

✕ "Send me an email with info."
→ "Yeah I can definitely do that — but real talk, I've sent like a hundred of those and people skim them and forget. What's actually useful is if I just show you a 5-minute demo of what I built for someone in your space. Worst case you steal the idea and build it yourself. What's a bad time for you this week so I can avoid it?"

✕ "How much does it cost?"
→ "Honest answer — between $2,000 and $2,500 one time, depending on what we're automating. But I genuinely can't tell you if it's worth that until I see what you're dealing with. Most of my clients were paying that much per month to a hire doing the same thing. Want to do a quick demo?"

✕ "We don't have budget right now."
→ "Got it — and I'm not trying to push you. But just so I understand — is it that the budget isn't there at all, or is it that you haven't seen anything yet that's clearly worth the spend? Because those are two different conversations."

✕ "I need to think about it."
→ "Totally — what specifically? Is it the price, the timing, or you're not sure it'll actually work for your setup? Because I can probably answer whichever one in like 30 seconds."

✕ "How did you get my number?"
→ "Honestly? I do my own prospecting. I look up businesses I think I can actually help and I call them myself. If now's a bad time I'll get out of your hair, but I promise I'm not a robocall."`,
  },
  {
    title: '07 — Delivery Notes',
    content: `Read this before every block of calls until it's internalized.

01 — The confused man only works if you sound genuinely curious
If it sounds rehearsed, it dies. Practice until it feels like you're actually unsure. Slow your pace by about 15%. Add small disfluencies — "um," "like," "hold on" — they're trust signals, not weaknesses.

02 — Never sell the build — sell the deletion of the pain
They don't want n8n workflows or Claude integrations. They want their Tuesday afternoons back. Every time you're tempted to explain how something works, ask: "Am I describing the outcome, or the mechanism?" Stick to outcomes.

03 — Drop scarcity at the END, not the opener
The "3 client slots open this month" line is a great closing nudge — but in the opener it sounds like pressure. At the end of a qualified call it sounds like a reason to pick a time this week instead of next.

04 — Track which opener variant gets you past the first 20 seconds
After 30–40 calls you'll know which industry/pain combo lands hardest. Double down there. Cold calling is a data game wearing a conversation costume.

05 — Silence is your most powerful tool
After Section 02's pitch, after the kill-shot probe in Section 03, and after the price reveal — say nothing. Most reps lose deals by talking through the prospect's internal processing.

06 — The goal of the call is a booked demo, not a closed deal
Don't try to close on the phone. You sell automation builds — they need to see them running. Your only job on the cold call is to earn 30 minutes of their calendar.`,
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

const STORAGE_KEY = 'crm_script_sections';

function loadScript() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return SCRIPT;
    const parsed = JSON.parse(saved);
    // Merge: use saved content but fall back to default for any missing sections
    return SCRIPT.map((def, i) => ({ ...def, content: parsed[i]?.content ?? def.content }));
  } catch {
    return SCRIPT;
  }
}

export default function NotesPanel({ notes, setNotes, selectedLead, onSaveNotes }) {
  const [fieldValues, setFieldValues] = useState({});
  const [website, setWebsite] = useState('');
  const [openSection, setOpenSection] = useState(0);
  const [scriptSections, setScriptSections] = useState(loadScript);
  const [editingSection, setEditingSection] = useState(null); // index being edited
  const [editDraft, setEditDraft] = useState('');
  const [notesSaved, setNotesSaved] = useState(false);

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
          placeholder="Type notes here…"
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
          <button
            onClick={async () => {
              await onSaveNotes?.();
              setNotesSaved(true);
              setTimeout(() => setNotesSaved(false), 2000);
            }}
            disabled={!selectedLead}
            style={{
              padding: '4px 12px',
              background: T.saveBlue,
              color: '#fff',
              border: 'none',
              borderRadius: 4,
              fontSize: 11,
              fontWeight: 600,
              cursor: selectedLead ? 'pointer' : 'not-allowed',
              opacity: selectedLead ? 1 : 0.4,
            }}
          >
            Save Notes
          </button>
          {notesSaved && (
            <span style={{ fontSize: 11, color: '#10b981', fontWeight: 600 }}>Saved ✓</span>
          )}
        </div>
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
        {scriptSections.map((section, i) => (
          <div key={i} style={{ borderBottom: `1px solid ${T.borderMuted}` }}>
            {/* Section header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              background: openSection === i ? T.inputBg : 'transparent',
            }}>
              <button
                onClick={() => { setOpenSection(openSection === i ? -1 : i); setEditingSection(null); }}
                style={{
                  flex: 1,
                  textAlign: 'left',
                  padding: '7px 14px',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: openSection === i ? T.textPrimary : T.textMuted,
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
              {/* Edit button — only visible when section is open */}
              {openSection === i && editingSection !== i && (
                <button
                  onClick={e => { e.stopPropagation(); setEditingSection(i); setEditDraft(section.content); }}
                  style={{
                    padding: '3px 8px',
                    marginRight: 10,
                    background: 'transparent',
                    border: `1px solid ${T.borderStrong}`,
                    borderRadius: 4,
                    color: T.textMuted,
                    fontSize: 10,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                  }}
                >
                  Edit
                </button>
              )}
            </div>

            {/* Section content */}
            {openSection === i && (
              <div style={{
                padding: '8px 14px 12px',
                background: T.panelBg,
                borderTop: `1px solid ${T.borderMuted}`,
              }}>
                {editingSection === i ? (
                  <>
                    <textarea
                      value={editDraft}
                      onChange={e => setEditDraft(e.target.value)}
                      style={{
                        width: '100%',
                        minHeight: 180,
                        padding: 8,
                        background: T.inputBg,
                        color: T.textPrimary,
                        border: `1px solid ${T.borderStrong}`,
                        borderRadius: 4,
                        fontSize: 12,
                        lineHeight: 1.7,
                        fontFamily: 'system-ui, sans-serif',
                        boxSizing: 'border-box',
                        resize: 'vertical',
                      }}
                    />
                    <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                      <button
                        onClick={() => {
                          const updated = scriptSections.map((s, idx) => idx === i ? { ...s, content: editDraft } : s);
                          setScriptSections(updated);
                          localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
                          setEditingSection(null);
                        }}
                        style={{ padding: '4px 12px', background: T.saveBlue, color: '#fff', border: 'none', borderRadius: 4, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingSection(null)}
                        style={{ padding: '4px 12px', background: 'transparent', color: T.textMuted, border: `1px solid ${T.borderStrong}`, borderRadius: 4, fontSize: 11, cursor: 'pointer' }}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => {
                          const updated = scriptSections.map((s, idx) => idx === i ? { ...s, content: SCRIPT[i].content } : s);
                          setScriptSections(updated);
                          localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
                          setEditingSection(null);
                        }}
                        style={{ padding: '4px 12px', background: 'transparent', color: '#f87171', border: '1px solid #f87171', borderRadius: 4, fontSize: 11, cursor: 'pointer', marginLeft: 'auto' }}
                      >
                        Reset
                      </button>
                    </div>
                  </>
                ) : (
                  <div style={{
                    color: T.transcriptText,
                    fontSize: 12,
                    lineHeight: 1.7,
                    whiteSpace: 'pre-wrap',
                    fontFamily: 'system-ui, sans-serif',
                  }}>
                    {section.content}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
