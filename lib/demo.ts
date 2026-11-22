import { cookies } from "next/headers";
import { addDays, nowParts } from "./dates";
import type { DoseLog, DoseStatus, Medicine, Pet, PetMedication, PetMedicationFull, Settings, Slot } from "./types";

/**
 * Demo data store (only used when NEXT_PUBLIC_DEMO_MODE=1).
 *
 * Each visitor starts from the same made-up sample pets. Their changes are saved in their own
 * browser as cookies, so visitors never see each other's edits and nothing reaches a database.
 * Doses for past days are filled in automatically so History looks lived-in.
 */

type DemoMed = PetMedication & { seed?: 1 };
type Override = [DoseStatus, string] | 0; // 0 = visitor cleared a dose that was auto-filled

type DemoState = {
  v: 1;
  pets: Pet[];
  medicines: Medicine[];
  meds: DemoMed[];
  logs: Record<string, Override>; // key: `${medId}|${date}|${slot}`, newest last
  settings: Settings;
};

const COOKIE = "mt_demo";
const CHUNK = 3800; // bytes per cookie (browsers allow ~4096)
const MAX_CHUNKS = 3;
const MAX_AGE = 60 * 60 * 24 * 7; // a visitor's demo data resets after a week

export const DEMO_LIMITS = { pets: 6, medicines: 10, meds: 10, logs: 60 };

/* ---------- Sample data ---------- */

const P = {
  milo: "00000000-0000-4000-8000-000000000001",
  coco: "00000000-0000-4000-8000-000000000002",
  oreo: "00000000-0000-4000-8000-000000000003",
};
const M = {
  amox: "00000000-0000-4000-8000-000000000011",
  melox: "00000000-0000-4000-8000-000000000012",
  omega: "00000000-0000-4000-8000-000000000013",
  probio: "00000000-0000-4000-8000-000000000014",
};

function seedState(today: string): DemoState {
  return {
    v: 1,
    pets: [
      { id: P.milo, name: "Milo", kind: "cat", emoji: "🐱", archived: false },
      { id: P.coco, name: "Coco", kind: "dog", emoji: "🐶", archived: false },
      { id: P.oreo, name: "Oreo", kind: "rabbit", emoji: "🐰", archived: false },
    ],
    medicines: [
      { id: M.amox, name: "Amoxicillin", description: "Antibiotic" },
      { id: M.melox, name: "Meloxicam", description: "Pain relief" },
      { id: M.omega, name: "Omega-3", description: "Skin and coat" },
      { id: M.probio, name: "Probiotic", description: "Gut health" },
    ],
    meds: [
      med("00000000-0000-4000-8000-000000000021", P.milo, M.amox, "1/2 tab", ["AM", "PM"], addDays(today, -6), addDays(today, 7)),
      med("00000000-0000-4000-8000-000000000022", P.milo, M.omega, "1 pump", ["AM"], addDays(today, -30), null),
      med("00000000-0000-4000-8000-000000000023", P.coco, M.melox, "0.5 ml", ["PM"], addDays(today, -20), null),
      med("00000000-0000-4000-8000-000000000024", P.coco, M.probio, "1 sachet", ["AM"], addDays(today, -30), null),
      med("00000000-0000-4000-8000-000000000025", P.oreo, M.probio, "1/4 sachet", ["AM", "PM"], addDays(today, -10), null),
      // A finished course, so the pet page shows past medicine too.
      med("00000000-0000-4000-8000-000000000026", P.oreo, M.melox, "0.1 ml", ["AM"], addDays(today, -30), addDays(today, -15)),
    ],
    logs: {},
    settings: { am_time: "08:00", pm_time: "20:00", reminders_enabled: true },
  };
}

function med(
  id: string,
  pet_id: string,
  medicine_id: string,
  amount: string,
  slots: Slot[],
  start_date: string,
  end_date: string | null,
): DemoMed {
  return { id, pet_id, medicine_id, amount, slots, start_date, end_date, seed: 1 };
}

/** Small stable hash so auto-filled history is the same on every visit. */
function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

const SKIP_REASONS = ["Vomited, vet said skip", "Refused, will retry later", "Ran out, refill tomorrow"];

