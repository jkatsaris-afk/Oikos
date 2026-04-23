import { supabase } from "../../../auth/supabaseClient";
import { fetchOrganizationAccess } from "../../../core/settings/organizationAccessService";

const ANNOUNCEMENTS_KEY = "oikos.church.announcements";
const EVENTS_KEY = "oikos.church.events";
const CHURCH_ANNOUNCEMENTS_TABLE = "church_announcements";
const CHURCH_EVENTS_TABLE = "church_events";
const MAX_PRE_SERVICE_ENTRIES = 6;

const defaultAnnouncements = [
  {
    id: "announcement-1",
    title: "Welcome To Fallon Church of Christ",
    body: "We are glad you are here. Service begins soon, and the pre-service loop is ready for your screens.",
    showOnLive: true,
    type: "announcement",
  },
  {
    id: "announcement-2",
    title: "Midweek Bible Study",
    body: "Join us Wednesday at 7:00 PM for Bible study and prayer.",
    showOnLive: true,
    type: "announcement",
  },
  {
    id: "announcement-3",
    title: "Prayer Requests",
    body: "Please see the welcome desk after service if you would like to share a prayer need.",
    showOnLive: true,
    type: "announcement",
  },
];

const defaultEvents = [
  {
    id: "event-1",
    title: "Community Fellowship Meal",
    body: "Bring a side if you can and stay after service.",
    eventDate: "",
    location: "Fellowship Hall",
    eventTime: "Sunday at 12:30 PM",
    showOnLive: true,
    type: "event",
  },
  {
    id: "event-2",
    title: "Youth Devotional Night",
    body: "Worship, teaching, and dinner for students.",
    eventDate: "",
    location: "Student Center",
    eventTime: "Friday at 6:30 PM",
    showOnLive: true,
    type: "event",
  },
];

function normalizeEvent(row = {}) {
  return {
    id: row.id || `event-${Date.now()}`,
    title: row.title || "",
    eventDate: row.event_date || row.eventDate || "",
    location: row.location || "",
    eventTime: row.event_time || row.eventTime || "",
    body: row.body || "",
    showOnLive: row.show_on_live !== false && row.showOnLive !== false,
    type: "event",
  };
}

function normalizeAnnouncement(row = {}) {
  return {
    id: row.id || `announcement-${Date.now()}`,
    title: row.title || "",
    body: row.body || "",
    showOnLive: row.show_on_live !== false && row.showOnLive !== false,
    type: "announcement",
  };
}

function buildGroupedLoopBody(items = [], formatter) {
  const visibleItems = items.filter(Boolean);
  const shownItems = visibleItems.slice(0, MAX_PRE_SERVICE_ENTRIES);
  const extraCount = Math.max(visibleItems.length - shownItems.length, 0);

  const lines = shownItems.map((item, index) => formatter(item, index));

  if (extraCount > 0) {
    lines.push(`+ ${extraCount} more`);
  }

  return lines.join("\n\n");
}

function buildEventMeta(item = {}) {
  return [item.eventDate, item.location, item.eventTime].filter(Boolean).join(" • ");
}

function readLocalArray(key, fallback) {
  if (typeof window === "undefined") {
    return fallback;
  }

  try {
    const raw = window.localStorage.getItem(key);

    if (!raw) {
      return fallback;
    }

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : fallback;
  } catch (error) {
    console.error("Church content local load error:", error);
    return fallback;
  }
}

function writeLocalArray(key, value) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error("Church content local save error:", error);
  }
}

export function getChurchAnnouncements() {
  return readLocalArray(ANNOUNCEMENTS_KEY, defaultAnnouncements).map((item) =>
    normalizeAnnouncement(item)
  );
}

export function getChurchEvents() {
  return readLocalArray(EVENTS_KEY, defaultEvents).map((item) => normalizeEvent(item));
}

export function saveChurchAnnouncements(items) {
  writeLocalArray(ANNOUNCEMENTS_KEY, items);
  return items;
}

