import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import Security2FA from './pages/Security2FA';
import SecuritySessions from './pages/SecuritySessions';
import TwoFactorAuth from './pages/TwoFactorAuth';
import Login from './pages/Login';
import Register from './pages/Register';
import VerifyEmail from './pages/VerifyEmail';
import EmailVerificationPending from './pages/EmailVerificationPending';
import PrivateRoute from './components/PrivateRoute';
import { FinanceProvider } from './contexts/FinanceContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider } from './contexts/AuthContext';

// 🛡️ ADMIN-ONLY IMPORTS - TESTING STEP BY STEP
import AdminGuard from './components/admin/AdminGuard';
import AdminLayout from './components/admin/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminUsers from './pages/admin/AdminUsers';
import AdminSecurity from './pages/admin/AdminSecurity';

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/verify-email" element={<VerifyEmail />} />
            <Route path="/email-verification-pending" element={<EmailVerificationPending />} />
            
            {/* 🛡️ ADMIN-ONLY ROUTES - TESTING AdminGuard ONLY */}
            <Route path="/admin/*" element={
              <AdminGuard>
                <AdminLayout />
              </AdminGuard>
            }>
              <Route path="dashboard" element={<AdminDashboard />} />
              <Route path="users" element={<AdminUsers />} />
              <Route path="security" element={<AdminSecurity />} />
              <Route path="" element={<AdminDashboard />} />
            </Route>
            
            {/* Protected User routes */}
            <Route path="/dashboard" element={
              <PrivateRoute>
                <FinanceProvider>
                  <Layout>
                    <Dashboard />
                  </Layout>
                </FinanceProvider>
              </PrivateRoute>
            } />
            
            <Route path="/profile" element={
              <PrivateRoute>
                <FinanceProvider>
                  <Layout>
                    <Profile />
                  </Layout>
                </FinanceProvider>
              </PrivateRoute>
            } />
            
            <Route path="/settings/*" element={
              <PrivateRoute>
                <FinanceProvider>
                  <Layout>
                    <Routes>
                      <Route path="/" element={<Settings />} />
                      <Route path="security-2fa" element={<Security2FA />} />
                      <Route path="sessions" element={<SecuritySessions />} />
                    </Routes>
                  </Layout>
                </FinanceProvider>
              </PrivateRoute>
            } />
            
            <Route path="/2fa" element={
              <PrivateRoute>
                <FinanceProvider>
                  <Layout>
                    <TwoFactorAuth />
                  </Layout>
                </FinanceProvider>
              </PrivateRoute>
            } />
            
            {/* Default redirect - Root path */}
            <Route path="/" element={
              <PrivateRoute>
                <FinanceProvider>
                  <Layout>
                    <Dashboard />
                  </Layout>
                </FinanceProvider>
              </PrivateRoute>
            } />
          </Routes>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
