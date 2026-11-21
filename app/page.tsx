import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import DoseList from "@/components/DoseList";
import PetAvatar from "@/components/PetAvatar";
import SetupNotice from "@/components/SetupNotice";
import { buildDoses, forPet, getLogs, getMedications, getPets, getSettings } from "@/lib/data";
import { addDays, formatLong, formatTime12, isDateKey, nowParts } from "@/lib/dates";
import { hasSupabaseEnv } from "@/lib/supabase";

export const dynamic = "force-dynamic";

type SP = { date?: string; pet?: string };

function href(date: string, today: string, pet?: string) {
  const q = new URLSearchParams();
  if (date !== today) q.set("date", date);
  if (pet) q.set("pet", pet);
  const s = q.toString();
  return s ? `/?${s}` : "/";
}

export default async function TodayPage({ searchParams }: { searchParams: Promise<SP> }) {
  if (!hasSupabaseEnv()) return <SetupNotice />;

  const sp = await searchParams;
  const today = nowParts().date;
  const date = isDateKey(sp.date) ? sp.date : today;

  let pets, settings, doses;
  try {
    // One round of queries, all in parallel. Filtering by pet happens here instead of in a second query.
    const [p, s, meds, logs] = await Promise.all([getPets(), getSettings(), getMedications(), getLogs(date, date)]);
    pets = p;
    settings = s;
    doses = buildDoses(forPet(meds, pets.find((x) => x.id === sp.pet)?.id), logs, date);
  } catch (e) {
    return <SetupNotice message={e instanceof Error ? e.message : String(e)} />;
  }
  const petId = pets.find((p) => p.id === sp.pet)?.id;

  return (
    <>
      <header>
        <p className="text-xs font-extrabold uppercase tracking-wider text-brand">Medicine Tracker</p>
        <h1 className="mt-1 text-3xl font-extrabold">
          {date === today ? "Today" : formatLong(date)}
        </h1>
        <div className="mt-3 flex items-center justify-between">
          <Link
            href={href(addDays(date, -1), today, petId)}
            className="btn-soft !px-3 !py-2"
            aria-label="Previous day"
          >
            <ChevronLeft size={18} />
          </Link>
          <div className="text-center">
            <p className="text-sm font-bold">{formatLong(date)}</p>
            {date !== today ? (
              <Link href={href(today, today, petId)} className="text-xs font-bold text-brand">
                Back to today
              </Link>
            ) : null}
          </div>
          <Link
            href={href(addDays(date, 1), today, petId)}
            className="btn-soft !px-3 !py-2"
            aria-label="Next day"
          >
            <ChevronRight size={18} />
          </Link>
        </div>
      </header>

      {pets.length > 0 ? (
        <nav className="-mx-4 mt-5 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
          <Link
            href={href(date, today)}
            className={`flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-extrabold transition ${
              !petId ? "bg-brand text-white shadow-card" : "bg-white text-muted"
            }`}
          >
            All
          </Link>
          {pets.map((p) => (
            <Link
              key={p.id}
              href={href(date, today, p.id)}
              className={`flex shrink-0 items-center gap-2 rounded-full py-1.5 pl-1.5 pr-4 text-sm font-extrabold transition ${
                petId === p.id ? "bg-brand text-white shadow-card" : "bg-white text-ink"
              }`}
            >
              <PetAvatar id={p.id} emoji={p.emoji} size={28} />
              {p.name}
            </Link>
          ))}
        </nav>
      ) : null}

      <DoseList
        doses={doses}
        showPet={!petId}
        amLabel={formatTime12(settings.am_time)}
        pmLabel={formatTime12(settings.pm_time)}
      />
    </>
  );
}
