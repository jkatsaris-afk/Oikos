import { Home, Calendar, ListTodo, StickyNote } from "lucide-react";

// 🔥 ALL AVAILABLE TILES IN SYSTEM
export const tileRegistry = {
  home: {
    id: "home",
    label: "Home",
    icon: Home,
    system: true, // 🔥 cannot uninstall
  },

  calendar: {
    id: "calendar",
    label: "Calendar",
    icon: Calendar,
  },

  chores: {
    id: "chores",
    label: "Chores",
    icon: ListTodo,
  },

  notes: {
    id: "notes",
    label: "Notes",
    icon: StickyNote,
  },
};
