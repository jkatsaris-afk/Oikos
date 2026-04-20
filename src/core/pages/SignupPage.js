import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { signup } from "../../auth/authService";

export default function SignupPage() {
  const navigate = useNavigate();

  const [mode, setMode] = useState("create");

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    accountName: "",
    accountType: "home",
    inviteCode: "",
  });

  const update = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const handleSubmit = async () => {
    try {
      await signup({
        email: form.email,
        password: form.password,
        full_name: form.name,
        mode,
        accountType: form.accountType,
        accountName: form.accountName,
        inviteCode: form.inviteCode,
        extraData: form,
      });

      navigate("/pending-approval");
    } catch (e) {
      alert(e.message);
    }
  };

  return (
    <div style={page}>
      <div style={card}>
        <h3>Create Your Account</h3>

        {/* MODE SWITCH */}
        <div style={switchRow}>
          <button onClick={() => setMode("create")}>Create New</button>
          <button onClick={() => setMode("join")}>Join Existing</button>
        </div>

        {/* BASE */}
        <input placeholder="Full Name" onChange={(e) => update("name", e.target.value)} />
        <input placeholder="Email" onChange={(e) => update("email", e.target.value)} />
        <input type="password" placeholder="Password" onChange={(e) => update("password", e.target.value)} />

        {/* CREATE */}
        {mode === "create" && (
          <>
            <input placeholder="Account Name" onChange={(e) => update("accountName", e.target.value)} />

            <select onChange={(e) => update("accountType", e.target.value)}>
              <option value="home">Home</option>
              <option value="business">Business</option>
              <option value="campus">Campus</option>
              <option value="church">Church</option>
            </select>
          </>
        )}

        {/* JOIN */}
        {mode === "join" && (
          <input placeholder="Invite Code" onChange={(e) => update("inviteCode", e.target.value)} />
        )}

        <button onClick={handleSubmit}>Create Account</button>
      </div>
    </div>
  );
}

const page = {
  height: "100vh",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  background: "#f7f8fa",
};

const card = {
  width: 360,
  padding: 30,
  background: "#fff",
  borderRadius: 12,
};

const switchRow = {
  display: "flex",
  gap: 10,
  marginBottom: 10,
};
