import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/server/db";
import { getSession } from "@/lib/server/auth";

const schema = z.object({
  attemptId: z.string(),
  questionId: z.string(),
  letter: z.string().length(1),
});

/**
 * Hangman letter guess — checks one letter against the secret word (stored
 * the same way as fill_blank: the correct ChallengeOption's text) and
 * returns which positions it appears at, without ever revealing the word
 * itself. Read-only, same pattern as /battle-round: the final word the
 * player assembles from revealed letters is what actually gets graded at
 * /submit, via the existing fill_blank text-match logic — this endpoint
 * only exists to power the letter-by-letter reveal UI.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: challengeId } = await params;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const attempt = await db.challengeAttempt.findUnique({ where: { id: parsed.data.attemptId } });
  if (!attempt || attempt.challengeId !== challengeId || attempt.userId !== session.userId) {
    return NextResponse.json({ error: "Attempt not found" }, { status: 404 });
  }

  const challenge = await db.challenge.findUnique({ where: { id: challengeId } });
  if (!challenge || challenge.type !== "hangman") {
    return NextResponse.json({ error: "Not a Hangman challenge" }, { status: 400 });
  }

  const question = await db.challengeQuestion.findUnique({
    where: { id: parsed.data.questionId },
    include: { options: true },
  });
  if (!question || question.challengeId !== challengeId) {
    return NextResponse.json({ error: "Question not found" }, { status: 404 });
  }

  const word = question.options.find((o) => o.isCorrect)?.text ?? "";
  const letter = parsed.data.letter.toLowerCase();
  const positions: number[] = [];
  for (let i = 0; i < word.length; i++) {
    if (word[i].toLowerCase() === letter) positions.push(i);
  }

  return NextResponse.json({ correct: positions.length > 0, positions, wordLength: word.length });
}
