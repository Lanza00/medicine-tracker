"use client";

import { useState, useTransition } from "react";
import { Pill, StopCircle, Trash2 } from "lucide-react";
import { deleteMedication, stopMedication } from "@/app/actions";
import { formatFull } from "@/lib/dates";
import type { PetMedicationFull } from "@/lib/types";

export default function MedicationItem({
  med,
  today,
  finished = false,
}: {
  med: PetMedicationFull;
  today: string;
  finished?: boolean;
}) {
  const [confirm, setConfirm] = useState<"stop" | "delete" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function run(kind: "stop" | "delete") {
    setError(null);
    startTransition(async () => {
      const res = kind === "stop" ? await stopMedication(med.id) : await deleteMedication(med.id);
      if (!res.ok) setError(res.error);
      setConfirm(null);
    });
  }

  const range = med.end_date
    ? `${formatFull(med.start_date)} → ${formatFull(med.end_date)}`
    : `From ${formatFull(med.start_date)}`;

  return (
    <div className={`card p-4 ${finished ? "opacity-70" : ""}`}>
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand-dark">
          <Pill size={20} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-extrabold">{med.medicine.name}</p>
          {med.medicine.description ? (
            <p className="text-xs font-semibold text-muted">{med.medicine.description}</p>
          ) : null}
          <div className="mt-2 flex flex-wrap gap-1.5">
            <span className="rounded-full bg-sky px-2.5 py-1 text-xs font-bold">{med.amount}</span>
            {med.slots.map((s) => (
              <span key={s} className="rounded-full bg-peach-soft px-2.5 py-1 text-xs font-bold text-orange-700">
                {s}
              </span>
            ))}
          </div>
          <p className="mt-2 text-xs font-semibold text-muted">{range}</p>
        </div>
      </div>

      {error ? <p className="mt-3 text-sm font-semibold text-coral">{error}</p> : null}

      {confirm ? (
        <div className="mt-3 rounded-xl bg-sky p-3">
          <p className="text-sm font-bold">
            {confirm === "stop"
              ? "Stop this medicine from today? Past records are kept."
              : "Delete this medicine and all its records? This can't be undone."}
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button className="btn-ghost !bg-white" onClick={() => setConfirm(null)} disabled={pending}>
              Cancel
            </button>
            <button
              className={confirm === "delete" ? "btn-danger" : "btn-soft"}
              onClick={() => run(confirm)}
              disabled={pending}
            >
              {pending ? "Working…" : confirm === "stop" ? "Yes, stop" : "Yes, delete"}
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-3 flex gap-2">
          {!finished && (!med.end_date || med.end_date >= today) ? (
            <button className="btn-soft flex-1 !py-2" onClick={() => setConfirm("stop")}>
              <StopCircle size={16} /> Stop
            </button>
          ) : null}
          <button className="btn-danger flex-1 !py-2" onClick={() => setConfirm("delete")}>
            <Trash2 size={16} /> Delete
          </button>
        </div>
      )}
    </div>
  );
}
