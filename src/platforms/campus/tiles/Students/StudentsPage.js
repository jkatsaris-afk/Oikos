import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  BadgeDollarSign,
  GraduationCap,
  HeartPulse,
  Home,
  Languages,
  PencilLine,
  Phone,
  Plus,
  Save,
  Search,
  ShieldAlert,
  User,
  Users,
  X,
} from "lucide-react";

import { useAuth } from "../../../../auth/useAuth";
import GlobalLoadingPage from "../../../../core/components/GlobalLoadingPage";
import {
  createCampusStudent,
  inviteCampusParentPortal,
  loadCampusStudents,
  searchCampusStudents,
  setCampusParentPortalAccess,
  uploadCampusStudentPhoto,
  updateCampusStudent,
} from "../../services/studentService";
import { loadCampusStaffDashboard } from "../../services/staffService";

function formatDate(value) {
  if (!value) return "Not set";

  try {
    return new Date(value).toLocaleDateString();
  } catch (_error) {
    return value;
  }
}

function formatCurrencyFromCents(value) {
  const cents = Number(value || 0) || 0;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

function renderPill(value, fallback = "Not set") {
  return value ? value : fallback;
}

function renderKeyValues(data = {}) {
  return Object.entries(data).filter(([, value]) => {
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === "boolean") return true;
    return value !== null && value !== undefined && value !== "";
  });
}

function toJsonText(value, fallback = "[]") {
  try {
    return JSON.stringify(value ?? JSON.parse(fallback), null, 2);
  } catch (_error) {
    return fallback;
  }
}

function parseJsonField(value, fallback) {
  try {
    const parsed = JSON.parse(value);
    return parsed;
  } catch (_error) {
    return fallback;
  }
}

function cloneValue(value, fallback) {
  try {
    return JSON.parse(JSON.stringify(value ?? fallback));
  } catch (_error) {
    return fallback;
  }
}

function createGuardian() {
  return {
    name: "",
    relationship: "",
    phone: "",
    email: "",
    linkedUserId: "",
    portalAccess: false,
    pickupApproved: false,
  };
}

function createEmergencyContact() {
  return {
    name: "",
    relationship: "",
    phone: "",
    priority: "",
  };
}

function createDisciplinaryEntry() {
  return {
    date: "",
    incidentType: "",
    actionTaken: "",
    staffName: "",
    notes: "",
  };
}

function createParentContactEntry() {
  return {
    date: "",
    method: "",
    contactName: "",
    staffName: "",
    summary: "",
  };
}

function SectionCard({ icon: Icon, title, action = null, sectionRef = null, children }) {
  return (
    <section ref={sectionRef} style={styles.sectionCard}>
      <div style={styles.sectionHeader}>
        <div style={styles.sectionHeaderLeft}>
          <div style={styles.sectionIcon}>
            <Icon size={18} />
          </div>
          <div style={styles.sectionTitle}>{title}</div>
        </div>
        {action}
      </div>
      <div style={styles.sectionBody}>{children}</div>
    </section>
  );
}

function DetailGrid({ items = [] }) {
  return (
    <div style={styles.detailGrid}>
      {items.map((item) => (
        <div key={item.label} style={styles.detailCard}>
          <div style={styles.detailLabel}>{item.label}</div>
          <div style={styles.detailValue}>{item.value || "Not set"}</div>
        </div>
      ))}
    </div>
  );
}

