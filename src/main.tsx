import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { loadPreferences } from "./storage/appState";
import { applyAppearance } from "./theme/azul";
import "./styles/index.css";

applyAppearance(loadPreferences(), document.documentElement);

const container = document.getElementById("root");
if (!container) throw new Error("Missing #root element");

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
