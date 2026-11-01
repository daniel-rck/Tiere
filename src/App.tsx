import { Outlet } from "react-router-dom";

/**
 * The root layout route. Tiere shows no app shell: toddlers can't read, and the
 * screens (start, world, viewer, parents) are a layer stack inside the one
 * route (docs/specs/tiere.md §6).
 */
export function App() {
  return <Outlet />;
}
