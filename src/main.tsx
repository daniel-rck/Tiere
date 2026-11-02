import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import "./index.css";
// Registers the `beforeinstallprompt` listener before the lazy route loads:
// a missed event never comes back (spec 3.5).
// oxlint-disable-next-line import/no-unassigned-import -- imported for its listener
import "./lib/ui/useInstallPrompt.ts";
import { router } from "./lib/router.tsx";

const root = document.getElementById("root");
if (!root) throw new Error("index.html has no #root element");

// No <UpdatePrompt />: its toast is text, and the toddler mode shows none
// (spec 9, criterion 5). How a waiting update surfaces is decided in phase 8.
createRoot(root).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
