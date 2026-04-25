// "5 min ago" / "2 hr ago" / etc. using stdlib Intl.RelativeTimeFormat.

const DIVISIONS: Array<{ amount: number; unit: Intl.RelativeTimeFormatUnit }> = [
  { amount: 60, unit: "second" },
  { amount: 60, unit: "minute" },
  { amount: 24, unit: "hour" },
  { amount: 7, unit: "day" },
  { amount: 4.34524, unit: "week" },
  { amount: 12, unit: "month" },
  { amount: Number.POSITIVE_INFINITY, unit: "year" },
];

const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

export function formatRelativeTime(iso: string): string {
  const past = new Date(iso).getTime();
  if (Number.isNaN(past)) return iso;
  let diff = (past - Date.now()) / 1000;
  for (const division of DIVISIONS) {
    if (Math.abs(diff) < division.amount) {
      return formatter.format(Math.round(diff), division.unit);
    }
    diff /= division.amount;
  }
  return iso;
}