function LabeledInput({ label, value, onChange, placeholder = "", type = "text" }) {
  return (
    <label style={styles.field}>
      <span style={styles.fieldLabel}>{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        style={styles.input}
      />
    </label>
  );
}

function LabeledSelect({ label, value, onChange, options = [], placeholder = "Select an option" }) {
  return (
    <label style={styles.field}>
      <span style={styles.fieldLabel}>{label}</span>
      <select value={value || ""} onChange={(event) => onChange(event.target.value)} style={styles.input}>
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function LabeledTextarea({ label, value, onChange, placeholder = "", rows = 5 }) {
  return (
    <label style={styles.field}>
      <span style={styles.fieldLabel}>{label}</span>
      <textarea
        rows={rows}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        style={styles.textarea}
      />
    </label>
  );
}

export default function StudentsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [tuitionFilter, setTuitionFilter] = useState("all");
  const [students, setStudents] = useState([]);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [previewStudentId, setPreviewStudentId] = useState("");
  const [pendingEditStudentId, setPendingEditStudentId] = useState("");
  const [editMode, setEditMode] = useState(false);
  const [activeEditSection, setActiveEditSection] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [editForm, setEditForm] = useState(null);
  const [teacherOptions, setTeacherOptions] = useState([]);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [guardianAccessSavingKey, setGuardianAccessSavingKey] = useState("");
  const studentPhotoInputRef = useRef(null);
  const editSectionRefs = useMemo(
    () => ({
      demographics: { current: null },
      enrollment: { current: null },
      tuition: { current: null },
      household: { current: null },
      guardians: { current: null },
      emergency: { current: null },
      medical: { current: null },
      disciplinary: { current: null },
      parentContact: { current: null },
      programs: { current: null },
    }),
    []
  );

  useEffect(() => {
    let mounted = true;

    async function bootstrap() {
      setLoading(true);

      try {
        const nextStudents = await loadCampusStudents(user?.id);
        let nextTeacherOptions = [];

        try {
          const staffDashboard = await loadCampusStaffDashboard(user?.id);
          nextTeacherOptions = (staffDashboard.staff || [])
            .filter(
              (staff) =>
                staff.isActive &&
                String(staff.staffType || "").toLowerCase() === "teacher" &&
                String(staff.displayName || "").trim()
            )
            .map((staff) => String(staff.displayName || "").trim())
            .filter((name, index, list) => list.indexOf(name) === index)
            .sort((a, b) => a.localeCompare(b))
            .map((name) => ({ label: name, value: name }));
        } catch (staffError) {
          console.error("Campus students teacher list load error:", staffError);
        }

        if (!mounted) return;
        setStudents(nextStudents);
        setTeacherOptions(nextTeacherOptions);
        setSelectedStudentId("");
        setPreviewStudentId(nextStudents[0]?.id || "");
      } catch (loadError) {
        console.error("Campus students page load error:", loadError);
        if (!mounted) return;
        setStudents([]);
        setTeacherOptions([]);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    bootstrap();

    return () => {
      mounted = false;
    };
  }, [user?.id]);

  const filteredStudents = useMemo(() => {
    const searched = searchCampusStudents(students, query);

    return searched.filter((student) => {
      const status = (student.currentEnrollmentStatus || student.enrollmentStatus || "").toLowerCase();
      const tuitionStatus = (student.tuitionPaymentStatus || "").toLowerCase();

      const statusMatches =
        statusFilter === "all" ||
        (statusFilter === "current" && status === "currently enrolled") ||
        (statusFilter === "active" && student.isActive) ||
        (statusFilter === "inactive" && !student.isActive);

      const tuitionMatches =
        tuitionFilter === "all" ||
        (tuitionFilter === "past-due" && tuitionStatus === "past due") ||
        (tuitionFilter === "current" && tuitionStatus === "current") ||
        (tuitionFilter === "no-status" && !tuitionStatus);

      return statusMatches && tuitionMatches;
    });
  }, [query, statusFilter, students, tuitionFilter]);

  const selectedStudent = selectedStudentId
    ? filteredStudents.find((student) => student.id === selectedStudentId) ||
      students.find((student) => student.id === selectedStudentId) ||
      null
    : null;

  const previewStudent = previewStudentId
    ? filteredStudents.find((student) => student.id === previewStudentId) ||
      students.find((student) => student.id === previewStudentId) ||
      null
    : filteredStudents[0] || students[0] || null;

  useEffect(() => {
    if (!selectedStudent || editMode) {
      return;
    }

    setEditForm({
      ...selectedStudent,
      raceEthnicityText: (selectedStudent.raceEthnicity || []).join(", "),
      tagsText: (selectedStudent.tags || []).join(", "),
      guardians: cloneValue(selectedStudent.guardians, []),
      emergencyContacts: cloneValue(selectedStudent.emergencyContacts, []),
      medical: cloneValue(selectedStudent.medical, {}),
      disciplinary: cloneValue(selectedStudent.disciplinary, []),
      parentContactLog: cloneValue(selectedStudent.parentContactLog, []),
      demographics: cloneValue(selectedStudent.demographics, {}),
      enrollment: cloneValue(selectedStudent.enrollment, {}),
      programParticipation: cloneValue(selectedStudent.programParticipation, {}),
      customFields: cloneValue(selectedStudent.customFields, {}),
    });
  }, [selectedStudent, editMode]);

  useEffect(() => {
    if (!selectedStudent || pendingEditStudentId !== selectedStudent.id) {
      return;
    }

    setPendingEditStudentId("");
    beginEdit();
  }, [pendingEditStudentId, selectedStudent]);

  useEffect(() => {
    if (!editMode || !activeEditSection) {
      return;
    }

    const target = editSectionRefs[activeEditSection]?.current;
    if (!target) {
      return;
    }

    target.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [activeEditSection, editMode, editSectionRefs]);

  function beginEdit(sectionKey = "") {
    if (!selectedStudent) return;
    setError("");
    setNotice("");
    setActiveEditSection(sectionKey);
    setEditMode(true);
    setEditForm({
      ...selectedStudent,
      raceEthnicityText: (selectedStudent.raceEthnicity || []).join(", "),
      tagsText: (selectedStudent.tags || []).join(", "),
      guardians: cloneValue(selectedStudent.guardians, []),
      emergencyContacts: cloneValue(selectedStudent.emergencyContacts, []),
      medical: cloneValue(selectedStudent.medical, {}),
      disciplinary: cloneValue(selectedStudent.disciplinary, []),
      parentContactLog: cloneValue(selectedStudent.parentContactLog, []),
      demographics: cloneValue(selectedStudent.demographics, {}),
      enrollment: cloneValue(selectedStudent.enrollment, {}),
      programParticipation: cloneValue(selectedStudent.programParticipation, {}),
      customFields: cloneValue(selectedStudent.customFields, {}),
    });
  }

  function renderSectionEditAction(sectionKey) {
    return (
      <button type="button" style={styles.sectionEditButton} onClick={() => beginEdit(sectionKey)}>
        <PencilLine size={14} />
        Edit
      </button>
    );
  }

  function updateForm(key, value) {
    setEditForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function updateListItem(key, index, field, value) {
    setEditForm((current) => {
      const nextItems = Array.isArray(current?.[key]) ? [...current[key]] : [];
      nextItems[index] = {
        ...(nextItems[index] || {}),
        [field]: value,
      };

      return {
        ...current,
        [key]: nextItems,
      };
    });
  }

  function addListItem(key, factory) {
    setEditForm((current) => ({
      ...current,
      [key]: [...(Array.isArray(current?.[key]) ? current[key] : []), factory()],
    }));
  }

  function removeListItem(key, index) {
    setEditForm((current) => ({
      ...current,
      [key]: (Array.isArray(current?.[key]) ? current[key] : []).filter(
        (_item, itemIndex) => itemIndex !== index
      ),
    }));
  }

  function updateNestedSection(section, field, value) {
    setEditForm((current) => ({
      ...current,
      [section]: {
        ...(current?.[section] || {}),
        [field]: value,
      },
    }));
  }

  function syncStudentRecord(nextStudent, noticeMessage = "") {
    setStudents((current) =>
      current.map((student) => (student.id === nextStudent.id ? nextStudent : student))
    );
    setSelectedStudentId(nextStudent.id);
    setPreviewStudentId(nextStudent.id);
    setEditForm((current) =>
      current && current.id === nextStudent.id
        ? {
            ...nextStudent,
            raceEthnicityText: (nextStudent.raceEthnicity || []).join(", "),
            tagsText: (nextStudent.tags || []).join(", "),
            guardians: cloneValue(nextStudent.guardians, []),
            emergencyContacts: cloneValue(nextStudent.emergencyContacts, []),
            medical: cloneValue(nextStudent.medical, {}),
            disciplinary: cloneValue(nextStudent.disciplinary, []),
            parentContactLog: cloneValue(nextStudent.parentContactLog, []),
            demographics: cloneValue(nextStudent.demographics, {}),
            enrollment: cloneValue(nextStudent.enrollment, {}),
            programParticipation: cloneValue(nextStudent.programParticipation, {}),
            customFields: cloneValue(nextStudent.customFields, {}),
          }
        : current
    );

    if (noticeMessage) {
      setNotice(noticeMessage);
    }
  }

  async function saveStudent() {
    if (!editForm) return;

    setSaving(true);
    setError("");
    setNotice("");

    try {
      const nextStudent = await updateCampusStudent(user?.id, {
        ...editForm,
        raceEthnicity: editForm.raceEthnicityText
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
        tags: editForm.tagsText
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
        guardians: editForm.guardians || [],
        emergencyContacts: editForm.emergencyContacts || [],
        medical: editForm.medical || {},
        disciplinary: editForm.disciplinary || [],
        parentContactLog: editForm.parentContactLog || [],
        demographics: editForm.demographics || {},
        enrollment: editForm.enrollment || {},
        programParticipation: editForm.programParticipation || {},
        customFields: editForm.customFields || {},
      });

      syncStudentRecord(nextStudent);
      setEditMode(false);
      setNotice("Student record updated.");
    } catch (saveError) {
      console.error("Student save error:", saveError);
      setError(saveError?.message || "Could not save student.");
    } finally {
      setSaving(false);
    }
  }

  async function handleStudentPhotoSelected(event) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file || !user?.id || !selectedStudent?.id) {
      return;
    }

    try {
      setPhotoUploading(true);
      setError("");
      setNotice("");
      const nextStudent = await uploadCampusStudentPhoto(user.id, selectedStudent.id, file);

      syncStudentRecord(nextStudent, "Student photo updated.");
    } catch (uploadError) {
      console.error("Student photo upload error:", uploadError);
      setError(uploadError?.message || "Could not upload student photo.");
    } finally {
      setPhotoUploading(false);
    }
  }

  async function handleAddStudent() {
    if (!user?.id) {
      return;
    }

    try {
      setSaving(true);
      setError("");
      setNotice("");
      const createdStudent = await createCampusStudent(user.id);
      setStudents((current) => [createdStudent, ...current]);
      setSelectedStudentId(createdStudent.id);
      setPreviewStudentId(createdStudent.id);
      setPendingEditStudentId(createdStudent.id);
      setNotice("Student record created.");
    } catch (createError) {
      console.error("Campus student create error:", createError);
      setError(createError?.message || "Could not create student.");
    } finally {
      setSaving(false);
    }
  }

  async function handleGuardianInvite(guardianIndex) {
    const workingStudent = editForm || selectedStudent;
    const guardian = workingStudent?.guardians?.[guardianIndex];

    if (!user?.id || !workingStudent?.id || !guardian) {
      return;
    }

    try {
      setGuardianAccessSavingKey(`invite:${guardianIndex}`);
      setError("");
      setNotice("");
      const { result, student: nextStudent } = await inviteCampusParentPortal({
        userId: user.id,
        student: workingStudent,
        guardianIndex,
      });

      if (nextStudent?.id) {
        syncStudentRecord(nextStudent);
      }

      setNotice(result?.message || `Parent portal invite sent to ${guardian.email}.`);
    } catch (inviteError) {
      console.error("Campus parent invite error:", inviteError);
      setError(inviteError.message || "Could not send the parent portal invite.");
    } finally {
      setGuardianAccessSavingKey("");
    }
  }

  async function handleGuardianPortalAccess(guardianIndex, enabled) {
    let workingStudent = editForm || selectedStudent;
    let guardian = workingStudent?.guardians?.[guardianIndex];

    if (!user?.id || !workingStudent?.id || !workingStudent?.accountId || !guardian) {
      return;
    }

    try {
      setGuardianAccessSavingKey(`access:${guardianIndex}`);
      setError("");
      setNotice("");

      if (!guardian.linkedUserId) {
        const { result, student: invitedStudent, guardian: invitedGuardian } =
          await inviteCampusParentPortal({
            userId: user.id,
            student: workingStudent,
            guardianIndex,
          });

        if (invitedStudent?.id) {
          syncStudentRecord(invitedStudent);
          workingStudent = invitedStudent;
          guardian = invitedStudent?.guardians?.[guardianIndex] || invitedGuardian || guardian;
        }

        if (!guardian?.linkedUserId) {
          throw new Error(
            result?.message ||
              "The parent account could not be linked yet. Ask the parent to complete their invite email first, then try again."
          );
        }
      }

      await setCampusParentPortalAccess({
        userId: user.id,
        accountId: workingStudent.accountId,
        targetUserId: guardian.linkedUserId,
        enabled,
      });

      const nextGuardians = cloneValue(workingStudent.guardians, []);
      nextGuardians[guardianIndex] = {
        ...nextGuardians[guardianIndex],
        portalAccess: enabled,
      };

      const nextStudent = await updateCampusStudent(user.id, {
        ...workingStudent,
        guardians: nextGuardians,
      });

      syncStudentRecord(
        nextStudent,
        enabled ? "Parent portal access enabled." : "Parent portal access removed."
      );
    } catch (accessError) {
      console.error("Campus parent portal access error:", accessError);
      setError(accessError.message || "Could not update parent portal access.");
    } finally {
      setGuardianAccessSavingKey("");
    }
  }

  if (loading) {
    return (
      <GlobalLoadingPage
        modeOverride="campus"
        title="Loading Students"
        detail="Preparing student records, demographic data, guardians, tuition status, and campus details..."
      />
    );
  }

  const totalStudents = students.length;
  const activeStudents = students.filter((student) => student.isActive).length;
  const currentlyEnrolled = students.filter(
    (student) => (student.currentEnrollmentStatus || "").toLowerCase() === "currently enrolled"
  ).length;
  const pastDueStudents = students.filter(
    (student) => (student.tuitionPaymentStatus || "").toLowerCase() === "past due"
  ).length;

  if (selectedStudent) {
    const demographicRows = [
      { label: "Student Number", value: renderPill(selectedStudent.studentNumber) },
      { label: "State ID", value: renderPill(selectedStudent.stateId) },
      { label: "Local ID", value: renderPill(selectedStudent.localId) },
      { label: "Date Of Birth", value: formatDate(selectedStudent.dateOfBirth) },
      { label: "Gender", value: renderPill(selectedStudent.gender) },
      { label: "Sex", value: renderPill(selectedStudent.sex) },
      { label: "Primary Language", value: renderPill(selectedStudent.primaryLanguage) },
      { label: "Home Language", value: renderPill(selectedStudent.homeLanguage) },
      { label: "Ethnicity", value: renderPill(selectedStudent.ethnicity) },
      {
        label: "Race / Ethnicity",
        value: selectedStudent.raceEthnicity?.length
          ? selectedStudent.raceEthnicity.join(", ")
          : "Not set",
      },
    ];

    const enrollmentRows = [
      { label: "Grade Level", value: renderPill(selectedStudent.gradeLevel) },
      { label: "School", value: renderPill(selectedStudent.schoolName) },
      { label: "Campus", value: renderPill(selectedStudent.campusName) },
      { label: "Teacher", value: renderPill(selectedStudent.homeroomTeacher, "Not assigned") },
      { label: "Counselor", value: renderPill(selectedStudent.counselorName) },
      { label: "Enrollment Status", value: renderPill(selectedStudent.enrollmentStatus) },
      {
        label: "Current Status",
        value: renderPill(selectedStudent.currentEnrollmentStatus),
      },
      { label: "Start Date", value: formatDate(selectedStudent.enrollmentStartDate) },
      { label: "End Date", value: formatDate(selectedStudent.enrollmentEndDate) },
      {
        label: "Graduation Year",
        value: renderPill(
          selectedStudent.graduationYear || selectedStudent.enrollment?.graduationYear
        ),
      },
    ];

    return (
      <div style={styles.detailPage}>
        <div style={styles.detailTopRow}>
          <button
            type="button"
            style={styles.backButton}
            onClick={() => {
              setSelectedStudentId("");
              setEditMode(false);
              setError("");
              setNotice("");
            }}
          >
            <ArrowLeft size={16} />
            Back To Students
          </button>

          <div style={styles.topRightActions}>
            <label style={styles.inlineSearch}>
              <Search size={18} color="var(--color-primary)" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search another student by name, ID, grade, or teacher"
                style={styles.searchInput}
              />
            </label>

            {!editMode ? (
              <button type="button" style={styles.editButton} onClick={beginEdit}>
                <PencilLine size={16} />
                Edit Student
              </button>
            ) : (
              <div style={styles.editActionRow}>
                <button type="button" style={styles.cancelButton} onClick={() => setEditMode(false)}>
                  <X size={16} />
                  Cancel
                </button>
                <button type="button" style={styles.saveButton} onClick={saveStudent} disabled={saving}>
                  <Save size={16} />
                  {saving ? "Saving..." : "Save Student"}
                </button>
              </div>
            )}
          </div>
        </div>

        {error ? <div style={styles.error}>{error}</div> : null}
        {notice ? <div style={styles.notice}>{notice}</div> : null}

        <div style={styles.studentHero}>
          <div style={styles.photoColumn}>
            <img
              src={editMode && editForm?.photoUrl ? editForm.photoUrl : selectedStudent.photoUrl}
              alt={selectedStudent.displayName}
              style={styles.studentPhoto}
            />
            {editMode ? (
              <>
                <input
                  ref={studentPhotoInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleStudentPhotoSelected}
                  style={styles.hiddenFileInput}
                />
                <button
                  type="button"
                  style={styles.photoUploadButton}
                  onClick={() => studentPhotoInputRef.current?.click()}
                  disabled={photoUploading}
                >
                  {photoUploading ? "Uploading Photo..." : "Upload Photo"}
                </button>
              </>
            ) : null}
          </div>

          <div style={styles.heroBody}>
            <div style={styles.heroKicker}>
              {selectedStudent.gradeLevel ? `Grade ${selectedStudent.gradeLevel}` : "Student Record"}
            </div>
            <h1 style={styles.heroName}>{selectedStudent.displayName}</h1>
            <div style={styles.heroMeta}>
              <span>{selectedStudent.studentNumber || "No student number"}</span>
              <span>•</span>
              <span>{selectedStudent.schoolName || "No school assigned"}</span>
              <span>•</span>
              <span>{selectedStudent.currentEnrollmentStatus || "Status not set"}</span>
            </div>
            <div style={styles.heroPills}>
              <span style={styles.heroPill}>{selectedStudent.homeroomTeacher || "No teacher selected"}</span>
              <span style={styles.heroPill}>{selectedStudent.primaryLanguage || "Language not set"}</span>
              <span style={styles.heroPill}>
                {selectedStudent.tuitionPaymentStatus || "Tuition status not set"}
              </span>
              {(selectedStudent.tags || []).map((tag) => (
                <span key={tag} style={styles.heroTag}>
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>

        {!editMode ? (
          <div style={styles.sectionGrid}>
            <SectionCard
              icon={User}
              title="Demographics"
              action={renderSectionEditAction("demographics")}
            >
              <DetailGrid items={demographicRows} />
            </SectionCard>

            <SectionCard
              icon={GraduationCap}
              title="Enrollment"
              action={renderSectionEditAction("enrollment")}
            >
              <DetailGrid items={enrollmentRows} />
            </SectionCard>

            <SectionCard
              icon={BadgeDollarSign}
              title="Tuition"
              action={renderSectionEditAction("tuition")}
            >
              <DetailGrid
                items={[
                  {
                    label: "Payment Status",
                    value: renderPill(selectedStudent.tuitionPaymentStatus),
                  },
                  {
                    label: "Balance",
                    value: formatCurrencyFromCents(selectedStudent.tuitionBalanceCents),
                  },
                ]}
              />
            </SectionCard>

            <SectionCard
              icon={Home}
              title="Address And Household"
              action={renderSectionEditAction("household")}
            >
              <DetailGrid
                items={[
                  { label: "Household", value: renderPill(selectedStudent.householdName) },
                  { label: "Primary Phone", value: renderPill(selectedStudent.primaryPhone) },
                  { label: "Primary Email", value: renderPill(selectedStudent.primaryEmail) },
                  {
                    label: "Street Address",
                    value: [selectedStudent.streetAddress1, selectedStudent.streetAddress2]
                      .filter(Boolean)
                      .join(", "),
                  },
                  {
                    label: "City / State / ZIP",
                    value: [selectedStudent.city, selectedStudent.state, selectedStudent.postalCode]
                      .filter(Boolean)
                      .join(", "),
                  },
                ]}
              />
            </SectionCard>

            <SectionCard
              icon={Users}
              title="Guardians"
              action={renderSectionEditAction("guardians")}
            >
              <div style={styles.stackList}>
                {selectedStudent.guardians.length ? (
                  selectedStudent.guardians.map((guardian, index) => (
                    <div key={`${guardian.name}-${index}`} style={styles.stackCard}>
                      <div style={styles.stackCardHeader}>
                        <div style={styles.stackTitle}>{guardian.name || "Unnamed Guardian"}</div>
                        <div style={guardian.portalAccess ? styles.portalBadgeActive : styles.portalBadgeMuted}>
                          {guardian.portalAccess ? "Parent Portal On" : "Parent Portal Off"}
                        </div>
                      </div>
                      <div style={styles.stackMeta}>
                        {guardian.relationship || "Relationship not set"}
                      </div>
                      <div style={styles.stackCopy}>
                        {guardian.phone || "No phone"} {guardian.email ? `• ${guardian.email}` : ""}
                      </div>
                      {guardian.linkedUserId ? (
                        <div style={styles.stackHint}>Linked account ready for `/parent`.</div>
                      ) : (
                        <div style={styles.stackHint}>Invite this guardian to connect their parent account.</div>
                      )}
                    </div>
                  ))
                ) : (
                  <div style={styles.emptyInline}>No guardians added.</div>
                )}
              </div>
            </SectionCard>

            <SectionCard
              icon={Phone}
              title="Emergency Contacts"
              action={renderSectionEditAction("emergency")}
            >
              <div style={styles.stackList}>
                {selectedStudent.emergencyContacts.length ? (
                  selectedStudent.emergencyContacts.map((contact, index) => (
                    <div key={`${contact.name}-${index}`} style={styles.stackCard}>
                      <div style={styles.stackTitle}>{contact.name || "Unnamed Contact"}</div>
                      <div style={styles.stackMeta}>
                        {contact.relationship || "Relationship not set"}
                      </div>
                      <div style={styles.stackCopy}>
                        {contact.phone || "No phone"}
                        {contact.priority ? ` • Priority ${contact.priority}` : ""}
                      </div>
                    </div>
                  ))
                ) : (
                  <div style={styles.emptyInline}>No emergency contacts added.</div>
                )}
              </div>
            </SectionCard>

            <SectionCard
              icon={HeartPulse}
              title="Medical"
              action={renderSectionEditAction("medical")}
            >
              <DetailGrid
                items={[
                  {
                    label: "Physician",
                    value: renderPill(selectedStudent.medical?.physician),
                  },
                  {
                    label: "Immunization Status",
                    value: renderPill(selectedStudent.medical?.immunizationStatus),
                  },
                  {
                    label: "Allergies",
                    value: Array.isArray(selectedStudent.medical?.allergies) &&
                      selectedStudent.medical.allergies.length
                      ? selectedStudent.medical.allergies.join(", ")
                      : "None listed",
                  },
                  {
                    label: "Medications",
                    value: Array.isArray(selectedStudent.medical?.medications) &&
                      selectedStudent.medical.medications.length
                      ? selectedStudent.medical.medications.join(", ")
                      : "None listed",
                  },
                  {
                    label: "Health Alerts",
                    value: Array.isArray(selectedStudent.medical?.healthAlerts) &&
                      selectedStudent.medical.healthAlerts.length
                      ? selectedStudent.medical.healthAlerts.join(", ")
                      : "None listed",
                  },
                ]}
              />
            </SectionCard>

            <SectionCard
              icon={ShieldAlert}
              title="Disciplinary"
              action={renderSectionEditAction("disciplinary")}
            >
              <div style={styles.stackList}>
                {selectedStudent.disciplinary?.length ? (
                  selectedStudent.disciplinary.map((entry, index) => (
                    <div key={`disciplinary-${index}`} style={styles.stackCard}>
                      <div style={styles.stackTitle}>
                        {entry.incidentType || "Incident"} {entry.date ? `• ${formatDate(entry.date)}` : ""}
                      </div>
                      <div style={styles.stackMeta}>
                        {entry.actionTaken || "No action recorded"}
                      </div>
                      <div style={styles.stackCopy}>
                        {entry.staffName || "No staff listed"} {entry.notes ? `• ${entry.notes}` : ""}
                      </div>
                    </div>
                  ))
                ) : (
                  <div style={styles.emptyInline}>No disciplinary history recorded.</div>
                )}
              </div>
            </SectionCard>

            <SectionCard
              icon={Phone}
              title="Parent Contact Log"
              action={renderSectionEditAction("parentContact")}
            >
              <div style={styles.stackList}>
                {selectedStudent.parentContactLog?.length ? (
                  selectedStudent.parentContactLog.map((entry, index) => (
                    <div key={`contact-log-${index}`} style={styles.stackCard}>
                      <div style={styles.stackTitle}>
                        {entry.contactName || "Parent Contact"} {entry.date ? `• ${formatDate(entry.date)}` : ""}
                      </div>
                      <div style={styles.stackMeta}>
                        {entry.method || "Method not set"} {entry.staffName ? `• ${entry.staffName}` : ""}
                      </div>
                      <div style={styles.stackCopy}>{entry.summary || "No summary recorded."}</div>
                    </div>
                  ))
                ) : (
                  <div style={styles.emptyInline}>No parent contact history recorded.</div>
                )}
              </div>
            </SectionCard>

            <SectionCard
              icon={ShieldAlert}
              title="Programs And Compliance"
              action={renderSectionEditAction("programs")}
            >
              <DetailGrid
                items={[
                  {
                    label: "IEP",
                    value: selectedStudent.programParticipation?.iep ? "Yes" : "No",
                  },
                  {
                    label: "504",
                    value: selectedStudent.programParticipation?.section504 ? "Yes" : "No",
                  },
                  {
                    label: "ELL",
                    value: selectedStudent.programParticipation?.ell ? "Yes" : "No",
                  },
                  {
                    label: "Gifted / Talented",
                    value: selectedStudent.programParticipation?.giftedTalented ? "Yes" : "No",
                  },
                  {
                    label: "Migrant",
                    value: selectedStudent.programParticipation?.migrant ? "Yes" : "No",
                  },
                  {
                    label: "Foster Care",
                    value: selectedStudent.programParticipation?.fosterCare ? "Yes" : "No",
                  },
                  {
                    label: "Homeless",
                    value: selectedStudent.programParticipation?.homeless ? "Yes" : "No",
                  },
                ]}
              />
            </SectionCard>

            <SectionCard
              icon={Languages}
              title="Additional Data"
              action={renderSectionEditAction("programs")}
            >
              <div style={styles.additionalList}>
                {renderKeyValues(selectedStudent.demographics).map(([key, value]) => (
                  <div key={key} style={styles.additionalRow}>
                    <div style={styles.additionalLabel}>{key}</div>
                    <div style={styles.additionalValue}>
                      {Array.isArray(value) ? value.join(", ") : String(value)}
                    </div>
                  </div>
                ))}
                {renderKeyValues(selectedStudent.customFields).map(([key, value]) => (
                  <div key={key} style={styles.additionalRow}>
                    <div style={styles.additionalLabel}>{key}</div>
                    <div style={styles.additionalValue}>
                      {Array.isArray(value) ? value.join(", ") : String(value)}
                    </div>
                  </div>
                ))}
                {renderKeyValues(selectedStudent.demographics).length === 0 &&
                renderKeyValues(selectedStudent.customFields).length === 0 ? (
                  <div style={styles.emptyInline}>No additional details recorded.</div>
                ) : null}
              </div>
            </SectionCard>
          </div>
        ) : (
          <div style={styles.editGrid}>
            <SectionCard
              icon={User}
              title="Identity And Demographics"
              sectionRef={editSectionRefs.demographics}
            >
              <div style={styles.formGrid}>
                <LabeledInput label="Display Name" value={editForm.displayName} onChange={(value) => updateForm("displayName", value)} />
                <LabeledInput label="Legal First Name" value={editForm.legalFirstName} onChange={(value) => updateForm("legalFirstName", value)} />
                <LabeledInput label="Legal Middle Name" value={editForm.legalMiddleName} onChange={(value) => updateForm("legalMiddleName", value)} />
                <LabeledInput label="Legal Last Name" value={editForm.legalLastName} onChange={(value) => updateForm("legalLastName", value)} />
                <LabeledInput label="Legal Suffix" value={editForm.legalSuffix} onChange={(value) => updateForm("legalSuffix", value)} />
                <LabeledInput label="Preferred First Name" value={editForm.preferredFirstName} onChange={(value) => updateForm("preferredFirstName", value)} />
                <LabeledInput label="Preferred Last Name" value={editForm.preferredLastName} onChange={(value) => updateForm("preferredLastName", value)} />
                <LabeledInput label="Student Number" value={editForm.studentNumber} onChange={(value) => updateForm("studentNumber", value)} />
                <LabeledInput label="State ID" value={editForm.stateId} onChange={(value) => updateForm("stateId", value)} />
                <LabeledInput label="Local ID" value={editForm.localId} onChange={(value) => updateForm("localId", value)} />
                <LabeledInput label="Campus Person ID" value={editForm.campusPersonId} onChange={(value) => updateForm("campusPersonId", value)} />
                <LabeledInput label="Date Of Birth" type="date" value={editForm.dateOfBirth || ""} onChange={(value) => updateForm("dateOfBirth", value)} />
                <LabeledInput label="Gender" value={editForm.gender} onChange={(value) => updateForm("gender", value)} />
                <LabeledInput label="Sex" value={editForm.sex} onChange={(value) => updateForm("sex", value)} />
                <LabeledInput label="Primary Language" value={editForm.primaryLanguage} onChange={(value) => updateForm("primaryLanguage", value)} />
                <LabeledInput label="Home Language" value={editForm.homeLanguage} onChange={(value) => updateForm("homeLanguage", value)} />
                <LabeledInput label="Ethnicity" value={editForm.ethnicity} onChange={(value) => updateForm("ethnicity", value)} />
                <LabeledInput label="Race / Ethnicity" value={editForm.raceEthnicityText} onChange={(value) => updateForm("raceEthnicityText", value)} placeholder="Comma separated" />
                <LabeledInput label="Tags" value={editForm.tagsText} onChange={(value) => updateForm("tagsText", value)} placeholder="Comma separated tags" />
              </div>
              <div style={styles.fieldHint}>Use the upload button beside the student photo to choose a profile image.</div>
            </SectionCard>

            <SectionCard
              icon={GraduationCap}
              title="Enrollment And Tuition"
              sectionRef={editSectionRefs.enrollment}
            >
              <div style={styles.formGrid}>
                <LabeledInput label="Grade Level" value={editForm.gradeLevel} onChange={(value) => updateForm("gradeLevel", value)} />
                <LabeledInput label="School Name" value={editForm.schoolName} onChange={(value) => updateForm("schoolName", value)} />
                <LabeledInput label="Campus Name" value={editForm.campusName} onChange={(value) => updateForm("campusName", value)} />
                <LabeledSelect
                  label="Teacher"
                  value={editForm.homeroomTeacher}
                  onChange={(value) => updateForm("homeroomTeacher", value)}
                  options={teacherOptions}
                  placeholder={teacherOptions.length ? "Select teacher" : "No teachers available"}
                />
                <LabeledInput label="Counselor" value={editForm.counselorName} onChange={(value) => updateForm("counselorName", value)} />
                <LabeledInput label="Enrollment Status" value={editForm.enrollmentStatus} onChange={(value) => updateForm("enrollmentStatus", value)} />
                <LabeledInput label="Current Enrollment Status" value={editForm.currentEnrollmentStatus} onChange={(value) => updateForm("currentEnrollmentStatus", value)} />
                <LabeledInput label="Enrollment Start Date" type="date" value={editForm.enrollmentStartDate || ""} onChange={(value) => updateForm("enrollmentStartDate", value)} />
                <LabeledInput label="Enrollment End Date" type="date" value={editForm.enrollmentEndDate || ""} onChange={(value) => updateForm("enrollmentEndDate", value)} />
                <LabeledInput label="Graduation Year" type="number" value={editForm.graduationYear || ""} onChange={(value) => updateForm("graduationYear", value)} />
                <LabeledInput label="Tuition Payment Status" value={editForm.tuitionPaymentStatus} onChange={(value) => updateForm("tuitionPaymentStatus", value)} />
                <LabeledInput label="Tuition Balance Cents" type="number" value={editForm.tuitionBalanceCents || 0} onChange={(value) => updateForm("tuitionBalanceCents", value)} />
              </div>
            </SectionCard>

            <div ref={editSectionRefs.tuition} />

            <SectionCard
              icon={Home}
              title="Household And Contacts"
              sectionRef={editSectionRefs.household}
            >
              <div style={styles.formGrid}>
                <LabeledInput label="Household Name" value={editForm.householdName} onChange={(value) => updateForm("householdName", value)} />
                <LabeledInput label="Primary Phone" value={editForm.primaryPhone} onChange={(value) => updateForm("primaryPhone", value)} />
                <LabeledInput label="Primary Email" value={editForm.primaryEmail} onChange={(value) => updateForm("primaryEmail", value)} />
                <LabeledInput label="Street Address 1" value={editForm.streetAddress1} onChange={(value) => updateForm("streetAddress1", value)} />
                <LabeledInput label="Street Address 2" value={editForm.streetAddress2} onChange={(value) => updateForm("streetAddress2", value)} />
                <LabeledInput label="City" value={editForm.city} onChange={(value) => updateForm("city", value)} />
                <LabeledInput label="State" value={editForm.state} onChange={(value) => updateForm("state", value)} />
                <LabeledInput label="Postal Code" value={editForm.postalCode} onChange={(value) => updateForm("postalCode", value)} />
              </div>
            </SectionCard>

            <SectionCard
              icon={Users}
              title="Guardians"
              sectionRef={editSectionRefs.guardians}
            >
              <div style={styles.stackEditList}>
                {(editForm.guardians || []).map((guardian, index) => (
                  <div key={`guardian-${index}`} style={styles.stackEditCard}>
                    <div style={styles.stackEditHeader}>
                      <div style={styles.stackEditTitle}>Guardian {index + 1}</div>
                      <button
                        type="button"
                        style={styles.removeMiniButton}
                        onClick={() => removeListItem("guardians", index)}
                      >
                        Remove
                      </button>
                    </div>
                    <div style={styles.formGrid}>
                      <LabeledInput label="Name" value={guardian.name || ""} onChange={(value) => updateListItem("guardians", index, "name", value)} />
                      <LabeledInput label="Relationship" value={guardian.relationship || ""} onChange={(value) => updateListItem("guardians", index, "relationship", value)} />
                      <LabeledInput label="Phone" value={guardian.phone || ""} onChange={(value) => updateListItem("guardians", index, "phone", value)} />
                      <LabeledInput label="Email" value={guardian.email || ""} onChange={(value) => updateListItem("guardians", index, "email", value)} />
                    </div>
                    <div style={styles.guardianAccessRow}>
                      <div style={styles.guardianAccessMeta}>
                        <div style={styles.guardianAccessTitle}>Parent Portal Access</div>
                        <div style={styles.guardianAccessCopy}>
                          {guardian.linkedUserId
                            ? guardian.portalAccess
                              ? "This parent can sign in at /parent."
                              : "Linked account found. Turn on portal access when you are ready."
                            : "Send the invite first to create or link the parent account."}
                        </div>
                      </div>
                      <div style={styles.guardianAccessActions}>
                        <button
                          type="button"
                          style={styles.inlineSecondaryButton}
                          onClick={() => handleGuardianInvite(index)}
                          disabled={guardianAccessSavingKey === `invite:${index}` || !guardian.email}
                        >
                          {guardianAccessSavingKey === `invite:${index}` ? "Sending..." : "Invite Parent"}
                        </button>
                        <button
                          type="button"
                          style={guardian.portalAccess ? styles.inlineGhostButton : styles.inlinePrimaryButton}
                          onClick={() => handleGuardianPortalAccess(index, !guardian.portalAccess)}
                          disabled={guardianAccessSavingKey === `access:${index}` || !guardian.email}
                        >
                          {guardianAccessSavingKey === `access:${index}`
                            ? "Saving..."
                            : guardian.portalAccess
                              ? "Remove Access"
                              : "Enable Access"}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                <button type="button" style={styles.addMiniButton} onClick={() => addListItem("guardians", createGuardian)}>
                  Add Guardian
                </button>
              </div>
            </SectionCard>

            <SectionCard
              icon={Phone}
              title="Emergency Contacts"
              sectionRef={editSectionRefs.emergency}
            >
              <div style={styles.stackEditList}>
                {(editForm.emergencyContacts || []).map((contact, index) => (
                  <div key={`emergency-${index}`} style={styles.stackEditCard}>
                    <div style={styles.stackEditHeader}>
                      <div style={styles.stackEditTitle}>Emergency Contact {index + 1}</div>
                      <button
                        type="button"
                        style={styles.removeMiniButton}
                        onClick={() => removeListItem("emergencyContacts", index)}
                      >
                        Remove
                      </button>
                    </div>
                    <div style={styles.formGrid}>
                      <LabeledInput label="Name" value={contact.name || ""} onChange={(value) => updateListItem("emergencyContacts", index, "name", value)} />
                      <LabeledInput label="Relationship" value={contact.relationship || ""} onChange={(value) => updateListItem("emergencyContacts", index, "relationship", value)} />
                      <LabeledInput label="Phone" value={contact.phone || ""} onChange={(value) => updateListItem("emergencyContacts", index, "phone", value)} />
                      <LabeledInput label="Priority" value={contact.priority || ""} onChange={(value) => updateListItem("emergencyContacts", index, "priority", value)} />
                    </div>
                  </div>
                ))}
                <button type="button" style={styles.addMiniButton} onClick={() => addListItem("emergencyContacts", createEmergencyContact)}>
                  Add Emergency Contact
                </button>
              </div>
            </SectionCard>

            <SectionCard
              icon={HeartPulse}
              title="Medical"
              sectionRef={editSectionRefs.medical}
            >
              <div style={styles.formGrid}>
                <LabeledInput label="Physician" value={editForm.medical?.physician || ""} onChange={(value) => updateNestedSection("medical", "physician", value)} />
                <LabeledInput label="Immunization Status" value={editForm.medical?.immunizationStatus || ""} onChange={(value) => updateNestedSection("medical", "immunizationStatus", value)} />
                <LabeledTextarea label="Allergies" value={Array.isArray(editForm.medical?.allergies) ? editForm.medical.allergies.join(", ") : ""} onChange={(value) => updateNestedSection("medical", "allergies", value.split(",").map((item) => item.trim()).filter(Boolean))} rows={3} />
                <LabeledTextarea label="Medications" value={Array.isArray(editForm.medical?.medications) ? editForm.medical.medications.join(", ") : ""} onChange={(value) => updateNestedSection("medical", "medications", value.split(",").map((item) => item.trim()).filter(Boolean))} rows={3} />
                <LabeledTextarea label="Health Alerts" value={Array.isArray(editForm.medical?.healthAlerts) ? editForm.medical.healthAlerts.join(", ") : ""} onChange={(value) => updateNestedSection("medical", "healthAlerts", value.split(",").map((item) => item.trim()).filter(Boolean))} rows={3} />
              </div>
            </SectionCard>

            <SectionCard
              icon={ShieldAlert}
              title="Disciplinary"
              sectionRef={editSectionRefs.disciplinary}
            >
              <div style={styles.stackEditList}>
                {(editForm.disciplinary || []).map((entry, index) => (
                  <div key={`disciplinary-edit-${index}`} style={styles.stackEditCard}>
                    <div style={styles.stackEditHeader}>
                      <div style={styles.stackEditTitle}>Incident {index + 1}</div>
                      <button
                        type="button"
                        style={styles.removeMiniButton}
                        onClick={() => removeListItem("disciplinary", index)}
                      >
                        Remove
                      </button>
                    </div>
                    <div style={styles.formGrid}>
                      <LabeledInput label="Date" type="date" value={entry.date || ""} onChange={(value) => updateListItem("disciplinary", index, "date", value)} />
                      <LabeledInput label="Incident Type" value={entry.incidentType || ""} onChange={(value) => updateListItem("disciplinary", index, "incidentType", value)} />
                      <LabeledInput label="Action Taken" value={entry.actionTaken || ""} onChange={(value) => updateListItem("disciplinary", index, "actionTaken", value)} />
                      <LabeledInput label="Staff Name" value={entry.staffName || ""} onChange={(value) => updateListItem("disciplinary", index, "staffName", value)} />
                      <LabeledTextarea label="Notes" value={entry.notes || ""} onChange={(value) => updateListItem("disciplinary", index, "notes", value)} rows={3} />
                    </div>
                  </div>
                ))}
                <button type="button" style={styles.addMiniButton} onClick={() => addListItem("disciplinary", createDisciplinaryEntry)}>
                  Add Discipline Entry
                </button>
              </div>
            </SectionCard>

            <SectionCard
              icon={Phone}
              title="Parent Contact Log"
              sectionRef={editSectionRefs.parentContact}
            >
              <div style={styles.stackEditList}>
                {(editForm.parentContactLog || []).map((entry, index) => (
                  <div key={`parent-contact-${index}`} style={styles.stackEditCard}>
                    <div style={styles.stackEditHeader}>
                      <div style={styles.stackEditTitle}>Contact Log {index + 1}</div>
                      <button
                        type="button"
                        style={styles.removeMiniButton}
                        onClick={() => removeListItem("parentContactLog", index)}
                      >
                        Remove
                      </button>
                    </div>
                    <div style={styles.formGrid}>
                      <LabeledInput label="Date" type="date" value={entry.date || ""} onChange={(value) => updateListItem("parentContactLog", index, "date", value)} />
                      <LabeledInput label="Method" value={entry.method || ""} onChange={(value) => updateListItem("parentContactLog", index, "method", value)} />
                      <LabeledInput label="Parent / Guardian" value={entry.contactName || ""} onChange={(value) => updateListItem("parentContactLog", index, "contactName", value)} />
                      <LabeledInput label="Staff Name" value={entry.staffName || ""} onChange={(value) => updateListItem("parentContactLog", index, "staffName", value)} />
                      <LabeledTextarea label="Summary" value={entry.summary || ""} onChange={(value) => updateListItem("parentContactLog", index, "summary", value)} rows={3} />
                    </div>
                  </div>
                ))}
                <button type="button" style={styles.addMiniButton} onClick={() => addListItem("parentContactLog", createParentContactEntry)}>
                  Add Contact Log Entry
                </button>
              </div>
            </SectionCard>

            <SectionCard
              icon={ShieldAlert}
              title="Programs And Extra Details"
              sectionRef={editSectionRefs.programs}
            >
              <div style={styles.formGrid}>
                <LabeledInput label="Birth Country" value={editForm.demographics?.birthCountry || ""} onChange={(value) => updateNestedSection("demographics", "birthCountry", value)} />
                <LabeledInput label="Birth City" value={editForm.demographics?.birthCity || ""} onChange={(value) => updateNestedSection("demographics", "birthCity", value)} />
                <LabeledInput label="Residency Status" value={editForm.demographics?.residencyStatus || ""} onChange={(value) => updateNestedSection("demographics", "residencyStatus", value)} />
                <LabeledInput label="Transportation" value={editForm.demographics?.transportation || ""} onChange={(value) => updateNestedSection("demographics", "transportation", value)} />
                <LabeledInput label="Schedule Type" value={editForm.enrollment?.scheduleType || ""} onChange={(value) => updateNestedSection("enrollment", "scheduleType", value)} />
                <LabeledInput label="Lunch Status" value={editForm.enrollment?.lunchStatus || ""} onChange={(value) => updateNestedSection("enrollment", "lunchStatus", value)} />
                <LabeledInput label="IEP" value={editForm.programParticipation?.iep ? "Yes" : "No"} onChange={(value) => updateNestedSection("programParticipation", "iep", value.toLowerCase() === "yes")} />
                <LabeledInput label="504" value={editForm.programParticipation?.section504 ? "Yes" : "No"} onChange={(value) => updateNestedSection("programParticipation", "section504", value.toLowerCase() === "yes")} />
                <LabeledInput label="ELL" value={editForm.programParticipation?.ell ? "Yes" : "No"} onChange={(value) => updateNestedSection("programParticipation", "ell", value.toLowerCase() === "yes")} />
                <LabeledTextarea label="Staff Notes" value={editForm.customFields?.staffNotes || ""} onChange={(value) => updateNestedSection("customFields", "staffNotes", value)} rows={4} />
              </div>
            </SectionCard>
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.rosterHero}>
        <div>
          <div style={styles.title}>Students</div>
          <div style={styles.subtitle}>
            Search the master student index, track current enrollment, review tuition status, and open a complete student profile.
          </div>
        </div>

        <div style={styles.summaryStats}>
          <div style={styles.statCard}>
            <div style={styles.statValue}>{totalStudents}</div>
            <div style={styles.statLabel}>Total</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statValue}>{activeStudents}</div>
            <div style={styles.statLabel}>Active</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statValue}>{currentlyEnrolled}</div>
            <div style={styles.statLabel}>Current</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statValue}>{pastDueStudents}</div>
            <div style={styles.statLabel}>Past Due</div>
          </div>
        </div>
      </div>

      {error ? <div style={styles.error}>{error}</div> : null}
      {notice ? <div style={styles.notice}>{notice}</div> : null}

      <div style={styles.rosterShell}>
        <aside style={styles.rosterSidebar}>
          <div style={styles.sidebarActionRow}>
            <button
              type="button"
              style={styles.sidebarAddButton}
              onClick={handleAddStudent}
              disabled={saving}
            >
              <Plus size={16} />
              {saving ? "Adding Student..." : "Add Student"}
            </button>
          </div>

          <label style={styles.searchBar}>
            <Search size={18} color="var(--color-primary)" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search name, student number, state ID, grade, school, teacher, or tag"
              style={styles.searchInput}
            />
          </label>

          <div style={styles.filterRow}>
            <button
              type="button"
              style={statusFilter === "all" ? styles.filterButtonActive : styles.filterButton}
              onClick={() => setStatusFilter("all")}
            >
              All Statuses
            </button>
            <button
              type="button"
              style={statusFilter === "current" ? styles.filterButtonActive : styles.filterButton}
              onClick={() => setStatusFilter("current")}
            >
              Current
            </button>
            <button
              type="button"
              style={statusFilter === "active" ? styles.filterButtonActive : styles.filterButton}
              onClick={() => setStatusFilter("active")}
            >
              Active
            </button>
            <button
              type="button"
              style={tuitionFilter === "past-due" ? styles.filterButtonActive : styles.filterButton}
              onClick={() => setTuitionFilter("past-due")}
            >
              Past Due
            </button>
            <button
              type="button"
              style={tuitionFilter === "all" ? styles.filterButtonActive : styles.filterButton}
              onClick={() => setTuitionFilter("all")}
            >
              Any Tuition
            </button>
          </div>

          <div style={styles.resultsSummary}>
            {filteredStudents.length} student{filteredStudents.length === 1 ? "" : "s"} found
          </div>

          <div style={styles.rosterList}>
            {filteredStudents.length === 0 ? (
              <div style={styles.emptyCard}>
                <div style={styles.emptyTitle}>No students found</div>
              <div style={styles.emptyText}>
                  Add a student here, or try a different search term.
                </div>
                <button
                  type="button"
                  style={styles.emptyActionButton}
                  onClick={handleAddStudent}
                  disabled={saving}
                >
                  <Plus size={16} />
                  {saving ? "Adding Student..." : "Add Student"}
                </button>
              </div>
            ) : (
              filteredStudents.map((student) => (
                <button
                  key={student.id}
                  type="button"
                  style={
                    (previewStudent?.id || "") === student.id
                      ? styles.rosterRowActive
                      : styles.rosterRow
                  }
                  onClick={() => setPreviewStudentId(student.id)}
                >
                  <img src={student.photoUrl} alt={student.displayName} style={styles.rosterThumb} />
                  <div style={styles.rosterBody}>
                    <div style={styles.rosterName}>{student.displayName}</div>
                    <div style={styles.rosterMeta}>
                      {student.studentNumber || "No ID"} • Grade {student.gradeLevel || "?"}
                    </div>
                    <div style={styles.rosterMeta}>
                      {student.currentEnrollmentStatus || student.enrollmentStatus || "Unknown status"}
                    </div>
                    <div style={styles.rosterChips}>
                      <span style={styles.cardPill}>{student.homeroomTeacher || "No teacher selected"}</span>
                      {student.tuitionPaymentStatus ? (
                        <span style={styles.alertPill}>{student.tuitionPaymentStatus}</span>
                      ) : null}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </aside>

        <section style={styles.selectionPanel}>
          {previewStudent ? (
            <div style={styles.previewPanel}>
              <div style={styles.previewHero}>
                <img
                  src={previewStudent.photoUrl}
                  alt={previewStudent.displayName}
                  style={styles.previewPhoto}
                />
                <div style={styles.previewHeroBody}>
                  <div style={styles.previewKicker}>
                    {previewStudent.gradeLevel ? `Grade ${previewStudent.gradeLevel}` : "Student"}
                  </div>
                  <div style={styles.previewName}>{previewStudent.displayName}</div>
                  <div style={styles.previewMeta}>
                    {previewStudent.studentNumber || "No student number"} •{" "}
                    {previewStudent.schoolName || "No school assigned"}
                  </div>
                </div>
              </div>

              <div style={styles.previewStats}>
                <div style={styles.previewStatCard}>
                  <div style={styles.previewStatLabel}>Current Status</div>
                  <div style={styles.previewStatValue}>
                    {previewStudent.currentEnrollmentStatus || previewStudent.enrollmentStatus || "Not set"}
                  </div>
                </div>
                <div style={styles.previewStatCard}>
                  <div style={styles.previewStatLabel}>Tuition</div>
                  <div style={styles.previewStatValue}>
                    {previewStudent.tuitionPaymentStatus || "Not set"}
                  </div>
                </div>
                <div style={styles.previewStatCard}>
                  <div style={styles.previewStatLabel}>Teacher</div>
                  <div style={styles.previewStatValue}>
                    {previewStudent.homeroomTeacher || "Not assigned"}
                  </div>
                </div>
                <div style={styles.previewStatCard}>
                  <div style={styles.previewStatLabel}>Family</div>
                  <div style={styles.previewStatValue}>
                    {previewStudent.householdName || "Not set"}
                  </div>
                </div>
              </div>

              <div style={styles.previewSection}>
                <div style={styles.previewSectionTitle}>Quick View</div>
                <div style={styles.previewSectionText}>
                  {previewStudent.primaryEmail || "No email"} {previewStudent.primaryPhone ? `• ${previewStudent.primaryPhone}` : ""}
                </div>
                <div style={styles.previewSectionText}>
                  {[previewStudent.city, previewStudent.state].filter(Boolean).join(", ") || "No city/state set"}
                </div>
                <div style={styles.previewTagRow}>
                  {(previewStudent.tags || []).length ? (
                    previewStudent.tags.map((tag) => (
                      <span key={tag} style={styles.previewTag}>
                        {tag}
                      </span>
                    ))
                  ) : (
                    <span style={styles.previewTagMuted}>No tags yet</span>
                  )}
                </div>
              </div>

              <div style={styles.previewActions}>
                <button
                  type="button"
                  style={styles.previewPrimaryButton}
                  onClick={() => {
                    setSelectedStudentId(previewStudent.id);
                    setEditMode(false);
                  }}
                >
                  Open Student
                </button>
                <button
                  type="button"
                  style={styles.previewSecondaryButton}
                  onClick={() => {
                    setSelectedStudentId(previewStudent.id);
                    setEditMode(false);
                    setPendingEditStudentId(previewStudent.id);
                  }}
                >
                  Edit Student
                </button>
              </div>
            </div>
          ) : (
            <div style={styles.selectionEmpty}>
              <div style={styles.selectionTitle}>Select a student</div>
              <div style={styles.selectionText}>
                Choose a student on the left and their quick view will appear here.
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

const styles = {
  page: {
    display: "flex",
    flexDirection: "column",
    gap: 18,
    padding: 16,
  },
  rosterHero: {
    alignItems: "stretch",
    background: "linear-gradient(135deg, color-mix(in srgb, var(--color-primary) 88%, #0f172a 12%) 0%, var(--color-primary-dark) 100%)",
    borderRadius: 24,
    color: "#ffffff",
    display: "grid",
    gap: 20,
    gridTemplateColumns: "minmax(0, 1.6fr) minmax(320px, 1fr)",
    padding: 22,
  },
  title: {
    fontSize: "clamp(24px, 2.2vw, 32px)",
    fontWeight: 900,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 1.7,
    marginTop: 8,
    maxWidth: 780,
    opacity: 0.92,
  },
  summaryStats: {
    display: "grid",
    gap: 12,
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  },
  statCard: {
    background: "rgba(255,255,255,0.12)",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 18,
    padding: 16,
  },
  statValue: {
    fontSize: 28,
    fontWeight: 900,
    lineHeight: 1,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: "0.08em",
    marginTop: 8,
    opacity: 0.86,
    textTransform: "uppercase",
  },
  rosterShell: {
    display: "grid",
    gap: 16,
    gridTemplateColumns: "minmax(360px, 420px) minmax(0, 1fr)",
  },
  rosterSidebar: {
    background: "#ffffff",
    border: "1px solid #d8e4e0",
    borderRadius: 22,
    boxShadow: "0 12px 28px rgba(15, 23, 42, 0.05)",
    display: "flex",
    flexDirection: "column",
    gap: 14,
    minHeight: 680,
    padding: 16,
  },
  sidebarActionRow: {
    display: "flex",
    justifyContent: "flex-start",
  },
  sidebarAddButton: {
    alignItems: "center",
    background: "var(--color-primary)",
    border: "none",
    borderRadius: 14,
    color: "#ffffff",
    cursor: "pointer",
    display: "inline-flex",
    fontSize: 14,
    fontWeight: 900,
    gap: 8,
    padding: "12px 16px",
  },
  searchBar: {
    alignItems: "center",
    background: "#ffffff",
    border: "1px solid #cfe0db",
    borderRadius: 16,
    display: "flex",
    gap: 12,
    padding: "14px 16px",
  },
  searchInput: {
    background: "transparent",
    border: "none",
    color: "#0f172a",
    flex: 1,
    fontSize: 15,
    outline: "none",
  },
  resultsSummary: {
    color: "var(--color-primary)",
    fontSize: 13,
    fontWeight: 800,
    letterSpacing: "0.04em",
    textTransform: "uppercase",
  },
  filterRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
  },
  filterButton: {
    background: "#f8fafc",
    border: "1px solid #d6e1dd",
    borderRadius: 999,
    color: "#475569",
    cursor: "pointer",
    fontSize: 12,
    fontWeight: 800,
    padding: "8px 12px",
  },
  filterButtonActive: {
    background: "var(--color-primary)",
    border: "1px solid var(--color-primary)",
    borderRadius: 999,
    color: "#ffffff",
    cursor: "pointer",
    fontSize: 12,
    fontWeight: 800,
    padding: "8px 12px",
  },
  rosterList: {
    display: "grid",
    gap: 12,
    overflow: "auto",
    paddingRight: 2,
  },
  rosterRow: {
    alignItems: "center",
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: 18,
    cursor: "pointer",
    display: "grid",
    gap: 12,
    gridTemplateColumns: "72px minmax(0, 1fr)",
    padding: 10,
    textAlign: "left",
  },
  rosterRowActive: {
    alignItems: "center",
    background: "color-mix(in srgb, var(--color-primary) 10%, #ffffff 90%)",
    border: "1px solid color-mix(in srgb, var(--color-primary) 45%, #d8e4e0 55%)",
    borderRadius: 18,
    boxShadow: "0 10px 24px rgba(var(--color-primary-rgb), 0.12)",
    cursor: "pointer",
    display: "grid",
    gap: 12,
    gridTemplateColumns: "72px minmax(0, 1fr)",
    padding: 10,
    textAlign: "left",
  },
  rosterThumb: {
    aspectRatio: "1 / 1",
    borderRadius: 14,
    objectFit: "cover",
    width: "100%",
  },
  rosterBody: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
    minWidth: 0,
  },
  rosterName: {
    color: "#0f172a",
    fontSize: 16,
    fontWeight: 800,
  },
  stackCardHeader: {
    alignItems: "center",
    display: "flex",
    flexWrap: "wrap",
    gap: 10,
    justifyContent: "space-between",
  },
  portalBadgeActive: {
    background: "#dcfce7",
    border: "1px solid #86efac",
    borderRadius: 999,
    color: "#166534",
    fontSize: 11,
    fontWeight: 800,
    padding: "6px 10px",
    textTransform: "uppercase",
  },
  portalBadgeMuted: {
    background: "#f8fafc",
    border: "1px solid #d6e1dd",
    borderRadius: 999,
    color: "#64748b",
    fontSize: 11,
    fontWeight: 800,
    padding: "6px 10px",
    textTransform: "uppercase",
  },
  stackHint: {
    color: "#64748b",
    fontSize: 12,
    lineHeight: 1.5,
  },
  guardianAccessRow: {
    alignItems: "flex-start",
    background: "#f8fafc",
    border: "1px solid #dbe7e3",
    borderRadius: 14,
    display: "flex",
    flexWrap: "wrap",
    gap: 12,
    justifyContent: "space-between",
    marginTop: 12,
    padding: 12,
  },
  guardianAccessMeta: {
    display: "flex",
    flex: "1 1 220px",
    flexDirection: "column",
    gap: 6,
    minWidth: 0,
  },
  guardianAccessTitle: {
    color: "#0f172a",
    fontSize: 13,
    fontWeight: 800,
  },
  guardianAccessCopy: {
    color: "#64748b",
    fontSize: 12,
    lineHeight: 1.6,
  },
  guardianAccessActions: {
    display: "flex",
    flex: "0 1 auto",
    flexWrap: "wrap",
    gap: 8,
  },
  inlinePrimaryButton: {
    background: "var(--color-primary)",
    border: "1px solid var(--color-primary)",
    borderRadius: 12,
    color: "#ffffff",
    cursor: "pointer",
    fontSize: 12,
    fontWeight: 800,
    padding: "10px 12px",
  },
  inlineSecondaryButton: {
    background: "#ffffff",
    border: "1px solid #cfe0db",
    borderRadius: 12,
    color: "#0f172a",
    cursor: "pointer",
    fontSize: 12,
    fontWeight: 800,
    padding: "10px 12px",
  },
  inlineGhostButton: {
    background: "#fff7ed",
    border: "1px solid #fdba74",
    borderRadius: 12,
    color: "#9a3412",
    cursor: "pointer",
    fontSize: 12,
    fontWeight: 800,
    padding: "10px 12px",
  },
  rosterMeta: {
    color: "#64748b",
    fontSize: 12,
    lineHeight: 1.4,
  },
  rosterChips: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 6,
  },
  selectionPanel: {
    background:
      "linear-gradient(180deg, color-mix(in srgb, var(--color-primary) 7%, #ffffff 93%) 0%, #ffffff 100%)",
    border: "1px solid color-mix(in srgb, var(--color-primary) 18%, #d8e4e0 82%)",
    borderRadius: 22,
    boxShadow: "0 12px 28px rgba(15, 23, 42, 0.05)",
    display: "flex",
    minHeight: 680,
    padding: 32,
  },
  previewPanel: {
    display: "flex",
    flex: 1,
    flexDirection: "column",
    gap: 20,
  },
  previewHero: {
    alignItems: "center",
    background: "linear-gradient(135deg, color-mix(in srgb, var(--color-primary) 90%, white 10%) 0%, var(--color-primary-dark) 100%)",
    borderRadius: 22,
    color: "#ffffff",
    display: "grid",
    gap: 16,
    gridTemplateColumns: "112px minmax(0, 1fr)",
    padding: 18,
  },
  previewPhoto: {
    aspectRatio: "1 / 1",
    border: "2px solid rgba(255,255,255,0.35)",
    borderRadius: 18,
    objectFit: "cover",
    width: "100%",
  },
  previewHeroBody: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
    minWidth: 0,
  },
  previewKicker: {
    fontSize: 11,
    fontWeight: 800,
    letterSpacing: "0.08em",
    opacity: 0.84,
    textTransform: "uppercase",
  },
  previewName: {
    fontSize: 28,
    fontWeight: 900,
    lineHeight: 1.05,
  },
  previewMeta: {
    fontSize: 14,
    lineHeight: 1.5,
    opacity: 0.92,
  },
  previewStats: {
    display: "grid",
    gap: 12,
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  },
  previewStatCard: {
    background: "#ffffff",
    border: "1px solid color-mix(in srgb, var(--color-primary) 12%, #d8e4e0 88%)",
    borderRadius: 18,
    padding: 16,
  },
  previewStatLabel: {
    color: "#64748b",
    fontSize: 11,
    fontWeight: 800,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
  },
  previewStatValue: {
    color: "#0f172a",
    fontSize: 16,
    fontWeight: 800,
    lineHeight: 1.4,
    marginTop: 8,
  },
  previewSection: {
    background: "#ffffff",
    border: "1px solid color-mix(in srgb, var(--color-primary) 12%, #d8e4e0 88%)",
    borderRadius: 18,
    display: "flex",
    flexDirection: "column",
    gap: 10,
    padding: 18,
  },
  previewSectionTitle: {
    color: "#0f172a",
    fontSize: 16,
    fontWeight: 900,
  },
  previewSectionText: {
    color: "#64748b",
    fontSize: 14,
    lineHeight: 1.6,
  },
  previewTagRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 4,
  },
  previewTag: {
    background: "color-mix(in srgb, var(--color-primary) 12%, #ffffff 88%)",
    borderRadius: 999,
    color: "var(--color-primary)",
    fontSize: 12,
    fontWeight: 800,
    padding: "7px 10px",
  },
  previewTagMuted: {
    color: "#94a3b8",
    fontSize: 13,
    fontWeight: 700,
  },
  previewActions: {
    display: "flex",
    gap: 12,
    justifyContent: "flex-end",
    marginTop: "auto",
  },
  previewPrimaryButton: {
    background: "var(--color-primary)",
    border: "none",
    borderRadius: 12,
    color: "#ffffff",
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 800,
    padding: "12px 14px",
  },
  previewSecondaryButton: {
    background: "#ffffff",
    border: "1px solid color-mix(in srgb, var(--color-primary) 25%, #d8e4e0 75%)",
    borderRadius: 12,
    color: "var(--color-primary)",
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 800,
    padding: "12px 14px",
  },
  selectionEmpty: {
    maxWidth: 520,
    textAlign: "center",
  },
  selectionTitle: {
    color: "#0f172a",
    fontSize: 28,
    fontWeight: 900,
  },
  selectionText: {
    color: "#64748b",
    fontSize: 15,
    lineHeight: 1.7,
    marginTop: 12,
  },
  emptyActionButton: {
    alignItems: "center",
    background: "var(--color-primary)",
    border: "none",
    borderRadius: 12,
    color: "#ffffff",
    cursor: "pointer",
    display: "inline-flex",
    fontSize: 13,
    fontWeight: 800,
    gap: 8,
    marginTop: 12,
    padding: "12px 14px",
  },
  cardPill: {
    background: "#ecfdf5",
    borderRadius: 999,
    color: "var(--color-primary)",
    fontSize: 12,
    fontWeight: 800,
    padding: "7px 10px",
  },
  alertPill: {
    background: "#fff7ed",
    borderRadius: 999,
    color: "#c2410c",
    fontSize: 12,
    fontWeight: 800,
    padding: "7px 10px",
  },
  detailPage: {
    display: "flex",
    flexDirection: "column",
    gap: 18,
    padding: 16,
  },
  detailTopRow: {
    alignItems: "center",
    display: "flex",
    flexWrap: "wrap",
    gap: 12,
    justifyContent: "space-between",
  },
  topRightActions: {
    alignItems: "center",
    display: "flex",
    flex: 1,
    flexWrap: "wrap",
    gap: 12,
    justifyContent: "flex-end",
  },
  backButton: {
    alignItems: "center",
    background: "var(--color-primary)",
    border: "none",
    borderRadius: 12,
    color: "#ffffff",
    cursor: "pointer",
    display: "inline-flex",
    fontSize: 13,
    fontWeight: 800,
    gap: 8,
    padding: "12px 14px",
  },
  inlineSearch: {
    alignItems: "center",
    background: "#ffffff",
    border: "1px solid #cfe0db",
    borderRadius: 16,
    display: "flex",
    flex: 1,
    gap: 12,
    maxWidth: 520,
    padding: "12px 14px",
  },
  editButton: {
    alignItems: "center",
    background: "#ffffff",
    border: "1px solid var(--color-primary)",
    borderRadius: 12,
    color: "var(--color-primary)",
    cursor: "pointer",
    display: "inline-flex",
    fontSize: 13,
    fontWeight: 800,
    gap: 8,
    padding: "12px 14px",
  },
  editActionRow: {
    display: "flex",
    gap: 10,
  },
  cancelButton: {
    alignItems: "center",
    background: "#ffffff",
    border: "1px solid #cbd5e1",
    borderRadius: 12,
    color: "#334155",
    cursor: "pointer",
    display: "inline-flex",
    fontSize: 13,
    fontWeight: 800,
    gap: 8,
    padding: "12px 14px",
  },
  saveButton: {
    alignItems: "center",
    background: "var(--color-primary)",
    border: "none",
    borderRadius: 12,
    color: "#ffffff",
    cursor: "pointer",
    display: "inline-flex",
    fontSize: 13,
    fontWeight: 800,
    gap: 8,
    padding: "12px 14px",
  },
  error: {
    background: "#fff1f2",
    border: "1px solid #fecdd3",
    borderRadius: 14,
    color: "#be123c",
    fontSize: 14,
    lineHeight: 1.6,
    padding: 12,
  },
  notice: {
    background: "#ecfdf5",
    border: "1px solid #a7f3d0",
    borderRadius: 14,
    color: "#166534",
    fontSize: 14,
    lineHeight: 1.6,
    padding: 12,
  },
  studentHero: {
    background: "linear-gradient(135deg, #0f172a 0%, var(--color-primary-dark) 100%)",
    borderRadius: 26,
    color: "#ffffff",
    display: "grid",
    gap: 18,
    gridTemplateColumns: "220px minmax(0, 1fr)",
    padding: 20,
  },
  photoColumn: {
    alignItems: "stretch",
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  studentPhoto: {
    aspectRatio: "1 / 1",
    border: "3px solid rgba(255,255,255,0.14)",
    borderRadius: 24,
    objectFit: "cover",
    width: "100%",
  },
  photoUploadButton: {
    alignItems: "center",
    background: "rgba(255,255,255,0.12)",
    border: "1px solid rgba(255,255,255,0.22)",
    borderRadius: 12,
    color: "#ffffff",
    cursor: "pointer",
    display: "inline-flex",
    fontSize: 13,
    fontWeight: 800,
    justifyContent: "center",
    minHeight: 42,
    padding: "10px 12px",
  },
  hiddenFileInput: {
    display: "none",
  },
  heroBody: {
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
  },
  heroKicker: {
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: "0.08em",
    opacity: 0.78,
    textTransform: "uppercase",
  },
  heroName: {
    fontSize: "clamp(28px, 3vw, 42px)",
    fontWeight: 900,
    lineHeight: 1.05,
    margin: "8px 0 0",
  },
  heroMeta: {
    alignItems: "center",
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 10,
    opacity: 0.88,
  },
  heroPills: {
    display: "flex",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 16,
  },
  heroPill: {
    background: "rgba(255,255,255,0.12)",
    border: "1px solid rgba(255,255,255,0.14)",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 800,
    padding: "8px 12px",
  },
  heroTag: {
    background: "rgba(255,255,255,0.22)",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 800,
    padding: "8px 12px",
  },
  sectionGrid: {
    display: "grid",
    gap: 16,
    gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
  },
  editGrid: {
    display: "grid",
    gap: 16,
  },
  sectionCard: {
    background: "#ffffff",
    border: "1px solid #d8e4e0",
    borderRadius: 22,
    boxShadow: "0 12px 28px rgba(15, 23, 42, 0.05)",
    display: "flex",
    flexDirection: "column",
    gap: 14,
    padding: 18,
  },
  sectionHeader: {
    alignItems: "center",
    display: "flex",
    gap: 10,
    justifyContent: "space-between",
  },
  sectionHeaderLeft: {
    alignItems: "center",
    display: "flex",
    gap: 10,
    minWidth: 0,
  },
  sectionIcon: {
    alignItems: "center",
    background: "color-mix(in srgb, var(--color-primary) 12%, white 88%)",
    borderRadius: 12,
    color: "var(--color-primary)",
    display: "flex",
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  sectionTitle: {
    color: "#0f172a",
    fontSize: 16,
    fontWeight: 800,
  },
  sectionEditButton: {
    alignItems: "center",
    background: "color-mix(in srgb, var(--color-primary) 10%, white 90%)",
    border: "1px solid color-mix(in srgb, var(--color-primary) 26%, #d8e4e0 74%)",
    borderRadius: 999,
    color: "var(--color-primary)",
    cursor: "pointer",
    display: "inline-flex",
    flexShrink: 0,
    fontSize: 12,
    fontWeight: 800,
    gap: 6,
    lineHeight: 1,
    padding: "9px 12px",
    transition: "all 160ms ease",
  },
  sectionBody: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  detailGrid: {
    display: "grid",
    gap: 12,
    gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
  },
  detailCard: {
    background: "#f8fafc",
    borderRadius: 16,
    padding: 12,
  },
  detailLabel: {
    color: "#64748b",
    fontSize: 11,
    fontWeight: 800,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
  },
  detailValue: {
    color: "#0f172a",
    fontSize: 14,
    fontWeight: 700,
    lineHeight: 1.4,
    marginTop: 6,
    whiteSpace: "pre-line",
  },
  stackList: {
    display: "grid",
    gap: 12,
  },
  stackEditList: {
    display: "grid",
    gap: 14,
  },
  stackCard: {
    background: "#f8fafc",
    borderRadius: 16,
    padding: 14,
  },
  stackEditCard: {
    background: "#f8fafc",
    border: "1px solid #dbe7e3",
    borderRadius: 16,
    display: "flex",
    flexDirection: "column",
    gap: 14,
    padding: 14,
  },
  stackEditHeader: {
    alignItems: "center",
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
  },
  stackEditTitle: {
    color: "#0f172a",
    fontSize: 14,
    fontWeight: 900,
  },
  addMiniButton: {
    background: "var(--color-primary)",
    border: "none",
    borderRadius: 12,
    color: "#ffffff",
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 800,
    padding: "12px 14px",
    justifySelf: "start",
  },
  removeMiniButton: {
    background: "#fff1f2",
    border: "1px solid #fecdd3",
    borderRadius: 10,
    color: "#be123c",
    cursor: "pointer",
    fontSize: 12,
    fontWeight: 800,
    padding: "8px 10px",
  },
  stackTitle: {
    color: "#0f172a",
    fontSize: 15,
    fontWeight: 800,
  },
  stackMeta: {
    color: "var(--color-primary)",
    fontSize: 13,
    fontWeight: 700,
    marginTop: 4,
  },
  stackCopy: {
    color: "#475569",
    fontSize: 13,
    lineHeight: 1.5,
    marginTop: 8,
  },
  additionalList: {
    display: "grid",
    gap: 10,
  },
  additionalRow: {
    borderTop: "1px solid #e2e8f0",
    display: "grid",
    gap: 8,
    gridTemplateColumns: "minmax(140px, 180px) minmax(0, 1fr)",
    paddingTop: 10,
  },
  additionalLabel: {
    color: "#64748b",
    fontSize: 12,
    fontWeight: 800,
    textTransform: "capitalize",
  },
  additionalValue: {
    color: "#0f172a",
    fontSize: 13,
    lineHeight: 1.5,
    whiteSpace: "pre-line",
  },
  emptyInline: {
    color: "#64748b",
    fontSize: 13,
    lineHeight: 1.5,
  },
  emptyCard: {
    alignItems: "center",
    background: "#ffffff",
    border: "1px solid #d8e4e0",
    borderRadius: 22,
    boxShadow: "0 12px 28px rgba(15, 23, 42, 0.05)",
    display: "flex",
    flexDirection: "column",
    gap: 10,
    justifyContent: "center",
    minHeight: 240,
    padding: 24,
    textAlign: "center",
  },
  emptyTitle: {
    color: "#0f172a",
    fontSize: 20,
    fontWeight: 800,
  },
  emptyText: {
    color: "#64748b",
    fontSize: 14,
    lineHeight: 1.6,
    maxWidth: 420,
  },
  formGrid: {
    display: "grid",
    gap: 12,
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  },
  jsonGrid: {
    display: "grid",
    gap: 12,
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
  },
  field: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  fieldHint: {
    color: "#64748b",
    fontSize: 13,
    lineHeight: 1.6,
  },
  fieldLabel: {
    color: "#334155",
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: "0.05em",
    textTransform: "uppercase",
  },
  input: {
    background: "#ffffff",
    border: "1px solid #d8e4e0",
    borderRadius: 12,
    color: "#0f172a",
    fontSize: 14,
    outline: "none",
    padding: "12px 14px",
  },
  textarea: {
    background: "#ffffff",
    border: "1px solid #d8e4e0",
    borderRadius: 12,
    color: "#0f172a",
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
    fontSize: 13,
    lineHeight: 1.5,
    minHeight: 120,
    outline: "none",
    padding: "12px 14px",
    resize: "vertical",
  },
};
