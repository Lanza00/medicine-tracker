import { db } from "@/lib/supabase";
import { isDemo } from "@/lib/demoMode";
import { getDosesForDate, getSettings } from "@/lib/data";
import { hmToMinutes, nowParts } from "@/lib/dates";
import { sendPushToAll } from "@/lib/push";
import type { Dose, Slot } from "@/lib/types";

export const dynamic = "force-dynamic";

const WINDOW_MIN = 180; // stop reminding 3 hours after the slot time
const NUDGE_GAP_MIN = 30; // minutes between reminders
const MAX_REMINDERS = 2; // per slot per day

function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = req.headers.get("authorization");
  if (header === `Bearer ${secret}`) return true;
  return new URL(req.url).searchParams.get("secret") === secret;
}

function summarize(doses: Dose[]): string {
  const byPet = new Map<string, string[]>();
  for (const d of doses) {
    const list = byPet.get(d.petName) ?? [];
    list.push(d.medicineName);
    byPet.set(d.petName, list);
  }
  return [...byPet.entries()].map(([pet, meds]) => `${pet}: ${meds.join(", ")}`).join(" · ");
}

/**
 * Call this every ~5 minutes (cron-job.org or Supabase pg_cron).
 * Sends a push if a slot's time has passed and doses are still not ticked.
 */
export async function GET(req: Request) {
  if (isDemo()) return Response.json({ skipped: "demo mode" }, { status: 404 });
  if (!authorized(req)) return Response.json({ error: "unauthorized" }, { status: 401 });

  const settings = await getSettings();
  if (!settings.reminders_enabled) return Response.json({ skipped: "reminders disabled" });

  const { date, hm } = nowParts();
  const nowMin = hmToMinutes(hm);
  const doses = await getDosesForDate(date);
  const results: Record<string, unknown> = {};

  for (const slot of ["AM", "PM"] as Slot[]) {
    const slotMin = hmToMinutes(slot === "AM" ? settings.am_time : settings.pm_time);
    if (nowMin < slotMin || nowMin >= slotMin + WINDOW_MIN) {
      results[slot] = "outside window";
      continue;
    }
    const pending = doses.filter((d) => d.slot === slot && !d.status);
    if (pending.length === 0) {
      results[slot] = "nothing pending";
      continue;
    }

    const { data: state } = await db()
      .from("reminder_state")
      .select("sent_count,last_sent_at")
      .eq("date", date)
      .eq("slot", slot)
      .maybeSingle();
    const sentCount = (state?.sent_count as number | undefined) ?? 0;
    const lastSent = state?.last_sent_at ? new Date(state.last_sent_at as string).getTime() : 0;

    if (sentCount >= MAX_REMINDERS) {
      results[slot] = "max reminders reached";
      continue;
    }
    if (lastSent && Date.now() - lastSent < NUDGE_GAP_MIN * 60_000) {
      results[slot] = "too soon";
      continue;
    }

    const label = slot === "AM" ? "Morning" : "Evening";
    const r = await sendPushToAll({
      title: sentCount === 0 ? `💊 ${label} medicine time` : `⏰ Still pending: ${label} medicine`,
      body: summarize(pending),
      tag: `dose-${date}-${slot}`,
      url: "/",
    });

    if (r.sent > 0) {
      await db().from("reminder_state").upsert({
        date,
        slot,
        sent_count: sentCount + 1,
        last_sent_at: new Date().toISOString(),
      });
    }
    results[slot] = { pending: pending.length, ...r };
  }

  return Response.json({ date, time: hm, results });
}
