"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { addPet } from "@/app/actions";

const EMOJIS = ["🐱", "🐈", "🐈‍⬛", "😺", "🐶", "🐰", "🐹", "🐦"];

export default function AddPetForm() {
  const [emoji, setEmoji] = useState(EMOJIS[0]);
  const [pending, setPending] = useState(false);

  return (
    <form action={addPet} onSubmit={() => setPending(true)} className="mt-4 space-y-4">
      <input type="hidden" name="emoji" value={emoji} />
      <div>
        <label className="label" htmlFor="pet-name">
          Name
        </label>
        <input id="pet-name" name="name" className="input" placeholder="e.g. Ateh" required maxLength={40} />
      </div>
      <div>
        <span className="label">Icon</span>
        <div className="flex flex-wrap gap-2">
          {EMOJIS.map((e) => (
            <button
              key={e}
              type="button"
              onClick={() => setEmoji(e)}
              className={`flex h-11 w-11 items-center justify-center rounded-xl text-2xl transition ${
                emoji === e ? "bg-brand-soft ring-2 ring-brand" : "bg-sky"
              }`}
              aria-pressed={emoji === e}
            >
              {e}
            </button>
          ))}
        </div>
      </div>
      <button type="submit" className="btn-primary w-full" disabled={pending}>
        <Plus size={18} /> {pending ? "Adding…" : "Add pet"}
      </button>
    </form>
  );
}
