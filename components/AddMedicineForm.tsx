"use client";

import { useId, useState, useTransition } from "react";
import { Check, Plus } from "lucide-react";
import { addMedication, updateMedication } from "@/app/actions";
import type { Medicine, PetMedicationFull, Slot } from "@/lib/types";
import { addDays, formatFull } from "@/lib/dates";

const NEW = "__new__";

/** Days from start to end, counting both (a course that ends the day it starts is 1 day). */
function courseDays(start: string, end: string): number {
  return Math.round((Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / 86400000) + 1;
}

/**
 * Add a medicine to a pet, or, with `edit`, change an existing one
 * (amount, AM/PM, start date, how long). The medicine itself can't be swapped
 * when editing, so its logged history stays meaningful.
 */
export default function AddMedicineForm({
  petId,
  medicines,
  today,
  edit,
  onDone,
}: {
  petId: string;
  medicines: Medicine[];
  today: string;
  edit?: PetMedicationFull;
  onDone?: () => void;
}) {
  const uid = useId(); // unique field ids: an edit form can sit on the same page as the add form
  const [choice, setChoice] = useState<string>(
    edit ? edit.medicine_id : medicines.length ? medicines[0].id : NEW,
  );
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [amount, setAmount] = useState(edit?.amount ?? "1");
  const [slots, setSlots] = useState<Slot[]>(edit?.slots ?? ["AM", "PM"]);
  const [start, setStart] = useState(edit?.start_date ?? today);
  const [days, setDays] = useState(
    edit?.end_date ? String(Math.max(1, courseDays(edit.start_date, edit.end_date))) : "7",
  );
  const [ongoing, setOngoing] = useState(edit ? !edit.end_date : false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();

  const isNew = !edit && choice === NEW;
  const selected = medicines.find((m) => m.id === choice);
  const dayCount = Number(days);
  // A long course that was stopped later can be more than a year, so editing allows more.
  const maxDays = edit ? 3650 : 365;
  const validDays = Number.isInteger(dayCount) && dayCount >= 1 && dayCount <= maxDays;
  const validStart = /^\d{4}-\d{2}-\d{2}$/.test(start);
  // The start date is day 1, so a 7-day course ends 6 days after it.
  const end = !ongoing && validDays && validStart ? addDays(start, dayCount - 1) : null;

  function toggle(s: Slot) {
    setSlots((cur) => (cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setDone(false);
    if (!validStart) {
      setError("Pick a start date.");
      return;
    }
    if (!ongoing && !validDays) {
      setError(`Enter how many days (1 to ${maxDays}), or choose Ongoing.`);
      return;
    }
    startTransition(async () => {
      if (edit) {
        const res = await updateMedication(edit.id, { amount, slots, startDate: start, endDate: end });
        if (!res.ok) setError(res.error);
        else onDone?.();
        return;
      }
      const res = await addMedication({
        petId,
        medicineId: isNew ? null : choice,
        newName,
        newDescription: newDesc,
        amount,
        slots,
        startDate: start,
        endDate: end,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setDone(true);
      setNewName("");
      setNewDesc("");
      setAmount("1");
      setDays("7");
      setOngoing(false);
    });
  }

  return (
    <form onSubmit={submit} className="mt-4 space-y-4">
      {edit ? null : (
      <div>
        <label className="label" htmlFor={`${uid}-choice`}>
          Medicine
        </label>
        <select
          id={`${uid}-choice`}
          className="input"
          value={choice}
          onChange={(e) => setChoice(e.target.value)}
        >
          {medicines.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
          <option value={NEW}>+ New medicine…</option>
        </select>
        {!isNew && selected?.description ? (
          <p className="mt-1.5 px-1 text-xs font-semibold text-muted">{selected.description}</p>
        ) : null}
      </div>
      )}

      {isNew ? (
        <>
          <div>
            <label className="label" htmlFor={`${uid}-name`}>
              Medicine name
            </label>
            <input
              id={`${uid}-name`}
              className="input"
              placeholder="e.g. Cetirizine"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              maxLength={80}
            />
          </div>
          <div>
            <label className="label" htmlFor={`${uid}-desc`}>
              What is it for? (optional)
            </label>
            <input
              id={`${uid}-desc`}
              className="input"
              placeholder="e.g. Allergy, antibiotic, immune booster"
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              maxLength={120}
            />
          </div>
        </>
      ) : null}

      <div>
        <label className="label" htmlFor={`${uid}-amount`}>
          Amount each time
        </label>
        <input
          id={`${uid}-amount`}
          className="input"
          placeholder="e.g. 1, 0.125, 1/8 tab, 2 ml"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          maxLength={40}
        />
      </div>

      <div>
        <span className="label">When</span>
        <div className="grid grid-cols-2 gap-2">
          {(["AM", "PM"] as Slot[]).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => toggle(s)}
              aria-pressed={slots.includes(s)}
              className={`rounded-xl border-2 py-3 text-sm font-extrabold transition ${
                slots.includes(s)
                  ? "border-brand bg-brand-soft text-brand-dark"
                  : "border-line bg-white text-muted"
              }`}
            >
              {s === "AM" ? "☀️ Morning (AM)" : "🌙 Evening (PM)"}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="label" htmlFor={`${uid}-start`}>
          Start
        </label>
        <input
          id={`${uid}-start`}
          type="date"
          className="input"
          value={start}
          onChange={(e) => setStart(e.target.value)}
          required
        />
      </div>

      <div>
        <label className="label" htmlFor={`${uid}-days`}>
          How long
        </label>
        <div className="grid grid-cols-2 gap-2">
          <div className="relative">
            <input
              id={`${uid}-days`}
              type="number"
              inputMode="numeric"
              min={1}
              max={maxDays}
              className="input pr-14"
              value={ongoing ? "" : days}
              placeholder={ongoing ? "—" : "e.g. 7"}
              disabled={ongoing}
              onChange={(e) => setDays(e.target.value)}
            />
            <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-sm font-bold text-muted">
              days
            </span>
          </div>
          <button
            type="button"
            onClick={() => setOngoing((v) => !v)}
            aria-pressed={ongoing}
            className={`rounded-xl border-2 py-3 text-sm font-extrabold transition ${
              ongoing ? "border-brand bg-brand-soft text-brand-dark" : "border-line bg-white text-muted"
            }`}
          >
            ♾️ Ongoing
          </button>
        </div>
        <p className="mt-1.5 px-1 text-xs font-semibold text-muted">
          {!validStart
            ? "Pick a start date."
            : ongoing
              ? `From ${formatFull(start)}, no end date.`
              : end
                ? `${formatFull(start)} to ${formatFull(end)} (last dose).`
                : `From ${formatFull(start)}.`}
        </p>
      </div>

      {error ? <p className="rounded-xl bg-coral-soft px-3 py-2 text-sm font-semibold text-coral">{error}</p> : null}
      {done ? (
        <p className="rounded-xl bg-mint-soft px-3 py-2 text-sm font-semibold text-emerald-700">
          Added! You can add another one.
        </p>
      ) : null}

      {edit ? (
        <div className="grid grid-cols-2 gap-2">
          <button type="button" className="btn-ghost !bg-sky" onClick={onDone} disabled={pending}>
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={pending}>
            <Check size={18} /> {pending ? "Saving…" : "Save"}
          </button>
        </div>
      ) : (
        <button type="submit" className="btn-primary w-full" disabled={pending}>
          <Plus size={18} /> {pending ? "Adding…" : "Add medicine"}
        </button>
      )}
    </form>
  );
}
