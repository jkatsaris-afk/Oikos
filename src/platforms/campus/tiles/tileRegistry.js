import CommunicationApp from "./Communication/CommunicationApp";
import CommunicationWidget from "./Communication/CommunicationWidget";
import EnrollmentApp from "./Enrollment/EnrollmentApp";
import EnrollmentWidget from "./Enrollment/EnrollmentWidget";
import StaffApp from "./Staff/StaffApp";
import StaffWidget from "./Staff/StaffWidget";
import StudentsApp from "./Students/StudentsApp";
import StudentsWidget from "./Students/StudentsWidget";

export const campusTileRegistry = {
  communication: {
    id: "communication",
    page: CommunicationApp,
    widget: CommunicationWidget,
    system: false,
    noUninstall: false,
  },
  enrollment: {
    id: "enrollment",
    page: EnrollmentApp,
    widget: EnrollmentWidget,
    system: false,
    noUninstall: false,
  },
  staff: {
    id: "staff",
    page: StaffApp,
    widget: StaffWidget,
    system: false,
    noUninstall: false,
  },
  students: {
    id: "students",
    page: StudentsApp,
    widget: StudentsWidget,
    system: false,
    noUninstall: false,
  },
};
