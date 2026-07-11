export interface NavItem {
  href: string;
  label: string;
  icon: (props: { className?: string }) => JSX.Element;
}

const stroke = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

export const NAV_ITEMS: NavItem[] = [
  {
    href: "/search",
    label: "Search",
    icon: ({ className }) => (
      <svg viewBox="0 0 24 24" className={className} {...stroke}>
        <circle cx="11" cy="11" r="7" />
        <line x1="21" y1="21" x2="16.5" y2="16.5" />
      </svg>
    ),
  },
  {
    href: "/queue",
    label: "Queue",
    icon: ({ className }) => (
      <svg viewBox="0 0 24 24" className={className} {...stroke}>
        <line x1="12" y1="4" x2="12" y2="15" />
        <polyline points="7,10 12,15 17,10" />
        <line x1="4" y1="20" x2="20" y2="20" />
      </svg>
    ),
  },
  {
    href: "/listen",
    label: "Listen",
    icon: ({ className }) => (
      <svg viewBox="0 0 24 24" className={className} {...stroke}>
        <path d="M4 14v-3a8 8 0 0 1 16 0v3" />
        <rect x="3" y="14" width="4" height="6" rx="1.5" />
        <rect x="17" y="14" width="4" height="6" rx="1.5" />
      </svg>
    ),
  },
  {
    href: "/library",
    label: "Library",
    icon: ({ className }) => (
      <svg viewBox="0 0 24 24" className={className} {...stroke}>
        <path d="M3 6a1 1 0 0 1 1-1h5l2 2h9a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6z" />
      </svg>
    ),
  },
  {
    href: "/settings",
    label: "Settings",
    icon: ({ className }) => (
      <svg viewBox="0 0 24 24" className={className} {...stroke}>
        <line x1="4" y1="7" x2="20" y2="7" />
        <circle cx="9" cy="7" r="2" />
        <line x1="4" y1="17" x2="20" y2="17" />
        <circle cx="15" cy="17" r="2" />
      </svg>
    ),
  },
];
