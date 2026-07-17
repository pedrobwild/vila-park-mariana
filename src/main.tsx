import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./i18n";

// Auto-reload on stale dynamic import failures (after deploy/rebuild)
window.addEventListener("error", (e) => {
  if (
    e.message?.includes("Failed to fetch dynamically imported module") ||
    e.message?.includes("Importing a module script failed")
  ) {
    const reloaded = sessionStorage.getItem("chunk-reload");
    if (!reloaded) {
      sessionStorage.setItem("chunk-reload", "1");
      window.location.reload();
    }
  }
});
window.addEventListener("load", () => sessionStorage.removeItem("chunk-reload"));

createRoot(document.getElementById("root")!).render(<App />);