export function saveChurchEvents(items) {
  writeLocalArray(EVENTS_KEY, items);
  return items;
}

async function getChurchAccountId(userId) {
  const access = await fetchOrganizationAccess(userId, "church");
  return access?.account?.id || null;
}

export async function loadChurchEvents(userId) {
  if (!userId) {
    return getChurchEvents();
  }

  try {
    const accountId = await getChurchAccountId(userId);

    if (!accountId) {
      return getChurchEvents();
    }

    const { data, error } = await supabase
      .from(CHURCH_EVENTS_TABLE)
      .select("id, title, event_date, location, event_time, body, show_on_live, created_at")
      .eq("account_id", accountId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Church events load error:", error);
      return getChurchEvents();
    }

    const nextEvents = Array.isArray(data) ? data.map((item) => normalizeEvent(item)) : [];
    saveChurchEvents(nextEvents);
    return nextEvents;
  } catch (error) {
    console.error("Church events load error:", error);
    return getChurchEvents();
  }
}

export async function loadChurchAnnouncements(userId) {
  if (!userId) {
    return getChurchAnnouncements();
  }

  try {
    const accountId = await getChurchAccountId(userId);

    if (!accountId) {
      return getChurchAnnouncements();
    }

    const { data, error } = await supabase
      .from(CHURCH_ANNOUNCEMENTS_TABLE)
      .select("id, title, body, show_on_live, created_at")
      .eq("account_id", accountId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Church announcements load error:", error);
      return getChurchAnnouncements();
    }

    const nextAnnouncements = Array.isArray(data)
      ? data.map((item) => normalizeAnnouncement(item))
      : [];
    saveChurchAnnouncements(nextAnnouncements);
    return nextAnnouncements;
  } catch (error) {
    console.error("Church announcements load error:", error);
    return getChurchAnnouncements();
  }
}

export async function createChurchAnnouncement(userId, draft) {
  const nextAnnouncement = normalizeAnnouncement(draft);

  if (!userId) {
    const nextAnnouncements = [nextAnnouncement, ...getChurchAnnouncements()];
    saveChurchAnnouncements(nextAnnouncements);
    return nextAnnouncements;
  }

  try {
    const accountId = await getChurchAccountId(userId);

    if (!accountId) {
      const nextAnnouncements = [nextAnnouncement, ...getChurchAnnouncements()];
      saveChurchAnnouncements(nextAnnouncements);
      return nextAnnouncements;
    }

    const { error } = await supabase.from(CHURCH_ANNOUNCEMENTS_TABLE).insert({
      account_id: accountId,
      title: nextAnnouncement.title,
      body: nextAnnouncement.body,
      show_on_live: nextAnnouncement.showOnLive,
      created_by: userId,
    });

    if (error) {
      throw error;
    }

    return loadChurchAnnouncements(userId);
  } catch (error) {
    console.error("Church announcement create error:", error);
    const nextAnnouncements = [nextAnnouncement, ...getChurchAnnouncements()];
    saveChurchAnnouncements(nextAnnouncements);
    return nextAnnouncements;
  }
}

export async function deleteChurchAnnouncement(userId, announcementId) {
  if (!userId) {
    const nextAnnouncements = getChurchAnnouncements().filter(
      (item) => item.id !== announcementId
    );
    saveChurchAnnouncements(nextAnnouncements);
    return nextAnnouncements;
  }

  try {
    const { error } = await supabase
      .from(CHURCH_ANNOUNCEMENTS_TABLE)
      .delete()
      .eq("id", announcementId);

    if (error) {
      throw error;
    }

    return loadChurchAnnouncements(userId);
  } catch (error) {
    console.error("Church announcement delete error:", error);
    const nextAnnouncements = getChurchAnnouncements().filter(
      (item) => item.id !== announcementId
    );
    saveChurchAnnouncements(nextAnnouncements);
    return nextAnnouncements;
  }
}

