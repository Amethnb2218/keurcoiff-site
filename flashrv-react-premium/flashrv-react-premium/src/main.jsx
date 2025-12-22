import React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { AuthProvider } from "react-oidc-context";

import "./styles.css";
import { oidcConfig } from "./auth/oidc";

import AppShell from "./ui/AppShell";
import ProtectedRoute from "./ui/ProtectedRoute";

import Home from "./pages/Home";
import Login from "./pages/Login";
import AuthCallback from "./pages/AuthCallback";
import Salons from "./pages/Salons";
import SalonDetail from "./pages/SalonDetail";
import Reservation from "./pages/Reservation";
import MyBookings from "./pages/MyBookings";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";

const router = createBrowserRouter([
  {
    element: <AppShell />,
    children: [
      { path: "/", element: <Home /> },
      { path: "/login", element: <Login /> },
      { path: "/auth/callback", element: <AuthCallback /> },
      { path: "/salons", element: <Salons /> },
      { path: "/salons/:id", element: <SalonDetail /> },
      { path: "/reservation", element: <ProtectedRoute><Reservation /></ProtectedRoute> },
      { path: "/mes-reservations", element: <ProtectedRoute><MyBookings /></ProtectedRoute> },
      { path: "/profile", element: <ProtectedRoute><Profile /></ProtectedRoute> },
      { path: "*", element: <NotFound /> },
    ],
  },
]);

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AuthProvider {...oidcConfig()}>
      <RouterProvider router={router} />
    </AuthProvider>
  </React.StrictMode>
);
