"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Camera, ImagePlus, Trash2, X } from "lucide-react";
import PetAvatar from "@/components/PetAvatar";
import { removePetPhoto, setPetPhoto } from "@/app/actions";
import { resizeImage } from "@/lib/resizeImage";
import { isDemo } from "@/lib/demoMode";

/**
 * The avatar on a pet's page. Tap it to add a photo, or to change / remove one.
 * On a phone the picker offers both the camera and the gallery.
 */
export default function PetPhotoEditor({
  petId,
  emoji,
  photo,
  size = 56,
}: {
  petId: string;
  emoji: string;
  photo: string | null;
  size?: number;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [menu, setMenu] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Free the local preview once it's no longer shown.
  useEffect(() => {
    if (!preview) return;
    return () => URL.revokeObjectURL(preview);
  }, [preview]);

  if (isDemo()) return <PetAvatar id={petId} emoji={emoji} photo={photo} size={size} />;

  const shown = preview ?? photo;

  function pick() {
    setMenu(false);
    setError(null);
    fileRef.current?.click();
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // so picking the same file again still fires
    if (!file) return;
    let blob: Blob;
    try {
      blob = await resizeImage(file);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not read that photo.");
      return;
    }
    setPreview(URL.createObjectURL(blob));
    const fd = new FormData();
    fd.set("photo", blob, "photo.jpg");
    startTransition(async () => {
      const r = await setPetPhoto(petId, fd);
      if (!r.ok) setError(r.error);
      setPreview(null); // the saved photo (or the old one, on error) comes back from the server
    });
  }

  function remove() {
    setMenu(false);
    setError(null);
    startTransition(async () => {
      const r = await removePetPhoto(petId);
      if (!r.ok) setError(r.error);
    });
  }

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={() => (shown ? setMenu((m) => !m) : pick())}
        disabled={pending}
        className="relative block rounded-full"
        aria-label={shown ? "Change or remove photo" : "Add a photo"}
      >
        <span className={pending ? "opacity-60" : ""}>
          <PetAvatar id={petId} emoji={emoji} photo={shown} size={size} />
        </span>
        <span className="absolute -bottom-0.5 -right-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-ink text-white ring-2 ring-white">
          <Camera size={13} strokeWidth={2.5} />
        </span>
      </button>

      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFile} />

      {menu ? (
        <div className="card absolute left-0 top-full z-20 mt-2 w-48 overflow-hidden p-1.5 shadow-lg">
          <button type="button" onClick={pick} className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-bold hover:bg-sky">
            <ImagePlus size={16} /> Change photo
          </button>
          <button type="button" onClick={remove} className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-bold text-red-600 hover:bg-sky">
            <Trash2 size={16} /> Remove photo
          </button>
          <button type="button" onClick={() => setMenu(false)} className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-bold text-muted hover:bg-sky">
            <X size={16} /> Cancel
          </button>
        </div>
      ) : null}

      {pending ? (
        <p className="absolute left-0 top-full mt-1 whitespace-nowrap text-xs font-bold text-muted">Saving photo…</p>
      ) : error ? (
        <p className="absolute left-0 top-full z-10 mt-1 w-64 text-xs font-bold text-red-600">{error}</p>
      ) : null}
    </div>
  );
}
