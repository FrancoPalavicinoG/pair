import type { ReactElement, SVGProps } from "react";
import type { ActivityCategory } from "@/lib/activity-category";

// Set de íconos por categoría de actividad (docs/style.md, "Iconos"): trazo fino,
// sin relleno, `stroke="currentColor"` para heredar color/hover de quien lo use
// (ej. className="text-graphite transition-colors group-hover:text-panel-muted").
type IconProps = SVGProps<SVGSVGElement>;

const BASE_PROPS = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

export function RunningIcon(props: IconProps) {
  return (
    <svg {...BASE_PROPS} {...props}>
      <circle cx="15.5" cy="4.5" r="1.6" />
      <path d="M5 20l4-4.5 3-2 1.5-4M9 15.5l4 1.5 3 3.5M12.5 10l3 1.5 3.5-1" />
    </svg>
  );
}

export function CyclingIcon(props: IconProps) {
  return (
    <svg {...BASE_PROPS} {...props}>
      <circle cx="5.5" cy="17" r="3" />
      <circle cx="18.5" cy="17" r="3" />
      <path d="M5.5 17l4.5-9h4l4.5 9M10 8h4M10 8l2.5 5.5" />
    </svg>
  );
}

export function HikingIcon(props: IconProps) {
  return (
    <svg {...BASE_PROPS} {...props}>
      <path d="M4 19l6-13 3 6.5L15.5 6l4.5 13" />
      <path d="M9.5 12.5l2 1.5" />
    </svg>
  );
}

export function SwimmingIcon(props: IconProps) {
  return (
    <svg {...BASE_PROPS} {...props}>
      <path d="M3 9c1.5-1.5 3-1.5 4.5 0s3 1.5 4.5 0 3-1.5 4.5 0 3 1.5 4.5 0" />
      <path d="M3 14.5c1.5-1.5 3-1.5 4.5 0s3 1.5 4.5 0 3-1.5 4.5 0 3 1.5 4.5 0" />
      <path d="M3 19.5c1.5-1.5 3-1.5 4.5 0s3 1.5 4.5 0 3-1.5 4.5 0 3 1.5 4.5 0" />
    </svg>
  );
}

export function GymIcon(props: IconProps) {
  return (
    <svg {...BASE_PROPS} {...props}>
      <path d="M3 12h2M19 12h2M5 12h1M18 12h1" />
      <rect x="3.5" y="9.5" width="2" height="5" rx="0.5" />
      <rect x="18.5" y="9.5" width="2" height="5" rx="0.5" />
      <rect x="6" y="8" width="2.5" height="8" rx="0.5" />
      <rect x="15.5" y="8" width="2.5" height="8" rx="0.5" />
    </svg>
  );
}

export function WinterSportsIcon(props: IconProps) {
  return (
    <svg {...BASE_PROPS} {...props}>
      <path d="M5 20l4-15M9 5l2 2M15 20l4-15M19 5l2 2" />
      <path d="M3 20h5M14 20h5" />
    </svg>
  );
}

export function TeamSportsIcon(props: IconProps) {
  return (
    <svg {...BASE_PROPS} {...props}>
      <circle cx="12" cy="12" r="8" />
      <path d="M6 8.5c2 1.2 4 1.2 6 0s4-1.2 6 0M6 15.5c2-1.2 4-1.2 6 0s4 1.2 6 0" />
    </svg>
  );
}

export function RacketSportsIcon(props: IconProps) {
  return (
    <svg {...BASE_PROPS} {...props}>
      <ellipse cx="9.5" cy="8" rx="5" ry="6" transform="rotate(-25 9.5 8)" />
      <path d="M13 12.5L20 20" />
    </svg>
  );
}

export function OtherIcon(props: IconProps) {
  return (
    <svg {...BASE_PROPS} {...props}>
      <path d="M12 4v16M4 12h16M6.5 6.5l11 11M17.5 6.5l-11 11" />
    </svg>
  );
}

export const ACTIVITY_ICON: Record<ActivityCategory, (props: IconProps) => ReactElement> = {
  running: RunningIcon,
  cycling: CyclingIcon,
  hiking: HikingIcon,
  swimming: SwimmingIcon,
  gym: GymIcon,
  winter_sports: WinterSportsIcon,
  team_sports: TeamSportsIcon,
  racket_sports: RacketSportsIcon,
  other: OtherIcon,
};

export function getActivityIcon(category: ActivityCategory) {
  return ACTIVITY_ICON[category];
}
