export const tileRegistry = {
  home: {
    id: "home",
    label: "Home",
    icon: Home,
    system: true, // cannot uninstall
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

  store: {
    id: "store",
    label: "Store",
    icon: Grid,
    noUninstall: true, // 🔥 IMPORTANT
  },
};
