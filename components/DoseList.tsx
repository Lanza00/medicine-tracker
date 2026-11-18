"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Check, MessageSquareText, Moon, PawPrint, SkipForward, Sun, X } from "lucide-react";
import { setDose } from "@/app/actions";
import PetAvatar from "@/components/PetAvatar";
import type { Dose, DoseStatus, Slot } from "@/lib/types";

type Props = {
  doses: Dose[];
  showPet: boolean;
  amLabel: string;
  pmLabel: string;
};

export default function DoseList({ doses, showPet, amLabel, pmLabel }: Props) {
  const [items, setItems] = useState<Dose[]>(doses);
  const [editing, setEditing] = useState<Dose | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  useEffect(() => setItems(doses), [doses]);

  const handled = items.filter((d) => d.status).length;
  const pct = items.length ? Math.round((handled / items.length) * 100) : 0;

  const groups = useMemo(
    () =>
      (["AM", "PM"] as Slot[])
        .map((slot) => ({ slot, list: items.filter((d) => d.slot === slot) }))
        .filter((g) => g.list.length > 0),
    [items],
  );

  function apply(dose: Dose, status: DoseStatus | null, remark: string) {
    const previous = dose;
    setItems((cur) => cur.map((d) => (d.key === dose.key ? { ...d, status, remark } : d)));
    setError(null);
    startTransition(async () => {
      const res = await setDose(dose.petMedicationId, dose.date, dose.slot, status, remark);
      if (!res.ok) {
        setItems((cur) => cur.map((d) => (d.key === previous.key ? previous : d)));
        setError(res.error);
      }
    });
  }

  function onCircle(dose: Dose) {
    if (dose.status === "taken") apply(dose, null, "");
    else if (dose.status === "skipped") setEditing(dose);
    else apply(dose, "taken", dose.remark);
  }

  if (items.length === 0) {
    return (
      <div className="card mt-6 p-8 text-center">
        <PawPrint className="mx-auto text-brand" size={34} />
        <p className="mt-3 font-extrabold">Nothing scheduled</p>
        <p className="mt-1 text-sm text-muted">Add a pet and their medicine to see doses here.</p>
        <Link href="/pets" className="btn-primary mt-5">
          Go to Pets
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="card mt-5 p-4">
        <div className="flex items-baseline justify-between">
          <p className="text-sm font-extrabold">
            {handled === items.length ? "All done 🎉" : `${handled} of ${items.length} done`}
          </p>
          <p className="text-xs font-bold text-muted">{pct}%</p>
        </div>
        <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-brand-soft">
          <motion.div
            className="h-full rounded-full bg-mint"
            initial={false}
            animate={{ width: `${pct}%` }}
            transition={{ type: "spring", stiffness: 140, damping: 20 }}
          />
        </div>
      </div>

      {error ? (
        <p className="mt-3 rounded-xl bg-coral-soft px-3 py-2 text-sm font-semibold text-coral">{error}</p>
      ) : null}

      {groups.map(({ slot, list }) => (
        <section key={slot} className="mt-6">
          <div className="mb-2 flex items-center gap-2 px-1">
            {slot === "AM" ? (
              <Sun size={18} className="text-peach" />
            ) : (
              <Moon size={18} className="text-brand" />
            )}
            <h2 className="text-sm font-extrabold">{slot === "AM" ? "Morning" : "Evening"}</h2>
            <span className="text-xs font-semibold text-muted">
              {slot === "AM" ? amLabel : pmLabel}
            </span>
          </div>
          <ul className="space-y-2.5">
            {list.map((d) => (
              <li key={d.key}>
                <DoseRow
                  dose={d}
                  showPet={showPet}
                  onCircle={() => onCircle(d)}
                  onNote={() => setEditing(d)}
                />
              </li>
            ))}
          </ul>
        </section>
      ))}

      <NoteSheet
        key={editing?.key ?? "none"}
        dose={editing}
        onClose={() => setEditing(null)}
        onSave={(status, remark) => {
          if (editing) apply(editing, status, remark);
          setEditing(null);
        }}
      />
    </>
  );
}

function DoseRow({
  dose,
  showPet,
  onCircle,
  onNote,
}: {
  dose: Dose;
  showPet: boolean;
  onCircle: () => void;
  onNote: () => void;
}) {
  const taken = dose.status === "taken";
  const skipped = dose.status === "skipped";
  return (
    <div
      className={`card flex items-center gap-3 p-3.5 transition ${taken ? "bg-mint-soft/60" : ""} ${
        skipped ? "bg-peach-soft" : ""
      }`}
    >
      {showPet ? <PetAvatar id={dose.petId} emoji={dose.petEmoji} size={40} /> : null}
      <div className="min-w-0 flex-1">
        <p className={`truncate font-extrabold ${taken ? "text-muted line-through decoration-2" : ""}`}>
          {dose.medicineName}
        </p>
        <p className="truncate text-xs font-semibold text-muted">
          {showPet ? `${dose.petName} · ` : ""}
          {dose.amount}
          {dose.description ? ` · ${dose.description}` : ""}
        </p>
        {skipped ? (
          <p className="mt-0.5 text-xs font-bold text-orange-600">
            Skipped{dose.remark ? ` · ${dose.remark}` : ""}
          </p>
        ) : dose.remark ? (
          <p className="mt-0.5 truncate text-xs italic text-muted">“{dose.remark}”</p>
        ) : null}
      </div>
      <button
        type="button"
        onClick={onNote}
        aria-label="Add note or skip"
        className="relative rounded-full p-2 text-muted hover:bg-sky"
      >
        <MessageSquareText size={20} />
        {dose.remark && !skipped ? (
          <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-brand" />
        ) : null}
      </button>
      <button
        type="button"
        onClick={onCircle}
        aria-label={taken ? "Mark as not done" : "Mark as done"}
        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 transition active:scale-90 ${
          taken
            ? "border-mint bg-mint text-white"
            : skipped
              ? "border-peach bg-peach text-white"
              : "border-line bg-white text-transparent hover:border-brand"
        }`}
      >
        <AnimatePresence initial={false} mode="wait">
          {taken ? (
            <motion.span
              key="t"
              initial={{ scale: 0, rotate: -30 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0 }}
              transition={{ type: "spring", stiffness: 500, damping: 20 }}
            >
              <Check size={26} strokeWidth={3} />
            </motion.span>
          ) : skipped ? (
            <motion.span key="s" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
              <SkipForward size={22} strokeWidth={2.5} />
            </motion.span>
          ) : (
            <span key="n">
              <Check size={26} strokeWidth={3} />
            </span>
          )}
        </AnimatePresence>
      </button>
    </div>
  );
}

function NoteSheet({
  dose,
  onClose,
  onSave,
}: {
  dose: Dose | null;
  onClose: () => void;
  onSave: (status: DoseStatus | null, remark: string) => void;
}) {
  const [text, setText] = useState(dose?.remark ?? "");

  return (
    <AnimatePresence>
      {dose ? (
        <motion.div
          className="fixed inset-0 z-40 flex items-end justify-center bg-ink/40"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="w-full max-w-md rounded-t-3xl bg-white p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))]"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 32 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-lg font-extrabold">{dose.medicineName}</p>
                <p className="text-xs font-semibold text-muted">
                  {dose.petName} · {dose.slot === "AM" ? "Morning" : "Evening"} · {dose.amount}
                </p>
              </div>
              <button onClick={onClose} aria-label="Close" className="rounded-full p-2 text-muted hover:bg-sky">
                <X size={20} />
              </button>
            </div>

            <label className="label mt-4" htmlFor="note">
              {dose.status === "skipped" ? "Reason for skipping" : "Note (optional)"}
            </label>
            <input
              id="note"
              className="input"
              placeholder={dose.status === "skipped" ? "e.g. ran out of medicine" : "e.g. mixed with food"}
              value={text}
              onChange={(e) => setText(e.target.value)}
              maxLength={300}
              autoFocus
            />

            <div className="mt-4 grid gap-2">
              {dose.status === null ? (
                <>
                  <button className="btn-soft" onClick={() => onSave("taken", text)}>
                    <Check size={18} /> Mark as given{text ? " with note" : ""}
                  </button>
                  <button
                    className="btn bg-peach-soft text-orange-700 hover:bg-orange-100"
                    onClick={() => onSave("skipped", text)}
                  >
                    <SkipForward size={18} /> Skip this dose
                  </button>
                </>
              ) : (
                <>
                  <button className="btn-primary" onClick={() => onSave(dose.status, text)}>
                    Save
                  </button>
                  <button className="btn-ghost" onClick={() => onSave(null, "")}>
                    Undo (mark as not done)
                  </button>
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
