import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Layout } from './components/Layout';
import { Home } from './pages/Home';
import { TripForm } from './pages/TripForm';
import { RefuelForm } from './pages/RefuelForm';
import { MaintenanceForm } from './pages/MaintenanceForm';
import { Login } from './pages/Login';

// Protected Route Wrapper
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) return <div className="h-screen flex items-center justify-center bg-slate-50 text-slate-400">Caricamento...</div>;
  
  if (!user) {
    return <Navigate to="/" replace />;
  }

  return <Layout>{children}</Layout>;
};

const AppRoutes = () => {
    return (
        <Routes>
            <Route path="/" element={<Login />} />
            <Route path="/dashboard" element={
                <ProtectedRoute>
                    <Home />
                </ProtectedRoute>
            } />
            <Route path="/trip" element={
                <ProtectedRoute>
                    <TripForm />
                </ProtectedRoute>
            } />
            <Route path="/refuel" element={
                <ProtectedRoute>
                    <RefuelForm />
                </ProtectedRoute>
            } />
            <Route path="/maintenance" element={
                <ProtectedRoute>
                    <MaintenanceForm />
                </ProtectedRoute>
            } />
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
}

const App: React.FC = () => {
  return (
    <AuthProvider>
      <HashRouter>
        <AppRoutes />
      </HashRouter>
    </AuthProvider>
  );
};

export default App;