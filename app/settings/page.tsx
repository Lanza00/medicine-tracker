import SetupNotice from "@/components/SetupNotice";
import SettingsForm from "@/components/SettingsForm";
import PushControls from "@/components/PushControls";
import { getSettings } from "@/lib/data";
import { hasSupabaseEnv } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  if (!hasSupabaseEnv()) return <SetupNotice />;
  let settings;
  try {
    settings = await getSettings();
  } catch (e) {
    return <SetupNotice message={e instanceof Error ? e.message : String(e)} />;
  }

  return (
    <>
      <header>
        <p className="text-xs font-extrabold uppercase tracking-wider text-brand">Preferences</p>
        <h1 className="mt-1 text-3xl font-extrabold">Settings</h1>
      </header>

      <section className="card mt-5 p-4">
        <h2 className="font-extrabold">Reminder times</h2>
        <p className="mt-0.5 text-xs text-muted">We&apos;ll remind you if a dose hasn&apos;t been ticked.</p>
        <SettingsForm initial={settings} />
      </section>

      <section className="card mt-5 p-4">
        <h2 className="font-extrabold">Notifications on this phone</h2>
        <p className="mt-0.5 text-xs text-muted">
          For the most reliable reminders, add this app to your Home Screen first (Chrome menu → Add to Home
          screen / Install app).
        </p>
        <PushControls vapidPublicKey={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ""} />
      </section>
    </>
  );
}
