import { RotateCcw } from "lucide-react";
import { resetDemoData } from "@/app/actions";
import { isDemo } from "@/lib/demoMode";

/** Shown at the top of every page on the demo deployment. */
export default function DemoBanner() {
  if (!isDemo()) return null;
  return (
    <div className="sticky top-0 z-30 flex items-center gap-2 bg-ink px-4 py-2 text-xs font-bold text-white">
      <span className="min-w-0 flex-1">
        Demo with sample pets. Your changes stay in this browser only.
      </span>
      <form action={resetDemoData}>
        <button type="submit" className="flex shrink-0 items-center gap-1 rounded-full bg-white/15 px-3 py-1 hover:bg-white/25">
          <RotateCcw size={12} /> Reset demo
        </button>
      </form>
    </div>
  );
}
