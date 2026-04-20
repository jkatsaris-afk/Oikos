import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

// 🔥 AUTH PROVIDER (ADDED)
import AuthProvider from "./auth/AuthProvider";

// 🔥 YOUR MASTER CSS
import "./core/styles/main.css";

// 🔥 ROOT RENDER
const root = ReactDOM.createRoot(document.getElementById("root"));

root.render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>
);
