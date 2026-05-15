import { Outlet } from "react-router";
import { Navbar } from "@/components/layout/header";

export default function RootLayout() {
  return (
    <>
      <Navbar />
      <main className="pt-16">
        <Outlet />
      </main>
    </>
  );
}
