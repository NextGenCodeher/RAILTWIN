import { createContext, useContext, useEffect, useState } from "react";
import { Navigate, Route, Routes, useParams, useLocation } from "react-router-dom";
import { api } from "./lib/api";
import { SYSTEMS } from "./lib/ui";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import Schedule from "./pages/Schedule";
import Planner from "./pages/Planner";
import Register from "./pages/Register";

// Authentication Imports
import { AuthProvider } from "./auth/AuthContext";
import ProtectedRoute from "./auth/ProtectedRoute";
import DepartmentLogin from "./pages/DepartmentLogin";

const MetaContext = createContext(null);
export const useMeta = () => useContext(MetaContext);

export default function App() {
  const [meta, setMeta] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api.meta().then(setMeta).catch((e) => setError(e.message));
  }, []);

  if (error)
    return (
      <div className="p-10 text-center text-sm">
        Cannot reach the backend ({error}). Start it with <code>uvicorn app.main:app --reload</code> in <code>backend/</code>.
      </div>
    );
  if (!meta) return <div className="p-10 text-center text-sm text-slate-500">Loading…</div>;

  return (
    <AuthProvider>
      <MetaContext.Provider value={meta}>
        <Routes>
          {/* Home Page */}
          <Route path="/" element={<Home />} />

          {/* Department Login Page */}
          <Route path="/login/:department" element={<DepartmentLogin />} />

          {/* Protected System Routes for each Department */}
          <Route 
            path="/track/*" 
            element={
              <ProtectedRoute department="engineering">
                <System />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/snt/*" 
            element={
              <ProtectedRoute department="signalling">
                <System />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/trd/*" 
            element={
              <ProtectedRoute department="trd">
                <System />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/coa/*" 
            element={
              <ProtectedRoute department="controller">
                <System />
              </ProtectedRoute>
            } 
          />

          {/* Fallback Public System Routes or Catch-all */}
          <Route path="/:sys" element={<System />}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="schedule" element={<ScheduleOrPlanner />} />
            <Route path="register" element={<Register />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </MetaContext.Provider>
    </AuthProvider>
  );
}

function System() {
  const { sys: paramSys } = useParams();
  const location = useLocation();

  // FIX: Fallback to extracting the system key from pathname if useParams() is empty (e.g. /track/dashboard)
  let sys = paramSys;
  if (!sys) {
    const segments = location.pathname.split("/").filter(Boolean);
    sys = segments[0]; // Extracts "track", "snt", "trd", or "coa"
  }

  // Normalize aliases if necessary
  if (sys === "engineering" || sys === "civil") {
    sys = "track";
  }

  if (!SYSTEMS[sys]) return <Navigate to="/" replace />;
  return <Layout />;
}

function ScheduleOrPlanner() {
  const { sys } = useParams();
  return sys === "coa" ? <Planner /> : <Schedule />;
}