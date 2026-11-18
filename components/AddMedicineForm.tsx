"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { addMedication } from "@/app/actions";
import type { Medicine, Slot } from "@/lib/types";

const NEW = "__new__";

export default function AddMedicineForm({
  petId,
  medicines,
  today,
}: {
  petId: string;
  medicines: Medicine[];
  today: string;
}) {
  const [choice, setChoice] = useState<string>(medicines.length ? medicines[0].id : NEW);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [amount, setAmount] = useState("1");
  const [slots, setSlots] = useState<Slot[]>(["AM", "PM"]);
  const [start, setStart] = useState(today);
  const [end, setEnd] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();

  const isNew = choice === NEW;
  const selected = medicines.find((m) => m.id === choice);

  function toggle(s: Slot) {
    setSlots((cur) => (cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setDone(false);
    startTransition(async () => {
      const res = await addMedication({
        petId,
        medicineId: isNew ? null : choice,
        newName,
        newDescription: newDesc,
        amount,
        slots,
        startDate: start,
        endDate: end || null,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setDone(true);
      setNewName("");
      setNewDesc("");
      setAmount("1");
      setEnd("");
    });
  }

  return (
    <form onSubmit={submit} className="mt-4 space-y-4">
      <div>
        <label className="label" htmlFor="med-choice">
          Medicine
        </label>
        <select
          id="med-choice"
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

      {isNew ? (
        <>
          <div>
            <label className="label" htmlFor="med-name">
              Medicine name
            </label>
            <input
              id="med-name"
              className="input"
              placeholder="e.g. Cetirizine"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              maxLength={80}
            />
          </div>
          <div>
            <label className="label" htmlFor="med-desc">
              What is it for? (optional)
            </label>
            <input
              id="med-desc"
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
        <label className="label" htmlFor="med-amount">
          Amount each time
        </label>
        <input
          id="med-amount"
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

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="med-start">
            Start
          </label>
          <input
            id="med-start"
            type="date"
            className="input"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="label" htmlFor="med-end">
            End (optional)
          </label>
          <input
            id="med-end"
            type="date"
            className="input"
            value={end}
            min={start}
            onChange={(e) => setEnd(e.target.value)}
          />
        </div>
      </div>

      {error ? <p className="rounded-xl bg-coral-soft px-3 py-2 text-sm font-semibold text-coral">{error}</p> : null}
      {done ? (
        <p className="rounded-xl bg-mint-soft px-3 py-2 text-sm font-semibold text-emerald-700">
          Added! You can add another one.
        </p>
      ) : null}

      <button type="submit" className="btn-primary w-full" disabled={pending}>
        <Plus size={18} /> {pending ? "Adding…" : "Add medicine"}
      </button>
    </form>
  );
}
