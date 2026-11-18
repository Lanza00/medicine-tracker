const PALETTE = [
  "bg-violet-100 text-violet-700",
  "bg-pink-100 text-pink-700",
  "bg-amber-100 text-amber-800",
  "bg-teal-100 text-teal-700",
  "bg-sky-100 text-sky-700",
  "bg-orange-100 text-orange-700",
];

/** Stable colour for a pet based on its id. */
export function petColor(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
}
