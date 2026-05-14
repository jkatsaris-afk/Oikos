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

if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/service-worker.js").catch((error) => {
      console.warn("Oikos service worker registration failed:", error);
    });
  });
}
