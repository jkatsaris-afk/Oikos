/* =========================
   MODE CONFIG (LOGOS)
========================= */

import ChurchLogo from "../../assets/logos/Church-Logo.png";
import AdminLogo from "../../assets/logos/Admin-logo.png";
import CampusLogo from "../../assets/logos/Campus-Logo.png";
import SportsLogo from "../../assets/logos/Sports-Logo.png";
import PagesLogo from "../../assets/logos/Pages-Logo.png";

import DisplayHomeLogo from "../../assets/logos/Display-Home-Logo.png";
import DisplayBusinessLogo from "../../assets/logos/Display-Business-Logo.png";
import DisplayEduLogo from "../../assets/logos/Display-Edu-Logo.png";

/* =========================
   MODE MAP
========================= */

export const modeConfig = {
  home: {
    label: "Home",
    logo: DisplayHomeLogo,
  },

  business: {
    label: "Business",
    logo: DisplayBusinessLogo,
  },

  education: {
    label: "Education",
    logo: DisplayEduLogo,
  },

  edu: {
    label: "Education",
    logo: DisplayEduLogo,
  },

  church: {
    label: "Church",
    logo: ChurchLogo,
  },

  admin: {
    label: "Admin",
    logo: AdminLogo,
  },

  campus: {
    label: "Campus",
    logo: CampusLogo,
  },

  sports: {
    label: "Sports",
    logo: SportsLogo,
  },

  /* 🔥 NEW */
  pages: {
    label: "Pages",
    logo: PagesLogo,
  },
};

/* =========================
   SAFE GETTER
========================= */

export function getModeConfig(mode) {
  return modeConfig[mode] || modeConfig["home"];
}