export async function toggleChurchAnnouncementLive(userId, announcement) {
  if (!announcement?.id) {
    return getChurchAnnouncements();
  }

  const nextValue = announcement.showOnLive === false;

  if (!userId) {
    const nextAnnouncements = getChurchAnnouncements().map((item) =>
      item.id === announcement.id
        ? {
            ...item,
            showOnLive: nextValue,
          }
        : item
    );
    saveChurchAnnouncements(nextAnnouncements);
    return nextAnnouncements;
  }

  try {
    const { error } = await supabase
      .from(CHURCH_ANNOUNCEMENTS_TABLE)
      .update({
        show_on_live: nextValue,
      })
      .eq("id", announcement.id);

    if (error) {
      throw error;
    }

    return loadChurchAnnouncements(userId);
  } catch (error) {
    console.error("Church announcement live toggle error:", error);
    const nextAnnouncements = getChurchAnnouncements().map((item) =>
      item.id === announcement.id
        ? {
            ...item,
            showOnLive: nextValue,
          }
        : item
    );
    saveChurchAnnouncements(nextAnnouncements);
    return nextAnnouncements;
  }
}

export async function createChurchEvent(userId, draft) {
  const nextEvent = normalizeEvent(draft);

  if (!userId) {
    const nextEvents = [nextEvent, ...getChurchEvents()];
    saveChurchEvents(nextEvents);
    return nextEvents;
  }

  try {
    const accountId = await getChurchAccountId(userId);

    if (!accountId) {
      const nextEvents = [nextEvent, ...getChurchEvents()];
      saveChurchEvents(nextEvents);
      return nextEvents;
    }

    const { error } = await supabase.from(CHURCH_EVENTS_TABLE).insert({
      account_id: accountId,
      title: nextEvent.title,
      event_date: nextEvent.eventDate || null,
      location: nextEvent.location,
      event_time: nextEvent.eventTime,
      body: nextEvent.body,
      show_on_live: nextEvent.showOnLive,
      created_by: userId,
    });

    if (error) {
      throw error;
    }

    return loadChurchEvents(userId);
  } catch (error) {
    console.error("Church event create error:", error);
    const nextEvents = [nextEvent, ...getChurchEvents()];
    saveChurchEvents(nextEvents);
    return nextEvents;
  }
}

export async function deleteChurchEvent(userId, eventId) {
  if (!userId) {
    const nextEvents = getChurchEvents().filter((item) => item.id !== eventId);
    saveChurchEvents(nextEvents);
    return nextEvents;
  }

  try {
    const { error } = await supabase.from(CHURCH_EVENTS_TABLE).delete().eq("id", eventId);

    if (error) {
      throw error;
    }

    return loadChurchEvents(userId);
  } catch (error) {
    console.error("Church event delete error:", error);
    const nextEvents = getChurchEvents().filter((item) => item.id !== eventId);
    saveChurchEvents(nextEvents);
    return nextEvents;
  }
}

export async function toggleChurchEventLive(userId, event) {
  if (!event?.id) {
    return getChurchEvents();
  }

  const nextValue = event.showOnLive === false;

  if (!userId) {
    const nextEvents = getChurchEvents().map((item) =>
      item.id === event.id
        ? {
            ...item,
            showOnLive: nextValue,
          }
        : item
    );
    saveChurchEvents(nextEvents);
    return nextEvents;
  }

  try {
    const { error } = await supabase
      .from(CHURCH_EVENTS_TABLE)
      .update({
        show_on_live: nextValue,
      })
      .eq("id", event.id);

    if (error) {
      throw error;
    }

    return loadChurchEvents(userId);
  } catch (error) {
    console.error("Church event live toggle error:", error);
    const nextEvents = getChurchEvents().map((item) =>
      item.id === event.id
        ? {
            ...item,
            showOnLive: nextValue,
          }
        : item
    );
    saveChurchEvents(nextEvents);
    return nextEvents;
  }
}

