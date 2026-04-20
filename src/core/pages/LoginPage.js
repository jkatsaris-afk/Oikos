import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { login, getProfile } from "../../auth/authService";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleLogin = async () => {
    try {
      const user = await login(email, password);

      const profile = await getProfile(user.id);

      if (!profile.is_approved) {
        navigate("/pending-approval");
        return;
      }

      // 🔥 TEMP: SEND YOU TO HOME (FULL ACCESS USER)
      navigate("/home");

    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div style={{ height: "100vh", display: "flex", justifyContent: "center", alignItems: "center" }}>
      <div style={{ padding: 30, width: 320, background: "#111", borderRadius: 12 }}>
        <h2 style={{ marginBottom: 20 }}>Oikos Login</h2>

        <input
          style={{ width: "100%", marginBottom: 10 }}
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          style={{ width: "100%", marginBottom: 20 }}
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button style={{ width: "100%" }} onClick={handleLogin}>
          Login
        </button>
      </div>
    </div>
  );
}
