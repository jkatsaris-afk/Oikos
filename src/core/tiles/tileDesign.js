import { Megaphone, Calendar, CheckSquare, Home } from "lucide-react";

/**
 * =========================================
 * TILE DESIGN CONFIG
 * =========================================
 * Controls how tiles look in the dock
 * This is the ONLY file you edit for dock visuals
 */

export const tileDesign = {
  announcements: {
    icon: Megaphone,
    label: "Announcements",
    color: "#4A4A4A",
    background: "rgba(255,255,255,0.7)",
  },

  calendar: {
    icon: Calendar,
    label: "Calendar",
    color: "#2F6EA3",
    background: "rgba(255,255,255,0.7)",
  },

  chores: {
    icon: CheckSquare,
    label: "Chores",
    color: "#96B379",
    background: "rgba(255,255,255,0.7)",
  },

  home: {
    icon: Home,
    label: "Home",
    color: "#1f2937",
    background: "rgba(255,255,255,0.7)",
  },
};
