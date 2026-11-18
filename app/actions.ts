"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/supabase";
import { nowParts, isDateKey, addDays } from "@/lib/dates";
import { sendPushToAll } from "@/lib/push";
import type { DoseStatus, Slot } from "@/lib/types";

type Result = { ok: true } | { ok: false; error: string };

function refresh() {
  revalidatePath("/", "layout");
}

function fail(e: unknown): Result {
  const msg = e instanceof Error ? e.message : typeof e === "object" && e && "message" in e ? String((e as { message: unknown }).message) : "Something went wrong";
  return { ok: false, error: msg };
}

/* ---------- Doses ---------- */

/** Set a dose to taken / skipped, or clear it (status = null). */
export async function setDose(
  petMedicationId: string,
  date: string,
  slot: Slot,
  status: DoseStatus | null,
  remark: string,
): Promise<Result> {
  try {
    if (!isDateKey(date) || (slot !== "AM" && slot !== "PM")) return { ok: false, error: "Invalid dose" };
    if (status === null) {
      const { error } = await db()
        .from("dose_logs")
        .delete()
        .eq("pet_medication_id", petMedicationId)
        .eq("date", date)
        .eq("slot", slot);
      if (error) throw error;
    } else {
      const { error } = await db()
        .from("dose_logs")
        .upsert(
          {
            pet_medication_id: petMedicationId,
            date,
            slot,
            status,
            remark: remark.trim().slice(0, 300),
            logged_at: new Date().toISOString(),
          },
          { onConflict: "pet_medication_id,date,slot" },
        );
      if (error) throw error;
    }
    refresh();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

/* ---------- Pets ---------- */

export async function addPet(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const emoji = String(formData.get("emoji") ?? "🐱") || "🐱";
  if (!name) redirect("/pets");
  const { data, error } = await db()
    .from("pets")
    .insert({ name: name.slice(0, 40), emoji })
    .select("id")
    .single();
  if (error) throw error;
  refresh();
  redirect(`/pets/${data.id}`);
}

export async function archivePet(petId: string) {
  const { error } = await db().from("pets").update({ archived: true }).eq("id", petId);
  if (error) throw error;
  refresh();
  redirect("/pets");
}

/* ---------- Medications ---------- */

export type AddMedicationInput = {
  petId: string;
  medicineId: string | null; // existing medicine, or null to create
  newName: string;
  newDescription: string;
  amount: string;
  slots: Slot[];
  startDate: string;
  endDate: string | null;
};

export async function addMedication(input: AddMedicationInput): Promise<Result> {
  try {
    const slots = input.slots.filter((s) => s === "AM" || s === "PM");
    if (slots.length === 0) return { ok: false, error: "Pick at least one time (AM or PM)." };
    if (!isDateKey(input.startDate)) return { ok: false, error: "Start date is invalid." };
    if (input.endDate && (!isDateKey(input.endDate) || input.endDate < input.startDate))
      return { ok: false, error: "End date must be on or after the start date." };

    let medicineId = input.medicineId;
    if (!medicineId) {
      const name = input.newName.trim();
      if (!name) return { ok: false, error: "Enter the medicine name." };
      // Reuse an existing medicine with the same name (case-insensitive).
      const { data: existing } = await db()
        .from("medicines")
        .select("id")
        .ilike("name", name.replace(/[%_]/g, "\\$&"))
        .maybeSingle();
      if (existing) {
        medicineId = existing.id as string;
      } else {
        const { data, error } = await db()
          .from("medicines")
          .insert({ name: name.slice(0, 80), description: input.newDescription.trim().slice(0, 120) })
          .select("id")
          .single();
        if (error) throw error;
        medicineId = data.id as string;
      }
    }

    const { error } = await db().from("pet_medications").insert({
      pet_id: input.petId,
      medicine_id: medicineId,
      amount: input.amount.trim().slice(0, 40) || "1",
      slots,
      start_date: input.startDate,
      end_date: input.endDate || null,
    });
    if (error) throw error;
    refresh();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

/** Stop a medication from today onward (history is kept). */
export async function stopMedication(id: string): Promise<Result> {
  try {
    const today = nowParts().date;
    const { data } = await db().from("pet_medications").select("start_date").eq("id", id).maybeSingle();
    // If it never started yet, stopping means the day before it would have begun.
    const start = (data as { start_date: string } | null)?.start_date ?? today;
    const end = start > today ? addDays(start, -1) : today;
    const { error } = await db().from("pet_medications").update({ end_date: end }).eq("id", id);
    if (error) throw error;
    refresh();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

/** Delete a medication and all its logged history. */
export async function deleteMedication(id: string): Promise<Result> {
  try {
    const { error } = await db().from("pet_medications").delete().eq("id", id);
    if (error) throw error;
    refresh();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

/* ---------- Settings & push ---------- */

export async function saveSettings(amTime: string, pmTime: string, enabled: boolean): Promise<Result> {
  try {
    const ok = /^\d{2}:\d{2}$/;
    if (!ok.test(amTime) || !ok.test(pmTime)) return { ok: false, error: "Invalid time." };
    const { error } = await db()
      .from("settings")
      .upsert({ id: 1, am_time: amTime, pm_time: pmTime, reminders_enabled: enabled });
    if (error) throw error;
    refresh();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function savePushSubscription(sub: {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}): Promise<Result> {
  try {
    const { error } = await db()
      .from("push_subscriptions")
      .upsert(
        { endpoint: sub.endpoint, p256dh: sub.keys.p256dh, auth: sub.keys.auth },
        { onConflict: "endpoint" },
      );
    if (error) throw error;
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function removePushSubscription(endpoint: string): Promise<Result> {
  try {
    const { error } = await db().from("push_subscriptions").delete().eq("endpoint", endpoint);
    if (error) throw error;
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function sendTestPush(): Promise<Result & { sent?: number }> {
  try {
    const r = await sendPushToAll({
      title: "💊 Test reminder",
      body: "Notifications are working. You will get reminders when a dose is due.",
      tag: "test",
      url: "/",
    });
    if (!r.configured) return { ok: false, error: "Push keys (VAPID) are not set on the server yet." };
    if (r.sent === 0) return { ok: false, error: "No device is subscribed yet. Turn on notifications first." };
    return { ok: true, sent: r.sent };
  } catch (e) {
    return fail(e);
  }
}
