"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AdminShell } from "@/components/admin/admin-shell";
import { Button } from "@/components/ui/button";

interface Option {
  id?: string;
  label: string;
  text: string;
  isCorrect: boolean;
}
interface Question {
  id?: string;
  order: number;
  type: string;
  prompt: string;
  points: number;
  explanation?: string | null;
  timeLimitSec?: number | null;
  options: Option[];
}

const TYPE_LABELS: Record<string, string> = {
  multiple_choice: "Multiple choice",
  fill_blank: "Written answer",
  true_false: "True / False",
  matching: "Matching",
};
interface ChallengeDetail {
  id: string;
  day: number;
  title: string;
  type: string;
  status: string;
  questions: Question[];
}

const EXAMPLE_JSON = `[
  {
    "type": "multiple_choice",
    "prompt": "Choose the word closest in meaning to 'meticulous'.",
    "points": 10,
    "timeLimitSec": 20,
    "explanation": "Meticulous means very careful and precise about details.",
    "options": [
      { "label": "A", "text": "careless", "isCorrect": false },
      { "label": "B", "text": "thorough", "isCorrect": true },
      { "label": "C", "text": "quick", "isCorrect": false },
      { "label": "D", "text": "loud", "isCorrect": false }
    ]
  },
  {
    "type": "true_false",
    "prompt": "'Meticulous' means careless about details.",
    "points": 10,
    "timeLimitSec": 10,
    "options": [
      { "label": "True", "text": "True", "isCorrect": false },
      { "label": "False", "text": "False", "isCorrect": true }
    ]
  },
  {
    "type": "fill_blank",
    "prompt": "Type the word: someone very careful and precise is ______.",
    "points": 15,
    "timeLimitSec": 30,
    "options": [
      { "label": "", "text": "meticulous", "isCorrect": true }
    ]
  }
]`;

export default function AdminChallengeDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [challenge, setChallenge] = useState<ChallengeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [jsonInput, setJsonInput] = useState("");
  const [importError, setImportError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);

  function load() {
    fetch(`/api/admin/challenges/${params.id}`)
      .then((r) => r.json())
      .then((d) => {
        setChallenge(d.challenge ?? null);
        setLoading(false);
      });
  }

  useEffect(load, [params.id]);

  async function importQuestions() {
    setImportError(null);
    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonInput);
    } catch {
      setImportError("That's not valid JSON — check for a trailing comma or missing bracket.");
      return;
    }
    if (!Array.isArray(parsed)) {
      setImportError("Expected a JSON array of questions.");
      return;
    }

    const questions = parsed.map((q, i) => ({
      order: i + 1,
      type: q.type ?? "multiple_choice",
      prompt: q.prompt,
      points: q.points ?? 10,
      explanation: q.explanation ?? undefined,
      timeLimitSec: q.timeLimitSec ?? undefined,
      options: q.options ?? [],
    }));

    setImporting(true);
    const res = await fetch(`/api/admin/challenges/${params.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questions }),
    });
    setImporting(false);

    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setImportError(d.error ?? "Import failed — check the shape matches the example.");
      return;
    }
    setJsonInput("");
    load();
  }

  if (loading) {
    return (
      <AdminShell>
        <div className="p-8 text-white/40">Loading…</div>
      </AdminShell>
    );
  }

  if (!challenge) {
    return (
      <AdminShell>
        <div className="p-8 text-white/40">Challenge not found.</div>
      </AdminShell>
    );
  }

  return (
    <AdminShell>
      <div className="p-8 max-w-4xl">
        <button
          onClick={() => router.push("/admin/challenges")}
          className="text-xs text-white/50 hover:underline font-semibold"
        >
          ← Back to challenges
        </button>

        <div className="mt-3 flex items-center justify-between">
          <div>
            <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold">{challenge.title}</h1>
            <p className="text-white/50 text-sm mt-1">
              Day {challenge.day} · {challenge.type} · {challenge.status}
            </p>
          </div>
        </div>

        <div className="mt-8 border-2 border-white/20">
          <div className="px-5 py-3 border-b-2 border-white/20 bg-black/40">
            <h2 className="font-bold text-sm">
              Questions ({challenge.questions.length})
            </h2>
          </div>
          {challenge.questions.length === 0 ? (
            <p className="p-5 text-white/40 text-sm">No questions yet — import some below.</p>
          ) : (
            <div className="divide-y divide-white/10">
              {challenge.questions.map((q, i) => (
                <div key={q.id ?? i} className="p-5">
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 border border-white/30 text-white/50">
                      {TYPE_LABELS[q.type] ?? q.type}
                    </span>
                    {q.timeLimitSec != null && (
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 border border-blue-400/50 text-blue-400">
                        {q.timeLimitSec}s
                      </span>
                    )}
                    <span className="text-[10px] text-white/40">{q.points} pts</span>
                  </div>
                  <p className="text-sm font-semibold">
                    {i + 1}. {q.prompt}
                  </p>
                  {q.type === "fill_blank" ? (
                    <p className="mt-2 text-xs text-emerald-400">
                      Accepted: {q.options.map((o) => o.text).join(", ")}
                    </p>
                  ) : (
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      {q.options.map((o, oi) => (
                        <div
                          key={oi}
                          className={`text-xs px-2 py-1.5 border ${
                            o.isCorrect ? "border-emerald-400 text-emerald-400" : "border-white/20 text-white/60"
                          }`}
                        >
                          {o.label ? `${o.label}. ` : ""}
                          {o.text}
                        </div>
                      ))}
                    </div>
                  )}
                  {q.explanation && (
                    <p className="mt-2 text-xs text-white/40 italic">{q.explanation}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-8 border-2 border-white/20">
          <div className="px-5 py-3 border-b-2 border-white/20 bg-black/40">
            <h2 className="font-bold text-sm">Import questions from JSON</h2>
            <p className="text-xs text-white/40 mt-1">
              Paste the JSON array Claude generated (see the content-generation prompt). This
              replaces the entire question set for this challenge.
            </p>
          </div>
          <div className="p-5">
            <textarea
              value={jsonInput}
              onChange={(e) => setJsonInput(e.target.value)}
              placeholder={EXAMPLE_JSON}
              rows={10}
              className="w-full border-2 border-white/30 bg-black px-3 py-2 text-xs font-mono outline-none focus:ring-2 focus:ring-blue-500"
            />
            {importError && <p className="mt-2 text-sm text-red-400">{importError}</p>}
            <div className="mt-3 flex gap-3">
              <Button onClick={importQuestions} disabled={importing || !jsonInput.trim()}>
                {importing ? "Importing…" : "Import & replace questions"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
