/* =========================
   BACKGROUND CONFIG
========================= */

/* IMPORT BACKGROUNDS */
import BusinessBg from "../../assets/backgrounds/Business-Background.png";
import AdminBg from "../../assets/backgrounds/Admin-Background.png";
import CampusBg from "../../assets/backgrounds/Campus-Background.png";
import ChurchBg from "../../assets/backgrounds/Church-Background.png";
import ClassroomBg from "../../assets/backgrounds/Classroom-Background.png";
import EducationBg from "../../assets/backgrounds/Education-Bckground.png"; // ⚠️ exact match
import HomeBg from "../../assets/backgrounds/Home-Background.png";
import NightstandBg from "../../assets/backgrounds/Nightstand-Background.png";
import PagesBg from "../../assets/backgrounds/Pages-Background.png";
import TvBg from "../../assets/backgrounds/TV-Background.png";

/* =========================
   MODE BACKGROUND MAP
========================= */

export const backgroundConfig = {
  home: {
    default: HomeBg,
    allowUserOverride: true,
  },

  business: {
    default: BusinessBg,
    allowUserOverride: false,
  },

  education: {
    default: EducationBg,
    allowUserOverride: false,
  },

  classroom: {
    default: ClassroomBg,
    allowUserOverride: false,
  },

  church: {
    default: ChurchBg,
    allowUserOverride: false,
  },

  admin: {
    default: AdminBg,
    allowUserOverride: false,
  },

  campus: {
    default: CampusBg,
    allowUserOverride: false,
  },

  pages: {
    default: PagesBg,
    allowUserOverride: false,
  },

  tv: {
    default: TvBg,
    allowUserOverride: true,
  },

  nightstand: {
    default: NightstandBg,
    allowUserOverride: true,
  },
};

/* =========================
   SAFE GETTER
========================= */

export function getBackgroundConfig(mode) {
  return backgroundConfig[mode] || backgroundConfig["home"];
}
