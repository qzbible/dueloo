import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import UsersAdmin from './pages/Users';
import ContentAdmin from './pages/Content';
import LiveAdmin from './pages/Live';
import EconomyAdmin from './pages/Economy';
import SettingsAdmin from './pages/Settings';
import AdminLayout from './layouts/AdminLayout';

const ProtectedRoute = ({ children }) => {
  const isAuthenticated = localStorage.getItem('adminAuth') === 'true';
  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

const ProtectedPage = ({ children }) => (
  <ProtectedRoute><AdminLayout>{children}</AdminLayout></ProtectedRoute>
);

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login"    element={<Login />} />
        <Route path="/dashboard" element={<ProtectedPage><Dashboard /></ProtectedPage>} />
        <Route path="/users"    element={<ProtectedPage><UsersAdmin /></ProtectedPage>} />
        <Route path="/content"  element={<ProtectedPage><ContentAdmin /></ProtectedPage>} />
        <Route path="/live"     element={<ProtectedPage><LiveAdmin /></ProtectedPage>} />
        <Route path="/economy"  element={<ProtectedPage><EconomyAdmin /></ProtectedPage>} />
        <Route path="/settings" element={<ProtectedPage><SettingsAdmin /></ProtectedPage>} />
        <Route path="*"         element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
