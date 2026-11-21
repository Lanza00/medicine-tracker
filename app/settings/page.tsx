import SetupNotice from "@/components/SetupNotice";
import SettingsForm from "@/components/SettingsForm";
import PushControls from "@/components/PushControls";
import { getSettings } from "@/lib/data";
import { hasSupabaseEnv } from "@/lib/supabase";
import { isDemo } from "@/lib/demoMode";

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
        {isDemo() ? (
          <p className="mt-4 rounded-xl bg-peach-soft px-3 py-2 text-sm font-semibold text-orange-700">
            Push reminders are turned off in this demo. In the real app, the phone gets a reminder when a
            dose hasn&apos;t been ticked by its time, and one more nudge 30 minutes later.
          </p>
        ) : (
          <PushControls vapidPublicKey={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ""} />
        )}
      </section>
    </>
  );
}