export function getAnnouncementWidgetContent() {
  const announcements = getChurchAnnouncements();

  return {
    "recent-updates": {
      title: "Recent Updates",
      text: "See the latest announcement cards for this church mode.",
    },
    "quick-view": {
      title: "Quick View",
      text: "Open announcements fast and jump into message editing.",
    },
    "first-message": {
      title: announcements[0]?.title || "Welcome to church",
      text: announcements[0]?.body || "Current first announcement card from the app home screen.",
    },
    "second-message": {
      title: announcements[1]?.title || "More updates coming soon",
      text: announcements[1]?.body || "Current second announcement card from the app home screen.",
    },
    "open-prompt": {
      title: "Open Announcements",
      text: "Jump into the tile app to manage church updates and alerts.",
    },
  };
}

export function buildPreServiceLoopItems({
  churchName = "Fallon Church of Christ",
  churchLogoUrl = "",
} = {}) {
  const announcements = getChurchAnnouncements();
  const events = getChurchEvents();

  return [
    {
      id: "welcome-slide",
      type: "welcome",
      title: "Welcome To",
      subtitle: churchName,
      body: "We are glad you are here. Service will begin shortly.",
      tone: "welcome",
      showLogo: true,
      logoUrl: churchLogoUrl,
    },
    ...(announcements.length > 0
      ? [
          {
            id: "announcements-slide",
            type: "announcement",
            title: "Announcements",
            subtitle: "",
            body: buildGroupedLoopBody(announcements, (item, index) =>
              `${index + 1}. ${item.title}${item.body ? `\n${item.body}` : ""}`
            ),
            tone: "announcement",
            entries: announcements.map((item) => ({
              id: item.id,
              title: item.title || "Church Announcement",
              body: item.body || "",
            })),
          },
        ]
      : []),
    ...(events.length > 0
      ? [
          {
            id: "events-slide",
            type: "event",
            title: "Events",
            subtitle: "",
            body: buildGroupedLoopBody(events, (item, index) => {
              const meta = buildEventMeta(item);
              return `${index + 1}. ${item.title}${meta ? `\n${meta}` : ""}${item.body ? `\n${item.body}` : ""}`;
            }),
            tone: "event",
            entries: events.map((item) => ({
              id: item.id,
              title: item.title || "Church Event",
              subtitle: buildEventMeta(item),
              body: item.body || "",
            })),
          },
        ]
      : []),
  ];
}

export async function buildPreServiceLoopItemsForUser(
  userId,
  {
    churchName = "Fallon Church of Christ",
    churchLogoUrl = "",
  } = {}
) {
  const announcements = (await loadChurchAnnouncements(userId)).filter(
    (item) => item.showOnLive !== false
  );
  const events = (await loadChurchEvents(userId)).filter((item) => item.showOnLive !== false);

  return [
    {
      id: "welcome-slide",
      type: "welcome",
      title: "Welcome To",
      subtitle: churchName,
      body: "We are glad you are here. Service will begin shortly.",
      tone: "welcome",
      showLogo: true,
      logoUrl: churchLogoUrl,
    },
    ...(announcements.length > 0
      ? [
          {
            id: "announcements-slide",
            type: "announcement",
            title: "Announcements",
            subtitle: "",
            body: buildGroupedLoopBody(announcements, (item, index) =>
              `${index + 1}. ${item.title}${item.body ? `\n${item.body}` : ""}`
            ),
            tone: "announcement",
            entries: announcements.map((item) => ({
              id: item.id,
              title: item.title || "Church Announcement",
              body: item.body || "",
            })),
          },
        ]
      : []),
    ...(events.length > 0
      ? [
          {
            id: "events-slide",
            type: "event",
            title: "Events",
            subtitle: "",
            body: buildGroupedLoopBody(events, (item, index) => {
              const meta = buildEventMeta(item);
              return `${index + 1}. ${item.title}${meta ? `\n${meta}` : ""}${item.body ? `\n${item.body}` : ""}`;
            }),
            tone: "event",
            entries: events.map((item) => ({
              id: item.id,
              title: item.title || "Church Event",
              subtitle: buildEventMeta(item),
              body: item.body || "",
            })),
          },
        ]
      : []),
  ];
}
