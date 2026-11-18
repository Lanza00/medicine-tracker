"use client";

import { useEffect, useState, useTransition } from "react";
import { Bell, BellOff, Send } from "lucide-react";
import { removePushSubscription, savePushSubscription, sendTestPush } from "@/app/actions";

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

type State = "loading" | "unsupported" | "denied" | "off" | "on";

export default function PushControls({ vapidPublicKey }: { vapidPublicKey: string }) {
  const [state, setState] = useState<State>("loading");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    (async () => {
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
        setState("unsupported");
        return;
      }
      if (Notification.permission === "denied") {
        setState("denied");
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      setState(sub ? "on" : "off");
    })().catch(() => setState("unsupported"));
  }, []);

  function enable() {
    setMsg(null);
    startTransition(async () => {
      try {
        if (!vapidPublicKey) {
          setMsg({ ok: false, text: "Push keys are not configured on the server yet." });
          return;
        }
        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
          setState(permission === "denied" ? "denied" : "off");
          return;
        }
        const reg = await navigator.serviceWorker.ready;
        const sub =
          (await reg.pushManager.getSubscription()) ??
          (await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
          }));
        const json = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } };
        const res = await savePushSubscription(json);
        if (!res.ok) {
          setMsg({ ok: false, text: res.error });
          return;
        }
        setState("on");
        setMsg({ ok: true, text: "Notifications are on for this phone." });
      } catch (e) {
        setMsg({ ok: false, text: e instanceof Error ? e.message : "Could not turn on notifications." });
      }
    });
  }

  function disable() {
    setMsg(null);
    startTransition(async () => {
      try {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
          await removePushSubscription(sub.endpoint);
          await sub.unsubscribe();
        }
        setState("off");
      } catch (e) {
        setMsg({ ok: false, text: e instanceof Error ? e.message : "Could not turn off notifications." });
      }
    });
  }

  function test() {
    setMsg(null);
    startTransition(async () => {
      const res = await sendTestPush();
      setMsg(
        res.ok
          ? { ok: true, text: "Test sent. It should arrive in a few seconds." }
          : { ok: false, text: res.error },
      );
    });
  }

  if (state === "loading") return <p className="mt-4 text-sm text-muted">Checking…</p>;
  if (state === "unsupported")
    return (
      <p className="mt-4 rounded-xl bg-peach-soft px-3 py-2 text-sm font-semibold text-orange-700">
        This browser doesn&apos;t support notifications. Try Chrome on Android.
      </p>
    );
  if (state === "denied")
    return (
      <p className="mt-4 rounded-xl bg-coral-soft px-3 py-2 text-sm font-semibold text-coral">
        Notifications are blocked. Open the site settings in Chrome and allow notifications, then reload.
      </p>
    );

  return (
    <div className="mt-4 space-y-3">
      {state === "on" ? (
        <>
          <p className="flex items-center gap-2 text-sm font-bold text-emerald-700">
            <Bell size={18} /> Notifications are on
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button className="btn-soft" onClick={test} disabled={pending}>
              <Send size={16} /> Send test
            </button>
            <button className="btn-ghost !bg-sky" onClick={disable} disabled={pending}>
              <BellOff size={16} /> Turn off
            </button>
          </div>
        </>
      ) : (
        <button className="btn-primary w-full" onClick={enable} disabled={pending}>
          <Bell size={18} /> {pending ? "Working…" : "Turn on notifications"}
        </button>
      )}
      {msg ? (
        <p
          className={`rounded-xl px-3 py-2 text-sm font-semibold ${
            msg.ok ? "bg-mint-soft text-emerald-700" : "bg-coral-soft text-coral"
          }`}
        >
          {msg.text}
        </p>
      ) : null}
    </div>
  );
}
