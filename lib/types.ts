export type Slot = "AM" | "PM";
export type DoseStatus = "taken" | "skipped";

export type Pet = {
  id: string;
  name: string;
  kind: string;
  emoji: string;
  /** Public URL of an uploaded photo; null/absent = show the emoji. */
  photo_url?: string | null;
  archived: boolean;
};

export type Medicine = {
  id: string;
  name: string;
  description: string;
};

export type PetMedication = {
  id: string;
  pet_id: string;
  medicine_id: string;
  amount: string;
  slots: Slot[];
  start_date: string;
  end_date: string | null;
};

export type PetMedicationFull = PetMedication & {
  pet: Pick<Pet, "id" | "name" | "emoji" | "photo_url" | "archived">;
  medicine: Medicine;
};

export type DoseLog = {
  pet_medication_id: string;
  date: string;
  slot: Slot;
  status: DoseStatus;
  remark: string;
};

/** One scheduled dose on one date, merged with its log (if any). */
export type Dose = {
  key: string;
  petMedicationId: string;
  petId: string;
  petName: string;
  petEmoji: string;
  petPhoto: string | null;
  medicineName: string;
  description: string;
  amount: string;
  slot: Slot;
  date: string;
  status: DoseStatus | null;
  remark: string;
};

export type Settings = {
  am_time: string;
  pm_time: string;
  reminders_enabled: boolean;
};
