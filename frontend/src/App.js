import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Landing from "./pages/Landing";
import AuthPage from "./pages/AuthPage";
import DashboardPage from "./pages/DashboardPage";
import ClassroomsPage from "./pages/ClassroomsPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import AIInsightsPage from "./pages/AIInsightsPage";
import CostPage from "./pages/CostPage";
import CarbonPage from "./pages/CarbonPage";
import LeaderboardPage from "./pages/LeaderboardPage";
import AlertsPage from "./pages/AlertsPage";
import AdminPage from "./pages/AdminPage";
import AutomationPage from "./pages/AutomationPage";

// Role access configuration
const ROLE_ACCESS = {
  admin: ["dashboard", "classrooms", "analytics", "ai-insights", "cost", "carbon", "leaderboard", "alerts", "admin", "automation"],
  faculty: ["dashboard", "classrooms", "analytics", "ai-insights", "cost", "carbon", "leaderboard", "alerts", "automation"],
  student: ["dashboard", "classrooms", "leaderboard", "carbon"],
};

function ProtectedRoute({ children, page }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        height: "100vh", background: "#0a0e1a", color: "#94a3b8",
        fontFamily: "Inter, sans-serif", fontSize: "1.1rem"
      }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "2rem", marginBottom: "1rem" }}>⚡</div>
          Loading...
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Check role access
  if (page) {
    const allowed = ROLE_ACCESS[user.role] || ROLE_ACCESS.student;
    if (!allowed.includes(page)) {
      return <Navigate to="/dashboard" replace />;
    }
  }

  return children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/auth" element={<AuthPage />} />
      <Route path="/dashboard" element={<ProtectedRoute page="dashboard"><DashboardPage /></ProtectedRoute>} />
      <Route path="/classrooms" element={<ProtectedRoute page="classrooms"><ClassroomsPage /></ProtectedRoute>} />
      <Route path="/analytics" element={<ProtectedRoute page="analytics"><AnalyticsPage /></ProtectedRoute>} />
      <Route path="/ai-insights" element={<ProtectedRoute page="ai-insights"><AIInsightsPage /></ProtectedRoute>} />
      <Route path="/cost" element={<ProtectedRoute page="cost"><CostPage /></ProtectedRoute>} />
      <Route path="/carbon" element={<ProtectedRoute page="carbon"><CarbonPage /></ProtectedRoute>} />
      <Route path="/leaderboard" element={<ProtectedRoute page="leaderboard"><LeaderboardPage /></ProtectedRoute>} />
      <Route path="/alerts" element={<ProtectedRoute page="alerts"><AlertsPage /></ProtectedRoute>} />
      <Route path="/admin" element={<ProtectedRoute page="admin"><AdminPage /></ProtectedRoute>} />
      <Route path="/automation" element={<ProtectedRoute page="automation"><AutomationPage /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/dashboard" />} />
    </Routes>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </Router>
  );
}

export default App;