/** The auto-filled log for a sample medicine on a past day (most are given, a few skipped). */
function autoLog(m: DemoMed, date: string, slot: Slot, today: string): Override | undefined {
  if (!m.seed || date >= today) return undefined;
  const h = hash(`${m.id}|${date}|${slot}`);
  if (h % 23 === 0) return ["skipped", SKIP_REASONS[h % SKIP_REASONS.length]];
  if (h % 31 === 0) return undefined; // a missed dose now and then
  return ["taken", h % 9 === 0 ? "Mixed in wet food" : ""];
}

/* ---------- Cookie storage ---------- */

async function read(): Promise<DemoState> {
  const today = nowParts().date;
  const jar = await cookies();
  let raw = "";
  for (let i = 0; i < MAX_CHUNKS; i++) {
    const part = jar.get(`${COOKIE}${i}`)?.value;
    if (!part) break;
    raw += part;
  }
  if (!raw) return seedState(today);
  try {
    const s = JSON.parse(Buffer.from(raw, "base64url").toString("utf8")) as DemoState;
    if (s?.v !== 1 || !Array.isArray(s.pets)) return seedState(today);
    return s;
  } catch {
    return seedState(today);
  }
}

async function write(s: DemoState): Promise<void> {
  // Keep the newest dose changes if the data grows too big for the cookies.
  const keys = Object.keys(s.logs);
  if (keys.length > DEMO_LIMITS.logs) {
    for (const k of keys.slice(0, keys.length - DEMO_LIMITS.logs)) delete s.logs[k];
  }
  let encoded = Buffer.from(JSON.stringify(s), "utf8").toString("base64url");
  while (encoded.length > CHUNK * MAX_CHUNKS && Object.keys(s.logs).length > 0) {
    delete s.logs[Object.keys(s.logs)[0]];
    encoded = Buffer.from(JSON.stringify(s), "utf8").toString("base64url");
  }
  if (encoded.length > CHUNK * MAX_CHUNKS) throw new Error("The demo is full. Tap “Reset demo” to start again.");

  const jar = await cookies();
  for (let i = 0; i < MAX_CHUNKS; i++) {
    const part = encoded.slice(i * CHUNK, (i + 1) * CHUNK);
    const name = `${COOKIE}${i}`;
    if (part) {
      jar.set(name, part, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: MAX_AGE });
    } else if (jar.get(name)) {
      jar.delete(name);
    }
  }
}

export async function resetDemo(): Promise<void> {
  const jar = await cookies();
  for (let i = 0; i < MAX_CHUNKS; i++) jar.delete(`${COOKIE}${i}`);
}

/* ---------- Reads (same shapes as lib/data.ts) ---------- */

export async function demoGetPets(includeArchived = false): Promise<Pet[]> {
  const s = await read();
  return s.pets.filter((p) => includeArchived || !p.archived);
}

export async function demoGetPet(id: string): Promise<Pet | null> {
  const s = await read();
  return s.pets.find((p) => p.id === id) ?? null;
}

export async function demoGetMedicines(): Promise<Medicine[]> {
  const s = await read();
  return [...s.medicines].sort((a, b) => a.name.localeCompare(b.name));
}

export async function demoGetSettings(): Promise<Settings> {
  return (await read()).settings;
}

export async function demoGetMedications(petId?: string): Promise<PetMedicationFull[]> {
  const s = await read();
  const out: PetMedicationFull[] = [];
  for (const m of s.meds) {
    if (petId && m.pet_id !== petId) continue;
    const pet = s.pets.find((p) => p.id === m.pet_id);
    const medicine = s.medicines.find((x) => x.id === m.medicine_id);
    if (!pet || pet.archived || !medicine) continue;
    out.push({
      id: m.id,
      pet_id: m.pet_id,
      medicine_id: m.medicine_id,
      amount: m.amount,
      slots: m.slots,
      start_date: m.start_date,
      end_date: m.end_date,
      pet: { id: pet.id, name: pet.name, emoji: pet.emoji, photo_url: null, archived: pet.archived },
      medicine,
    });
  }
  return out;
}

export async function demoGetLogs(from: string, to: string): Promise<DoseLog[]> {
  const s = await read();
  const today = nowParts().date;
  const out: DoseLog[] = [];
  for (const m of s.meds) {
    const start = m.start_date > from ? m.start_date : from;
    const endLimit = m.end_date && m.end_date < to ? m.end_date : to;
    for (let d = start; d <= endLimit; d = addDays(d, 1)) {
      for (const slot of m.slots) {
        const key = `${m.id}|${d}|${slot}`;
        const o = key in s.logs ? s.logs[key] : autoLog(m, d, slot, today);
        if (o) out.push({ pet_medication_id: m.id, date: d, slot, status: o[0], remark: o[1] });
      }
    }
  }
  return out;
}

