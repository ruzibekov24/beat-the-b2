import Link from "next/link";
import { Sparkle } from "lucide-react";
import { LEVELS, LEVEL_ORDER, CHALLENGE_DAY_TITLES } from "@/lib/levels";
import { ChallengeDayIcon } from "@/components/shared/challenge-day-icon";
import { ThemeToggleButton } from "@/components/shared/theme-toggle-button";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-[var(--bg)] text-[var(--ink)] overflow-x-hidden selection:bg-[var(--yellow)] selection:text-black">
      <TopBar />
      <Hero />
      <Ticker />
      <HowItWorks />
      <Levels />
      <SevenDayPreview />
      <Prize />
      <LeaderboardPreview />
      <FinalCTA />
      <Footer />
    </main>
  );
}

function TopBar() {
  return (
    <header className="sticky top-0 z-40 border-b-2 border-[var(--line)] bg-[var(--bg)]">
      <div className="mx-auto max-w-6xl px-5 h-16 flex items-center justify-between">
        <span className="font-[family-name:var(--font-display)] text-base sm:text-lg tracking-tight">
          BEAT<span className="text-[var(--blue)]">THE</span>B2
        </span>
        <div className="hidden sm:flex items-center gap-8 text-sm font-[family-name:var(--font-mono)] font-medium uppercase tracking-wide">
          <Link href="#how-it-works" className="hover:text-[var(--blue)]">How it works</Link>
          <Link href="/leaderboard" className="hover:text-[var(--blue)]">Leaderboard</Link>
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggleButton />
          <Link
            href="/onboarding"
            className="font-[family-name:var(--font-mono)] font-bold text-sm uppercase tracking-wide border-2 border-[var(--line)] bg-[var(--yellow)] text-black px-4 py-2 hard-shadow-sm hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all"
          >
            Start →
          </Link>
        </div>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative mx-auto max-w-6xl px-5 pt-14 pb-20 sm:pt-20 sm:pb-28 border-b-2 border-[var(--line)]">
      {/* The scorecard is 16:9, so it needs a wider column than the old
          portrait card did — and centring keeps it level with the headline. */}
      <div className="grid lg:grid-cols-[1fr_1fr] gap-12 lg:gap-10 items-center">
        <div>
          <div className="inline-flex items-center gap-2 border-2 border-[var(--line)] bg-[var(--paper)] px-3 py-1.5 font-[family-name:var(--font-mono)] text-xs font-bold uppercase tracking-widest hard-shadow-sm">
            <span className="w-2 h-2 bg-[var(--red)] rounded-full animate-pulse" />
            7-day competition · registration open
          </div>

          <h1 className="mt-7 font-[family-name:var(--font-display)] text-[clamp(3rem,10vw,6.5rem)] leading-[0.88] tracking-tight uppercase">
            Can you
            <br />
            beat the
            <br />
            <span className="relative inline-block">
              <span className="relative z-10 text-[var(--bg)] px-2">B2?</span>
              <span className="absolute inset-0 bg-[var(--ink)] -skew-x-6" aria-hidden />
            </span>
          </h1>

          <p className="mt-8 max-w-lg text-lg text-[var(--muted)] leading-relaxed">
            Think your English is good enough? Choose your level, lock it, complete daily
            challenges, climb the leaderboard, and prove yourself. No refunds. No mercy.
          </p>

          <div className="mt-9 flex flex-wrap gap-4">
            <Link
              href="/onboarding"
              className="font-[family-name:var(--font-mono)] font-bold uppercase tracking-wide text-black bg-[var(--yellow)] border-2 border-[var(--line)] px-7 py-4 hard-shadow hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-none transition-all"
            >
              Start the challenge →
            </Link>
            <Link
              href="/leaderboard"
              className="font-[family-name:var(--font-mono)] font-bold uppercase tracking-wide bg-[var(--paper)] border-2 border-[var(--line)] px-7 py-4 hard-shadow hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-none transition-all"
            >
              View leaderboard
            </Link>
          </div>
        </div>

        {/* Signature element: the exam scorecard, not a gradient stat card */}
        <ScoreboardVideo />
      </div>
    </section>
  );
}

