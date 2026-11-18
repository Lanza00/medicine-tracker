import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import PetAvatar from "@/components/PetAvatar";
import SetupNotice from "@/components/SetupNotice";
import AddMedicineForm from "@/components/AddMedicineForm";
import MedicationItem from "@/components/MedicationItem";
import ArchivePetButton from "@/components/ArchivePetButton";
import { getMedicines, getMedications, getPet } from "@/lib/data";
import { nowParts } from "@/lib/dates";
import { hasSupabaseEnv } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export default async function PetPage({ params }: { params: Promise<{ id: string }> }) {
  if (!hasSupabaseEnv()) return <SetupNotice />;
  const { id } = await params;

  let pet, meds, medicines;
  try {
    pet = await getPet(id);
    if (!pet) notFound();
    [meds, medicines] = await Promise.all([getMedications(id), getMedicines()]);
  } catch (e) {
    if (e && typeof e === "object" && "digest" in e) throw e; // let notFound() through
    return <SetupNotice message={e instanceof Error ? e.message : String(e)} />;
  }

  const today = nowParts().date;
  const current = meds.filter((m) => !m.end_date || m.end_date >= today);
  const past = meds.filter((m) => m.end_date && m.end_date < today);

  return (
    <>
      <Link href="/pets" className="inline-flex items-center gap-1 text-sm font-bold text-muted">
        <ChevronLeft size={18} /> Pets
      </Link>

      <header className="mt-3 flex items-center gap-3">
        <PetAvatar id={pet.id} emoji={pet.emoji} size={56} />
        <h1 className="min-w-0 flex-1 truncate text-3xl font-extrabold">{pet.name}</h1>
      </header>

      <h2 className="mt-6 px-1 text-sm font-extrabold">Current medicine</h2>
      {current.length === 0 ? (
        <p className="card mt-2 p-4 text-sm text-muted">No medicine yet. Add one below.</p>
      ) : (
        <ul className="mt-2 space-y-2.5">
          {current.map((m) => (
            <li key={m.id}>
              <MedicationItem med={m} today={today} />
            </li>
          ))}
        </ul>
      )}

      <section className="card mt-6 p-4">
        <h2 className="font-extrabold">Add medicine</h2>
        <p className="mt-0.5 text-xs text-muted">Pick one you already use, or add a new one.</p>
        <AddMedicineForm petId={pet.id} medicines={medicines} today={today} />
      </section>

      {past.length > 0 ? (
        <>
          <h2 className="mt-6 px-1 text-sm font-extrabold text-muted">Finished</h2>
          <ul className="mt-2 space-y-2.5">
            {past.map((m) => (
              <li key={m.id}>
                <MedicationItem med={m} today={today} finished />
              </li>
            ))}
          </ul>
        </>
      ) : null}

      <div className="mt-8 text-center">
        <ArchivePetButton petId={pet.id} name={pet.name} />
      </div>
    </>
  );
}
