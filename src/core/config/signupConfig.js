export const signupConfig = {
  home: {
    fields: [],
  },

  business: {
    fields: [
      { name: "company", label: "Company Name" },
      { name: "title", label: "Job Title" },
    ],
  },

  edu: {
    fields: [
      { name: "school", label: "School Name" },
      { name: "role", label: "Role (Teacher/Admin)" },
    ],
  },

  church: {
    fields: [
      { name: "church_name", label: "Church Name" },
      { name: "role", label: "Role (Preacher/Elder/etc)" },
    ],
  },

  campus: {
    fields: [
      { name: "school", label: "School Name" },
      { name: "role", label: "Role" },
    ],
  },

  sports: {
    fields: [
      { name: "league", label: "League Name" },
      { name: "role", label: "Coach / Parent" },
    ],
  },
};
