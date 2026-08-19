"use client";

import { useState } from "react";
import { WHEEL_PRIZES } from "@/lib/wheel";
import { Button } from "@/components/ui/button";

const SEGMENT_DEG = 360 / WHEEL_PRIZES.length;

function polar(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function wedgePath(startAngle: number, endAngle: number) {
  const start = polar(50, 50, 48, endAngle);
  const end = polar(50, 50, 48, startAngle);
  const largeArc = endAngle - startAngle <= 180 ? 0 : 1;
  return `M 50 50 L ${start.x} ${start.y} A 48 48 0 ${largeArc} 0 ${end.x} ${end.y} Z`;
}

export function DailyWheel({
  canSpin,
  onSpun,
}: {
  canSpin: boolean;
  onSpun: (points: number, label: string) => void;
}) {
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function spin() {
    setSpinning(true);
    setError(null);
    const res = await fetch("/api/wheel/spin", { method: "POST" });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setSpinning(false);
      setError(d.error ?? "Could not spin the wheel.");
      return;
    }
    const { prizeIndex, points, label } = await res.json();
    const centerAngle = prizeIndex * SEGMENT_DEG + SEGMENT_DEG / 2;
    const target = 1800 + (360 - centerAngle);
    setRotation(target);
    setTimeout(() => {
      setSpinning(false);
      onSpun(points, label);
    }, 3200);
  }

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-48 h-48">
        <div
          className="absolute left-1/2 -top-2 -translate-x-1/2 z-10 w-0 h-0"
          style={{
            borderLeft: "10px solid transparent",
            borderRight: "10px solid transparent",
            borderTop: "16px solid var(--ink)",
          }}
        />
        <svg
          viewBox="0 0 100 100"
          className="w-full h-full border-2 border-[var(--line)] rounded-full"
          style={{
            transform: `rotate(${rotation}deg)`,
            transition: spinning ? "transform 3.2s cubic-bezier(0.15, 0.65, 0.25, 1)" : "none",
          }}
        >
          {WHEEL_PRIZES.map((prize, i) => {
            const start = i * SEGMENT_DEG;
            const end = start + SEGMENT_DEG;
            const mid = start + SEGMENT_DEG / 2;
            const labelPos = polar(50, 50, 30, mid);
            return (
              <g key={i}>
                <path
                  d={wedgePath(start, end)}
                  fill={`var(${prize.color})`}
                  stroke="var(--line)"
                  strokeWidth={1}
                />
                <text
                  x={labelPos.x}
                  y={labelPos.y}
                  fontSize={5.5}
                  fontWeight={700}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="var(--ink)"
                  transform={`rotate(${mid}, ${labelPos.x}, ${labelPos.y})`}
                >
                  {prize.label}
                </text>
              </g>
            );
          })}
          <circle cx={50} cy={50} r={4} fill="var(--ink)" />
        </svg>
      </div>

      <Button className="mt-5" onClick={spin} disabled={!canSpin || spinning}>
        {spinning ? "Spinning…" : canSpin ? "Spin the wheel" : "Come back tomorrow"}
      </Button>
      {error && <p className="mt-2 text-xs text-[var(--red)] font-[family-name:var(--font-mono)]">{error}</p>}
    </div>
  );
}
