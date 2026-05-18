import { useMemo, useState } from "react";
import {
  Activity,
  AppWindow,
  ArrowRight,
  BadgeCheck,
  Bell,
  Calculator,
  Check,
  ChevronRight,
  CreditCard,
  FlaskConical,
  GraduationCap,
  Home,
  KeyRound,
  LayoutDashboard,
  Laptop,
  Lock,
  LogOut,
  Monitor,
  MousePointerClick,
  RefreshCw,
  Save,
  Search,
  ShieldCheck,
  Sparkles,
  Settings,
  Store,
  Users,
  Wifi,
} from "lucide-react";

import eduLogo from "../../../assets/logos/Oikos_EDU_logo.png";
import classroomBackground from "../../../assets/backgrounds/Classroom-Background.png";
import studentDeviceBackground from "../../../assets/backgrounds/Oikos-EDU-Default-Background.svg";

const FEATURES = [
  {
    title: "Students only go where learning happens",
    body: "Apps, testing tools, and class links are intentionally assigned. No full desktop, no wandering, no hunting through the open web.",
    icon: ShieldCheck,
  },
  {
    title: "Teacher-managed PINs",
    body: "Teachers can set and reset simple student PINs without touching Google Admin or waiting on IT for every classroom moment.",
    icon: KeyRound,
  },
  {
    title: "No ChromeOS sign-in flow",
    body: "Kiosk devices open straight into Oikos EDU. Students sign into the learning tools they need, then return to a controlled student space.",
    icon: Lock,
  },
  {
    title: "Live device awareness",
    body: "Schools can see active devices, open apps, battery, network status, and recent activity from one clean admin view.",
    icon: Wifi,
  },
  {
    title: "Teacher messages on screen",
    body: "Send a student, group, or school-wide message directly onto devices when attention needs to move now.",
    icon: Bell,
  },
  {
    title: "Built for testing days",
    body: "Keep secure testing apps close at hand while preserving the same intentional access model after testing is over.",
    icon: GraduationCap,
  },
];

const PRODUCT_VIEWS = [
  {
    id: "student",
    label: "Student Device",
    kicker: "Kiosk Home",
    title: "A focused launchpad for learning",
  },
  {
    id: "teacher",
    label: "Teacher Portal",
    kicker: "Classroom Control",
    title: "Pins, groups, apps, and messages",
  },
  {
    id: "admin",
    label: "School Admin",
    kicker: "Device Fleet",
    title: "Every active device in view",
  },
];

function formatCurrency(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: value % 1 === 0 ? 0 : 2,
  }).format(value);
}

function ProductPreview({ activeView, setActiveView }) {
  return (
    <section style={styles.productPreview} aria-label="Interactive product demo">
      <div style={styles.previewToolbar}>
        {PRODUCT_VIEWS.map((view) => (
          <button
            key={view.id}
            type="button"
            onClick={() => setActiveView(view.id)}
            style={{
              ...styles.previewTab,
              ...(view.id === activeView ? styles.previewTabActive : {}),
            }}
          >
            {view.label}
          </button>
        ))}
      </div>
      <div style={styles.previewShell}>
        {activeView === "student" ? <StudentScreenshot /> : null}
        {activeView === "teacher" ? <TeacherScreenshot /> : null}
        {activeView === "admin" ? <AdminScreenshot /> : null}
      </div>
    </section>
  );
}

