import { db } from "./supabase";
import { addDays } from "./dates";
import type {
  Dose,
  DoseLog,
  Medicine,
  Pet,
  PetMedicationFull,
  Settings,
  Slot,
} from "./types";

const SLOT_ORDER: Record<Slot, number> = { AM: 0, PM: 1 };

export async function getPets(includeArchived = false): Promise<Pet[]> {
  let q = db().from("pets").select("id,name,kind,emoji,archived").order("created_at");
  if (!includeArchived) q = q.eq("archived", false);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as Pet[];
}

export async function getPet(id: string): Promise<Pet | null> {
  const { data, error } = await db()
    .from("pets")
    .select("id,name,kind,emoji,archived")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data as Pet | null) ?? null;
}

export async function getMedicines(): Promise<Medicine[]> {
  const { data, error } = await db().from("medicines").select("id,name,description").order("name");
  if (error) throw error;
  return (data ?? []) as Medicine[];
}

export async function getSettings(): Promise<Settings> {
  const { data } = await db()
    .from("settings")
    .select("am_time,pm_time,reminders_enabled")
    .eq("id", 1)
    .maybeSingle();
  return (data as Settings | null) ?? { am_time: "08:00", pm_time: "20:00", reminders_enabled: true };
}

type MedRow = {
  id: string;
  pet_id: string;
  medicine_id: string;
  amount: string;
  slots: Slot[];
  start_date: string;
  end_date: string | null;
  pets: { id: string; name: string; emoji: string; archived: boolean };
  medicines: Medicine;
};

/** All medications (optionally for one pet) for pets that are not archived. */
export async function getMedications(petId?: string): Promise<PetMedicationFull[]> {
  let q = db()
    .from("pet_medications")
    .select(
      "id,pet_id,medicine_id,amount,slots,start_date,end_date,pets!inner(id,name,emoji,archived),medicines!inner(id,name,description)",
    )
    .eq("pets.archived", false)
    .order("created_at");
  if (petId) q = q.eq("pet_id", petId);
  const { data, error } = await q;
  if (error) throw error;
  return ((data ?? []) as unknown as MedRow[]).map((r) => ({
    id: r.id,
    pet_id: r.pet_id,
    medicine_id: r.medicine_id,
    amount: r.amount,
    slots: r.slots,
    start_date: r.start_date,
    end_date: r.end_date,
    pet: r.pets,
    medicine: r.medicines,
  }));
}

export async function getLogs(from: string, to: string): Promise<DoseLog[]> {
  const { data, error } = await db()
    .from("dose_logs")
    .select("pet_medication_id,date,slot,status,remark")
    .gte("date", from)
    .lte("date", to);
  if (error) throw error;
  return (data ?? []) as DoseLog[];
}

/** Build the doses scheduled for a date by combining medications and logs. */
export function buildDoses(meds: PetMedicationFull[], logs: DoseLog[], date: string): Dose[] {
  const logMap = new Map<string, DoseLog>();
  for (const l of logs) {
    if (l.date === date) logMap.set(`${l.pet_medication_id}:${l.slot}`, l);
  }
  const out: Dose[] = [];
  for (const m of meds) {
    if (m.start_date > date) continue;
    if (m.end_date && m.end_date < date) continue;
    for (const slot of m.slots) {
      const log = logMap.get(`${m.id}:${slot}`);
      out.push({
        key: `${m.id}:${slot}:${date}`,
        petMedicationId: m.id,
        petId: m.pet.id,
        petName: m.pet.name,
        petEmoji: m.pet.emoji,
        medicineName: m.medicine.name,
        description: m.medicine.description,
        amount: m.amount,
        slot,
        date,
        status: log?.status ?? null,
        remark: log?.remark ?? "",
      });
    }
  }
  out.sort(
    (a, b) =>
      SLOT_ORDER[a.slot] - SLOT_ORDER[b.slot] ||
      a.petName.localeCompare(b.petName) ||
      a.medicineName.localeCompare(b.medicineName),
  );
  return out;
}

export async function getDosesForDate(date: string, petId?: string): Promise<Dose[]> {
  const [meds, logs] = await Promise.all([getMedications(petId), getLogs(date, date)]);
  return buildDoses(meds, logs, date);
}

/** Keep only one pet's medications (when a pet is picked). */
export function forPet(meds: PetMedicationFull[], petId?: string): PetMedicationFull[] {
  return petId ? meds.filter((m) => m.pet_id === petId) : meds;
}

/** Group already-fetched medications and logs into days, newest first. */
export function buildRange(
  meds: PetMedicationFull[],
  logs: DoseLog[],
  from: string,
  to: string,
): { date: string; doses: Dose[] }[] {
  const days: { date: string; doses: Dose[] }[] = [];
  for (let d = to; d >= from; d = addDays(d, -1)) {
    days.push({ date: d, doses: buildDoses(meds, logs, d) });
  }
  return days;
}

/** Doses for each date in [from, to], newest first. */
export async function getDosesForRange(
  from: string,
  to: string,
  petId?: string,
): Promise<{ date: string; doses: Dose[] }[]> {
  const [meds, logs] = await Promise.all([getMedications(petId), getLogs(from, to)]);
  return buildRange(meds, logs, from, to);
}
