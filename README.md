# Medicine Tracker

Simple web app to track daily medicine for pets (works for people too).
Next.js (App Router) · TypeScript · Tailwind · Framer Motion · Lucide · Supabase · Vercel.

No login. One client, one database. Phone-first, installable as an app (PWA) with push reminders.

## Screens

| Screen | What it does |
|---|---|
| **Today** | Tabs: All + one per pet. Doses grouped Morning / Evening. Tap the circle to tick. Note button → add a note or **Skip** with a reason. Arrows move between days. |
| **Pets** | List pets, add a pet. Open a pet to add / stop / delete medicine. |
| **Add medicine** | Pick an existing medicine or create a new one. Amount is free text (`0.125`, `1/8 tab`). Choose AM / PM, start date, optional end date. |
| **History** | Last 7 / 14 / 30 days, filter by pet, **CSV export**. |
| **Settings** | Reminder times, on/off, turn on notifications for this phone, send a test. |

## 1. Run locally

```bash
npm install
cp .env.example .env.local     # then fill it in (steps below)
npm run dev                    # http://localhost:3000
```

## 2. Supabase

1. Create a project at supabase.com (free tier is fine).
2. **SQL Editor → New query**, paste `supabase/schema.sql`, **Run**.
3. **Project Settings → API**: copy the Project URL and the **service_role** key into `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`  ← server only, never expose it

All tables have RLS enabled with **no policies**: the public/anon key can read and write nothing.
Only the Next.js server (service role key) touches the data.

> Free-tier Supabase pauses a project after ~1 week of no activity. Opening the app or the
> reminder cron (below) counts as activity.

## 3. Push reminders

```bash
npm run gen-vapid
```

Put the output in `.env.local`:

```
NEXT_PUBLIC_VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
VAPID_SUBJECT=mailto:you@example.com
CRON_SECRET=<long random string>
```

Reminder rules (Malaysia time by default, change with `NEXT_PUBLIC_TZ`):
- After the slot time (default AM 08:00, PM 20:00), if doses are still not ticked → one push listing who/what.
- One more nudge after 30 minutes, then stop (max 2 per slot per day).
- Stops 3 hours after the slot time. Ticked or skipped doses are never reminded.

### Trigger the reminders every 5 minutes

Vercel Hobby cron only runs once a day, so use a free external scheduler:

**cron-job.org** (easiest)
- URL: `https://YOUR-APP.vercel.app/api/cron/reminders`
- Schedule: every 5 minutes
- Header: `Authorization: Bearer <CRON_SECRET>`  (or append `?secret=<CRON_SECRET>` to the URL)

The endpoint returns JSON showing what it did, handy for debugging.

## 4. Deploy to Vercel

1. Push this folder to GitHub, **Add New → Project** on Vercel, import the repo.
2. Add all variables from `.env.example` in **Settings → Environment Variables**.
3. Deploy, then set up the cron job above with the final URL.

## 5. On the client's Android phone

1. Open the Vercel link in **Chrome**.
2. Chrome menu → **Add to Home screen / Install app**.
3. Open the installed app → **Settings → Turn on notifications → Allow**.
4. Tap **Send test** to confirm.

## 6. Public demo (for a portfolio)

Set `NEXT_PUBLIC_DEMO_MODE=1` on a **separate** Vercel project to get a safe demo:

- Every visitor starts with the same made-up pets (Milo, Coco, Oreo) and a few weeks of history.
- Their changes are saved in their own browser (cookies), so visitors never see each other's edits.
  A **Reset demo** button in the top bar brings back the sample data.
- It never connects to Supabase (the database client refuses to start in demo mode) and never sends
  notifications. Do **not** add the Supabase, VAPID or cron variables to the demo project.

Run it locally with `NEXT_PUBLIC_DEMO_MODE=1 npm run dev`.

## Notes

- Today's doses are generated from each pet's active medicine; only ticks/skips are stored.
- **Stop** ends a medicine from today (history kept). **Delete** removes it and its records.
- Anyone with the link can use the app (no login by design). If you ever need privacy, add Supabase Auth
  and per-user RLS; the schema is ready for an `owner_id` column.
- Text is in English; strings live in the components.
