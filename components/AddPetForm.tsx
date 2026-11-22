"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, Check, Plus, X } from "lucide-react";
import { addPet, updatePet } from "@/app/actions";
import type { Pet } from "@/lib/types";
import { resizeImage } from "@/lib/resizeImage";
import { isDemo } from "@/lib/demoMode";

const EMOJIS = ["🐱", "🐈", "🐈‍⬛", "😺", "🐶", "🐰", "🐹", "🐦"];

/** Add a pet, or, with `pet`, edit its name, icon and photo. */
export default function AddPetForm({ pet, onDone }: { pet?: Pet; onDone?: () => void } = {}) {
  const [emoji, setEmoji] = useState(pet?.emoji ?? EMOJIS[0]);
  const [photo, setPhoto] = useState<{ blob: Blob; url: string } | null>(null);
  // Edit only: the photo already saved, until the user removes or replaces it.
  const [savedPhoto, setSavedPhoto] = useState<string | null>(pet?.photo_url ?? null);
  const [error, setError] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [reading, setReading] = useState(false);
  const [pending, setPending] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const canUpload = !isDemo(); // the demo keeps data in a cookie, which can't hold photos

  useEffect(() => {
    if (!photo) return;
    return () => URL.revokeObjectURL(photo.url);
  }, [photo]);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // so picking the same file again still fires
    if (!file) return;
    setPhotoError(null);
    setReading(true);
    try {
      const blob = await resizeImage(file);
      setPhoto({ blob, url: URL.createObjectURL(blob) });
    } catch (err) {
      setPhotoError(err instanceof Error ? err.message : "Could not read that photo.");
    } finally {
      setReading(false);
    }
  }

  async function submit(formData: FormData) {
    setPending(true);
    setError(null);
    if (photo) formData.set("photo", photo.blob, "photo.jpg");
    if (pet) {
      if (!photo && !savedPhoto && pet.photo_url) formData.set("removePhoto", "1");
      const r = await updatePet(pet.id, formData);
      setPending(false);
      if (r.ok) onDone?.();
      else setError(r.error);
      return;
    }
    try {
      await addPet(formData); // redirects to the new pet's page
    } finally {
      setPending(false);
    }
  }

  return (
    <form action={submit} className="mt-4 space-y-4">
      <input type="hidden" name="emoji" value={emoji} />
      <div>
        <label className="label" htmlFor={pet ? "pet-name-edit" : "pet-name"}>
          Name
        </label>
        <input
          id={pet ? "pet-name-edit" : "pet-name"}
          name="name"
          className="input"
          placeholder="e.g. Ateh"
          required
          maxLength={40}
          defaultValue={pet?.name}
        />
      </div>
      <div>
        <span className="label">{canUpload ? "Photo or icon" : "Icon"}</span>
        <div className="flex flex-wrap gap-2">
          {canUpload ? (
            photo || savedPhoto ? (
              <span className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element -- local preview */}
                <img
                  src={photo?.url ?? savedPhoto ?? ""}
                  alt="Chosen photo"
                  className="h-11 w-11 rounded-full object-cover ring-2 ring-brand"
                />
                <button
                  type="button"
                  onClick={() => {
                    setPhoto(null);
                    setSavedPhoto(null);
                  }}
                  className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-ink text-white ring-2 ring-white"
                  aria-label="Remove photo"
                >
                  <X size={12} strokeWidth={3} />
                </button>
              </span>
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={reading}
                className="flex h-11 items-center gap-1.5 rounded-xl bg-sky px-3 text-sm font-bold"
              >
                <Camera size={18} /> {reading ? "Loading…" : "Upload photo"}
              </button>
            )
          ) : null}
          {EMOJIS.map((e) => {
            const selected = !photo && !savedPhoto && emoji === e;
            return (
              <button
                key={e}
                type="button"
                onClick={() => {
                  setEmoji(e);
                  setPhoto(null);
                  setSavedPhoto(null);
                }}
                className={`flex h-11 w-11 items-center justify-center rounded-xl text-2xl transition ${
                  selected ? "bg-brand-soft ring-2 ring-brand" : "bg-sky"
                }`}
                aria-pressed={selected}
              >
                {e}
              </button>
            );
          })}
        </div>
        {canUpload ? (
          <>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFile} />
            {photoError ? (
              <p className="mt-1.5 text-xs font-bold text-red-600">{photoError}</p>
            ) : photo || savedPhoto ? (
              <p className="mt-1.5 text-xs text-muted">
                The photo is shown in the app. The {emoji} icon is kept as a backup.
              </p>
            ) : null}
          </>
        ) : null}
      </div>
      {error ? <p className="rounded-xl bg-coral-soft px-3 py-2 text-sm font-semibold text-coral">{error}</p> : null}
      {pet ? (
        <div className="grid grid-cols-2 gap-2">
          <button type="button" className="btn-ghost !bg-sky" onClick={onDone} disabled={pending}>
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={pending || reading}>
            <Check size={18} /> {pending ? "Saving…" : "Save"}
          </button>
        </div>
      ) : (
        <button type="submit" className="btn-primary w-full" disabled={pending || reading}>
          <Plus size={18} /> {pending ? "Adding…" : "Add pet"}
        </button>
      )}
    </form>
  );
}
