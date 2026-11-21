/**
 * Demo mode: set NEXT_PUBLIC_DEMO_MODE=1 on a separate deployment (for a portfolio).
 * The app then uses made-up sample data saved in the visitor's own browser (a cookie),
 * never touches Supabase and never sends notifications.
 * Safe to import from client components.
 */
export function isDemo(): boolean {
  return process.env.NEXT_PUBLIC_DEMO_MODE === "1";
}

export const DEMO_DISABLED = "This is turned off in the demo.";
