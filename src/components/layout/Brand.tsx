export function BrandMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden>
      <rect width="32" height="32" rx="7" fill="rgb(var(--card))" stroke="rgb(var(--line))" />
      <path d="M16 5 L27 16 L16 27 L5 16 Z" fill="none" stroke="rgb(var(--cyan))" strokeWidth="2.2" />
      <path d="M16 10.5v11M10.5 16h11" stroke="rgb(var(--red))" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
