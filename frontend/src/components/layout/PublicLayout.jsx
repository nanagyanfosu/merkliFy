import { Outlet } from "react-router-dom";

export default function PublicLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
}

