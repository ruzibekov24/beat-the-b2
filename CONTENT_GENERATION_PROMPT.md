# Generating challenge content with Claude.ai

Use this with the regular Claude.ai chat (claude.ai — not the API) to write
reading passages, listening scripts, and quiz questions for **Can You Beat
The B2?**. The output pastes directly into the admin panel.

## How to use it

1. Open a new chat at [claude.ai](https://claude.ai).
2. Copy the prompt block below, fill in the `[bracketed]` parts, and send it.
3. Copy Claude's JSON output.
4. In the admin panel, open **Challenges → click the challenge row →
   "Import questions from JSON"**, paste it in, click **Import & replace
   questions**.
5. For reading passages / listening scripts, paste the title + text into
   **Reading** / **Listening** in the admin sidebar (those pages take plain
   text directly, no JSON needed).

Do this once per challenge (Day 1–7). Re-running the import on the same
challenge replaces its whole question set, so paste the full set each time,
not one question at a time.

---

## The prompt

```
You are writing content for "Can You Beat The B2?", a 7-day competitive
English test platform. Levels are A1_A2 (beginner), B1 (intermediate),
B2 (upper-intermediate), C1 (advanced) — the whole platform is named
after the B2 level.

Write [NUMBER, e.g. 8] English questions for:
- Level: [A1_A2 / B1 / B2 / C1]
- Focus: [e.g. "vocabulary", "grammar — mixed tenses", "reading
  comprehension for the passage below", "listening comprehension for the
  script below"]
- Day: [1-7] of the competition (day 7 should feel like a tougher final)
- Mix of formats: [e.g. "mostly multiple_choice, 2 true_false, 1
  fill_blank" — or just "multiple_choice only" for a plain quiz]

Rules:
- Three question types are available — pick per the mix requested above:
  - "multiple_choice": exactly 4 options, exactly one correct.
  - "true_false": exactly 2 options, texts must be literally "True" and
    "False", exactly one correct.
  - "fill_blank": a free-text answer. "options" holds every acceptable
    spelling/variant (e.g. "color" and "colour"), all isCorrect: true, no
    incorrect options. The prompt must make the expected answer
    unambiguous (e.g. "Type the missing word: ...").
- Distractors (multiple_choice/true_false) must be plausible, not silly or
  obviously wrong — a real test-taker at this level should have to think.
- No two questions test the exact same word/rule.
- Write a one-sentence explanation for each correct answer.
- Points: 10 for straightforward questions, 15 for genuinely hard ones,
  20 for fill_blank (recalling > recognizing is harder).
- timeLimitSec: a per-question countdown in seconds — omit (or null) for
  no limit. Guideline: ~20s multiple_choice, ~10s true_false, ~30s
  fill_blank; tighten by ~30% on day 7 for a "final round" feel.
- Keep prompts and options concise — this renders on a mobile screen.

Output ONLY a JSON array, no prose, no markdown fences, in exactly this
shape:

[
  {
    "type": "multiple_choice",
    "prompt": "Question text here.",
    "points": 10,
    "timeLimitSec": 20,
    "explanation": "One sentence on why the correct answer is correct.",
    "options": [
      { "label": "A", "text": "...", "isCorrect": false },
      { "label": "B", "text": "...", "isCorrect": true },
      { "label": "C", "text": "...", "isCorrect": false },
      { "label": "D", "text": "...", "isCorrect": false }
    ]
  },
  {
    "type": "true_false",
    "prompt": "A true/false statement here.",
    "points": 10,
    "timeLimitSec": 10,
    "options": [
      { "label": "True", "text": "True", "isCorrect": false },
      { "label": "False", "text": "False", "isCorrect": true }
    ]
  },
  {
    "type": "fill_blank",
    "prompt": "Type the missing word: ...",
    "points": 20,
    "timeLimitSec": 30,
    "options": [
      { "label": "", "text": "answer", "isCorrect": true },
      { "label": "", "text": "accepted variant spelling", "isCorrect": true }
    ]
  }
]
```

## For reading challenges

Add this before the question rules, and reference "the passage below" as
the focus:

```
First write a reading passage:
- Level: [A1_A2 / B1 / B2 / C1]
- Topic: [e.g. "a news article about renewable energy"]
- Length: [e.g. 150-250 words for B1, 300-400 for C1]

Output it as:
TITLE: <short title>
---
<passage text>
---

Then write the questions as instructed above, testing comprehension of
that passage specifically (not general vocabulary).
```

## For listening challenges

Claude can't generate audio — it can write the script, but you (or a TTS
tool) still need to actually produce the audio file and upload it via
**Listening** in the admin panel.

```
First write a listening script — a short dialogue or monologue meant to
be read aloud or run through text-to-speech:
- Level: [A1_A2 / B1 / B2 / C1]
- Topic: [e.g. "two colleagues planning a work trip"]
- Length: [e.g. 30-60 seconds spoken, ~100-150 words for B1]

Output it as:
TITLE: <short title>
---
<script text, formatted as dialogue if there's more than one speaker>
---

Then write comprehension questions as instructed above, testing what a
listener would need to catch (not text visible to them).
```
