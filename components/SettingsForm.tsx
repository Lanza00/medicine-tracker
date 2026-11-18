"use client";

import { useState, useTransition } from "react";
import { Check } from "lucide-react";
import { saveSettings } from "@/app/actions";
import type { Settings } from "@/lib/types";

export default function SettingsForm({ initial }: { initial: Settings }) {
  const [am, setAm] = useState(initial.am_time);
  const [pm, setPm] = useState(initial.pm_time);
  const [enabled, setEnabled] = useState(initial.reminders_enabled);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  function save(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    startTransition(async () => {
      const res = await saveSettings(am, pm, enabled);
      setMsg(res.ok ? { ok: true, text: "Saved" } : { ok: false, text: res.error });
    });
  }

  return (
    <form onSubmit={save} className="mt-4 space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="am">
            ☀️ Morning
          </label>
          <input id="am" type="time" className="input" value={am} onChange={(e) => setAm(e.target.value)} required />
        </div>
        <div>
          <label className="label" htmlFor="pm">
            🌙 Evening
          </label>
          <input id="pm" type="time" className="input" value={pm} onChange={(e) => setPm(e.target.value)} required />
        </div>
      </div>

      <label className="flex items-center justify-between rounded-xl bg-sky px-4 py-3">
        <span className="text-sm font-bold">Send reminders</span>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          onClick={() => setEnabled((v) => !v)}
          className={`relative h-7 w-12 rounded-full transition ${enabled ? "bg-mint" : "bg-slate-300"}`}
        >
          <span
            className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all ${
              enabled ? "left-[22px]" : "left-0.5"
            }`}
          />
        </button>
      </label>

      {msg ? (
        <p
          className={`rounded-xl px-3 py-2 text-sm font-semibold ${
            msg.ok ? "bg-mint-soft text-emerald-700" : "bg-coral-soft text-coral"
          }`}
        >
          {msg.text}
        </p>
      ) : null}

      <button type="submit" className="btn-primary w-full" disabled={pending}>
        <Check size={18} /> {pending ? "Saving…" : "Save"}
      </button>
    </form>
  );
}
