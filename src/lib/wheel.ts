/**
 * Wheel of Fortune prize table — shared between the spin API (which picks
 * the winning index server-side) and the frontend (which needs the exact
 * same segment order/colors to render the wheel and animate to the right
 * spot). No secrets here — the prize table itself is fine to expose,
 * only the actual spin OUTCOME is decided server-side.
 */
export interface WheelPrize {
  label: string;
  points: number;
  weight: number; // relative probability
  color: string; // CSS var name, e.g. "--yellow"
}

export const WHEEL_PRIZES: WheelPrize[] = [
  { label: "10 XP", points: 10, weight: 20, color: "--paper" },
  { label: "25 XP", points: 25, weight: 18, color: "--blue" },
  { label: "5 XP", points: 5, weight: 20, color: "--paper" },
  { label: "50 XP", points: 50, weight: 12, color: "--yellow" },
  { label: "15 XP", points: 15, weight: 18, color: "--blue" },
  { label: "100 XP", points: 100, weight: 4, color: "--red" },
  { label: "20 XP", points: 20, weight: 18, color: "--paper" },
  { label: "JACKPOT 250", points: 250, weight: 1, color: "--purple" },
];

export function pickWeightedPrizeIndex(): number {
  const total = WHEEL_PRIZES.reduce((sum, p) => sum + p.weight, 0);
  let roll = Math.random() * total;
  for (let i = 0; i < WHEEL_PRIZES.length; i++) {
    roll -= WHEEL_PRIZES[i].weight;
    if (roll <= 0) return i;
  }
  return WHEEL_PRIZES.length - 1;
}
