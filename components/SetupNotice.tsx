import { DatabaseZap } from "lucide-react";

export default function SetupNotice({ message }: { message?: string }) {
  return (
    <div className="card mt-10 p-6 text-center">
      <DatabaseZap className="mx-auto text-brand" size={36} />
      <h1 className="mt-3 text-lg font-extrabold">Almost there</h1>
      <p className="mt-2 text-sm text-muted">
        The app can&apos;t reach the database yet. Add{" "}
        <code className="rounded bg-sky px-1.5 py-0.5 text-xs">NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
        <code className="rounded bg-sky px-1.5 py-0.5 text-xs">SUPABASE_SERVICE_ROLE_KEY</code>, then run{" "}
        <code className="rounded bg-sky px-1.5 py-0.5 text-xs">supabase/schema.sql</code>.
      </p>
      {message ? <p className="mt-3 break-words text-xs text-coral">{message}</p> : null}
    </div>
  );
}
