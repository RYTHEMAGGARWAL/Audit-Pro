import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Select from './pages/Select';
import AdminPanel from './pages/AdminPanel';
import Dashboard from './pages/Dashboard';
import ResetPassword from './pages/ResetPassword';
import ChangePassword from './pages/ChangePassword'; // ✅ NEW

const Protected = ({ children, adminOnly = false }) => {
  const { user, loading } = useAuth();
  if (loading) return (
    <div style={{color:'white',display:'flex',justifyContent:'center',alignItems:'center',height:'100vh'}}>
      Loading...
    </div>
  );
  if (!user) return <Navigate to="/login" />;

  // ✅ Agar mustChangePassword true hai toh seedha change-password pe bhejo
  if (user.mustChangePassword) return <Navigate to="/change-password" />;

  if (adminOnly && user.role !== 'admin') return <Navigate to="/select" />;
  return children;
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/reset-password/:token" element={<ResetPassword />} />
          <Route path="/change-password" element={<ChangePassword />} /> {/* ✅ NEW */}
          <Route path="/select"    element={<Protected><Select /></Protected>} />
          <Route path="/dashboard" element={<Protected><Dashboard /></Protected>} />
          <Route path="/admin"     element={<Protected adminOnly><AdminPanel /></Protected>} />
          <Route path="*"          element={<Navigate to="/login" />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;