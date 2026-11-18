import { petColor } from "@/lib/petColor";

export default function PetAvatar({
  id,
  emoji,
  size = 40,
}: {
  id: string;
  emoji: string;
  size?: number;
}) {
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full ${petColor(id)}`}
      style={{ width: size, height: size, fontSize: size * 0.55 }}
      aria-hidden
    >
      {emoji}
    </span>
  );
}
