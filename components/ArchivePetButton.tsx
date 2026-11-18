"use client";

import { useState, useTransition } from "react";
import { Archive } from "lucide-react";
import { archivePet } from "@/app/actions";

export default function ArchivePetButton({ petId, name }: { petId: string; name: string }) {
  const [confirm, setConfirm] = useState(false);
  const [pending, startTransition] = useTransition();

  if (!confirm) {
    return (
      <button className="btn-ghost text-sm" onClick={() => setConfirm(true)}>
        <Archive size={16} /> Archive {name}
      </button>
    );
  }
  return (
    <div className="card p-4 text-left">
      <p className="text-sm font-bold">
        Hide {name} from the app? Their records are kept but they won&apos;t show up in Today or History.
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button className="btn-ghost !bg-sky" onClick={() => setConfirm(false)} disabled={pending}>
          Cancel
        </button>
        <button
          className="btn-danger"
          disabled={pending}
          onClick={() => startTransition(() => archivePet(petId))}
        >
          {pending ? "Archiving…" : "Archive"}
        </button>
      </div>
    </div>
  );
}
