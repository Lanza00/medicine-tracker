import { petColor } from "@/lib/petColor";

/** A pet's round avatar: their photo if they have one, otherwise their emoji icon. */
export default function PetAvatar({
  id,
  emoji,
  photo,
  size = 40,
}: {
  id: string;
  emoji: string;
  photo?: string | null;
  size?: number;
}) {
  if (photo) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- already resized to 400px on upload
      <img
        src={photo}
        alt=""
        width={size}
        height={size}
        loading="lazy"
        decoding="async"
        className={`inline-block shrink-0 rounded-full object-cover ${petColor(id)}`}
        style={{ width: size, height: size }}
        aria-hidden
      />
    );
  }
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
