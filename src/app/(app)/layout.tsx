export const dynamic = "force-dynamic";

import dynamicImport from "next/dynamic";
import { ReactNode } from "react";

/* 👇 Sidebar SOLO cliente (NO SSR) */
const Sidebar = dynamicImport(() => import("../../components/Sidebar"), {
  ssr: false,
});

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">{children}</main>
    </div>
  );
}
