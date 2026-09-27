import { NavLink, Outlet, Link, useParams } from "react-router-dom";
import { TrainFront } from "lucide-react";
import { SYSTEMS, DEPT_COLOR, niceDay } from "../lib/ui";
import { useMeta } from "../App";

export default function Layout() {
  const { sys } = useParams();
  const s = SYSTEMS[sys];
  const meta = useMeta();
  const modules = [
    ["dashboard", "Dashboard"],
    ["schedule", sys === "coa" ? "AI Block Planner" : "Maintenance Schedule"],
    ["register", "Block Request Register"],
  ];
  const accent = s.dept ? DEPT_COLOR[s.dept] : "#0f172a";

  return (
    <div className="min-h-screen">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-[1500px] mx-auto px-4 flex items-center gap-6 h-14">
          <Link to="/" className="flex items-center gap-2 font-semibold">
            <TrainFront size={20} /> RailBlock
          </Link>
          <div className="flex items-center gap-2 pl-4 border-l border-slate-200">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: accent }} />
            <span className="font-medium">{s.title}</span>
            <span className="text-xs text-slate-500">{s.sub}</span>
          </div>
          <nav className="flex gap-1 ml-4">
            {modules.map(([to, label]) => (
              <NavLink
                key={to}
                to={`/${sys}/${to}`}
                className={({ isActive }) =>
                  `px-3 py-4 text-sm border-b-2 ${isActive ? "border-slate-900 font-medium" : "border-transparent text-slate-500 hover:text-slate-800"}`
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>
          <div className="ml-auto text-xs text-slate-500">Plan date: {niceDay(meta.now.slice(0, 10))}</div>
          <Link to="/" className="text-xs text-slate-500 hover:underline">Switch system</Link>
        </div>
      </header>
      <main className="max-w-[1500px] mx-auto p-4">
        <Outlet />
      </main>
    </div>
  );
}
