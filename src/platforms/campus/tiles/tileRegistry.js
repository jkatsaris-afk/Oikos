import AttendanceApp from "./Attendance/AttendanceApp";
import AttendanceWidget from "./Attendance/AttendanceWidget";
import CommunicationApp from "./Communication/CommunicationApp";
import CommunicationWidget from "./Communication/CommunicationWidget";
import EnrollmentApp from "./Enrollment/EnrollmentApp";
import EnrollmentWidget from "./Enrollment/EnrollmentWidget";
import StaffApp from "./Staff/StaffApp";
import StaffWidget from "./Staff/StaffWidget";
import StudentsApp from "./Students/StudentsApp";
import StudentsWidget from "./Students/StudentsWidget";
import TuitionApp from "./Tuition/TuitionApp";
import TuitionWidget from "./Tuition/TuitionWidget";

export const campusTileRegistry = {
  attendance: {
    id: "attendance",
    page: AttendanceApp,
    widget: AttendanceWidget,
    store: {
      category: "Education",
      developer: "Oikos Campus",
      version: "1.0",
      shortDescription: "Take daily attendance, manage codes, and review live school-day totals.",
      description:
        "Track daily attendance from Campus with live status changes, attendance settings, teacher integration, and family visibility support.",
      features: [
        "Live attendance entry",
        "Attendance code management",
        "Teacher and family attendance workflows",
      ],
    },
    requiredTiles: ["students"],
    system: false,
    noUninstall: false,
  },
  communication: {
    id: "communication",
    page: CommunicationApp,
    widget: CommunicationWidget,
    store: {
      category: "Education",
      developer: "Oikos Campus",
      version: "1.0",
      shortDescription: "Prepare campus outreach, parent communication, and shared message history.",
      description:
        "Create communication workflows for parents and staff, prepare outreach drafts, and connect campus messaging with your configured providers.",
      features: [
        "Parent and staff messaging",
        "Provider-aware communication setup",
        "Shared campus message history",
      ],
    },
    system: false,
    noUninstall: false,
  },
  enrollment: {
    id: "enrollment",
    page: EnrollmentApp,
    widget: EnrollmentWidget,
    store: {
      category: "Education",
      developer: "Oikos Campus",
      version: "1.0",
      shortDescription: "Manage enrollment windows, submissions, and public application flow.",
      description:
        "Run the campus enrollment pipeline with a public application form, submission review tools, and schedule-based enrollment controls.",
      features: [
        "Public enrollment form",
        "Submission review workflow",
        "Manual or scheduled open windows",
      ],
    },
    system: false,
    noUninstall: false,
  },
  staff: {
    id: "staff",
    page: StaffApp,
    widget: StaffWidget,
    store: {
      category: "Education",
      developer: "Oikos Campus",
      version: "1.0",
      shortDescription: "Manage staff records, roles, assignments, and teacher access.",
      description:
        "Create and manage campus staff profiles, connect them to user accounts, assign students, and control teacher portal access.",
      features: [
        "Staff profile management",
        "Teacher portal access control",
        "Roster and assignment tools",
      ],
    },
    system: false,
    noUninstall: false,
  },
  students: {
    id: "students",
    page: StudentsApp,
    widget: StudentsWidget,
    store: {
      category: "Education",
      developer: "Oikos Campus",
      version: "1.0",
      shortDescription: "Track student records, guardians, emergency contacts, and enrollment data.",
      description:
        "Manage the campus student directory with profiles, sibling-linked guardians and contacts, tuition fields, and classroom assignments.",
      features: [
        "Full student profiles",
        "Guardian and emergency contact linking",
        "Enrollment and tuition data",
      ],
    },
    system: false,
    noUninstall: false,
  },
  tuition: {
    id: "tuition",
    page: TuitionApp,
    widget: TuitionWidget,
    store: {
      category: "Education",
      developer: "Oikos Campus",
      version: "1.0",
      shortDescription: "Set tuition, fees, payment plans, and provider handoff for families.",
      description:
        "Manage tuition pricing, recurring payment plans, auto-charge timing, and student billing profiles using your connected campus payment provider.",
      features: [
        "Tuition and fee settings",
        "One-time, 10 month, and 12 month plans",
        "Provider-ready payment payloads",
      ],
    },
    requiredTiles: ["students"],
    system: false,
    noUninstall: false,
  },
};
