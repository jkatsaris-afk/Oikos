import { useEffect, useMemo, useRef, useState } from "react";
import {
  Briefcase,
  Building2,
  GraduationCap,
  KeyRound,
  Mail,
  Plus,
  Save,
  Search,
  Send,
  ShieldCheck,
  Trash2,
  UserSquare2,
} from "lucide-react";

import { useAuth } from "../../../../auth/useAuth";
import {
  archiveCampusStaff,
  createCampusStaff,
  loadCampusStaffDashboard,
  setCampusDefaultAccess,
  sendCampusStaffPasswordReset,
  sendCampusStaffInviteEmail,
  setCampusTeacherPortalAccess,
  uploadCampusStaffPhoto,
  updateCampusStaff,
} from "../../services/staffService";

function SectionCard({ icon: Icon, title, children, action = null }) {
  return (
    <section style={styles.sectionCard}>
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

function LabeledInput({ label, value, onChange, type = "text", placeholder = "" }) {
  return (
    <label style={styles.field}>
      <span style={styles.fieldLabel}>{label}</span>
      <input
        type={type}
        value={value || ""}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        style={styles.input}
      />
    </label>
  );
}

function LabeledTextarea({ label, value, onChange, rows = 4 }) {
  return (
    <label style={styles.field}>
      <span style={styles.fieldLabel}>{label}</span>
      <textarea
        rows={rows}
        value={value || ""}
        onChange={(event) => onChange(event.target.value)}
        style={styles.textarea}
      />
    </label>
  );
}

function LabeledTokens({ label, values, onChange, placeholder }) {
  return (
    <LabeledInput
      label={label}
      value={(values || []).join(", ")}
      onChange={(value) =>
        onChange(
          value
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean)
        )
      }
      placeholder={placeholder}
    />
  );
}

function SummaryPill({ children, tone = "default" }) {
  const toneStyles =
    tone === "primary"
      ? styles.summaryPillPrimary
      : tone === "warn"
        ? styles.summaryPillWarn
        : styles.summaryPill;

  return <div style={toneStyles}>{children}</div>;
}

function assignmentSourceLabel(source) {
  if (source === "grade-and-direct") return "Grade + Direct";
  if (source === "direct") return "Direct";
  return "Grade";
}

export default function StaffPage() {
  const { user } = useAuth();
  const [staff, setStaff] = useState([]);
  const [students, setStudents] = useState([]);
  const [account, setAccount] = useState(null);
  const [inviteCode, setInviteCode] = useState("");
  const [selectedStaffId, setSelectedStaffId] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [saving, setSaving] = useState(false);
  const [assignmentSavingId, setAssignmentSavingId] = useState("");
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [editForm, setEditForm] = useState(null);
  const [studentQuery, setStudentQuery] = useState("");
  const [saveFeedback, setSaveFeedback] = useState("idle");
  const [photoUploading, setPhotoUploading] = useState(false);
  const [accessSaving, setAccessSaving] = useState(false);
  const staffPhotoInputRef = useRef(null);

  useEffect(() => {
    let mounted = true;

    async function loadDashboard() {
      try {
        setLoading(true);
        setError("");
        const dashboard = await loadCampusStaffDashboard(user?.id);
        if (!mounted) return;
        setStaff(dashboard.staff || []);
        setStudents(dashboard.students || []);
        setAccount(dashboard.account || null);
        setInviteCode(dashboard.inviteCode || "");
        const firstId = dashboard.staff?.[0]?.id || "";
        setSelectedStaffId((current) => current || firstId);
      } catch (loadError) {
        console.error("Campus staff load error:", loadError);
        if (!mounted) return;
        setError(loadError.message || "Could not load staff.");
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadDashboard();
    return () => {
      mounted = false;
    };
  }, [user?.id]);

  const filteredStaff = useMemo(() => {
    const normalized = String(query || "").trim().toLowerCase();

    return staff.filter((item) => {
      const statusMatches =
        statusFilter === "all" ||
        String(item.employmentStatus || "").toLowerCase() === statusFilter;

      const queryMatches =
        !normalized ||
        [
          item.displayName,
          item.email,
          item.staffType,
          item.jobTitle,
          ...(item.gradeAssignments || []),
          ...(item.classroomAssignments || []),
          ...(item.subjectAssignments || []),
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(normalized));

      return statusMatches && queryMatches;
    });
  }, [query, staff, statusFilter]);

  const selectedStaff =
    filteredStaff.find((item) => item.id === selectedStaffId) ||
    staff.find((item) => item.id === selectedStaffId) ||
    filteredStaff[0] ||
    staff[0] ||
    null;

  useEffect(() => {
    if (!selectedStaff) {
      setEditForm(null);
      return;
    }

    setEditForm({
      ...selectedStaff,
      gradeAssignments: [...(selectedStaff.gradeAssignments || [])],
      studentAssignments: [...(selectedStaff.studentAssignments || [])],
      classroomAssignments: [...(selectedStaff.classroomAssignments || [])],
      subjectAssignments: [...(selectedStaff.subjectAssignments || [])],
      programAssignments: [...(selectedStaff.programAssignments || [])],
      tags: [...(selectedStaff.tags || [])],
    });
    setStudentQuery("");
  }, [selectedStaff?.id]);

  useEffect(() => {
    if (!notice && !error) return undefined;

    const timeoutId = window.setTimeout(() => {
      setNotice("");
      setError("");
    }, 4000);

    return () => window.clearTimeout(timeoutId);
  }, [notice, error]);

  useEffect(() => {
    if (saveFeedback !== "saved") return undefined;

    const timeoutId = window.setTimeout(() => {
      setSaveFeedback("idle");
    }, 2200);

    return () => window.clearTimeout(timeoutId);
  }, [saveFeedback]);

  const previewAssignedStudents = useMemo(() => {
    if (!editForm) return [];

    const gradeAssignments = new Set(
      (editForm.gradeAssignments || []).map((value) => String(value).toLowerCase())
    );
    const directAssignments = new Set(
      (editForm.studentAssignments || []).map((value) => String(value))
    );

    return students
      .filter((student) => {
        const matchesGrade = gradeAssignments.has(
          String(student.gradeLevel || "").toLowerCase()
        );
        const matchesDirect = directAssignments.has(String(student.id || ""));
        return matchesGrade || matchesDirect;
      })
      .map((student) => {
        const matchesGrade = gradeAssignments.has(
          String(student.gradeLevel || "").toLowerCase()
        );
        const matchesDirect = directAssignments.has(String(student.id || ""));
        return {
          ...student,
          assignmentSource: matchesGrade && matchesDirect
            ? "grade-and-direct"
            : matchesGrade
              ? "grade"
              : "direct",
        };
      })
      .sort((left, right) =>
        String(left.displayName || "").localeCompare(String(right.displayName || ""))
      );
  }, [editForm, students]);

  const availableStudentResults = useMemo(() => {
    const normalized = String(studentQuery || "").trim().toLowerCase();
    if (!normalized) {
      return students.slice(0, 8);
    }

    return students
      .filter((student) =>
        [
          student.displayName,
          student.gradeLevel,
          student.studentNumber,
          student.householdName,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(normalized))
      )
      .slice(0, 8);
  }, [studentQuery, students]);

  const selectedStaffPortalUserId =
    selectedStaff?.linkedUserId || selectedStaff?.linkedAccount?.userId || "";

  async function toggleDirectStudentAssignment(studentId) {
    if (!user?.id || !editForm?.id) return;

    const existing = new Set((editForm.studentAssignments || []).map((value) => String(value)));
    if (existing.has(String(studentId))) {
      existing.delete(String(studentId));
    } else {
      existing.add(String(studentId));
    }

    const nextAssignments = Array.from(existing);
    const nextForm = {
      ...editForm,
      studentAssignments: nextAssignments,
    };

    setAssignmentSavingId(String(studentId));
    setError("");
    setEditForm(nextForm);

    try {
      const updated = await updateCampusStaff(user.id, nextForm);

      setStaff((current) =>
        current.map((item) =>
          item.id === updated.id
            ? {
                ...item,
                ...updated,
                linkedAccount: item.linkedAccount || null,
                teacherPortalAccess: item.teacherPortalAccess || false,
                assignedStudents: item.assignedStudents || [],
                primaryOwnedGrades: item.primaryOwnedGrades || [],
              }
            : item
        )
      );
      await refreshDashboard(selectedStaffId || updated.id);
      setNotice(
        nextAssignments.includes(String(studentId))
          ? "Student assigned."
          : "Student removed from direct assignments."
      );
      setSaveFeedback("saved");
    } catch (saveError) {
      console.error("Campus direct student assignment save error:", saveError);
      setError(saveError.message || "Could not update direct student assignments.");
      setEditForm(editForm);
    } finally {
      setAssignmentSavingId("");
    }
  }

  async function refreshDashboard(preferredStaffId = selectedStaffId) {
    const dashboard = await loadCampusStaffDashboard(user?.id);
    setStaff(dashboard.staff || []);
    setStudents(dashboard.students || []);
    setAccount(dashboard.account || null);
    setInviteCode(dashboard.inviteCode || "");
    setSelectedStaffId(preferredStaffId || dashboard.staff?.[0]?.id || "");
  }

  async function handleAddStaff() {
    if (!user?.id) return;

    try {
      setSaving(true);
      setError("");
      const created = await createCampusStaff(user.id);
      await refreshDashboard(created.id);
      setNotice("Staff record created.");
    } catch (createError) {
      console.error("Campus staff create error:", createError);
      setError(createError.message || "Could not create staff record.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSave() {
    if (!user?.id || !editForm?.id) return;

    try {
      setSaving(true);
      setSaveFeedback("saving");
      setError("");
      await updateCampusStaff(user.id, editForm);
      await refreshDashboard(editForm.id);
      setNotice("Staff record saved.");
      setSaveFeedback("saved");
    } catch (saveError) {
      console.error("Campus staff save error:", saveError);
      setError(saveError.message || "Could not save staff record.");
      setSaveFeedback("idle");
    } finally {
      setSaving(false);
    }
  }

  async function handleArchive() {
    if (!user?.id || !selectedStaff?.id) return;

    try {
      setSaving(true);
      setError("");
      await archiveCampusStaff(user.id, selectedStaff.id);
      await refreshDashboard("");
      setNotice("Staff record archived.");
    } catch (archiveError) {
      console.error("Campus staff archive error:", archiveError);
      setError(archiveError.message || "Could not archive staff record.");
    } finally {
      setSaving(false);
    }
  }

  async function handlePasswordReset() {
    if (!selectedStaff?.email) return;

    try {
      setError("");
      await sendCampusStaffPasswordReset(selectedStaff);
      setNotice(`Password reset email sent to ${selectedStaff.email}.`);
    } catch (resetError) {
      console.error("Campus staff password reset error:", resetError);
      setError(resetError.message || "Could not send reset email.");
    }
  }

  async function handleInviteEmail() {
    if (!selectedStaff) return;

    try {
      const result = await sendCampusStaffInviteEmail({
        accountId: account?.id || "",
        email: selectedStaff.email,
        recipientName: selectedStaff.displayName,
        inviteCode,
        staffId: selectedStaff.id,
      });
      setNotice(result?.message || `Invite email sent to ${selectedStaff.email}.`);
    } catch (inviteError) {
      console.error("Campus staff invite email error:", inviteError);
      setError(inviteError.message || "Could not send the invite email.");
    }
  }

  async function handleTeacherPortalAccess(enabled) {
    if (!user?.id || !account?.id || !selectedStaffPortalUserId) {
      setError("This staff member needs a linked account before you can control teacher portal access.");
      return;
    }

    try {
      setAccessSaving(true);
      setError("");
      await setCampusTeacherPortalAccess({
        userId: user.id,
        accountId: account.id,
        targetUserId: selectedStaffPortalUserId,
        enabled,
      });
      await refreshDashboard(selectedStaff.id);
      setNotice(
        enabled
          ? "Teacher portal access enabled."
          : "Teacher portal access removed."
      );
    } catch (accessError) {
      console.error("Campus teacher portal access error:", accessError);
      setError(accessError.message || "Could not update teacher portal access.");
    } finally {
      setAccessSaving(false);
    }
  }

  async function handleCampusAccess(enabled) {
    if (!user?.id || !account?.id || !selectedStaffPortalUserId) {
      setError("This staff member needs a linked account before you can control campus access.");
      return;
    }

    try {
      setAccessSaving(true);
      setError("");
      await setCampusDefaultAccess({
        userId: user.id,
        accountId: account.id,
        targetUserId: selectedStaffPortalUserId,
        enabled,
      });
      await refreshDashboard(selectedStaff.id);
      setNotice(enabled ? "Campus access enabled." : "Campus access removed.");
    } catch (accessError) {
      console.error("Campus default access error:", accessError);
      setError(accessError.message || "Could not update campus access.");
    } finally {
      setAccessSaving(false);
    }
  }

  async function handleStaffPhotoSelected(event) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file || !user?.id || !selectedStaff?.id) {
      return;
    }

    try {
      setPhotoUploading(true);
      setError("");
      const nextStaff = await uploadCampusStaffPhoto(user.id, selectedStaff.id, file);

      setStaff((current) =>
        current.map((item) => (item.id === nextStaff.id ? { ...item, ...nextStaff } : item))
      );
      setEditForm((current) =>
        current && current.id === nextStaff.id
          ? { ...current, photoPath: nextStaff.photoPath, photoUrl: nextStaff.photoUrl }
          : current
      );
      setNotice("Staff photo updated.");
    } catch (uploadError) {
      console.error("Campus staff photo upload error:", uploadError);
      setError(uploadError.message || "Could not upload staff photo.");
    } finally {
      setPhotoUploading(false);
    }
  }

  const activeTeachers = staff.filter(
    (item) =>
      item.isActive && String(item.staffType || "").toLowerCase() === "teacher"
  ).length;

  if (loading) {
    return <div style={styles.loading}>Loading staff...</div>;
  }

  if (!account) {
    return (
      <div style={styles.emptyState}>
        <div style={styles.emptyTitle}>No campus organization found</div>
        <div style={styles.emptyText}>
          Create or join a campus organization in Settings before managing staff.
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.hero}>
        <div>
          <div style={styles.eyebrow}>Staff</div>
          <h1 style={styles.title}>Manage teachers, assignments, and account access</h1>
          <p style={styles.subtitle}>
            Keep staff records together with grade ownership, classroom and subject assignments,
            account linkage, onboarding, and teacher-to-student visibility.
          </p>
        </div>
        <div style={styles.heroActions}>
          <button type="button" style={styles.primaryButton} onClick={handleAddStaff} disabled={saving}>
            <Plus size={16} />
            Add Staff
          </button>
        </div>
      </div>

      {error ? <div style={styles.errorBanner}>{error}</div> : null}
      {notice ? <div style={styles.noticeBanner}>{notice}</div> : null}

      <div style={styles.metricGrid}>
        <MetricCard label="Staff" value={String(staff.filter((item) => item.isActive).length)} detail="Active campus staff" />
        <MetricCard label="Teachers" value={String(activeTeachers)} detail="Teacher records" />
        <MetricCard label="Linked" value={String(staff.filter((item) => item.linkedAccount).length)} detail="Account-linked staff" />
        <MetricCard label="Students" value={String(students.length)} detail="Students available to assign" />
      </div>

      <div style={styles.layout}>
        <aside style={styles.sidebar}>
          <div style={styles.searchWrap}>
            <Search size={16} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search staff, grade, class, or subject"
              style={styles.searchInput}
            />
          </div>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            style={styles.select}
          >
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="pending">Pending</option>
            <option value="inactive">Inactive</option>
          </select>

          <div style={styles.staffList}>
            {filteredStaff.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelectedStaffId(item.id)}
                style={{
                  ...styles.staffCard,
                  ...(selectedStaff?.id === item.id ? styles.staffCardActive : {}),
                }}
              >
                <img src={item.photoUrl} alt={item.displayName} style={styles.staffAvatar} />
                <div style={styles.staffCardContent}>
                  <div style={styles.staffCardName}>{item.displayName}</div>
                  <div style={styles.staffCardMeta}>
                    {item.staffType || "Staff"} • {item.employmentStatus || "Status not set"}
                  </div>
                  <div style={styles.staffCardMetaMuted}>
                    {(item.gradeAssignments || []).join(", ") || "No grades assigned"}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </aside>

        <main style={styles.mainColumn}>
          {selectedStaff && editForm ? (
            <>
              <section style={styles.profileHero}>
                <div style={styles.profileAvatarColumn}>
                  <img
                    src={editForm.photoUrl || selectedStaff.photoUrl}
                    alt={selectedStaff.displayName}
                    style={styles.profileAvatar}
                  />
                  <input
                    ref={staffPhotoInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleStaffPhotoSelected}
                    style={styles.hiddenFileInput}
                  />
                  <button
                    type="button"
                    style={styles.secondaryButton}
                    onClick={() => staffPhotoInputRef.current?.click()}
                    disabled={photoUploading}
                  >
                    {photoUploading ? "Uploading Photo..." : "Upload Photo"}
                  </button>
                </div>
                <div style={styles.profileBody}>
                  <div style={styles.profileName}>{selectedStaff.displayName}</div>
                  <div style={styles.profileMeta}>
                    {selectedStaff.jobTitle || selectedStaff.staffType || "Staff"} • {selectedStaff.email || "No email"}
                  </div>
                  <div style={styles.profileMetaMuted}>
                    {selectedStaff.primaryOwnedGrades?.length
                      ? `Primary teacher for ${selectedStaff.primaryOwnedGrades.join(", ")}`
                      : "Shared or non-grade assignment"}
                  </div>
                </div>
                <div style={styles.profileActions}>
                  <button type="button" style={styles.secondaryButton} onClick={handlePasswordReset}>
                    <KeyRound size={15} />
                    Reset Password
                  </button>
                  <button type="button" style={styles.secondaryButton} onClick={handleInviteEmail}>
                    <Send size={15} />
                    Invite by Email
                  </button>
                  <button type="button" style={styles.primaryButton} onClick={handleSave} disabled={saving}>
                    <Save size={15} />
                    {saving
                      ? "Saving..."
                      : saveFeedback === "saved"
                        ? "Saved"
                        : "Save Staff"}
                  </button>
                </div>
              </section>

              <div style={styles.sectionGrid}>
                <SectionCard icon={UserSquare2} title="Staff Profile">
                  <div style={styles.fieldGrid}>
                    <LabeledInput label="First Name" value={editForm.firstName} onChange={(value) => setEditForm((current) => ({ ...current, firstName: value, displayName: `${value} ${current.lastName || ""}`.trim() }))} />
                    <LabeledInput label="Last Name" value={editForm.lastName} onChange={(value) => setEditForm((current) => ({ ...current, lastName: value, displayName: `${current.firstName || ""} ${value}`.trim() }))} />
                    <LabeledInput label="Display Name" value={editForm.displayName} onChange={(value) => setEditForm((current) => ({ ...current, displayName: value }))} />
                    <LabeledInput label="Email" type="email" value={editForm.email} onChange={(value) => setEditForm((current) => ({ ...current, email: value }))} />
                    <LabeledInput label="Phone" value={editForm.phone} onChange={(value) => setEditForm((current) => ({ ...current, phone: value }))} />
                    <LabeledInput label="Alternate Phone" value={editForm.alternatePhone} onChange={(value) => setEditForm((current) => ({ ...current, alternatePhone: value }))} />
                    <LabeledInput label="Staff Type" value={editForm.staffType} onChange={(value) => setEditForm((current) => ({ ...current, staffType: value }))} />
                    <LabeledInput label="Job Title" value={editForm.jobTitle} onChange={(value) => setEditForm((current) => ({ ...current, jobTitle: value }))} />
                    <LabeledInput label="Staff Number" value={editForm.staffNumber} onChange={(value) => setEditForm((current) => ({ ...current, staffNumber: value }))} />
                    <LabeledInput label="Employment Status" value={editForm.employmentStatus} onChange={(value) => setEditForm((current) => ({ ...current, employmentStatus: value }))} />
                    <LabeledInput label="Hire Date" type="date" value={editForm.hireDate} onChange={(value) => setEditForm((current) => ({ ...current, hireDate: value }))} />
                    <LabeledInput label="Start Date" type="date" value={editForm.startDate} onChange={(value) => setEditForm((current) => ({ ...current, startDate: value }))} />
                  </div>
                  <div style={styles.fieldHint}>Use the upload button beside the staff photo to choose a profile image.</div>
                  <LabeledTextarea label="Biography" value={editForm.biography} onChange={(value) => setEditForm((current) => ({ ...current, biography: value }))} />
                </SectionCard>

                <SectionCard icon={Building2} title="Assignments">
                  <div style={styles.summaryPillRow}>
                    <SummaryPill tone="primary">
                      {(editForm.gradeAssignments || []).length || 0} grade assignments
                    </SummaryPill>
                    <SummaryPill>
                      {(editForm.classroomAssignments || []).length || 0} classrooms
                    </SummaryPill>
                    <SummaryPill>
                      {(editForm.subjectAssignments || []).length || 0} subjects
                    </SummaryPill>
                    <SummaryPill tone="warn">
                      {(editForm.studentAssignments || []).length || 0} direct students
                    </SummaryPill>
                  </div>
                  <div style={styles.fieldGrid}>
                    <LabeledTokens label="Grades" values={editForm.gradeAssignments} onChange={(values) => setEditForm((current) => ({ ...current, gradeAssignments: values }))} placeholder="K, 1, 2" />
                    <LabeledTokens label="Classrooms" values={editForm.classroomAssignments} onChange={(values) => setEditForm((current) => ({ ...current, classroomAssignments: values }))} placeholder="Room 201, Bluebirds" />
                    <LabeledTokens label="Subjects" values={editForm.subjectAssignments} onChange={(values) => setEditForm((current) => ({ ...current, subjectAssignments: values }))} placeholder="Music, Art, Math" />
                    <LabeledTokens label="Programs" values={editForm.programAssignments} onChange={(values) => setEditForm((current) => ({ ...current, programAssignments: values }))} placeholder="Aftercare, Chapel" />
                    <LabeledTokens label="Tags" values={editForm.tags} onChange={(values) => setEditForm((current) => ({ ...current, tags: values }))} placeholder="Lead Teacher, Specials" />
                  </div>
                  <div style={styles.compactSection}>
                    <div style={styles.compactHeader}>
                      <div style={styles.compactTitle}>Direct Student Assignments</div>
                      <div style={styles.compactText}>
                        Add specific students here. Grade assignments still auto-pull whole grade rosters.
                      </div>
                    </div>
                    <div style={styles.searchWrap}>
                      <Search size={16} />
                      <input
                        value={studentQuery}
                        onChange={(event) => setStudentQuery(event.target.value)}
                        placeholder="Search students to assign directly"
                        style={styles.searchInput}
                      />
                    </div>
                    <div style={styles.assignableStudentList}>
                      {availableStudentResults.map((student) => {
                        const isAssigned = (editForm.studentAssignments || []).includes(student.id);
                        return (
                          <div key={student.id} style={styles.assignableStudentCard}>
                            <div>
                              <div style={styles.studentName}>{student.displayName}</div>
                              <div style={styles.studentMeta}>
                                Grade {student.gradeLevel || "Unknown"} • {student.householdName || "No household listed"}
                              </div>
                            </div>
                            <button
                              type="button"
                              style={isAssigned ? styles.secondaryButton : styles.primaryButton}
                              disabled={assignmentSavingId === student.id}
                              onClick={() => toggleDirectStudentAssignment(student.id)}
                            >
                              {assignmentSavingId === student.id
                                ? "Saving..."
                                : isAssigned
                                  ? "Remove"
                                  : "Assign"}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </SectionCard>

                <SectionCard icon={ShieldCheck} title="Account Control">
                  <div style={styles.summaryPillRow}>
                    <SummaryPill tone="primary">
                      Join code: {inviteCode || "Unavailable"}
                    </SummaryPill>
                    <SummaryPill>
                      {selectedStaff.linkedAccount
                        ? `Linked ${selectedStaff.linkedAccount.status || "account"}`
                        : "Not linked yet"}
                    </SummaryPill>
                    <SummaryPill>
                      {selectedStaff.email ? "Email on file" : "Missing email"}
                    </SummaryPill>
                    <SummaryPill tone={selectedStaff.teacherPortalAccess ? "primary" : "default"}>
                      {selectedStaff.teacherPortalAccess
                        ? "Teacher portal enabled"
                        : "Teacher portal off"}
                    </SummaryPill>
                  </div>
                  <div style={styles.accountPanelCompact}>
                    <div style={styles.accountStat}>
                      <div style={styles.accountStatLabel}>Campus Join Code</div>
                      <div style={styles.accountStatValue}>{inviteCode || "Unavailable"}</div>
                    </div>
                    <div style={styles.accountStat}>
                      <div style={styles.accountStatLabel}>Linked Account</div>
                      <div style={styles.accountStatValue}>
                        {selectedStaff.linkedAccount
                          ? `${selectedStaff.linkedAccount.fullName || selectedStaff.linkedAccount.email} • ${selectedStaff.linkedAccount.status}`
                          : "Not linked yet"}
                      </div>
                    </div>
                    <div style={styles.accountStat}>
                      <div style={styles.accountStatLabel}>Regular Campus Access</div>
                      <div style={styles.accountStatValue}>
                        {selectedStaffPortalUserId
                          ? selectedStaff.campusAccess
                            ? "Enabled"
                            : "Disabled"
                          : "Needs linked account"}
                      </div>
                    </div>
                    <div style={styles.accountStat}>
                      <div style={styles.accountStatLabel}>Teacher Portal Access</div>
                      <div style={styles.accountStatValue}>
                        {selectedStaffPortalUserId
                          ? selectedStaff.teacherPortalAccess
                            ? "Enabled"
                            : "Disabled"
                          : "Needs linked account"}
                      </div>
                    </div>
                  </div>
                  <div style={styles.portalAccessCard}>
                    <div>
                      <div style={styles.portalAccessTitle}>Regular Campus Access</div>
                      <div style={styles.portalAccessText}>
                        Use this for staff who should enter the main Campus experience and standard staff workflows, even if they are not teachers.
                      </div>
                    </div>
                    <button
                      type="button"
                      style={
                        selectedStaff.campusAccess
                          ? styles.portalAccessDisableButton
                          : styles.portalAccessEnableButton
                      }
                      onClick={() => handleCampusAccess(!selectedStaff.campusAccess)}
                      disabled={accessSaving || !selectedStaffPortalUserId}
                    >
                      {accessSaving
                        ? "Saving Access..."
                        : selectedStaff.campusAccess
                          ? "Remove Campus Access"
                          : "Give Campus Access"}
                    </button>
                  </div>
                  <div style={styles.portalAccessCard}>
                    <div>
                      <div style={styles.portalAccessTitle}>Teacher Portal Access</div>
                      <div style={styles.portalAccessText}>
                        Give this staff member access to the teacher-facing campus experience with a fixed set of tiles and no tile store.
                      </div>
                    </div>
                    <button
                      type="button"
                      style={
                        selectedStaff.teacherPortalAccess
                          ? styles.portalAccessDisableButton
                          : styles.portalAccessEnableButton
                      }
                      onClick={() =>
                        handleTeacherPortalAccess(!selectedStaff.teacherPortalAccess)
                      }
                      disabled={accessSaving || !selectedStaffPortalUserId}
                    >
                      {accessSaving
                        ? "Saving Access..."
                        : selectedStaff.teacherPortalAccess
                          ? "Remove Teacher Portal"
                          : "Give Teacher Portal"}
                    </button>
                  </div>
                  {!selectedStaffPortalUserId ? (
                    <div style={styles.accountHint}>
                      This turns on after the staff member has a linked campus account. Invite them first, then choose whether they should get regular Campus access, teacher portal access, or both.
                    </div>
                  ) : null}
                  <div style={styles.accountActions}>
                    <button type="button" style={styles.secondaryButton} onClick={handleInviteEmail}>
                      <Mail size={15} />
                      Open Invite Email
                    </button>
                    <button type="button" style={styles.secondaryButton} onClick={handlePasswordReset}>
                      <KeyRound size={15} />
                      Send Reset Email
                    </button>
                    <button type="button" style={styles.dangerButton} onClick={handleArchive}>
                      <Trash2 size={15} />
                      Archive Staff
                    </button>
                  </div>
                  <LabeledTextarea label="Account Notes" value={editForm.accountNotes} onChange={(value) => setEditForm((current) => ({ ...current, accountNotes: value }))} rows={2} />
                </SectionCard>

                <SectionCard icon={GraduationCap} title="Teacher Students">
                  <div style={styles.summaryPillRow}>
                    <SummaryPill tone="primary">
                      {previewAssignedStudents.length} assigned students
                    </SummaryPill>
                    {selectedStaff.primaryOwnedGrades?.length ? (
                      <SummaryPill>
                        Primary teacher: {selectedStaff.primaryOwnedGrades.join(", ")}
                      </SummaryPill>
                    ) : null}
                  </div>
                  {previewAssignedStudents.length ? (
                    <div style={styles.studentList}>
                      {previewAssignedStudents.map((student) => (
                        <div key={student.id} style={styles.studentCard}>
                          <div style={styles.studentCardHeader}>
                            <div>
                              <div style={styles.studentName}>{student.displayName}</div>
                              <div style={styles.studentMeta}>
                                Grade {student.gradeLevel || "Unknown"} • {student.currentEnrollmentStatus || student.enrollmentStatus || "Not set"}
                              </div>
                            </div>
                            <SummaryPill>{assignmentSourceLabel(student.assignmentSource)}</SummaryPill>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={styles.emptySmall}>
                      No students are visible for this staff member yet. Assign a grade to pull the grade roster here.
                    </div>
                  )}
                </SectionCard>

                <SectionCard icon={Briefcase} title="Internal Notes">
                  <LabeledTextarea label="Staff Notes" value={editForm.notes} onChange={(value) => setEditForm((current) => ({ ...current, notes: value }))} rows={5} />
                </SectionCard>
              </div>
            </>
          ) : (
            <div style={styles.emptyState}>
              <div style={styles.emptyTitle}>No staff selected</div>
              <div style={styles.emptyText}>Choose a staff member from the list or create a new one.</div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

function MetricCard({ label, value, detail }) {
  return (
    <div style={styles.metricCard}>
      <div style={styles.metricLabel}>{label}</div>
      <div style={styles.metricValue}>{value}</div>
      <div style={styles.metricDetail}>{detail}</div>
    </div>
  );
}

const styles = {
  page: { color: "#0f172a", display: "flex", flexDirection: "column", gap: 20 },
  loading: { color: "#475569", padding: 24 },
  hero: {
    alignItems: "flex-start",
    background:
      "linear-gradient(135deg, color-mix(in srgb, var(--color-primary) 8%, #ffffff 92%), color-mix(in srgb, var(--color-primary) 16%, #ffffff 84%))",
    border: "1px solid rgba(148,163,184,0.18)",
    borderRadius: 28,
    boxShadow: "0 18px 50px rgba(15,23,42,0.08)",
    display: "flex",
    gap: 20,
    justifyContent: "space-between",
    padding: 28,
  },
  eyebrow: { color: "var(--color-primary)", fontSize: 12, fontWeight: 900, letterSpacing: "0.12em", textTransform: "uppercase" },
  title: { fontSize: "clamp(28px, 4vw, 40px)", lineHeight: 1.05, margin: "10px 0 8px" },
  subtitle: { color: "#475569", lineHeight: 1.6, margin: 0, maxWidth: 760 },
  heroActions: { display: "flex", gap: 10 },
  primaryButton: {
    alignItems: "center",
    background: "var(--color-primary)",
    border: 0,
    borderRadius: 999,
    color: "#ffffff",
    cursor: "pointer",
    display: "inline-flex",
    fontSize: 14,
    fontWeight: 800,
    gap: 8,
    padding: "14px 18px",
  },
  secondaryButton: {
    alignItems: "center",
    background: "#ffffff",
    border: "1px solid rgba(148,163,184,0.24)",
    borderRadius: 999,
    color: "#0f172a",
    cursor: "pointer",
    display: "inline-flex",
    fontSize: 14,
    fontWeight: 800,
    gap: 8,
    padding: "12px 16px",
  },
  dangerButton: {
    alignItems: "center",
    background: "rgba(254,226,226,0.95)",
    border: "1px solid rgba(248,113,113,0.25)",
    borderRadius: 999,
    color: "#991b1b",
    cursor: "pointer",
    display: "inline-flex",
    fontSize: 14,
    fontWeight: 800,
    gap: 8,
    padding: "12px 16px",
  },
  errorBanner: {
    background: "rgba(254,226,226,0.95)",
    border: "1px solid rgba(248,113,113,0.25)",
    borderRadius: 18,
    color: "#991b1b",
    padding: "12px 14px",
  },
  noticeBanner: {
    background: "rgba(236,253,245,0.95)",
    border: "1px solid rgba(74,222,128,0.24)",
    borderRadius: 18,
    color: "#166534",
    padding: "12px 14px",
  },
  metricGrid: { display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" },
  metricCard: {
    background: "rgba(255,255,255,0.95)",
    border: "1px solid rgba(148,163,184,0.18)",
    borderRadius: 22,
    padding: 20,
  },
  metricLabel: { color: "#64748b", fontSize: 12, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase" },
  metricValue: { fontSize: 24, fontWeight: 900, marginTop: 8 },
  metricDetail: { color: "#475569", fontSize: 13, marginTop: 8 },
  layout: { display: "grid", gap: 20, gridTemplateColumns: "340px minmax(0, 1fr)" },
  sidebar: {
    background: "rgba(255,255,255,0.95)",
    border: "1px solid rgba(148,163,184,0.18)",
    borderRadius: 24,
    boxShadow: "0 18px 40px rgba(15,23,42,0.06)",
    display: "flex",
    flexDirection: "column",
    gap: 14,
    padding: 18,
  },
  searchWrap: {
    alignItems: "center",
    background: "#f8fafc",
    border: "1px solid rgba(148,163,184,0.18)",
    borderRadius: 14,
    color: "#64748b",
    display: "flex",
    gap: 10,
    padding: "0 12px",
  },
  searchInput: { background: "transparent", border: 0, color: "#0f172a", flex: 1, fontSize: 14, outline: "none", padding: "12px 0" },
  select: {
    background: "#ffffff",
    border: "1px solid rgba(148,163,184,0.24)",
    borderRadius: 14,
    color: "#0f172a",
    fontSize: 14,
    padding: "12px 14px",
  },
  staffList: { display: "grid", gap: 10, maxHeight: "70vh", overflow: "auto", paddingRight: 4 },
  staffCard: {
    alignItems: "center",
    background: "#ffffff",
    border: "1px solid rgba(148,163,184,0.18)",
    borderRadius: 18,
    cursor: "pointer",
    display: "flex",
    gap: 12,
    padding: 12,
    textAlign: "left",
  },
  staffCardActive: {
    border: "2px solid var(--color-primary)",
    boxShadow: "0 0 0 3px rgba(15,23,42,0.04)",
  },
  staffAvatar: { borderRadius: 16, height: 54, objectFit: "cover", width: 54 },
  staffCardContent: { minWidth: 0 },
  staffCardName: { fontSize: 15, fontWeight: 900 },
  staffCardMeta: { color: "#334155", fontSize: 12, marginTop: 4 },
  staffCardMetaMuted: { color: "#64748b", fontSize: 12, marginTop: 4 },
  mainColumn: { display: "flex", flexDirection: "column", gap: 20 },
  profileHero: {
    alignItems: "center",
    background:
      "linear-gradient(135deg, color-mix(in srgb, var(--color-primary) 7%, #ffffff 93%), color-mix(in srgb, var(--color-primary) 14%, #ffffff 86%))",
    border: "1px solid rgba(148,163,184,0.18)",
    borderRadius: 24,
    boxShadow: "0 18px 40px rgba(15,23,42,0.06)",
    display: "flex",
    gap: 18,
    padding: 22,
  },
  profileAvatarColumn: {
    alignItems: "center",
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  profileAvatar: { borderRadius: 22, height: 92, objectFit: "cover", width: 92 },
  hiddenFileInput: { display: "none" },
  profileBody: { flex: 1, minWidth: 0 },
  profileName: { fontSize: 30, fontWeight: 900, lineHeight: 1.05 },
  profileMeta: { color: "#334155", marginTop: 8 },
  profileMetaMuted: { color: "#64748b", fontSize: 13, marginTop: 8 },
  profileActions: { display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "flex-end" },
  sectionGrid: { display: "grid", gap: 18, gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))" },
  sectionCard: {
    background: "rgba(255,255,255,0.95)",
    border: "1px solid rgba(148,163,184,0.18)",
    borderRadius: 22,
    boxShadow: "0 18px 40px rgba(15,23,42,0.06)",
    padding: 18,
  },
  sectionHeader: { alignItems: "center", display: "flex", justifyContent: "space-between", marginBottom: 14 },
  sectionHeaderLeft: { alignItems: "center", display: "flex", gap: 10 },
  sectionIcon: {
    alignItems: "center",
    background: "color-mix(in srgb, var(--color-primary) 12%, #ffffff 88%)",
    borderRadius: 12,
    color: "var(--color-primary)",
    display: "flex",
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  sectionTitle: { fontSize: 18, fontWeight: 900 },
  sectionBody: { display: "grid", gap: 14 },
  fieldGrid: { display: "grid", gap: 14, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" },
  summaryPillRow: { display: "flex", flexWrap: "wrap", gap: 8 },
  summaryPill: {
    background: "rgba(241,245,249,0.95)",
    border: "1px solid rgba(148,163,184,0.18)",
    borderRadius: 999,
    color: "#334155",
    fontSize: 12,
    fontWeight: 800,
    padding: "8px 12px",
  },
  summaryPillPrimary: {
    background: "color-mix(in srgb, var(--color-primary) 14%, white)",
    border: "1px solid color-mix(in srgb, var(--color-primary) 28%, white)",
    borderRadius: 999,
    color: "var(--color-primary)",
    fontSize: 12,
    fontWeight: 900,
    padding: "8px 12px",
  },
  summaryPillWarn: {
    background: "rgba(255,247,237,0.95)",
    border: "1px solid rgba(251,146,60,0.24)",
    borderRadius: 999,
    color: "#9a3412",
    fontSize: 12,
    fontWeight: 900,
    padding: "8px 12px",
  },
  compactSection: {
    background: "color-mix(in srgb, var(--color-primary) 6%, #ffffff 94%)",
    border: "1px solid color-mix(in srgb, var(--color-primary) 16%, #d8e4e0 84%)",
    borderRadius: 18,
    display: "grid",
    gap: 12,
    padding: 14,
  },
  compactHeader: { display: "grid", gap: 4 },
  compactTitle: { fontSize: 14, fontWeight: 900 },
  compactText: { color: "#64748b", fontSize: 13, lineHeight: 1.5 },
  assignableStudentList: { display: "grid", gap: 10 },
  assignableStudentCard: {
    alignItems: "center",
    background: "#ffffff",
    border: "1px solid rgba(148,163,184,0.16)",
    borderRadius: 16,
    display: "flex",
    gap: 12,
    justifyContent: "space-between",
    padding: 12,
  },
  fieldHint: { color: "#64748b", fontSize: 13, lineHeight: 1.6 },
  field: { display: "grid", gap: 8 },
  fieldLabel: { color: "#334155", fontSize: 13, fontWeight: 800 },
  input: {
    background: "#ffffff",
    border: "1px solid rgba(148,163,184,0.24)",
    borderRadius: 14,
    color: "#0f172a",
    fontSize: 14,
    padding: "12px 14px",
  },
  textarea: {
    background: "#ffffff",
    border: "1px solid rgba(148,163,184,0.24)",
    borderRadius: 14,
    color: "#0f172a",
    fontSize: 14,
    minHeight: 90,
    padding: "12px 14px",
    resize: "vertical",
  },
  accountPanel: { display: "grid", gap: 12 },
  accountPanelCompact: { display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" },
  accountStat: {
    background: "color-mix(in srgb, var(--color-primary) 6%, #ffffff 94%)",
    border: "1px solid color-mix(in srgb, var(--color-primary) 16%, #d8e4e0 84%)",
    borderRadius: 16,
    padding: 14,
  },
  accountStatLabel: { color: "#64748b", fontSize: 12, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase" },
  accountStatValue: { fontSize: 14, fontWeight: 800, marginTop: 6 },
  portalAccessCard: {
    alignItems: "center",
    background: "color-mix(in srgb, var(--color-primary) 7%, #ffffff 93%)",
    border: "1px solid color-mix(in srgb, var(--color-primary) 18%, #d8e4e0 82%)",
    borderRadius: 18,
    display: "flex",
    flexWrap: "wrap",
    gap: 14,
    justifyContent: "space-between",
    padding: 14,
  },
  portalAccessTitle: { fontSize: 14, fontWeight: 900 },
  portalAccessText: { color: "#64748b", fontSize: 13, lineHeight: 1.55, marginTop: 4, maxWidth: 540 },
  portalAccessEnableButton: {
    alignItems: "center",
    background: "var(--color-primary)",
    border: "none",
    borderRadius: 999,
    color: "#ffffff",
    cursor: "pointer",
    display: "inline-flex",
    fontSize: 13,
    fontWeight: 900,
    justifyContent: "center",
    minWidth: 186,
    padding: "12px 16px",
  },
  portalAccessDisableButton: {
    alignItems: "center",
    background: "#ffffff",
    border: "1px solid color-mix(in srgb, var(--color-primary) 24%, #d8e4e0 76%)",
    borderRadius: 999,
    color: "var(--color-primary)",
    cursor: "pointer",
    display: "inline-flex",
    fontSize: 13,
    fontWeight: 900,
    justifyContent: "center",
    minWidth: 186,
    padding: "12px 16px",
  },
  accountHint: { color: "#64748b", fontSize: 13, lineHeight: 1.6 },
  accountActions: { display: "flex", flexWrap: "wrap", gap: 10 },
  studentList: { display: "grid", gap: 10, maxHeight: 320, overflow: "auto" },
  studentCard: {
    background: "color-mix(in srgb, var(--color-primary) 6%, #ffffff 94%)",
    border: "1px solid color-mix(in srgb, var(--color-primary) 16%, #d8e4e0 84%)",
    borderRadius: 16,
    padding: 12,
  },
  studentCardHeader: { alignItems: "flex-start", display: "flex", gap: 12, justifyContent: "space-between" },
  studentName: { fontSize: 14, fontWeight: 900 },
  studentMeta: { color: "#64748b", fontSize: 12, marginTop: 4 },
  emptyState: {
    background: "rgba(255,255,255,0.95)",
    border: "1px solid rgba(148,163,184,0.18)",
    borderRadius: 24,
    padding: 28,
  },
  emptyTitle: { fontSize: 24, fontWeight: 900 },
  emptyText: { color: "#475569", marginTop: 8 },
  emptySmall: { color: "#64748b", lineHeight: 1.6 },
};
