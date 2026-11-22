"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/supabase";
import { nowParts, isDateKey, addDays } from "@/lib/dates";
import { sendPushToAll } from "@/lib/push";
import { DEMO_DISABLED, isDemo } from "@/lib/demoMode";
import * as demo from "@/lib/demo";
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
    if (isDemo()) {
      await demo.demoSetDose(petMedicationId, date, slot, status, remark);
      refresh();
      return { ok: true };
    }
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

const PHOTO_BUCKET = "pet-photos";
const PHOTO_TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
const PHOTO_MAX_BYTES = 1024 * 1024; // the app shrinks photos to ~400px first, so this is plenty

/** Pull a valid photo out of a form, or null if none was sent. Throws on a bad file. */
function photoFrom(formData: FormData): File | null {
  const f = formData.get("photo");
  if (!f || typeof f === "string" || f.size === 0) return null;
  if (!PHOTO_TYPES[f.type]) throw new Error("The photo must be a JPG, PNG or WebP image.");
  if (f.size > PHOTO_MAX_BYTES) throw new Error("That photo is too big (max 1 MB).");
  return f;
}

/** Upload a pet photo to Supabase Storage and return its public URL. */
async function uploadPhoto(petId: string, file: File): Promise<string> {
  // A new random name each time, so a changed photo never shows the old cached one.
  const path = `${petId}/${crypto.randomUUID()}.${PHOTO_TYPES[file.type]}`;
  const { error } = await db()
    .storage.from(PHOTO_BUCKET)
    .upload(path, file, { contentType: file.type, cacheControl: "31536000", upsert: false });
  if (error) {
    if (/bucket not found/i.test(error.message)) {
      throw new Error("Photo storage isn't set up yet. Run supabase/migrations/20261122_pet_photos.sql in Supabase.");
    }
    throw error;
  }
  return db().storage.from(PHOTO_BUCKET).getPublicUrl(path).data.publicUrl;
}

/** Delete an uploaded photo by its public URL. Best effort: a leftover file is harmless. */
async function deletePhoto(url: string | null | undefined) {
  if (!url) return;
  const marker = `/object/public/${PHOTO_BUCKET}/`;
  const i = url.indexOf(marker);
  if (i < 0) return;
  await db().storage.from(PHOTO_BUCKET).remove([decodeURIComponent(url.slice(i + marker.length))]);
}

export async function addPet(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const emoji = String(formData.get("emoji") ?? "🐱") || "🐱";
  if (!name) redirect("/pets");
  if (isDemo()) {
    const id = await demo.demoAddPet(name, emoji); // photos aren't kept in the demo
    refresh();
    redirect(`/pets/${id}`);
  }
  const photo = photoFrom(formData);
  const { data, error } = await db()
    .from("pets")
    .insert({ name: name.slice(0, 40), emoji })
    .select("id")
    .single();
  if (error) throw error;
  if (photo) {
    // The pet is saved even if the photo fails; it can be added again from the pet's page.
    try {
      const url = await uploadPhoto(data.id, photo);
      await db().from("pets").update({ photo_url: url }).eq("id", data.id);
    } catch (e) {
      console.error("Pet photo upload failed", e);
    }
  }
  refresh();
  redirect(`/pets/${data.id}`);
}

/**
 * Edit a pet: name, icon, and optionally a new "photo" file or "removePhoto"="1".
 * Returns a result instead of redirecting, so the form can show errors in place.
 */
