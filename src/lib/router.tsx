import { createBrowserRouter } from "react-router-dom";
import { App } from "../App.tsx";
import { ROUTES } from "./routes.ts";
import { NotFound } from "./routing/NotFound.tsx";
import { RouteError } from "./routing/RouteError.tsx";
import { RouteFallback } from "./routing/RouteFallback.tsx";

export const router = createBrowserRouter([
  {
    // The root layout route: a bare <Outlet /> (src/App.tsx). Tiere has one
    // route; its screens are a layer stack (src/platform/history.ts, phase 4).
    path: ROUTES.home,
    Component: App,
    ErrorBoundary: RouteError,
    HydrateFallback: RouteFallback,
    children: [
      {
        ErrorBoundary: RouteError,
        children: [
          {
            index: true,
            lazy: async () => ({
              Component: (await import("../features/home/HomePage.tsx")).HomePage,
            }),
          },
          { path: "*", Component: NotFound },
        ],
      },
    ],
  },
]);