/**
 * The animated scorecard. The WebM carries its own alpha channel so it sits
 * directly on the yellow panel; the MP4 fallback has that same yellow baked
 * in, which keeps the two indistinguishable on browsers without alpha WebM.
 */
function ScoreboardVideo() {
  return (
    <div className="border-2 border-[var(--line)] bg-[var(--yellow)] hard-shadow-lg overflow-hidden">
      <video
        autoPlay
        muted
        loop
        playsInline
        poster="/scoreboard_still.png"
        aria-label="Animated scorecard: day 6 of 7, rank 27, 742 points, a 5-day streak, and a warning that someone just passed you."
        className="block w-full aspect-video"
      >
        <source src="/scoreboard_transparent_960.webm" type="video/webm" />
        <source src="/scoreboard_yellow.mp4" type="video/mp4" />
      </video>
    </div>
  );
}

function Ticker() {
  const items = [
    "CHOOSE YOUR LEVEL", "LOCK IT", "PROVE IT", "BEAT THE B2",
    "CHOOSE YOUR LEVEL", "LOCK IT", "PROVE IT", "BEAT THE B2",
  ];
  return (
    <div className="border-b-2 border-[var(--line)] bg-[var(--ink)] text-[var(--bg)] overflow-hidden">
      <div className="flex whitespace-nowrap py-3 animate-[scroll_22s_linear_infinite]">
        {[...items, ...items].map((t, i) => (
          <span key={i} className="mx-6 font-[family-name:var(--font-mono)] font-bold text-sm uppercase tracking-widest flex items-center gap-6">
            {t} <Sparkle size={14} strokeWidth={2.5} className="text-[var(--yellow)]" fill="currentColor" />
          </span>
        ))}
      </div>
      <style>{`
        @keyframes scroll {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}

function HowItWorks() {
  const steps = [
    { n: "01", title: "Choose your level", body: "Pick A1–A2, B1, B2, or C1 based on how confident you are." },
    { n: "02", title: "Lock it in", body: "Two-step confirmation. Once locked, there's no going back." },
    { n: "03", title: "Complete daily challenges", body: "7 days, 7 different formats — from bot battles to reading sprints." },
    { n: "04", title: "Climb the leaderboard", body: "Server-scored, real-time ranking. Beat the person above you." },
  ];
  return (
    <section id="how-it-works" className="mx-auto max-w-6xl px-5 py-20 border-b-2 border-[var(--line)]">
      <SectionHeading eyebrow="Process" title="How it works" />
      <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-4 border-2 border-[var(--line)] divide-y-2 sm:divide-y-0 sm:divide-x-2 divide-[var(--line)]">
        {steps.map((s) => (
          <div key={s.n} className="p-6">
            <p className="font-[family-name:var(--font-mono)] text-[var(--muted)] text-sm">{s.n}</p>
            <p className="mt-3 font-[family-name:var(--font-display)] text-xl leading-tight normal-case">{s.title}</p>
            <p className="mt-2 text-sm text-[var(--muted)]">{s.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function Levels() {
  return (
    <section className="mx-auto max-w-6xl px-5 py-20 border-b-2 border-[var(--line)]">
      <SectionHeading eyebrow="Risk vs. reward" title="Choose your level" />
      <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-4 border-2 border-[var(--line)] divide-y-2 sm:divide-y-0 sm:divide-x-2 divide-[var(--line)]">
        {LEVEL_ORDER.map((key) => {
          const l = LEVELS[key];
          return (
            <div key={key} className="p-6 relative bg-[var(--paper)]">
              <div className="flex items-center justify-between">
                <span className="font-[family-name:var(--font-mono)] text-xs uppercase tracking-widest text-[var(--muted)]">{l.subtitle}</span>
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: l.hex }} />
              </div>
              <p className="mt-3 font-[family-name:var(--font-display)] text-4xl">{l.label}</p>
              <p className="mt-4 font-[family-name:var(--font-mono)] text-2xl font-bold" style={{ color: l.hex }}>
                {l.multiplierLabel}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function SevenDayPreview() {
  return (
    <section className="mx-auto max-w-6xl px-5 py-20 border-b-2 border-[var(--line)]">
      <SectionHeading eyebrow="Schedule" title="7 days. 7 battles." />
      <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-4 border-2 border-[var(--line)] divide-y-2 sm:divide-y-0 sm:divide-x-2 divide-[var(--line)]">
        {Object.entries(CHALLENGE_DAY_TITLES).map(([day, meta]) => (
          <div key={day} className="p-5 bg-[var(--paper)]">
            <p className="font-[family-name:var(--font-mono)] text-xs font-bold text-[var(--muted)]">DAY {day}</p>
            <ChallengeDayIcon icon={meta.icon} size={26} className="mt-3 text-[var(--blue)]" />
            <p className="mt-3 font-[family-name:var(--font-display)] text-lg leading-tight normal-case">{meta.title}</p>
            <p className="text-sm text-[var(--muted)]">{meta.subtitle}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function Prize() {
  return (
    <section className="mx-auto max-w-6xl px-5 py-20 border-b-2 border-[var(--line)]">
      <div className="border-2 border-[var(--line)] bg-[var(--yellow)] text-black p-8 sm:p-12 text-center hard-shadow-lg relative overflow-hidden">
        <div className="absolute inset-0 dot-grid" aria-hidden />
        <div className="relative mx-auto w-full max-w-xs sm:max-w-sm">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/prize-trophy.png"
            alt="Grand prize: 1 Year Ustoz AI Premium"
            className="w-full h-auto"
          />
        </div>
        <p className="relative mt-2 font-[family-name:var(--font-mono)] text-sm font-bold uppercase tracking-wide">
          Will it be you?
        </p>
      </div>
    </section>
  );
}

function LeaderboardPreview() {
  const rows = [
    { rank: 1, name: "Aziza", level: "B2" as const, points: 1842 },
    { rank: 2, name: "Jasur", level: "C1" as const, points: 1790 },
    { rank: 3, name: "Malika", level: "B2" as const, points: 1705 },
  ];
  return (
    <section id="leaderboard-preview" className="mx-auto max-w-3xl px-5 py-20 border-b-2 border-[var(--line)]">
      <SectionHeading eyebrow="Live ranking" title="Someone is ahead of you" />
      <div className="mt-10 border-2 border-[var(--line)] divide-y-2 divide-[var(--line)]">
        {rows.map((r) => (
          <div key={r.rank} className="flex items-center gap-4 p-4 font-[family-name:var(--font-mono)]">
            <span className="w-10 text-lg font-bold tabular-nums">#{r.rank}</span>
            <span className="flex-1 font-semibold">{r.name}</span>
            <span
              className="text-xs font-bold px-2 py-1 border-2 border-[var(--line)]"
              style={{ color: LEVELS[r.level].hex }}
            >
              {r.level}
            </span>
            <span className="font-bold tabular-nums">{r.points} XP</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function FinalCTA() {
  return (
    <section className="mx-auto max-w-4xl px-5 py-24 text-center">
      <h2 className="font-[family-name:var(--font-display)] text-4xl sm:text-5xl leading-tight uppercase">
        Good luck.
        <br />
        You&apos;re going to need it.
      </h2>
      <div className="mt-9">
        <Link
          href="/onboarding"
          className="inline-block font-[family-name:var(--font-mono)] font-bold uppercase tracking-wide text-black bg-[var(--yellow)] border-2 border-[var(--line)] px-8 py-4 hard-shadow hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-none transition-all"
        >
          Start the challenge →
        </Link>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t-2 border-[var(--line)] py-8 text-center font-[family-name:var(--font-mono)] text-xs uppercase tracking-widest text-[var(--muted)]">
      Choose your level. Lock it. Prove it. Beat the B2.
    </footer>
  );
}

function SectionHeading({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="flex items-end justify-between gap-4 flex-wrap">
      <div>
        <p className="font-[family-name:var(--font-mono)] text-xs font-bold uppercase tracking-[0.3em] text-[var(--muted)]">
          {eyebrow}
        </p>
        <h2 className="mt-2 font-[family-name:var(--font-display)] text-3xl sm:text-4xl uppercase">{title}</h2>
      </div>
    </div>
  );
}
