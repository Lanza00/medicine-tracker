"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import AddPetForm from "@/components/AddPetForm";
import PetPhotoEditor from "@/components/PetPhotoEditor";
import type { Pet } from "@/lib/types";

/** Top of a pet's page: photo, name and an Edit button that opens the pet form filled in. */
export default function PetHeader({ pet }: { pet: Pet }) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <section className="card mt-3 p-4">
        <h1 className="font-extrabold">Edit {pet.name}</h1>
        <AddPetForm pet={pet} onDone={() => setEditing(false)} />
      </section>
    );
  }

  return (
    <header className="mt-3 flex items-center gap-3">
      <PetPhotoEditor petId={pet.id} emoji={pet.emoji} photo={pet.photo_url ?? null} size={56} />
      <h1 className="min-w-0 flex-1 truncate text-3xl font-extrabold">{pet.name}</h1>
      <button type="button" className="btn-soft shrink-0 !px-3 !py-2 text-sm" onClick={() => setEditing(true)}>
        <Pencil size={16} /> Edit
      </button>
    </header>
  );
}
