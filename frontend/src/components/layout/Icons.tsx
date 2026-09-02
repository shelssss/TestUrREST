/**
 * Inline icons.
 *
 * Hand-drawn on a 16px grid rather than pulled from an icon package: the
 * app needs a dozen glyphs, and inlining them keeps the bundle small and
 * the stroke weight consistent with the rest of the interface.
 */

interface IconProps {
  className?: string
}

const base = {
  width: 16,
  height: 16,
  viewBox: '0 0 16 16',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
}

export const DashboardIcon = ({ className }: IconProps) => (
  <svg {...base} className={className}>
    <rect x="2" y="2" width="5" height="5" rx="1" />
    <rect x="9" y="2" width="5" height="5" rx="1" />
    <rect x="2" y="9" width="5" height="5" rx="1" />
    <rect x="9" y="9" width="5" height="5" rx="1" />
  </svg>
)

export const ProjectsIcon = ({ className }: IconProps) => (
  <svg {...base} className={className}>
    <path d="M2 4.5A1.5 1.5 0 0 1 3.5 3h2.4l1.3 1.6h5.3A1.5 1.5 0 0 1 14 6.1v5.4a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 2 11.5v-7Z" />
  </svg>
)

export const OverviewIcon = ({ className }: IconProps) => (
  <svg {...base} className={className}>
    <circle cx="8" cy="8" r="6" />
    <path d="M8 4.5V8l2.4 1.4" />
  </svg>
)

export const EndpointsIcon = ({ className }: IconProps) => (
  <svg {...base} className={className}>
    <circle cx="4" cy="4" r="1.75" />
    <circle cx="12" cy="12" r="1.75" />
    <path d="M4 5.75v3.5A2.75 2.75 0 0 0 6.75 12H10" />
  </svg>
)

export const ExplorerIcon = ({ className }: IconProps) => (
  <svg {...base} className={className}>
    <path d="M2 8h9" />
    <path d="M8 5l3 3-3 3" />
    <path d="M13.5 3v10" />
  </svg>
)

export const LogsIcon = ({ className }: IconProps) => (
  <svg {...base} className={className}>
    <path d="M3 3h10M3 6.5h10M3 10h7M3 13.5h7" />
  </svg>
)

export const AnalyticsIcon = ({ className }: IconProps) => (
  <svg {...base} className={className}>
    <path d="M2 13V9M6 13V4M10 13v-6M14 13V6" />
  </svg>
)

export const SettingsIcon = ({ className }: IconProps) => (
  <svg {...base} className={className}>
    <circle cx="8" cy="8" r="2.25" />
    <path d="M8 1.5v1.8M8 12.7v1.8M14.5 8h-1.8M3.3 8H1.5M12.6 3.4l-1.3 1.3M4.7 11.3l-1.3 1.3M12.6 12.6l-1.3-1.3M4.7 4.7 3.4 3.4" />
  </svg>
)

export const PlusIcon = ({ className }: IconProps) => (
  <svg {...base} className={className}>
    <path d="M8 3.5v9M3.5 8h9" />
  </svg>
)

export const SearchIcon = ({ className }: IconProps) => (
  <svg {...base} className={className}>
    <circle cx="7" cy="7" r="4.25" />
    <path d="m10.2 10.2 3 3" />
  </svg>
)

export const ChevronDownIcon = ({ className }: IconProps) => (
  <svg {...base} className={className}>
    <path d="m4 6 4 4 4-4" />
  </svg>
)

export const CheckIcon = ({ className }: IconProps) => (
  <svg {...base} className={className}>
    <path d="m3.5 8.5 3 3 6-7" />
  </svg>
)

export const CopyIcon = ({ className }: IconProps) => (
  <svg {...base} className={className}>
    <rect x="5.5" y="5.5" width="8" height="8" rx="1.5" />
    <path d="M10.5 3.5A1.5 1.5 0 0 0 9 2H4a1.5 1.5 0 0 0-1.5 1.5v5A1.5 1.5 0 0 0 4 10" />
  </svg>
)

export const SendIcon = ({ className }: IconProps) => (
  <svg {...base} className={className}>
    <path d="M14 2 7 9M14 2l-4.5 12-2.5-5L2 6.5 14 2Z" />
  </svg>
)

export const TrashIcon = ({ className }: IconProps) => (
  <svg {...base} className={className}>
    <path d="M2.5 4h11M6 4V2.5h4V4M4 4l.6 9a1 1 0 0 0 1 .9h4.8a1 1 0 0 0 1-.9L12 4" />
  </svg>
)

export const EditIcon = ({ className }: IconProps) => (
  <svg {...base} className={className}>
    <path d="M11.5 2.5a1.8 1.8 0 0 1 2.5 2.5L5.5 13.5 2 14l.5-3.5 9-8Z" />
  </svg>
)

export const MenuIcon = ({ className }: IconProps) => (
  <svg {...base} className={className}>
    <path d="M2.5 4h11M2.5 8h11M2.5 12h11" />
  </svg>
)

export const CloseIcon = ({ className }: IconProps) => (
  <svg {...base} className={className}>
    <path d="m4 4 8 8M12 4l-8 8" />
  </svg>
)

export const SunIcon = ({ className }: IconProps) => (
  <svg {...base} className={className}>
    <circle cx="8" cy="8" r="3" />
    <path d="M8 1.5v1.2M8 13.3v1.2M14.5 8h-1.2M2.7 8H1.5M12.6 3.4l-.9.9M4.3 11.7l-.9.9M12.6 12.6l-.9-.9M4.3 4.3l-.9-.9" />
  </svg>
)

export const MoonIcon = ({ className }: IconProps) => (
  <svg {...base} className={className}>
    <path d="M13.5 9.4A5.8 5.8 0 0 1 6.6 2.5a5.8 5.8 0 1 0 6.9 6.9Z" />
  </svg>
)

export const ArrowLeftIcon = ({ className }: IconProps) => (
  <svg {...base} className={className}>
    <path d="M13 8H3M7 4 3 8l4 4" />
  </svg>
)

export const RefreshIcon = ({ className }: IconProps) => (
  <svg {...base} className={className}>
    <path d="M13.5 7a5.5 5.5 0 1 0-.6 3.5" />
    <path d="M13.5 3.5V7H10" />
  </svg>
)
