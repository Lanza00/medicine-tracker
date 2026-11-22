import Link from "next/link";
import { ChevronRight } from "lucide-react";
import PetAvatar from "@/components/PetAvatar";
import SetupNotice from "@/components/SetupNotice";
import AddPetForm from "@/components/AddPetForm";
import { getMedications, getPets } from "@/lib/data";
import { nowParts } from "@/lib/dates";
import { hasSupabaseEnv } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export default async function PetsPage() {
  if (!hasSupabaseEnv()) return <SetupNotice />;

  let pets, meds;
  try {
    [pets, meds] = await Promise.all([getPets(), getMedications()]);
  } catch (e) {
    return <SetupNotice message={e instanceof Error ? e.message : String(e)} />;
  }
  const today = nowParts().date;

  return (
    <>
      <header>
        <p className="text-xs font-extrabold uppercase tracking-wider text-brand">Manage</p>
        <h1 className="mt-1 text-3xl font-extrabold">Pets</h1>
      </header>

      <ul className="mt-5 space-y-2.5">
        {pets.map((p) => {
          const count = meds.filter(
            (m) => m.pet_id === p.id && (!m.end_date || m.end_date >= today),
          ).length;
          return (
            <li key={p.id}>
              <Link href={`/pets/${p.id}`} className="card flex items-center gap-3 p-3.5">
                <PetAvatar id={p.id} emoji={p.emoji} photo={p.photo_url} size={48} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-lg font-extrabold">{p.name}</p>
                  <p className="text-xs font-semibold text-muted">
                    {count === 0 ? "No medicine yet" : `${count} medicine${count > 1 ? "s" : ""}`}
                  </p>
                </div>
                <ChevronRight className="text-muted" size={20} />
              </Link>
            </li>
          );
        })}
      </ul>

      <section className="card mt-6 p-4">
        <h2 className="font-extrabold">Add a new pet</h2>
        <p className="mt-0.5 text-xs text-muted">Add the name first, then their medicine.</p>
        <AddPetForm />
      </section>
    </>
  );
}
