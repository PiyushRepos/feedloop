import { createBrowserRouter } from "react-router";
import RootLayout from "@/layouts/RootLayout";
import Landing from "@/pages/Landing";
import Explore from "@/pages/Explore";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import Dashboard from "@/pages/Dashboard";
import CreatePoll from "@/pages/CreatePoll";
import PollView from "@/pages/PollView";
import NotFound from "@/pages/NotFound";

export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      { path: "/", element: <Landing /> },
      { path: "/explore", element: <Explore /> },
      { path: "/dashboard", element: <Dashboard /> },
      { path: "/poll/create", element: <CreatePoll /> },
      { path: "/poll/:slug", element: <PollView /> },
    ],
  },
  { path: "/login", element: <Login /> },
  { path: "/register", element: <Register /> },
  { path: "*", element: <NotFound /> },
]);
