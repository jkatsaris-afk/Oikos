import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

// 🔥 YOUR MASTER CSS
import "./core/styles/main.css";

// 🔥 ROOT RENDER
const root = ReactDOM.createRoot(document.getElementById("root"));

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
