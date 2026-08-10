import type { RoleInfo } from "@/lib/roles";

export default function RoleIcon({ id }: { id: RoleInfo["id"] }) {
  const common = {
    width: 28,
    height: 28,
    viewBox: "0 0 28 28",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.6,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  switch (id) {
    case "WEREWOLF":
      // angular ears + muzzle silhouette
      return (
        <svg {...common}>
          <path d="M6 20 L8 9 L13 13 L14 8 L15 13 L20 9 L22 20 Z" />
          <path d="M10 20 Q14 23 18 20" />
          <circle cx="11.5" cy="15.5" r="0.8" fill="currentColor" stroke="none" />
          <circle cx="16.5" cy="15.5" r="0.8" fill="currentColor" stroke="none" />
        </svg>
      );
    case "SEER":
      // eye
      return (
        <svg {...common}>
          <path d="M4 14 C8 8 20 8 24 14 C20 20 8 20 4 14 Z" />
          <circle cx="14" cy="14" r="3.2" />
        </svg>
      );
    case "DOCTOR":
      // herb / remedy cross
      return (
        <svg {...common}>
          <path d="M14 6 C14 12 14 12 20 12 C14 12 14 12 14 18 C14 12 14 12 8 12 C14 12 14 12 14 6 Z" />
          <path d="M14 18 L14 23" />
          <path d="M14 23 C11 23 9 21 9 19" />
          <path d="M14 23 C17 23 19 21 19 19" />
        </svg>
      );
    case "VILLAGER":
    default:
      // small house
      return (
        <svg {...common}>
          <path d="M6 15 L14 8 L22 15" />
          <path d="M8.5 13 V22 H19.5 V13" />
          <path d="M12.5 22 V17 H15.5 V22" />
        </svg>
      );
  }
}
