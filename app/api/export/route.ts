import { getDosesForRange } from "@/lib/data";
import { addDays, nowParts } from "@/lib/dates";

export const dynamic = "force-dynamic";

function csvCell(v: string): string {
  return /[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const days = Math.min(Math.max(Number(url.searchParams.get("days")) || 30, 1), 366);
  const petId = url.searchParams.get("pet") || undefined;
  const today = nowParts().date;

  const history = await getDosesForRange(addDays(today, -(days - 1)), today, petId);

  const rows: string[][] = [["Date", "Pet", "Medicine", "Purpose", "Amount", "Time", "Status", "Remark"]];
  for (const { date, doses } of [...history].reverse()) {
    for (const d of doses) {
      const status = d.status === "taken" ? "Given" : d.status === "skipped" ? "Skipped" : "Not done";
      rows.push([
        date,
        d.petName,
        d.medicineName,
        d.description,
        d.amount,
        d.slot,
        status,
        d.remark,
      ]);
    }
  }
  // BOM so Excel opens UTF-8 correctly.
  const body = "﻿" + rows.map((r) => r.map(csvCell).join(",")).join("\r\n");

  return new Response(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="medicine-history-${today}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
