import Link from "next/link";
import { Check, Circle, Download, SkipForward, XCircle } from "lucide-react";
import PetAvatar from "@/components/PetAvatar";
import SetupNotice from "@/components/SetupNotice";
import { buildRange, forPet, getLogs, getMedications, getPets } from "@/lib/data";
import { addDays, formatLong, nowParts } from "@/lib/dates";
import { hasSupabaseEnv } from "@/lib/supabase";

export const dynamic = "force-dynamic";

type SP = { pet?: string; days?: string };
const RANGES = [7, 14, 30];

function qs(pet: string | undefined, days: number) {
  const q = new URLSearchParams();
  if (pet) q.set("pet", pet);
  if (days !== 7) q.set("days", String(days));
  const s = q.toString();
  return s ? `?${s}` : "";
}

export default async function HistoryPage({ searchParams }: { searchParams: Promise<SP> }) {
  if (!hasSupabaseEnv()) return <SetupNotice />;
  const sp = await searchParams;
  const today = nowParts().date;
  const days = RANGES.includes(Number(sp.days)) ? Number(sp.days) : 7;

  let pets, history;
  try {
    const from = addDays(today, -(days - 1));
    const [p, meds, logs] = await Promise.all([getPets(), getMedications(), getLogs(from, today)]);
    pets = p;
    history = buildRange(forPet(meds, pets.find((x) => x.id === sp.pet)?.id), logs, from, today);
  } catch (e) {
    return <SetupNotice message={e instanceof Error ? e.message : String(e)} />;
  }
  const petId = pets.find((p) => p.id === sp.pet)?.id;
  const nonEmpty = history.filter((d) => d.doses.length > 0);

  const exportQ = new URLSearchParams({ days: String(days) });
  if (petId) exportQ.set("pet", petId);

  return (
    <>
      <header className="flex items-end justify-between">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-wider text-brand">Records</p>
          <h1 className="mt-1 text-3xl font-extrabold">History</h1>
        </div>
        <a href={`/api/export?${exportQ.toString()}`} className="btn-soft !px-3 !py-2" download>
          <Download size={16} /> CSV
        </a>
      </header>

      <div className="mt-4 flex gap-2">
        {RANGES.map((r) => (
          <Link
            key={r}
            href={`/history${qs(petId, r)}`}
            className={`rounded-full px-4 py-1.5 text-sm font-extrabold ${
              r === days ? "bg-brand text-white" : "bg-white text-muted"
            }`}
          >
            {r} days
          </Link>
        ))}
      </div>

      {pets.length > 0 ? (
        <nav className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
          <Link
            href={`/history${qs(undefined, days)}`}
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-extrabold ${
              !petId ? "bg-ink text-white" : "bg-white text-muted"
            }`}
          >
            All
          </Link>
          {pets.map((p) => (
            <Link
              key={p.id}
              href={`/history${qs(p.id, days)}`}
              className={`flex shrink-0 items-center gap-2 rounded-full py-1.5 pl-1.5 pr-4 text-sm font-extrabold ${
                petId === p.id ? "bg-ink text-white" : "bg-white text-ink"
              }`}
            >
              <PetAvatar id={p.id} emoji={p.emoji} size={26} />
              {p.name}
            </Link>
          ))}
        </nav>
      ) : null}

      {nonEmpty.length === 0 ? (
        <p className="card mt-6 p-6 text-center text-sm text-muted">No records for this period yet.</p>
      ) : (
        <div className="mt-5 space-y-3">
          {nonEmpty.map(({ date, doses }) => {
            const handled = doses.filter((d) => d.status).length;
            return (
              <section key={date} className="card overflow-hidden">
                <div className="flex items-center justify-between bg-brand-soft/60 px-4 py-2.5">
                  <h2 className="text-sm font-extrabold">{date === today ? "Today" : formatLong(date)}</h2>
                  <span className="text-xs font-bold text-brand-dark">
                    {handled}/{doses.length}
                  </span>
                </div>
                <ul className="divide-y divide-line">
                  {doses.map((d) => {
                    const missed = !d.status && date < today;
                    return (
                      <li key={d.key} className="flex items-center gap-3 px-4 py-2.5">
                        <span className="w-7 text-xs font-extrabold text-muted">{d.slot}</span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-bold">
                            {d.petEmoji} {d.petName} · {d.medicineName}
                          </p>
                          {d.remark ? (
                            <p className="truncate text-xs italic text-muted">“{d.remark}”</p>
                          ) : null}
                        </div>
                        {d.status === "taken" ? (
                          <Check size={20} className="text-mint" strokeWidth={3} />
                        ) : d.status === "skipped" ? (
                          <span className="flex items-center gap-1 text-xs font-bold text-orange-600">
                            <SkipForward size={16} /> Skipped
                          </span>
                        ) : missed ? (
                          <span className="flex items-center gap-1 text-xs font-bold text-coral">
                            <XCircle size={16} /> Missed
                          </span>
                        ) : (
                          <Circle size={20} className="text-line" />
                        )}
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </>
  );
}
