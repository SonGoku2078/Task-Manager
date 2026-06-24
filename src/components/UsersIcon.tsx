// Two-tone "two people" icon for the Benutzer menu (pink + orange).
export default function UsersIcon({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      {/* Back person (orange) */}
      <circle cx="16" cy="8.5" r="3.2" fill="#fb923c" />
      <path
        d="M9.5 19c0-3.3 2.9-5.5 6.5-5.5s6.5 2.2 6.5 5.5z"
        fill="#fb923c"
      />
      {/* Front person (pink) */}
      <circle cx="8.5" cy="8" r="3.6" fill="#f472b6" />
      <path
        d="M1.5 19.5c0-3.7 3.1-6 7-6s7 2.3 7 6z"
        fill="#f472b6"
      />
    </svg>
  );
}
