function initials(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("") || "?";
}

export function Avatar({
  name,
  src,
  size = 40,
  rounded = "full",
}: {
  name: string;
  src?: string | null;
  size?: number;
  rounded?: "full" | "md";
}) {
  const cls = rounded === "full" ? "rounded-full" : "rounded-md";
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={src}
        alt={name}
        width={size}
        height={size}
        className={`${cls} object-cover`}
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      className={`grid place-items-center ${cls} bg-brand-500 font-semibold text-white`}
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {initials(name)}
    </span>
  );
}
