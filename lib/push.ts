import webpush from "web-push";
import { db } from "./supabase";

let configured = false;

function configure(): boolean {
  if (configured) return true;
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return false;
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:admin@example.com", pub, priv);
  configured = true;
  return true;
}

export type PushPayload = { title: string; body: string; tag?: string; url?: string };

/** Send a notification to every saved device. Dead subscriptions are removed. */
export async function sendPushToAll(
  payload: PushPayload,
): Promise<{ configured: boolean; sent: number; failed: number }> {
  if (!configure()) return { configured: false, sent: 0, failed: 0 };

  const { data } = await db().from("push_subscriptions").select("endpoint,p256dh,auth");
  const subs = (data ?? []) as { endpoint: string; p256dh: string; auth: string }[];

  let sent = 0;
  let failed = 0;
  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          JSON.stringify(payload),
        );
        sent++;
      } catch (err) {
        failed++;
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          await db().from("push_subscriptions").delete().eq("endpoint", s.endpoint);
        }
      }
    }),
  );
  return { configured: true, sent, failed };
}