function StudentScreenshot() {
  const [openGroup, setOpenGroup] = useState(false);
  const [activePanel, setActivePanel] = useState("home");
  const [toast, setToast] = useState("");
  const groupApps = [
    ["Gmail", "#ea4335"],
    ["Classroom", "#34a853"],
    ["Drive", "#4285f4"],
  ];

  function selectApp(label) {
    setOpenGroup(false);
    if (label === "Home") {
      setActivePanel("home");
      setToast("");
      return;
    }
    if (label === "Store") {
      setActivePanel("store");
      setToast("");
      return;
    }
    if (label === "Testing") {
      setActivePanel("testing");
      setToast("Testing apps open in the secure student kiosk.");
      return;
    }
    setActivePanel("blocked");
    setToast(`${label} launch is disabled in this demo.`);
  }

  function openDeviceStatus(panel) {
    setOpenGroup(false);
    setActivePanel(panel);
    setToast("");
  }

  return (
    <div style={styles.studentShot}>
      <div style={styles.studentDeviceTopBar}>
        <span style={styles.studentDeviceAvatar}>TU</span>
        <div>
          <strong>Test User</strong>
          <span>Pershing County School District · Test Chromebook</span>
        </div>
        <div style={styles.studentDeviceStatusGroup}>
          <button
            type="button"
            style={{
              ...styles.studentDeviceStatus,
              ...(activePanel === "wifi" ? styles.studentDeviceStatusActive : {}),
            }}
            onClick={() => openDeviceStatus("wifi")}
          >
            <Wifi size={15} /> Online
          </button>
          <button
            type="button"
            style={{
              ...styles.studentDeviceStatus,
              ...(activePanel === "battery" ? styles.studentDeviceStatusActive : {}),
            }}
            onClick={() => openDeviceStatus("battery")}
          >
            <Sparkles size={15} /> 100%
          </button>
          <button type="button" style={styles.studentDeviceRoundButton} onClick={() => setActivePanel("settings")}><Settings size={17} /></button>
          <span style={styles.studentDeviceRoundButton}><LogOut size={17} /></span>
        </div>
      </div>

      <div style={styles.studentDesktopArea}>
        <button type="button" style={{ ...styles.studentDesktopTile, ...styles.studentDesktopButton, gridColumn: "1" }} onClick={() => setOpenGroup(true)}>
          <span style={styles.createGroupPreviewIcon}>+</span>
          <strong>Create Group</strong>
        </button>

        <button type="button" style={{ ...styles.studentDesktopTile, ...styles.studentDesktopButton, gridColumn: "2" }} onClick={() => setOpenGroup(true)}>
          <span style={styles.googleGroupPreview}>
            <span style={{ ...styles.googleMiniIcon, background: "#4285f4" }}>D</span>
            <span style={{ ...styles.googleMiniIcon, background: "#fbbc04" }}>S</span>
            <span style={{ ...styles.googleMiniIcon, background: "#34a853" }}>C</span>
          </span>
          <strong>Google apps</strong>
        </button>

        <button type="button" style={{ ...styles.studentDesktopTile, ...styles.studentDesktopButton, gridColumn: "3" }} onClick={() => selectApp("Calendar")}>
          <span style={styles.calendarPreviewIcon}>
            <span>31</span>
          </span>
          <strong>Google Cale...</strong>
        </button>

        {openGroup ? (
          <div style={styles.studentGroupOverlay} onClick={() => setOpenGroup(false)} role="presentation">
            <div style={styles.studentGroupPanel} onClick={(event) => event.stopPropagation()}>
              <strong>Google apps</strong>
              <div style={styles.studentGroupApps}>
                {groupApps.map(([label, color]) => (
                  <button key={label} type="button" style={styles.studentGroupApp} onClick={() => selectApp(label)}>
                    <span style={{ ...styles.googleMiniIcon, background: color }}>{label.slice(0, 1)}</span>
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : null}

        {activePanel !== "home" && !openGroup ? (
          <div style={styles.studentDemoPanel}>
            {activePanel === "store" ? (
              <>
                <div style={styles.studentDemoPanelHeader}>
                  <strong>Student App Store</strong>
                  <button type="button" style={styles.studentDemoPanelButton} onClick={() => setActivePanel("home")}>Done</button>
                </div>
                <div style={styles.studentDemoAppGrid}>
                  {["Gmail", "Classroom", "Drive", "Calendar", "ReadWorks", "IXL"].map((label, index) => (
                    <button key={label} type="button" style={styles.studentDemoAppButton} onClick={() => selectApp(label)}>
                      <span style={{ ...styles.googleMiniIcon, background: ["#ea4335", "#34a853", "#4285f4", "#fbbc04", "#7c3aed", "#0f766e"][index] }}>{label.slice(0, 1)}</span>
                      <strong>{label}</strong>
                    </button>
                  ))}
                </div>
              </>
            ) : null}
            {activePanel === "settings" ? (
              <>
                <div style={styles.studentDemoPanelHeader}>
                  <strong>Settings</strong>
                  <button type="button" style={styles.studentDemoPanelButton} onClick={() => setActivePanel("home")}>Done</button>
                </div>
                <div style={styles.studentSettingsList}>
                  {[
                    ["Appearance", "Theme color and wallpaper"],
                    ["PIN", "Change your four digit PIN"],
                    ["Apps", "Choose assigned apps for your desktop"],
                    ["Device Info", "Chromebook status and network"],
                  ].map(([label, detail]) => (
                    <button key={label} type="button" style={styles.studentSettingsRow} onClick={() => setToast(`${label} settings opened.`)}>
                      <strong>{label}</strong>
                      <span>{detail}</span>
                    </button>
                  ))}
                </div>
              </>
            ) : null}
            {activePanel === "wifi" ? (
              <>
                <div style={styles.studentDemoPanelHeader}>
                  <strong>Network Status</strong>
                  <button type="button" style={styles.studentDemoPanelButton} onClick={() => setActivePanel("home")}>Done</button>
                </div>
                <div style={styles.studentStatusDetailGrid}>
                  {[
                    ["Connection", "Online"],
                    ["Network", "PCSD Student Wi-Fi"],
                    ["Signal", "Strong"],
                    ["Last report", "Just now"],
                  ].map(([label, value]) => (
                    <div key={label} style={styles.studentStatusDetailRow}>
                      <span>{label}</span>
                      <strong>{value}</strong>
                    </div>
                  ))}
                </div>
                <button type="button" style={styles.studentStatusAction} onClick={() => setToast("Network status sent to the admin dashboard.")}>
                  <Wifi size={16} />
                  Send network report
                </button>
              </>
            ) : null}
            {activePanel === "battery" ? (
              <>
                <div style={styles.studentDemoPanelHeader}>
                  <strong>Battery Status</strong>
                  <button type="button" style={styles.studentDemoPanelButton} onClick={() => setActivePanel("home")}>Done</button>
                </div>
                <div style={styles.studentBatteryMeter}>
                  <span style={styles.studentBatteryFill} />
                  <strong>100%</strong>
                </div>
                <div style={styles.studentStatusDetailGrid}>
                  {[
                    ["Power", "Fully charged"],
                    ["Charging", "Plugged in"],
                    ["Health", "Good"],
                    ["Last report", "Just now"],
                  ].map(([label, value]) => (
                    <div key={label} style={styles.studentStatusDetailRow}>
                      <span>{label}</span>
                      <strong>{value}</strong>
                    </div>
                  ))}
                </div>
                <button type="button" style={styles.studentStatusAction} onClick={() => setToast("Battery status sent to the admin dashboard.")}>
                  <Sparkles size={16} />
                  Send battery report
                </button>
              </>
            ) : null}
            {activePanel === "testing" ? (
              <>
                <div style={styles.studentDemoPanelHeader}>
                  <strong>Testing Apps</strong>
                  <button type="button" style={styles.studentDemoPanelButton} onClick={() => setActivePanel("home")}>Done</button>
                </div>
                <div style={styles.studentDemoAppGrid}>
                  {["TestNav", "DRC", "NWEA MAP"].map((label) => (
                    <button key={label} type="button" style={styles.studentDemoAppButton} onClick={() => setToast(`${label} would open in a locked test window.`)}>
                      <FlaskConical size={22} />
                      <strong>{label}</strong>
                    </button>
                  ))}
                </div>
              </>
            ) : null}
            {activePanel === "blocked" ? (
              <div style={styles.studentBlockedPanel}>
                <Lock size={26} />
                <strong>Google app links are disabled in this demo.</strong>
                <span>In a real student session, assigned links open from here and report activity back to the teacher and admin views.</span>
                <button type="button" style={styles.studentDemoPanelButton} onClick={() => setActivePanel("home")}>Back to desktop</button>
              </div>
            ) : null}
          </div>
        ) : null}

        {toast ? (
          <button type="button" style={styles.studentMessageToast} onClick={() => setToast("")}>
            <Bell size={16} />
            <span>{toast}</span>
          </button>
        ) : null}
      </div>

      <div style={styles.studentDeviceDock}>
        {[
          ["Home", Home],
          ["Gmail", null],
          ["Google Classroom", GraduationCap],
          ["Google Drive", null],
          ["Store", Store],
          ["Testing", Calculator],
        ].map(([label, Icon]) => (
          <button
            key={label}
            type="button"
            style={{
              ...styles.studentDockItem,
              ...((activePanel === "store" && label === "Store") || (activePanel === "testing" && label === "Testing") || (activePanel === "home" && label === "Home") ? styles.studentDockItemActive : {}),
            }}
            onClick={() => selectApp(label)}
          >
            {Icon ? <Icon size={17} /> : <span style={styles.studentDockGoogleMark}>{label === "Gmail" ? "M" : "D"}</span>}
            <strong>{label}</strong>
          </button>
        ))}
      </div>
    </div>
  );
}

function TeacherScreenshot() {
  const students = [
    { name: "Maya Johnson", login: "maya johnson", grade: "4", group: "Blue Table", pin: "4821", color: "#2563eb", device: "Cart A-12 Chromebook", activeUrl: "classroom.google.com" },
    { name: "Eli Parker", login: "eli parker", grade: "4", group: "Reading Group", pin: "1904", color: "#0f766e", device: "Library Kiosk", activeUrl: "docs.google.com" },
    { name: "Noah Kim", login: "noah kim", grade: "5", group: "Testing", pin: "7730", color: "#e86a1f", device: "Grade 5 Cart", activeUrl: "testnav.com" },
  ];
  const [selectedStudent, setSelectedStudent] = useState(students[0]);
  const [sentMessage, setSentMessage] = useState("Open Classroom and start today’s warmup.");
  const [activeTeacherSection, setActiveTeacherSection] = useState("students");
  const teacherNav = [
    ["summary", "Overview", LayoutDashboard],
    ["apps", "Student App Store", AppWindow],
    ["students", "Students", Users],
    ["groups", "Class Groups", GraduationCap],
    ["notifications", "Notifications", Bell],
    ["devices", "Devices", Monitor],
  ];

  const renderTeacherContent = () => {
    if (activeTeacherSection === "summary") {
      return (
        <div style={styles.workspaceSummaryRow}>
          {[
            ["My Students", students.length, Users],
            ["Class Groups", 3, GraduationCap],
            ["Student App Store", 8, AppWindow],
            ["Online", 2, Activity],
          ].map(([label, value, Icon]) => (
            <div key={label} style={styles.workspaceSummaryTile}>
              <Icon size={17} />
              <span>{label}</span>
              <strong>{value}</strong>
            </div>
          ))}
        </div>
      );
    }

    if (activeTeacherSection === "apps") {
      return (
        <section style={styles.workspacePanel}>
          <div style={styles.workspacePanelHeader}>
            <strong>Student App Store</strong>
            <button type="button" style={styles.workspacePrimaryButton} onClick={() => setSentMessage("New website draft opened.")}>
              <AppWindow size={15} />
              Add
            </button>
          </div>
          <div style={styles.demoCardGrid}>
            {[
              ["Google Classroom", "classroom.google.com", "#1e8e3e"],
              ["ReadWorks", "readworks.org", "#7c3aed"],
              ["Khan Academy", "khanacademy.org", "#0f766e"],
              ["Math Practice", "school.math/practice", "#e86a1f"],
            ].map(([name, url, color]) => (
              <button key={name} type="button" style={styles.demoAppCard} onClick={() => setSentMessage(`${name} opened for editing.`)}>
                <span style={{ ...styles.workspaceAvatar, background: color }}>{name.slice(0, 1)}</span>
                <strong>{name}</strong>
                <small>{url}</small>
              </button>
            ))}
          </div>
        </section>
      );
    }

    if (activeTeacherSection === "groups") {
      return (
        <section style={styles.workspacePanel}>
          <div style={styles.workspacePanelHeader}>
            <strong>Class Groups</strong>
            <button type="button" style={styles.workspacePrimaryButton} onClick={() => setSentMessage("New group draft opened.")}>
              <GraduationCap size={15} />
              New Group
            </button>
          </div>
          <div style={styles.demoCardGrid}>
            {["Blue Table", "Reading Group", "Testing"].map((name, index) => (
              <button key={name} type="button" style={styles.demoGroupCard} onClick={() => setSentMessage(`${name} selected.`)}>
                <span style={{ ...styles.onlineDot, background: ["#2563eb", "#0f766e", "#e86a1f"][index] }} />
                <strong>{name}</strong>
                <small>{index === 0 ? "2 students" : "1 student"}</small>
              </button>
            ))}
          </div>
        </section>
      );
    }

    if (activeTeacherSection === "notifications") {
      return (
        <section style={styles.workspacePanel}>
          <div style={styles.workspacePanelHeader}>
            <strong>Screen Notifications</strong>
          </div>
          <div style={styles.teacherNoticeComposer}>
            <span>Target</span>
            <strong>{selectedStudent.name}</strong>
            <span>Message</span>
            <strong>{sentMessage}</strong>
            <button type="button" style={styles.workspacePrimaryButton} onClick={() => setSentMessage(`Message sent to ${selectedStudent.name}.`)}>
              <Bell size={15} />
              Send
            </button>
          </div>
        </section>
      );
    }

    if (activeTeacherSection === "devices") {
      return (
        <section style={styles.workspacePanel}>
          <div style={styles.workspacePanelHeader}>
            <strong>Student Devices</strong>
          </div>
          <div style={styles.workspaceList}>
            {students.map((student) => (
              <button key={student.device} type="button" style={styles.adminDeviceRow} onClick={() => setSelectedStudent(student)}>
                <span style={styles.onlineDot} />
                <span>
                  <strong>{student.device}</strong>
                  <small>{student.name} · {student.activeUrl}</small>
                </span>
                <small>Just now</small>
              </button>
            ))}
          </div>
        </section>
      );
    }

    return (
      <>
        <div style={styles.teacherWorkspaceGrid}>
          <section style={styles.workspacePanel}>
            <div style={styles.workspacePanelHeader}>
              <strong>My Students</strong>
            </div>
            <label style={styles.workspaceSearch}>
              <Search size={16} />
              <span>Search your students</span>
            </label>
            <div style={styles.workspaceList}>
              {students.map((student) => (
                <button
                  key={student.name}
                  type="button"
                  style={{
                    ...styles.workspacePersonRow,
                    ...(selectedStudent.name === student.name ? styles.workspacePersonRowActive : {}),
                  }}
                  onClick={() => setSelectedStudent(student)}
                >
                  <span style={{ ...styles.workspaceAvatar, background: student.color }}>{student.name.split(" ").map((part) => part[0]).join("")}</span>
                  <span>
                    <strong>{student.name}</strong>
                    <small>Grade {student.grade} · {student.login}</small>
                  </span>
                </button>
              ))}
            </div>
          </section>

          <section style={styles.workspacePanel}>
            <div style={styles.workspacePanelHeader}>
              <strong>Student Details</strong>
            </div>
            <div style={styles.workspacePersonHero}>
              <span style={{ ...styles.workspaceHeroAvatar, background: selectedStudent.color }}>
                {selectedStudent.name.split(" ").map((part) => part[0]).join("")}
              </span>
              <span>
                <strong>{selectedStudent.name}</strong>
                <small>Grade {selectedStudent.grade} · {selectedStudent.group}</small>
              </span>
            </div>
            <div style={styles.teacherPinForm}>
              <label>
                New PIN
                <span>{selectedStudent.pin}</span>
              </label>
              <button type="button" style={styles.workspacePrimaryButton} onClick={() => setSentMessage(`PIN saved for ${selectedStudent.name}.`)}>
                <Save size={15} />
                Set PIN
              </button>
            </div>
            <div style={styles.workspaceDeviceRow}>
              <span style={styles.onlineDot} />
              <span>
                <strong>{selectedStudent.device}</strong>
                <small>{selectedStudent.activeUrl}</small>
              </span>
              <small>Just now</small>
            </div>
          </section>
        </div>

        <button type="button" style={styles.workspaceMessageBar} onClick={() => setSentMessage(`Message sent to ${selectedStudent.name}.`)}>
          <Bell size={17} />
          <span>{sentMessage}</span>
        </button>
      </>
    );
  };

  return (
    <div style={styles.workspacePreview}>
      <div style={styles.workspaceHeader}>
        <div>
          <span style={styles.workspaceEyebrow}>Pershing County School District</span>
          <strong>Mrs. Rivera Portal</strong>
          <span>Grade 4 · Room 204</span>
        </div>
        <button type="button" style={styles.workspaceIconButton}><RefreshCw size={16} /></button>
      </div>

      <div style={styles.workspaceBody}>
        <aside style={styles.workspaceSideNav}>
          <span style={styles.workspaceNavTitle}>Manage</span>
          {teacherNav.map(([id, label, Icon]) => (
            <button
              key={id}
              type="button"
              style={{
                ...styles.workspaceNavButton,
                ...(activeTeacherSection === id ? styles.workspaceNavButtonActive : {}),
              }}
              onClick={() => setActiveTeacherSection(id)}
            >
              <Icon size={16} />
              <span>{label}</span>
            </button>
          ))}
        </aside>

        <section style={styles.workspaceContent}>
          {renderTeacherContent()}
        </section>
      </div>
    </div>
  );
}

function AdminScreenshot() {
  const devices = [
    { name: "Cart A-12", student: "Maya Johnson", app: "Google Classroom", battery: "96%", charging: "No", status: "Online", network: "Online", screen: "1366 x 768", url: "classroom.google.com", seen: "8 sec ago" },
    { name: "Library Kiosk", student: "Eli Parker", app: "TestNav", battery: "82%", charging: "Yes", status: "Testing", network: "Online", screen: "1366 x 768", url: "home.testnav.com", seen: "19 sec ago" },
    { name: "Grade 5 Cart", student: "Noah Kim", app: "Gmail", battery: "68%", charging: "No", status: "Online", network: "Online", screen: "1440 x 900", url: "mail.google.com", seen: "1 min ago" },
  ];
  const [selectedDevice, setSelectedDevice] = useState(devices[0]);
  const [activeAdminSection, setActiveAdminSection] = useState("summary");
  const adminNav = [
    ["summary", "Overview", LayoutDashboard],
    ["apps", "Student App Store", AppWindow],
    ["testing", "Testing Apps", FlaskConical],
    ["members", "Admins", Users],
    ["teachers", "Teachers", GraduationCap],
    ["students", "Students", Users],
    ["notifications", "Notifications", Bell],
    ["branding", "Branding", Sparkles],
    ["security", "Security", ShieldCheck],
    ["chrome", "Chrome Guard", Lock],
    ["devices", "Devices", Monitor],
  ];
  const overviewTiles = [
    ["School Code", "PCSD-24", "Create or share the enrollment code.", KeyRound],
    ["Student Link", "/studentdevice/PCSD-24", "Kiosk launch URL for managed devices.", Monitor],
    ["Devices", "418", "392 seen in 24h", Laptop],
    ["Teacher Portal", "/edu/teacher", "Classroom tools for assigned teachers.", GraduationCap],
    ["Online", "392", "94% of devices", Activity],
    ["Students", "612", "8 inactive", Users],
    ["Admins", "3", "Owner access", ShieldCheck],
    ["Active Apps", "14", "8 school, 6 system", AppWindow],
  ];
  const glanceStats = [
    ["Teacher Accounts", "38", "2 inactive"],
    ["Assigned Students", "588", "24 unassigned"],
    ["Logged In Devices", "376", "148 running an app or site"],
    ["Offline Devices", "26", "9 not seen in 24h"],
    ["Low Battery", "14", "31 charging"],
    ["Testing Apps Enabled", "3", "TestNav, DRC, NWEA"],
    ["Chrome Guard", "Ready", "Unknown sites blocked"],
    ["Idle Logout", "15 min", "student inactivity timer"],
  ];

  const renderAdminContent = () => {
    if (activeAdminSection === "summary") {
      return (
        <section style={styles.adminSectionStack}>
          <div style={styles.adminOverviewGrid}>
            {overviewTiles.map(([label, value, detail, Icon]) => (
              <div key={label} style={styles.workspaceSummaryTile}>
                <Icon size={18} />
                <span>{label}</span>
                <strong>{value}</strong>
                <small>{detail}</small>
              </div>
            ))}
          </div>
          <section style={styles.workspacePanel}>
            <div style={styles.workspacePanelHeader}>
              <div>
                <strong>At a Glance</strong>
                <small>Fast read on setup, classroom coverage, device health, and filtering.</small>
              </div>
            </div>
            <div style={styles.adminOverviewStatGrid}>
              {glanceStats.map(([label, value, detail]) => (
                <div key={label} style={styles.adminOverviewStatCard}>
                  <span>{label}</span>
                  <strong>{value}</strong>
                  <small>{detail}</small>
                </div>
              ))}
            </div>
          </section>
        </section>
      );
    }

    if (activeAdminSection === "apps") {
      return (
        <section style={styles.adminSectionStack}>
          <div style={styles.workspacePanelHeader}>
            <div>
              <strong>App Install Analytics</strong>
              <small>Counts show apps currently installed on student desktops.</small>
            </div>
            <button type="button" style={styles.workspacePrimaryButton}>
              <Save size={15} />
              Save
            </button>
          </div>
          <div style={styles.adminShelfGrid}>
            {[
              ["412", "Google Classroom"],
              ["386", "Gmail"],
              ["341", "ReadWorks"],
            ].map(([count, label]) => (
              <div key={label} style={styles.adminShelfTile}>
                <strong>{count}</strong>
                <span>{label}</span>
              </div>
            ))}
          </div>
          <section style={styles.workspacePanel}>
            <div style={styles.workspacePanelHeader}>
              <div>
                <strong>Global System Apps</strong>
                <small>Platform-managed apps available to every school.</small>
              </div>
            </div>
            <div style={styles.adminCompactRows}>
              {["Gmail", "Google Classroom", "Google Drive"].map((name) => (
                <span key={name}><AppWindow size={15} />{name}<small>Enabled</small></span>
              ))}
            </div>
          </section>
          <section style={styles.workspacePanel}>
            <div style={styles.workspacePanelHeader}>
              <div>
                <strong>School Websites</strong>
                <small>Admin-created links for this organization.</small>
              </div>
            </div>
            <div style={styles.adminCompactRows}>
              {["ReadWorks", "Khan Academy", "District Library"].map((name) => (
                <span key={name}><Store size={15} />{name}<small>Active</small></span>
              ))}
            </div>
          </section>
        </section>
      );
    }

    if (activeAdminSection === "testing") {
      return (
        <section style={styles.workspacePanel}>
          <div style={styles.workspacePanelHeader}>
            <div>
              <strong>Testing Apps</strong>
              <small>Secure launchers exposed to student devices by school setting.</small>
            </div>
          </div>
          <div style={styles.workspaceList}>
            {[
              ["TestNav", "Pearson TestNav kiosk launcher", true],
              ["DRC", "DRC INSIGHT secure testing launcher", true],
              ["NWEA MAP Growth", "NWEA secure testing launcher", true],
            ].map(([name, detail, enabled]) => (
              <button key={name} type="button" style={styles.adminDeviceRow}>
                <span style={styles.onlineDot} />
                <span>
                  <strong>{name}</strong>
                  <small>{detail}</small>
                </span>
                <small>{enabled ? "Enabled" : "Off"}</small>
              </button>
            ))}
          </div>
        </section>
      );
    }

    if (["members", "teachers", "students"].includes(activeAdminSection)) {
      const people = activeAdminSection === "members"
        ? [["J. Carter", "Owner"], ["M. Shah", "Admin"], ["A. Lopez", "Admin"]]
        : activeAdminSection === "teachers"
          ? [["Mrs. Rivera", "Grade 4 · Room 204"], ["Mr. Hall", "Grade 5 · Lab"], ["Ms. Boyd", "Intervention"]]
          : [["Maya Johnson", "Grade 4 · active"], ["Eli Parker", "Grade 4 · active"], ["Noah Kim", "Grade 5 · active"]];
      const title = activeAdminSection === "members" ? "Admin Users" : activeAdminSection === "teachers" ? "Teachers" : "Students";
      return (
        <section style={styles.workspacePanel}>
          <div style={styles.workspacePanelHeader}>
            <div>
              <strong>{title}</strong>
              <small>{activeAdminSection === "teachers" ? "Teacher accounts and student assignments." : activeAdminSection === "students" ? "Student roster, PINs, and desktop state." : "Organization admins with device-management access."}</small>
            </div>
          </div>
          <label style={styles.workspaceSearch}>
            <Search size={16} />
            <span>Search</span>
          </label>
          <div style={styles.workspaceList}>
            {people.map(([name, detail], index) => (
              <button key={name} type="button" style={styles.workspacePersonRow}>
                <span style={{ ...styles.workspaceAvatar, background: ["#2563eb", "#0f766e", "#e86a1f"][index] }}>{name.split(" ").map((part) => part[0]).join("")}</span>
                <span>
                  <strong>{name}</strong>
                  <small>{detail}</small>
                </span>
              </button>
            ))}
          </div>
        </section>
      );
    }

    if (["branding", "security", "chrome"].includes(activeAdminSection)) {
      const cards = activeAdminSection === "branding"
        ? [["Device Background", "Classroom image active"], ["Login Background", "Uses device background"], ["Dock Apps", "4 pinned apps"]]
        : activeAdminSection === "security"
          ? [["Student PINs", "4 digit PINs enabled"], ["Idle Logout", "15 minutes"], ["Kiosk Sessions", "Heartbeat required"]]
          : [["Filtering Configuration", "Ready"], ["Block Unknown Sites", "On"], ["Oikos Return Bar", "On"]];
      return (
        <section style={styles.workspacePanel}>
          <div style={styles.workspacePanelHeader}>
            <div>
              <strong>{activeAdminSection === "branding" ? "Branding" : activeAdminSection === "security" ? "Security" : "Chrome Guard Setup"}</strong>
              <small>{activeAdminSection === "chrome" ? "Google policy and filtering controls for managed Chromebooks." : "Organization settings for the student device experience."}</small>
            </div>
          </div>
          <div style={styles.adminSettingsGrid}>
            {cards.map(([label, value]) => (
              <div key={label} style={styles.adminSettingCard}>
                <Settings size={17} />
                <span>{label}</span>
                <strong>{value}</strong>
              </div>
            ))}
          </div>
        </section>
      );
    }

    if (activeAdminSection === "notifications") {
      return (
        <section style={styles.workspacePanel}>
          <div style={styles.workspacePanelHeader}>
            <div>
              <strong>Screen Notifications</strong>
              <small>Send a message to one student or all active students.</small>
            </div>
          </div>
          <div style={styles.teacherNoticeComposer}>
            <span>Target</span>
            <strong>All active students</strong>
            <span>Message</span>
            <strong>Testing starts in 10 minutes. Please stay on this screen.</strong>
            <button type="button" style={styles.workspacePrimaryButton}>
              <Bell size={15} />
              Send
            </button>
          </div>
        </section>
      );
    }

    return (
      <section style={styles.workspacePanel}>
        <div style={styles.workspacePanelHeader}>
          <div>
            <strong>Devices</strong>
            <small>Live student device status and telemetry</small>
          </div>
          <button type="button" style={styles.workspacePrimaryButton}>
            <Bell size={15} />
            Message
          </button>
        </div>
        <div style={styles.adminDeviceGrid}>
          <div style={styles.workspaceList}>
            {devices.map((device) => (
              <button
                key={device.name}
                type="button"
                style={{
                  ...styles.adminDeviceRow,
                  ...(selectedDevice.name === device.name ? styles.workspacePersonRowActive : {}),
                }}
                onClick={() => setSelectedDevice(device)}
              >
                <span style={styles.onlineDot} />
                <span>
                  <strong>{device.name}</strong>
                  <small>{device.student} · {device.app}</small>
                </span>
                <small>{device.seen}</small>
              </button>
            ))}
          </div>

          <div style={styles.adminTelemetryPanel}>
            <div style={styles.workspacePersonHero}>
              <span style={styles.workspaceHeroAvatar}><Monitor size={24} /></span>
              <span>
                <strong>{selectedDevice.name}</strong>
                <small>{selectedDevice.student} · {selectedDevice.status}</small>
              </span>
            </div>
            {[
              ["Active App", selectedDevice.app],
              ["Active URL", selectedDevice.url],
              ["Battery", selectedDevice.battery],
              ["Charging", selectedDevice.charging],
              ["Network", selectedDevice.network],
              ["Screen", selectedDevice.screen],
              ["Last Device Report", selectedDevice.seen],
            ].map(([label, value]) => (
              <div key={label} style={styles.telemetryRow}>
                <span>{label}</span>
                <strong>{value}</strong>
              </div>
            ))}
            <div style={styles.adminDeviceActions}>
              <button type="button" style={styles.adminTinyButton}>Rename</button>
              <button type="button" style={styles.adminTinyButton}>Remove</button>
            </div>
          </div>
        </div>
      </section>
    );
  };

  return (
    <div style={styles.workspacePreview}>
      <div style={styles.workspaceHeader}>
        <div>
          <span style={styles.workspaceEyebrow}>Edu Admin</span>
          <strong>Pershing County School District Student Devices</strong>
        </div>
        <button type="button" style={styles.workspaceIconButton}><RefreshCw size={16} /></button>
      </div>

      <div style={styles.workspaceBody}>
        <aside style={styles.workspaceSideNav}>
          <span style={styles.workspaceNavTitle}>Manage</span>
          {adminNav.map(([id, label, Icon]) => (
            <button
              key={id}
              type="button"
              style={{
                ...styles.workspaceNavButton,
                ...styles.adminWorkspaceNavButton,
                ...(id === activeAdminSection ? styles.workspaceNavButtonActive : {}),
              }}
              onClick={() => setActiveAdminSection(id)}
            >
              <Icon size={16} />
              <span>{label}</span>
            </button>
          ))}
        </aside>

        <section style={styles.workspaceContent}>
          {renderAdminContent()}
        </section>
      </div>
    </div>
  );
}

function PhoneMockup({ activeView, setActiveView }) {
  const currentIndex = PRODUCT_VIEWS.findIndex((view) => view.id === activeView);
  const nextView = PRODUCT_VIEWS[(currentIndex + 1) % PRODUCT_VIEWS.length];

  return (
    <div style={styles.phoneFrame} aria-label="Interactive mobile preview">
      <div style={styles.phoneScreen}>
        <div style={styles.phoneStatus}>
          <span>9:41</span>
          <span>5G 92%</span>
        </div>
        <img src={eduLogo} alt="Oikos EDU" style={styles.phoneLogo} />
        <div style={styles.phoneCard}>
          <span style={styles.phoneEyebrow}>Intentional Access</span>
          <h2>{activeView === "student" ? "Student launchpad" : activeView === "teacher" ? "Teacher control" : "Admin visibility"}</h2>
          <p>
            {activeView === "student"
              ? "The device opens to assigned learning apps and nothing else."
              : activeView === "teacher"
                ? "Teachers manage PINs, groups, apps, and quick messages."
                : "Schools monitor device health and active learning tools."}
          </p>
        </div>
        <div style={styles.phoneApps}>
          {["Classroom", "Docs", "Testing", "Messages"].map((label, index) => (
            <span key={label} style={{ "--tile-color": ["#1e8e3e", "#4285f4", "#0f766e", "#e86a1f"][index], ...styles.phoneApp }}>
              {label}
            </span>
          ))}
        </div>
        <button type="button" style={styles.phoneButton} onClick={() => setActiveView(nextView.id)}>
          Show {nextView.label}
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}

export default function EduSalesPage() {
  const [deviceCount, setDeviceCount] = useState(500);
  const [activeView, setActiveView] = useState("student");
  const monthlyCost = useMemo(() => deviceCount * 0.5, [deviceCount]);
  const oneTimeCost = useMemo(() => deviceCount * 0.5 * 3, [deviceCount]);

  function contactSales() {
    const subject = encodeURIComponent(`Oikos EDU for ${deviceCount} devices`);
    const body = encodeURIComponent(
      `Hi Oikos EDU,\n\nWe are looking at ${deviceCount} student devices.\n\nPlease send next steps for monthly and one-time setup.`
    );
    window.location.href = `mailto:sales@oikosedu.com?subject=${subject}&body=${body}`;
  }

  return (
    <main style={styles.page}>
      <section style={styles.hero}>
        <nav style={styles.nav}>
          <img src={eduLogo} alt="Oikos EDU" style={styles.logo} />
          <div style={styles.navActions}>
            <a href="#features" style={styles.navLink}>Features</a>
            <a href="#pricing" style={styles.navLink}>Pricing</a>
            <a href="/login" style={styles.navLoginButton}>
              Login
            </a>
            <button type="button" style={styles.navButton} onClick={contactSales}>
              Talk to us
            </button>
          </div>
        </nav>

        <div style={styles.heroGrid}>
          <div style={styles.heroCopy}>
            <span style={styles.eyebrow}>
              <Sparkles size={16} />
              Intentional tech for students
            </span>
            <h1 style={styles.heroTitle}>Student devices that stay on purpose.</h1>
            <p style={styles.heroText}>
              Full access on student devices is getting in the way of learning. Oikos EDU replaces the open-ended Chromebook experience with a focused kiosk where students can only go where school has decided they need to go.
            </p>
            <div style={styles.heroActions}>
              <a href="#pricing" style={styles.primaryButton}>
                Start with your device count
                <ArrowRight size={18} />
              </a>
              <a href="#screenshots" style={styles.secondaryButton}>
                Try the mini demo
              </a>
            </div>
            <div style={styles.proofRow}>
              {["No full ChromeOS desktop", "Teacher-set PINs", "$0.50 active device/month"].map((item) => (
                <span key={item} style={styles.proofPill}>
                  <Check size={15} />
                  {item}
                </span>
              ))}
            </div>
          </div>
          <PhoneMockup activeView={activeView} setActiveView={setActiveView} />
        </div>
      </section>

      <section id="screenshots" style={styles.section}>
        <div style={styles.sectionIntro}>
          <span style={styles.sectionKicker}>Interactive Demo</span>
          <h2 style={styles.sectionTitle}>Click through the student, teacher, and admin experience.</h2>
          <p style={styles.sectionText}>
            These are contained demo states built to feel like the real product. Google app launches are disabled here, but the flows, controls, and layouts mirror what users see.
          </p>
        </div>
        <ProductPreview activeView={activeView} setActiveView={setActiveView} />
      </section>

      <section id="features" style={styles.featureBand}>
        <div style={styles.sectionIntro}>
          <span style={styles.sectionKicker}>Why Schools Want It</span>
          <h2 style={styles.sectionTitle}>Purpose-built control without burying teachers in admin work.</h2>
        </div>
        <div style={styles.featureGrid}>
          {FEATURES.map((feature) => {
            const Icon = feature.icon;
            return (
              <article key={feature.title} style={styles.featureCard}>
                <span style={styles.featureIcon}><Icon size={22} /></span>
                <h3>{feature.title}</h3>
                <p>{feature.body}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section style={styles.comparisonBand}>
        <div style={styles.comparisonCopy}>
          <span style={styles.sectionKicker}>Better Than Filtering</span>
          <h2 style={styles.sectionTitle}>Filters react after access exists. Oikos EDU starts by removing the extra doors.</h2>
        </div>
        <div style={styles.comparisonGrid}>
          <div style={styles.compareColumnMuted}>
            <h3>Typical student device</h3>
            {["Full OS sign-in", "Open browser first", "Filter rules chase behavior", "Teachers wait on IT"].map((item) => (
              <p key={item}>{item}</p>
            ))}
          </div>
          <div style={styles.compareColumn}>
            <h3>Oikos EDU</h3>
            {["Kiosk-first student access", "Assigned apps and links", "Testing and class tools only", "Teachers reset PINs and guide focus"].map((item) => (
              <p key={item}>
                <BadgeCheck size={16} />
                {item}
              </p>
            ))}
          </div>
        </div>
      </section>

      <section id="pricing" style={styles.pricingSection}>
        <div style={styles.sectionIntro}>
          <span style={styles.sectionKicker}>Simple Pricing</span>
          <h2 style={styles.sectionTitle}>No packages. Just devices.</h2>
          <p style={styles.sectionText}>
            Choose monthly automatic payment or a one-time device cap. Purchase orders and checks can be used for one-time payments.
          </p>
        </div>

        <div style={styles.calculator}>
          <div style={styles.sliderPanel}>
            <div style={styles.sliderHeader}>
              <span><Calculator size={20} /> Requested devices</span>
              <strong>{deviceCount.toLocaleString()}</strong>
            </div>
            <input
              aria-label="Requested devices"
              type="range"
              min="25"
              max="5000"
              step="25"
              value={deviceCount}
              onChange={(event) => setDeviceCount(Number(event.target.value))}
              style={styles.slider}
            />
            <div style={styles.sliderBounds}>
              <span>25</span>
              <span>5,000</span>
            </div>
          </div>

          <div style={styles.priceCards}>
            <article style={styles.priceCardPrimary}>
              <span style={styles.priceLabel}><CreditCard size={18} /> Monthly</span>
              <strong style={styles.priceValue}>{formatCurrency(monthlyCost)} / month</strong>
              <p>$0.50 per active device. Requires automatic payment.</p>
            </article>
            <article style={styles.priceCard}>
              <span style={styles.priceLabel}><Laptop size={18} /> One-time</span>
              <strong style={styles.priceValue}>{formatCurrency(oneTimeCost)}</strong>
              <p>Device cap set to {deviceCount.toLocaleString()}. Remove devices to add others within the cap. No fees after payment.</p>
            </article>
          </div>
        </div>
      </section>

      <section style={styles.finalCta}>
        <div>
          <span style={styles.sectionKicker}>Bring Focus Back</span>
          <h2 style={styles.finalTitle}>Give students the device they actually need for school.</h2>
        </div>
        <button type="button" style={styles.primaryButton} onClick={contactSales}>
          Get Oikos EDU pricing
          <MousePointerClick size={18} />
        </button>
      </section>
    </main>
  );
}

const styles = {
  page: {
    background: "#f6f8fb",
    color: "#102033",
    fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    minHeight: "100dvh",
  },
  hero: {
    backgroundColor: "#102033",
    backgroundImage: `linear-gradient(90deg, rgba(16,32,51,0.96), rgba(16,32,51,0.78)), url(${classroomBackground})`,
    backgroundPosition: "center, left bottom",
    backgroundSize: "cover, 430%",
    color: "#fff",
    minHeight: "92dvh",
    overflow: "hidden",
    padding: "18px clamp(18px, 4vw, 56px) 44px",
  },
  nav: {
    alignItems: "center",
    display: "flex",
    flexWrap: "wrap",
    gap: 14,
    justifyContent: "space-between",
    margin: "0 auto",
    maxWidth: 1180,
  },
  logo: {
    height: 44,
    objectFit: "contain",
  },
  navActions: {
    alignItems: "center",
    display: "flex",
    flexWrap: "wrap",
    gap: 16,
    justifyContent: "flex-end",
  },
  navLink: {
    color: "rgba(255,255,255,0.82)",
    fontSize: 14,
    fontWeight: 800,
    textDecoration: "none",
  },
  navButton: {
    background: "#fff",
    border: 0,
    borderRadius: 999,
    color: "#102033",
    cursor: "pointer",
    fontWeight: 900,
    minHeight: 40,
    padding: "0 16px",
  },
  navLoginButton: {
    alignItems: "center",
    background: "rgba(255,255,255,0.10)",
    border: "1px solid rgba(255,255,255,0.18)",
    borderRadius: 999,
    color: "#fff",
    display: "inline-flex",
    fontSize: 14,
    fontWeight: 900,
    minHeight: 40,
    padding: "0 16px",
    textDecoration: "none",
  },
  heroGrid: {
    alignItems: "center",
    display: "grid",
    gap: 42,
    gridTemplateColumns: "repeat(auto-fit, minmax(min(330px, 100%), 1fr))",
    margin: "46px auto 0",
    maxWidth: 1180,
  },
  heroCopy: {
    display: "grid",
    gap: 22,
    maxWidth: 720,
  },
  eyebrow: {
    alignItems: "center",
    background: "rgba(255,255,255,0.12)",
    border: "1px solid rgba(255,255,255,0.20)",
    borderRadius: 999,
    display: "inline-flex",
    gap: 8,
    fontSize: 13,
    fontWeight: 900,
    justifySelf: "start",
    padding: "8px 12px",
  },
  heroTitle: {
    fontSize: "clamp(46px, 7vw, 86px)",
    letterSpacing: 0,
    lineHeight: 0.94,
    margin: 0,
    maxWidth: 820,
  },
  heroText: {
    color: "rgba(255,255,255,0.82)",
    fontSize: "clamp(18px, 2.1vw, 23px)",
    lineHeight: 1.5,
    margin: 0,
    maxWidth: 760,
  },
  heroActions: {
    display: "flex",
    flexWrap: "wrap",
    gap: 12,
  },
  primaryButton: {
    alignItems: "center",
    background: "#1e8e3e",
    border: 0,
    borderRadius: 999,
    color: "#fff",
    cursor: "pointer",
    display: "inline-flex",
    fontSize: 15,
    fontWeight: 950,
    gap: 8,
    minHeight: 48,
    padding: "0 20px",
    textDecoration: "none",
  },
  secondaryButton: {
    alignItems: "center",
    background: "rgba(255,255,255,0.10)",
    border: "1px solid rgba(255,255,255,0.18)",
    borderRadius: 999,
    color: "#fff",
    display: "inline-flex",
    fontSize: 15,
    fontWeight: 900,
    minHeight: 48,
    padding: "0 18px",
    textDecoration: "none",
  },
  proofRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: 10,
  },
  proofPill: {
    alignItems: "center",
    background: "rgba(255,255,255,0.10)",
    border: "1px solid rgba(255,255,255,0.16)",
    borderRadius: 999,
    color: "rgba(255,255,255,0.86)",
    display: "inline-flex",
    fontSize: 13,
    fontWeight: 850,
    gap: 7,
    padding: "8px 11px",
  },
  phoneFrame: {
    justifySelf: "center",
    perspective: 1200,
  },
  phoneScreen: {
    background: "linear-gradient(160deg, #ffffff, #e8f2ff)",
    border: "10px solid #07111f",
    borderRadius: 42,
    boxShadow: "0 34px 90px rgba(0,0,0,0.42)",
    color: "#102033",
    display: "grid",
    gap: 16,
    maxWidth: 336,
    minHeight: 620,
    padding: 18,
    transform: "rotate(-2deg)",
    width: "min(76vw, 336px)",
  },
  phoneStatus: {
    display: "flex",
    fontSize: 12,
    fontWeight: 900,
    justifyContent: "space-between",
  },
  phoneLogo: {
    height: 38,
    objectFit: "contain",
    width: 138,
  },
  phoneCard: {
    background: "#fff",
    border: "1px solid #dbe7f3",
    borderRadius: 22,
    boxShadow: "0 16px 34px rgba(15,23,42,0.10)",
    padding: 18,
  },
  phoneEyebrow: {
    color: "#1e8e3e",
    fontSize: 12,
    fontWeight: 950,
    textTransform: "uppercase",
  },
  phoneApps: {
    display: "grid",
    gap: 10,
    gridTemplateColumns: "1fr 1fr",
  },
  phoneApp: {
    background: "rgba(255,255,255,0.82)",
    border: "1px solid #dbe7f3",
    borderRadius: 16,
    boxShadow: "inset 5px 0 0 var(--tile-color)",
    fontSize: 13,
    fontWeight: 900,
    padding: "16px 12px",
  },
  phoneButton: {
    alignItems: "center",
    alignSelf: "end",
    background: "#102033",
    border: 0,
    borderRadius: 16,
    color: "#fff",
    cursor: "pointer",
    display: "inline-flex",
    fontWeight: 900,
    gap: 6,
    justifyContent: "center",
    minHeight: 44,
  },
  section: {
    padding: "72px clamp(18px, 4vw, 56px)",
  },
  sectionIntro: {
    display: "grid",
    gap: 10,
    margin: "0 auto 28px",
    maxWidth: 880,
    textAlign: "center",
  },
  sectionKicker: {
    color: "#1e8e3e",
    fontSize: 12,
    fontWeight: 950,
    letterSpacing: 0,
    textTransform: "uppercase",
  },
  sectionTitle: {
    color: "#102033",
    fontSize: "clamp(32px, 4vw, 52px)",
    letterSpacing: 0,
    lineHeight: 1.04,
    margin: 0,
  },
  sectionText: {
    color: "#52657a",
    fontSize: 18,
    lineHeight: 1.6,
    margin: 0,
  },
  productPreview: {
    margin: "0 auto",
    maxWidth: 1040,
  },
  previewToolbar: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "center",
    marginBottom: 14,
  },
  previewTab: {
    background: "#fff",
    border: "1px solid #d8e3ee",
    borderRadius: 999,
    color: "#52657a",
    cursor: "pointer",
    fontWeight: 900,
    minHeight: 40,
    padding: "0 14px",
  },
  previewTabActive: {
    background: "#102033",
    borderColor: "#102033",
    color: "#fff",
  },
  previewShell: {
    background: "#fff",
    border: "1px solid #d8e3ee",
    borderRadius: 24,
    boxShadow: "0 24px 60px rgba(15,23,42,0.10)",
    overflow: "hidden",
  },
  previewHeader: {
    alignItems: "center",
    background: "#102033",
    color: "#fff",
    display: "flex",
    flexWrap: "wrap",
    gap: 10,
    justifyContent: "space-between",
    padding: "16px 18px",
  },
  studentShot: {
    backgroundColor: "#f8f9fb",
    backgroundImage: `url(${studentDeviceBackground})`,
    backgroundPosition: "center",
    backgroundSize: "cover",
    display: "grid",
    gridTemplateRows: "56px minmax(360px, 1fr) auto",
    minHeight: 520,
    overflow: "hidden",
    padding: 12,
    position: "relative",
  },
  studentDeviceTopBar: {
    alignItems: "center",
    background: "rgba(243,247,252,0.86)",
    backdropFilter: "blur(18px) saturate(1.12)",
    WebkitBackdropFilter: "blur(18px) saturate(1.12)",
    border: "1px solid rgba(255,255,255,0.82)",
    borderRadius: 20,
    boxShadow: "0 18px 42px rgba(15,23,42,0.10)",
    color: "#102033",
    display: "grid",
    gap: 10,
    gridTemplateColumns: "42px minmax(0, 1fr) auto",
    padding: "8px 10px",
    position: "relative",
    zIndex: 2,
  },
  studentDeviceAvatar: {
    alignItems: "center",
    background: "#f36c18",
    borderRadius: 16,
    color: "#fff",
    display: "inline-flex",
    fontFamily: "Georgia, 'Times New Roman', serif",
    fontWeight: 950,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  studentDeviceStatusGroup: {
    alignItems: "center",
    display: "flex",
    gap: 8,
    justifyContent: "flex-end",
  },
  studentDeviceStatus: {
    alignItems: "center",
    background: "rgba(255,255,255,0.72)",
    border: "1px solid rgba(219,231,243,0.92)",
    borderRadius: 14,
    color: "#102033",
    cursor: "pointer",
    display: "inline-flex",
    fontFamily: "inherit",
    fontSize: 12,
    fontWeight: 950,
    gap: 6,
    minHeight: 34,
    padding: "0 10px",
  },
  studentDeviceStatusActive: {
    background: "#102033",
    borderColor: "#102033",
    color: "#fff",
  },
  studentDeviceRoundButton: {
    alignItems: "center",
    background: "rgba(255,111,24,0.10)",
    border: "1px solid rgba(255,111,24,0.16)",
    borderRadius: 14,
    color: "#e85f12",
    cursor: "pointer",
    display: "inline-flex",
    fontFamily: "inherit",
    height: 34,
    justifyContent: "center",
    width: 34,
  },
  studentDesktopArea: {
    display: "grid",
    gap: 18,
    gridTemplateColumns: "repeat(8, minmax(52px, 1fr))",
    gridTemplateRows: "112px minmax(120px, 1fr) 104px",
    padding: "20px 18px 0",
    position: "relative",
  },
  studentDesktopTile: {
    alignItems: "center",
    alignSelf: "start",
    background: "rgba(255,255,255,0.56)",
    backdropFilter: "blur(18px) saturate(1.12)",
    WebkitBackdropFilter: "blur(18px) saturate(1.12)",
    border: "1px solid rgba(15,23,42,0.75)",
    borderRadius: 18,
    boxShadow: "0 14px 34px rgba(15,23,42,0.09)",
    color: "#0f172a",
    display: "grid",
    gap: 7,
    justifyItems: "center",
    minHeight: 94,
    padding: 9,
  },
  studentDesktopButton: {
    cursor: "pointer",
    fontFamily: "inherit",
    fontSize: 11,
  },
  createGroupPreviewIcon: {
    alignItems: "center",
    background: "rgba(255,111,24,0.18)",
    borderRadius: 14,
    color: "#b65319",
    display: "inline-flex",
    fontSize: 24,
    fontWeight: 700,
    height: 48,
    justifyContent: "center",
    width: 48,
  },
  googleGroupPreview: {
    display: "grid",
    gap: 3,
    gridTemplateColumns: "repeat(2, 18px)",
    marginTop: 8,
  },
  googleMiniIcon: {
    alignItems: "center",
    borderRadius: 5,
    color: "#fff",
    display: "inline-flex",
    fontSize: 9,
    fontWeight: 950,
    height: 18,
    justifyContent: "center",
    width: 18,
  },
  calendarPreviewIcon: {
    background: "linear-gradient(135deg, #4285f4 0 50%, #fbbc04 50% 70%, #34a853 70% 100%)",
    borderRadius: 6,
    color: "#4285f4",
    display: "grid",
    height: 38,
    marginTop: 8,
    placeItems: "center",
    width: 38,
  },
  studentGroupOverlay: {
    alignItems: "center",
    background: "rgba(16,32,51,0.10)",
    backdropFilter: "blur(8px)",
    WebkitBackdropFilter: "blur(8px)",
    border: 0,
    display: "flex",
    inset: 0,
    justifyContent: "center",
    padding: 18,
    position: "absolute",
    zIndex: 4,
  },
  studentGroupPanel: {
    background: "rgba(255,255,255,0.62)",
    backdropFilter: "blur(24px) saturate(1.16)",
    WebkitBackdropFilter: "blur(24px) saturate(1.16)",
    border: "1px solid rgba(255,255,255,0.78)",
    borderRadius: 24,
    boxShadow: "0 24px 72px rgba(15,23,42,0.22)",
    color: "#102033",
    display: "grid",
    gap: 14,
    maxWidth: 360,
    padding: 18,
    width: "min(86%, 360px)",
  },
  studentGroupApps: {
    display: "grid",
    gap: 10,
    gridTemplateColumns: "repeat(3, minmax(72px, 1fr))",
  },
  studentGroupApp: {
    alignItems: "center",
    background: "rgba(255,255,255,0.66)",
    border: "1px solid rgba(255,255,255,0.72)",
    borderRadius: 18,
    color: "#102033",
    cursor: "pointer",
    display: "grid",
    fontFamily: "inherit",
    fontSize: 12,
    fontWeight: 900,
    gap: 8,
    justifyItems: "center",
    minHeight: 92,
    padding: 10,
  },
  studentMessageToast: {
    alignItems: "center",
    background: "rgba(16,32,51,0.92)",
    border: "1px solid rgba(255,255,255,0.18)",
    borderRadius: 999,
    bottom: 14,
    color: "#fff",
    cursor: "pointer",
    display: "inline-flex",
    fontFamily: "inherit",
    fontWeight: 900,
    gap: 8,
    left: "50%",
    minHeight: 40,
    padding: "0 14px",
    position: "absolute",
    transform: "translateX(-50%)",
    zIndex: 5,
  },
  studentDemoPanel: {
    background: "rgba(255,255,255,0.70)",
    backdropFilter: "blur(24px) saturate(1.14)",
    WebkitBackdropFilter: "blur(24px) saturate(1.14)",
    border: "1px solid rgba(255,255,255,0.82)",
    borderRadius: 26,
    boxShadow: "0 24px 72px rgba(15,23,42,0.20)",
    color: "#102033",
    display: "grid",
    gap: 14,
    left: "50%",
    maxWidth: 520,
    padding: 18,
    position: "absolute",
    top: "50%",
    transform: "translate(-50%, -50%)",
    width: "min(86%, 520px)",
    zIndex: 4,
  },
  studentDemoPanelHeader: {
    alignItems: "center",
    display: "flex",
    justifyContent: "space-between",
  },
  studentDemoPanelButton: {
    background: "#102033",
    border: 0,
    borderRadius: 999,
    color: "#fff",
    cursor: "pointer",
    fontFamily: "inherit",
    fontWeight: 900,
    minHeight: 34,
    padding: "0 12px",
  },
  studentDemoAppGrid: {
    display: "grid",
    gap: 10,
    gridTemplateColumns: "repeat(auto-fit, minmax(116px, 1fr))",
  },
  studentDemoAppButton: {
    alignItems: "center",
    background: "rgba(255,255,255,0.68)",
    border: "1px solid rgba(15,23,42,0.08)",
    borderRadius: 18,
    color: "#102033",
    cursor: "pointer",
    display: "grid",
    fontFamily: "inherit",
    gap: 8,
    justifyItems: "center",
    minHeight: 92,
    padding: 12,
  },
  studentSettingsList: {
    display: "grid",
    gap: 9,
  },
  studentSettingsRow: {
    background: "rgba(255,255,255,0.66)",
    border: "1px solid rgba(15,23,42,0.08)",
    borderRadius: 16,
    color: "#102033",
    cursor: "pointer",
    display: "grid",
    fontFamily: "inherit",
    gap: 4,
    padding: 12,
    textAlign: "left",
  },
  studentStatusDetailGrid: {
    display: "grid",
    gap: 9,
  },
  studentStatusDetailRow: {
    alignItems: "center",
    background: "rgba(255,255,255,0.66)",
    border: "1px solid rgba(15,23,42,0.08)",
    borderRadius: 16,
    display: "flex",
    gap: 12,
    justifyContent: "space-between",
    padding: "12px 14px",
  },
  studentStatusAction: {
    alignItems: "center",
    background: "#f36c18",
    border: 0,
    borderRadius: 16,
    color: "#fff",
    cursor: "pointer",
    display: "inline-flex",
    fontFamily: "inherit",
    fontWeight: 950,
    gap: 8,
    justifyContent: "center",
    minHeight: 42,
    padding: "0 14px",
  },
  studentBatteryMeter: {
    alignItems: "center",
    background: "rgba(16,32,51,0.10)",
    border: "1px solid rgba(16,32,51,0.12)",
    borderRadius: 18,
    display: "grid",
    gap: 10,
    gridTemplateColumns: "minmax(0, 1fr) auto",
    padding: 12,
  },
  studentBatteryFill: {
    background: "linear-gradient(90deg, #22c55e, #84cc16)",
    borderRadius: 999,
    display: "block",
    height: 16,
    width: "100%",
  },
  studentBlockedPanel: {
    alignItems: "center",
    display: "grid",
    gap: 10,
    justifyItems: "center",
    padding: 8,
    textAlign: "center",
  },
  studentDeviceDock: {
    alignItems: "center",
    background: "rgba(66,82,115,0.42)",
    backdropFilter: "blur(16px) saturate(1.15)",
    WebkitBackdropFilter: "blur(16px) saturate(1.15)",
    borderRadius: 24,
    display: "grid",
    gap: 8,
    gridTemplateColumns: "repeat(6, minmax(62px, 1fr))",
    padding: 10,
    position: "relative",
    zIndex: 2,
  },
  studentDockItem: {
    alignItems: "center",
    background: "#f36c18",
    border: "1px solid rgba(255,255,255,0.14)",
    borderRadius: 14,
    color: "#fff",
    display: "grid",
    fontSize: 12,
    fontWeight: 950,
    gap: 2,
    justifyItems: "center",
    cursor: "pointer",
    fontFamily: "inherit",
    minHeight: 54,
    minWidth: 0,
    padding: "6px 8px",
    textAlign: "center",
  },
  studentDockItemActive: {
    background: "#102033",
    boxShadow: "inset 0 0 0 2px rgba(255,255,255,0.18)",
  },
  studentDockGoogleMark: {
    alignItems: "center",
    background: "#fff",
    borderRadius: 999,
    color: "#ea4335",
    display: "inline-flex",
    fontSize: 13,
    fontWeight: 950,
    height: 24,
    justifyContent: "center",
    width: 24,
  },
  studentTopBar: {
    alignItems: "center",
    background: "rgba(255,255,255,0.74)",
    border: "1px solid rgba(255,255,255,0.74)",
    borderRadius: 20,
    display: "flex",
    gap: 12,
    padding: 12,
  },
  avatar: {
    alignItems: "center",
    background: "#2563eb",
    borderRadius: 14,
    color: "#fff",
    display: "inline-flex",
    fontWeight: 950,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  onlinePill: {
    background: "#dcfce7",
    borderRadius: 999,
    color: "#166534",
    fontSize: 12,
    fontWeight: 950,
    marginLeft: "auto",
    padding: "7px 10px",
  },
  appGrid: {
    display: "grid",
    gap: 14,
    gridTemplateColumns: "repeat(auto-fit, minmax(118px, 1fr))",
  },
  appTile: {
    alignItems: "center",
    background: "rgba(255,255,255,0.82)",
    border: "1px solid rgba(255,255,255,0.9)",
    borderRadius: 20,
    display: "grid",
    gap: 10,
    justifyItems: "center",
    minHeight: 112,
    padding: 12,
  },
  appIcon: {
    alignItems: "center",
    borderRadius: 18,
    color: "#fff",
    display: "inline-flex",
    fontWeight: 950,
    height: 48,
    justifyContent: "center",
    width: 48,
  },
  deviceDock: {
    alignSelf: "end",
    background: "rgba(255,255,255,0.68)",
    borderRadius: 22,
    display: "flex",
    gap: 12,
    justifySelf: "center",
    padding: 12,
  },
  workspacePreview: {
    background: "linear-gradient(135deg, #eff6ff, #f8fbff 46%, #f1f5f9)",
    color: "#0f172a",
    display: "grid",
    gridTemplateRows: "auto 1fr",
    minHeight: 520,
    overflow: "hidden",
  },
  workspaceHeader: {
    alignItems: "center",
    background: "rgba(255,255,255,0.72)",
    backdropFilter: "blur(18px) saturate(1.12)",
    WebkitBackdropFilter: "blur(18px) saturate(1.12)",
    borderBottom: "1px solid rgba(203,213,225,0.72)",
    display: "flex",
    gap: 12,
    justifyContent: "space-between",
    padding: "16px 18px",
  },
  workspaceEyebrow: {
    color: "#64748b",
    display: "block",
    fontSize: 12,
    fontWeight: 900,
    textTransform: "uppercase",
  },
  workspaceIconButton: {
    alignItems: "center",
    background: "rgba(255,255,255,0.82)",
    border: "1px solid rgba(15,23,42,0.10)",
    borderRadius: 14,
    color: "#102033",
    cursor: "pointer",
    display: "inline-flex",
    height: 38,
    justifyContent: "center",
    width: 38,
  },
  workspaceBody: {
    display: "grid",
    gap: 18,
    gridTemplateColumns: "210px minmax(0, 1fr)",
    minHeight: 0,
    padding: 18,
  },
  workspaceSideNav: {
    background: "rgba(255,255,255,0.72)",
    backdropFilter: "blur(18px) saturate(1.12)",
    WebkitBackdropFilter: "blur(18px) saturate(1.12)",
    border: "1px solid rgba(255,255,255,0.56)",
    borderRadius: 24,
    boxShadow: "0 18px 46px rgba(15,23,42,0.10)",
    display: "flex",
    flexDirection: "column",
    gap: 8,
    padding: 12,
  },
  workspaceNavTitle: {
    color: "#64748b",
    fontSize: 12,
    fontWeight: 900,
    padding: "8px 12px 4px",
    textTransform: "uppercase",
  },
  workspaceNavButton: {
    alignItems: "center",
    background: "rgba(30,142,62,0.08)",
    border: "1px solid rgba(30,142,62,0.10)",
    borderRadius: 999,
    color: "#166534",
    cursor: "pointer",
    display: "flex",
    fontFamily: "inherit",
    fontSize: 13,
    fontWeight: 850,
    gap: 9,
    minHeight: 42,
    padding: "0 13px",
    textAlign: "left",
    width: "100%",
  },
  workspaceNavButtonActive: {
    background: "#1e8e3e",
    borderColor: "transparent",
    color: "#fff",
  },
  adminWorkspaceNavButton: {
    fontSize: 11,
    gap: 7,
    minHeight: 32,
    padding: "0 10px",
  },
  workspaceContent: {
    display: "grid",
    gap: 14,
    alignContent: "start",
    minWidth: 0,
  },
  workspaceSummaryRow: {
    display: "grid",
    gap: 12,
    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
  },
  workspaceSummaryTile: {
    background: "rgba(255,255,255,0.72)",
    backdropFilter: "blur(18px) saturate(1.12)",
    WebkitBackdropFilter: "blur(18px) saturate(1.12)",
    border: "1px solid rgba(255,255,255,0.56)",
    borderRadius: 22,
    boxShadow: "0 16px 42px rgba(15,23,42,0.10)",
    display: "grid",
    gap: 4,
    minHeight: 88,
    padding: 14,
  },
  teacherWorkspaceGrid: {
    display: "grid",
    gap: 14,
    gridTemplateColumns: "minmax(220px, 0.9fr) minmax(260px, 1.1fr)",
  },
  workspacePanel: {
    background: "rgba(255,255,255,0.72)",
    backdropFilter: "blur(18px) saturate(1.12)",
    WebkitBackdropFilter: "blur(18px) saturate(1.12)",
    border: "1px solid rgba(255,255,255,0.56)",
    borderRadius: 22,
    boxShadow: "0 16px 42px rgba(15,23,42,0.10)",
    padding: 16,
  },
  workspacePanelHeader: {
    alignItems: "center",
    display: "flex",
    gap: 12,
    justifyContent: "space-between",
    marginBottom: 14,
  },
  workspaceSearch: {
    alignItems: "center",
    background: "rgba(255,255,255,0.78)",
    border: "1px solid rgba(15,23,42,0.10)",
    borderRadius: 14,
    color: "#64748b",
    display: "flex",
    fontSize: 13,
    gap: 8,
    marginBottom: 14,
    minHeight: 42,
    padding: "0 12px",
  },
  workspaceList: {
    display: "grid",
    gap: 10,
  },
  workspacePersonRow: {
    alignItems: "center",
    background: "rgba(255,255,255,0.66)",
    border: "1px solid rgba(15,23,42,0.08)",
    borderRadius: 16,
    color: "#0f172a",
    cursor: "pointer",
    display: "grid",
    fontFamily: "inherit",
    gap: 12,
    gridTemplateColumns: "42px minmax(0, 1fr)",
    padding: 12,
    textAlign: "left",
  },
  workspacePersonRowActive: {
    background: "#eef8f2",
    borderColor: "#9ed8b3",
    boxShadow: "inset 4px 0 0 #1e8e3e",
  },
  workspaceAvatar: {
    alignItems: "center",
    borderRadius: 14,
    color: "#fff",
    display: "inline-flex",
    fontWeight: 950,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  workspacePersonHero: {
    alignItems: "center",
    display: "flex",
    gap: 12,
    marginBottom: 14,
  },
  workspaceHeroAvatar: {
    alignItems: "center",
    background: "#1e8e3e",
    borderRadius: 18,
    color: "#fff",
    display: "inline-flex",
    fontWeight: 950,
    height: 58,
    justifyContent: "center",
    width: 58,
  },
  teacherPinForm: {
    alignItems: "end",
    display: "grid",
    gap: 10,
    gridTemplateColumns: "minmax(0, 1fr) auto",
    marginBottom: 14,
  },
  workspacePrimaryButton: {
    alignItems: "center",
    background: "#1e8e3e",
    border: 0,
    borderRadius: 14,
    color: "#fff",
    cursor: "pointer",
    display: "inline-flex",
    fontFamily: "inherit",
    fontWeight: 900,
    gap: 7,
    minHeight: 40,
    padding: "0 12px",
  },
  workspaceDeviceRow: {
    alignItems: "center",
    background: "rgba(255,255,255,0.66)",
    border: "1px solid rgba(15,23,42,0.08)",
    borderRadius: 16,
    display: "grid",
    gap: 10,
    gridTemplateColumns: "10px minmax(0, 1fr) auto",
    padding: 12,
  },
  workspaceMessageBar: {
    alignItems: "center",
    background: "#102033",
    border: 0,
    borderRadius: 18,
    color: "#fff",
    cursor: "pointer",
    display: "flex",
    fontFamily: "inherit",
    fontWeight: 900,
    gap: 10,
    justifyContent: "flex-start",
    minHeight: 50,
    padding: "0 16px",
    textAlign: "left",
  },
  onlineDot: {
    background: "#16a34a",
    borderRadius: 999,
    height: 10,
    width: 10,
  },
  adminDeviceGrid: {
    display: "grid",
    gap: 14,
    gridTemplateColumns: "minmax(260px, 1fr) minmax(240px, 0.9fr)",
  },
  adminDeviceRow: {
    alignItems: "center",
    background: "rgba(255,255,255,0.66)",
    border: "1px solid rgba(15,23,42,0.08)",
    borderRadius: 16,
    color: "#0f172a",
    cursor: "pointer",
    display: "grid",
    fontFamily: "inherit",
    gap: 10,
    gridTemplateColumns: "10px minmax(0, 1fr) auto",
    padding: 12,
    textAlign: "left",
  },
  adminTelemetryPanel: {
    background: "rgba(248,251,255,0.82)",
    border: "1px solid rgba(15,23,42,0.08)",
    borderRadius: 18,
    display: "grid",
    gap: 10,
    padding: 14,
  },
  telemetryRow: {
    alignItems: "center",
    borderTop: "1px solid rgba(15,23,42,0.08)",
    display: "flex",
    gap: 10,
    justifyContent: "space-between",
    paddingTop: 9,
  },
  adminSectionStack: {
    display: "grid",
    gap: 14,
  },
  adminOverviewGrid: {
    display: "grid",
    gap: 12,
    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
  },
  adminOverviewStatGrid: {
    display: "grid",
    gap: 10,
    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
  },
  adminOverviewStatCard: {
    background: "rgba(248,251,255,0.82)",
    border: "1px solid rgba(15,23,42,0.08)",
    borderRadius: 16,
    display: "grid",
    gap: 4,
    minHeight: 78,
    padding: 12,
  },
  adminShelfGrid: {
    display: "grid",
    gap: 12,
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  },
  adminShelfTile: {
    background: "rgba(255,255,255,0.72)",
    border: "1px solid rgba(255,255,255,0.56)",
    borderRadius: 18,
    display: "grid",
    gap: 4,
    minHeight: 84,
    padding: 14,
  },
  adminCompactRows: {
    display: "grid",
    gap: 9,
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  },
  adminSettingsGrid: {
    display: "grid",
    gap: 12,
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  },
  adminSettingCard: {
    background: "rgba(248,251,255,0.82)",
    border: "1px solid rgba(15,23,42,0.08)",
    borderRadius: 18,
    display: "grid",
    gap: 7,
    minHeight: 104,
    padding: 14,
  },
  adminDeviceActions: {
    display: "flex",
    gap: 8,
    paddingTop: 4,
  },
  adminTinyButton: {
    background: "rgba(30,142,62,0.10)",
    border: "1px solid rgba(30,142,62,0.16)",
    borderRadius: 12,
    color: "#166534",
    cursor: "pointer",
    fontFamily: "inherit",
    fontWeight: 900,
    minHeight: 34,
    padding: "0 10px",
  },
  demoCardGrid: {
    display: "grid",
    gap: 12,
    gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
  },
  demoAppCard: {
    background: "rgba(255,255,255,0.66)",
    border: "1px solid rgba(15,23,42,0.08)",
    borderRadius: 18,
    color: "#0f172a",
    cursor: "pointer",
    display: "grid",
    fontFamily: "inherit",
    gap: 8,
    justifyItems: "start",
    minHeight: 132,
    padding: 14,
    textAlign: "left",
  },
  demoGroupCard: {
    alignItems: "center",
    background: "rgba(255,255,255,0.66)",
    border: "1px solid rgba(15,23,42,0.08)",
    borderRadius: 18,
    color: "#0f172a",
    cursor: "pointer",
    display: "grid",
    fontFamily: "inherit",
    gap: 7,
    gridTemplateColumns: "10px minmax(0, 1fr)",
    padding: 14,
    textAlign: "left",
  },
  teacherNoticeComposer: {
    background: "rgba(255,255,255,0.66)",
    border: "1px solid rgba(15,23,42,0.08)",
    borderRadius: 18,
    display: "grid",
    gap: 9,
    padding: 14,
  },
  overviewDemoGrid: {
    display: "grid",
    gap: 12,
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  },
  teacherShot: {
    display: "grid",
    gap: 14,
    minHeight: 430,
    padding: 24,
  },
  panelHeader: {
    alignItems: "center",
    display: "flex",
    justifyContent: "space-between",
  },
  fakeButton: {
    background: "#1e8e3e",
    border: 0,
    borderRadius: 12,
    color: "#fff",
    fontWeight: 900,
    minHeight: 38,
    padding: "0 12px",
  },
  studentRow: {
    alignItems: "center",
    background: "#f8fbff",
    border: "1px solid #d8e3ee",
    borderRadius: 16,
    display: "grid",
    gap: 12,
    gridTemplateColumns: "16px minmax(0, 1fr) auto",
    padding: 14,
    color: "#102033",
    cursor: "pointer",
    fontFamily: "inherit",
    textAlign: "left",
  },
  studentRowActive: {
    background: "#eef8f2",
    borderColor: "#9ed8b3",
    boxShadow: "inset 4px 0 0 #1e8e3e",
  },
  studentDot: {
    borderRadius: 999,
    height: 12,
    width: 12,
  },
  pinBadge: {
    background: "#e8f5ee",
    borderRadius: 999,
    color: "#166534",
    fontSize: 12,
    fontWeight: 950,
    padding: "7px 10px",
  },
  messageCard: {
    alignItems: "center",
    background: "#102033",
    borderRadius: 18,
    color: "#fff",
    display: "flex",
    gap: 10,
    padding: 16,
  },
  teacherControlGrid: {
    display: "grid",
    gap: 10,
    gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
  },
  teacherActionButton: {
    background: "#fff",
    border: "1px solid #d8e3ee",
    borderRadius: 14,
    color: "#102033",
    cursor: "pointer",
    fontFamily: "inherit",
    fontWeight: 900,
    minHeight: 42,
  },
  adminShot: {
    display: "grid",
    gap: 18,
    minHeight: 430,
    padding: 24,
  },
  metricGrid: {
    display: "grid",
    gap: 14,
    gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
  },
  metricCard: {
    background: "#f8fbff",
    border: "1px solid #d8e3ee",
    borderRadius: 18,
    display: "grid",
    gap: 6,
    padding: 16,
  },
  deviceTable: {
    background: "#f8fbff",
    border: "1px solid #d8e3ee",
    borderRadius: 18,
    overflow: "hidden",
  },
  deviceTableRow: {
    alignItems: "center",
    borderBottom: "1px solid #d8e3ee",
    background: "transparent",
    color: "#102033",
    cursor: "pointer",
    display: "grid",
    fontFamily: "inherit",
    gap: 12,
    gridTemplateColumns: "12px minmax(0, 1fr) minmax(0, 1fr)",
    padding: 16,
    textAlign: "left",
    width: "100%",
  },
  deviceTableRowActive: {
    background: "#eef8f2",
  },
  tableStatus: {
    background: "#16a34a",
    borderRadius: 999,
    height: 10,
    width: 10,
  },
  adminDetailPanel: {
    alignItems: "center",
    background: "#102033",
    borderRadius: 18,
    color: "#fff",
    display: "grid",
    gap: 12,
    gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
    padding: 16,
  },
  featureBand: {
    background: "#fff",
    padding: "72px clamp(18px, 4vw, 56px)",
  },
  featureGrid: {
    display: "grid",
    gap: 16,
    gridTemplateColumns: "repeat(auto-fit, minmax(min(260px, 100%), 1fr))",
    margin: "0 auto",
    maxWidth: 1120,
  },
  featureCard: {
    background: "#f8fbff",
    border: "1px solid #d8e3ee",
    borderRadius: 22,
    padding: 20,
  },
  featureIcon: {
    alignItems: "center",
    background: "#e8f5ee",
    borderRadius: 16,
    color: "#1e8e3e",
    display: "inline-flex",
    height: 46,
    justifyContent: "center",
    width: 46,
  },
  comparisonBand: {
    alignItems: "center",
    background: "#102033",
    color: "#fff",
    display: "grid",
    gap: 28,
    gridTemplateColumns: "repeat(auto-fit, minmax(min(330px, 100%), 1fr))",
    padding: "72px clamp(18px, 4vw, 56px)",
  },
  comparisonCopy: {
    maxWidth: 680,
  },
  comparisonGrid: {
    display: "grid",
    gap: 14,
    gridTemplateColumns: "repeat(auto-fit, minmax(min(230px, 100%), 1fr))",
  },
  compareColumnMuted: {
    background: "rgba(255,255,255,0.08)",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 20,
    padding: 18,
  },
  compareColumn: {
    background: "#fff",
    borderRadius: 20,
    color: "#102033",
    padding: 18,
  },
  pricingSection: {
    padding: "72px clamp(18px, 4vw, 56px)",
  },
  calculator: {
    display: "grid",
    gap: 18,
    gridTemplateColumns: "repeat(auto-fit, minmax(min(320px, 100%), 1fr))",
    margin: "0 auto",
    maxWidth: 1060,
  },
  sliderPanel: {
    background: "#fff",
    border: "1px solid #d8e3ee",
    borderRadius: 24,
    boxShadow: "0 16px 42px rgba(15,23,42,0.08)",
    display: "grid",
    gap: 18,
    padding: 22,
  },
  sliderHeader: {
    alignItems: "center",
    display: "flex",
    justifyContent: "space-between",
  },
  slider: {
    accentColor: "#1e8e3e",
    width: "100%",
  },
  sliderBounds: {
    color: "#52657a",
    display: "flex",
    fontSize: 13,
    fontWeight: 850,
    justifyContent: "space-between",
  },
  priceCards: {
    display: "grid",
    gap: 14,
    gridTemplateColumns: "repeat(auto-fit, minmax(min(240px, 100%), 1fr))",
  },
  priceCardPrimary: {
    background: "#102033",
    borderRadius: 24,
    boxShadow: "0 16px 42px rgba(15,23,42,0.12)",
    color: "#fff",
    display: "grid",
    gap: 10,
    padding: 22,
  },
  priceCard: {
    background: "#fff",
    border: "1px solid #d8e3ee",
    borderRadius: 24,
    boxShadow: "0 16px 42px rgba(15,23,42,0.08)",
    display: "grid",
    gap: 10,
    padding: 22,
  },
  priceLabel: {
    alignItems: "center",
    display: "inline-flex",
    fontSize: 13,
    fontWeight: 950,
    gap: 8,
    textTransform: "uppercase",
  },
  priceValue: {
    fontSize: "clamp(28px, 4vw, 42px)",
    lineHeight: 1,
  },
  finalCta: {
    alignItems: "center",
    background: "#fff",
    display: "flex",
    flexWrap: "wrap",
    gap: 20,
    justifyContent: "space-between",
    padding: "56px clamp(18px, 4vw, 56px)",
  },
  finalTitle: {
    fontSize: "clamp(30px, 4vw, 48px)",
    lineHeight: 1.05,
    margin: "8px 0 0",
    maxWidth: 760,
  },
};