export async function updatePet(petId: string, formData: FormData): Promise<Result> {
  try {
    const name = String(formData.get("name") ?? "").trim();
    const emoji = String(formData.get("emoji") ?? "").trim() || "🐱";
    if (!name) return { ok: false, error: "Enter a name." };
    if (isDemo()) {
      await demo.demoUpdatePet(petId, name, emoji); // photos aren't kept in the demo
      refresh();
      return { ok: true };
    }
    const photo = photoFrom(formData);
    const removePhoto = formData.get("removePhoto") === "1";
    const { data: pet, error: readErr } = await db().from("pets").select("photo_url").eq("id", petId).maybeSingle();
    if (readErr) throw readErr;
    if (!pet) return { ok: false, error: "Pet not found." };
    const oldUrl = (pet as { photo_url: string | null }).photo_url;

    const changes: { name: string; emoji: string; photo_url?: string | null } = { name: name.slice(0, 40), emoji };
    if (photo) changes.photo_url = await uploadPhoto(petId, photo);
    else if (removePhoto) changes.photo_url = null;

    const { error } = await db().from("pets").update(changes).eq("id", petId);
    if (error) throw error;
    if ("photo_url" in changes && oldUrl && oldUrl !== changes.photo_url) {
      await deletePhoto(oldUrl).catch(() => {});
    }
    refresh();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

/** Set or replace a pet's photo. The form must hold a "photo" file. */
export async function setPetPhoto(petId: string, formData: FormData): Promise<Result> {
  if (isDemo()) return { ok: false, error: DEMO_DISABLED };
  try {
    const photo = photoFrom(formData);
    if (!photo) return { ok: false, error: "Pick a photo first." };
    const { data: pet, error: readErr } = await db().from("pets").select("photo_url").eq("id", petId).maybeSingle();
    if (readErr) throw readErr;
    if (!pet) return { ok: false, error: "Pet not found." };
    const url = await uploadPhoto(petId, photo);
    const { error } = await db().from("pets").update({ photo_url: url }).eq("id", petId);
    if (error) throw error;
    await deletePhoto((pet as { photo_url: string | null }).photo_url).catch(() => {});
    refresh();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

/** Remove a pet's photo and go back to showing its icon. */
export async function removePetPhoto(petId: string): Promise<Result> {
  if (isDemo()) return { ok: false, error: DEMO_DISABLED };
  try {
    const { data: pet, error: readErr } = await db().from("pets").select("photo_url").eq("id", petId).maybeSingle();
    if (readErr) throw readErr;
    const { error } = await db().from("pets").update({ photo_url: null }).eq("id", petId);
    if (error) throw error;
    await deletePhoto((pet as { photo_url: string | null } | null)?.photo_url).catch(() => {});
    refresh();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function archivePet(petId: string) {
  if (isDemo()) {
    await demo.demoArchivePet(petId);
    refresh();
    redirect("/pets");
  }
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

    if (isDemo()) {
      await demo.demoAddMedication({ ...input, slots });
      refresh();
      return { ok: true };
    }

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

export type UpdateMedicationInput = {
  amount: string;
  slots: Slot[];
  startDate: string;
  endDate: string | null;
};

/** Edit a pet's medicine: amount, AM/PM, start date and end date. Logged doses are kept. */
export async function updateMedication(id: string, input: UpdateMedicationInput): Promise<Result> {
  try {
    const slots = input.slots.filter((s) => s === "AM" || s === "PM");
    if (slots.length === 0) return { ok: false, error: "Pick at least one time (AM or PM)." };
    if (!isDateKey(input.startDate)) return { ok: false, error: "Start date is invalid." };
    if (input.endDate && (!isDateKey(input.endDate) || input.endDate < input.startDate))
      return { ok: false, error: "End date must be on or after the start date." };

    if (isDemo()) {
      await demo.demoUpdateMedication(id, { ...input, slots });
      refresh();
      return { ok: true };
    }

    const { error } = await db()
      .from("pet_medications")
      .update({
        amount: input.amount.trim().slice(0, 40) || "1",
        slots,
        start_date: input.startDate,
        end_date: input.endDate || null,
      })
      .eq("id", id);
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
    if (isDemo()) {
      await demo.demoStopMedication(id);
      refresh();
      return { ok: true };
    }
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
    if (isDemo()) {
      await demo.demoDeleteMedication(id);
      refresh();
      return { ok: true };
    }
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
    if (isDemo()) {
      await demo.demoSaveSettings({ am_time: amTime, pm_time: pmTime, reminders_enabled: enabled });
      refresh();
      return { ok: true };
    }
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
  if (isDemo()) return { ok: false, error: DEMO_DISABLED };
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
  if (isDemo()) return { ok: true };
  try {
    const { error } = await db().from("push_subscriptions").delete().eq("endpoint", endpoint);
    if (error) throw error;
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function sendTestPush(): Promise<Result & { sent?: number }> {
  if (isDemo()) return { ok: false, error: DEMO_DISABLED };
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

/* ---------- Demo ---------- */

/** Demo only: throw away this visitor's changes and go back to the sample data. */
export async function resetDemoData(): Promise<void> {
  if (!isDemo()) return;
  await demo.resetDemo();
  refresh();
  redirect("/");
}
