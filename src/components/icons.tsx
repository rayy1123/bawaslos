// Ikon garis minimalis (menggantikan emoji dekoratif) — stroke ink/gold.
type I = { className?: string };

export function SealIcon({ className = 'h-4 w-4' }: I) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <circle cx="12" cy="10" r="6" />
      <path d="M12 2v2M12 16v2M5 22h14M9 22l1-2M15 22l-1-2" />
    </svg>
  );
}

export function BallotIcon({ className = 'h-4 w-4' }: I) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <rect x="4" y="8" width="16" height="12" rx="1.5" />
      <path d="M9 8V5a3 3 0 0 1 6 0v3M4 12h16" />
    </svg>
  );
}

export function ArrowRight({ className = 'h-4 w-4' }: I) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

export function CheckIcon({ className = 'h-4 w-4' }: I) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M5 12.5l4.5 4.5L19 7" />
    </svg>
  );
}

export function LockIcon({ className = 'h-4 w-4' }: I) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3M12 15v2" />
    </svg>
  );
}