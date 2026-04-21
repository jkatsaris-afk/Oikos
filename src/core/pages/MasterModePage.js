import { useNavigate } from "react-router-dom";

// LOGOS
import DisplayHomeLogo from "../../assets/logos/Display-Home-Logo.png";
import DisplayBusinessLogo from "../../assets/logos/Display-Business-Logo.png";
import DisplayEduLogo from "../../assets/logos/Display-Edu-Logo.png";
import PagesLogo from "../../assets/logos/Pages-Logo.png";
import ChurchLogo from "../../assets/logos/Church-Logo.png";
import CampusLogo from "../../assets/logos/Campus-Logo.png";
import SportsLogo from "../../assets/logos/Sports-Logo.png";

export default function MasterModePage() {
  const navigate = useNavigate();

  const modes = [
    { name: "Home", type: "internal", path: "/home", logo: DisplayHomeLogo },
    { name: "Business", type: "internal", path: "/business", logo: DisplayBusinessLogo },
    { name: "Education", type: "internal", path: "/edu", logo: DisplayEduLogo },
    { name: "Pages", type: "internal", path: "/pages", logo: PagesLogo },

    // 🔥 EXTERNAL DOMAINS
    { name: "Church", type: "external", url: "https://oikoschurch.app", logo: ChurchLogo },
    { name: "Campus", type: "external", url: "https://oikoscampus.app", logo: CampusLogo },
    { name: "Sports", type: "external", url: "https://oikossports.app", logo: SportsLogo },
  ];

  const handleClick = (mode) => {
    if (mode.type === "external") {
      window.location.href = mode.url;
    } else {
      navigate(mode.path);
    }
  };

  return (
    <div style={pageStyle}>
      <div style={containerStyle}>

        <h2 style={titleStyle}>Oikos Mode Launcher</h2>

        <div style={gridStyle}>
          {modes.map((mode) => (
            <div
              key={mode.name}
              style={tileStyle}
              onClick={() => handleClick(mode)}
            >
              <img src={mode.logo} alt={mode.name} style={logoStyle} />
              <div style={labelStyle}>{mode.name}</div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}

// =========================
// 🎨 STYLES
// =========================

const pageStyle = {
  minHeight: "100vh",
  background: "#f7f8fa",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  padding: "20px",
};

const containerStyle = {
  width: "100%",
  maxWidth: "900px",
};

const titleStyle = {
  textAlign: "center",
  marginBottom: "30px",
};

const gridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: "20px",
};

const tileStyle = {
  background: "#fff",
  borderRadius: "16px",
  padding: "20px",
  textAlign: "center",
  boxShadow: "0 10px 30px rgba(0,0,0,0.06)",
  cursor: "pointer",
  transition: "transform 0.15s ease",
};

const logoStyle = {
  width: "120px",
  marginBottom: "10px",
};

const labelStyle = {
  fontSize: "14px",
  fontWeight: "600",
};