/* ---------- Writes (same rules as app/actions.ts) ---------- */

export async function demoSetDose(
  petMedicationId: string,
  date: string,
  slot: Slot,
  status: DoseStatus | null,
  remark: string,
): Promise<void> {
  const s = await read();
  if (!s.meds.some((m) => m.id === petMedicationId)) throw new Error("Medicine not found");
  const key = `${petMedicationId}|${date}|${slot}`;
  delete s.logs[key]; // re-insert so it counts as the newest change
  s.logs[key] = status ? [status, remark.trim().slice(0, 80)] : 0;
  await write(s);
}

export async function demoAddPet(name: string, emoji: string): Promise<string> {
  const s = await read();
  if (s.pets.filter((p) => !p.archived).length >= DEMO_LIMITS.pets) {
    throw new Error(`The demo allows up to ${DEMO_LIMITS.pets} pets.`);
  }
  const id = crypto.randomUUID();
  s.pets.push({ id, name: name.slice(0, 20), kind: "pet", emoji: emoji.slice(0, 8), archived: false });
  await write(s);
  return id;
}

export async function demoUpdatePet(petId: string, name: string, emoji: string): Promise<void> {
  const s = await read();
  const pet = s.pets.find((p) => p.id === petId);
  if (!pet) throw new Error("Pet not found");
  pet.name = name.slice(0, 20);
  pet.emoji = emoji.slice(0, 8);
  await write(s);
}

export async function demoArchivePet(petId: string): Promise<void> {
  const s = await read();
  const pet = s.pets.find((p) => p.id === petId);
  if (pet) pet.archived = true;
  await write(s);
}

export async function demoAddMedication(input: {
  petId: string;
  medicineId: string | null;
  newName: string;
  newDescription: string;
  amount: string;
  slots: Slot[];
  startDate: string;
  endDate: string | null;
}): Promise<void> {
  const s = await read();
  if (!s.pets.some((p) => p.id === input.petId)) throw new Error("Pet not found");
  if (s.meds.length >= DEMO_LIMITS.meds) throw new Error(`The demo allows up to ${DEMO_LIMITS.meds} medicines in total.`);

  let medicineId = input.medicineId;
  if (medicineId && !s.medicines.some((m) => m.id === medicineId)) medicineId = null;
  if (!medicineId) {
    const name = input.newName.trim().slice(0, 30);
    if (!name) throw new Error("Enter the medicine name.");
    const existing = s.medicines.find((m) => m.name.toLowerCase() === name.toLowerCase());
    if (existing) {
      medicineId = existing.id;
    } else {
      if (s.medicines.length >= DEMO_LIMITS.medicines) throw new Error("The demo medicine list is full.");
      medicineId = crypto.randomUUID();
      s.medicines.push({ id: medicineId, name, description: input.newDescription.trim().slice(0, 40) });
    }
  }

  s.meds.push({
    id: crypto.randomUUID(),
    pet_id: input.petId,
    medicine_id: medicineId,
    amount: input.amount.trim().slice(0, 15) || "1",
    slots: input.slots,
    start_date: input.startDate,
    end_date: input.endDate || null,
  });
  await write(s);
}

export async function demoUpdateMedication(
  id: string,
  input: { amount: string; slots: Slot[]; startDate: string; endDate: string | null },
): Promise<void> {
  const s = await read();
  const m = s.meds.find((x) => x.id === id);
  if (!m) throw new Error("Medicine not found");
  m.amount = input.amount.trim().slice(0, 15) || "1";
  m.slots = input.slots;
  m.start_date = input.startDate;
  m.end_date = input.endDate || null;
  await write(s);
}

export async function demoStopMedication(id: string): Promise<void> {
  const s = await read();
  const m = s.meds.find((x) => x.id === id);
  if (!m) return;
  const today = nowParts().date;
  m.end_date = m.start_date > today ? addDays(m.start_date, -1) : today;
  await write(s);
}

export async function demoDeleteMedication(id: string): Promise<void> {
  const s = await read();
  s.meds = s.meds.filter((m) => m.id !== id);
  for (const k of Object.keys(s.logs)) if (k.startsWith(`${id}|`)) delete s.logs[k];
  await write(s);
}

export async function demoSaveSettings(settings: Settings): Promise<void> {
  const s = await read();
  s.settings = settings;
  await write(s);
}
