import './App.css';
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Landing from './pages/Landing';
import AuthPage from './pages/Authpage';

function App() {
  return (
    <>
    
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/auth" element={<AuthPage />} />
      {/* <Route path="/dashboard" element={<ProtectedRoute page="dashboard"><DashboardPage /></ProtectedRoute>} />
      <Route path="/classrooms" element={<ProtectedRoute page="classrooms"><ClassroomsPage /></ProtectedRoute>} />
      <Route path="/analytics" element={<ProtectedRoute page="analytics"><AnalyticsPage /></ProtectedRoute>} />
      <Route path="/ai-insights" element={<ProtectedRoute page="ai-insights"><AIInsightsPage /></ProtectedRoute>} />
      <Route path="/cost" element={<ProtectedRoute page="cost"><CostPage /></ProtectedRoute>} />
      <Route path="/carbon" element={<ProtectedRoute page="carbon"><CarbonPage /></ProtectedRoute>} />
      <Route path="/leaderboard" element={<ProtectedRoute page="leaderboard"><LeaderboardPage /></ProtectedRoute>} />
      <Route path="/alerts" element={<ProtectedRoute page="alerts"><AlertsPage /></ProtectedRoute>} />
      <Route path="/admin" element={<ProtectedRoute page="admin"><AdminPage /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/dashboard" />} /> */}
    </Routes>
    </>
  );
}

export default App;
