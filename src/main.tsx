import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import "./index.css";
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
