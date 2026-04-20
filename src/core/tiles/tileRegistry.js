import { Home, Calendar, ListTodo, StickyNote } from "lucide-react";

/* 🔥 IMPORT TILE PAGES */
import CalendarPage from "../../platforms/apps/calendar/CalendarPage";
import ChoresPage from "../../platforms/apps/chores/ChoresPage";
import NotesPage from "../../platforms/apps/notes/NotesPage";

export const tileRegistry = {
  home: {
    id: "home",
    label: "Home",
    icon: Home,
    system: true,
  },

  calendar: {
    id: "calendar",
    label: "Calendar",
    icon: Calendar,
    component: CalendarPage,
  },

  chores: {
    id: "chores",
    label: "Chores",
    icon: ListTodo,
    component: ChoresPage,
  },

  notes: {
    id: "notes",
    label: "Notes",
    icon: StickyNote,
    component: NotesPage,
  },

  extra1: {
    id: "extra1",
    label: "Extra 1",
    icon: Calendar,
  },

  extra2: {
    id: "extra2",
    label: "Extra 2",
    icon: Calendar,
  },
};
