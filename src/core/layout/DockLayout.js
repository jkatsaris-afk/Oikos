import { Home, UserPlus } from "lucide-react";
import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

export default function DockLayout({ children }) {
  const [showSignupMenu, setShowSignupMenu] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();

  const currentPath = location.pathname;

  const goTo = (path) => {
    setShowSignupMenu(false);
    navigate(path);
  };

  return (
    <div className="app-container">

      {/* CONTENT */}
      <div className="content">
        {children}
      </div>

      {/* 🔥 BACKDROP (FIXED) */}
      {showSignupMenu && (
        <div
          className="popup-backdrop"
          onClick={() => setShowSignupMenu(false)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 90
          }}
        />
      )}

      {/* 🔥 POPUP (FIXED Z-INDEX + POSITION) */}
      {showSignupMenu && (
        <div
          className="popup-wrap"
          style={{
            position: "fixed",
            bottom: 90,
            left: 0,
            right: 0,
            display: "flex",
            justifyContent: "center",
            zIndex: 100
          }}
        >
          <div
            className="popup-card"
            onClick={(e) => e.stopPropagation()}
          >
            <PopupItem label="Option 1" onClick={() => goTo("/option1")} />
            <PopupItem label="Option 2" onClick={() => goTo("/option2")} />
            <PopupItem label="Option 3" onClick={() => goTo("/option3")} />
          </div>
        </div>
      )}

      {/* 🔥 DOCK */}
      <div className="nav-wrap">

        <NavItem
          icon={<Home size={22} />}
          label="Home"
          active={currentPath === "/" || currentPath === "/home"}
          onClick={() => navigate("/home")}
        />

        {/* 🔥 POPUP BUTTON */}
        <NavItem
          icon={<UserPlus size={22} />}
          label="Menu"
          active={showSignupMenu}
          onClick={() => setShowSignupMenu(prev => !prev)}
        />

      </div>
    </div>
  );
}

/* NAV ITEM */
function NavItem({ icon, label, active, onClick }) {
  return (
    <div
      className={`nav-item2 ${active ? "active" : ""}`}
      onClick={onClick}
    >
      {icon}
      <span>{label}</span>
    </div>
  );
}

/* POPUP ITEM */
function PopupItem({ label, onClick }) {
  return (
    <div className="popup-item" onClick={onClick}>
      <span>{label}</span>
    </div>
  );
}
