import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Layout } from './components/Layout';
import { Home } from './pages/Home';
import { TripForm } from './pages/TripForm';
import { RefuelForm } from './pages/RefuelForm';
import { MaintenanceForm } from './pages/MaintenanceForm';
import { Login } from './pages/Login';
import { MasterDashboard } from './pages/MasterDashboard';
import { OwnerDashboard } from './pages/OwnerDashboard';
import { WorkshopsManager } from './pages/WorkshopsManager';
import { UsersManager } from './pages/UsersManager';
import { Clock, Lock, LogOut } from 'lucide-react';

// ACCESS DENIED PAGE (Pending or Suspended)
const AccessDenied: React.FC = () => {
    const { user, logout } = useAuth();
    
    if (!user) return <Navigate to="/" />;

    const isSuspended = user.status === 'suspended';

    return (
        <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-white text-center">
            <div className={`p-5 rounded-full mb-6 ${isSuspended ? 'bg-red-500/20 text-red-500' : 'bg-orange-500/20 text-orange-500'}`}>
                {isSuspended ? <Lock size={48} /> : <Clock size={48} />}
            </div>
            
            <h1 className="text-2xl font-bold mb-2">
                {isSuspended ? 'Account Sospeso' : 'In Attesa di Approvazione'}
            </h1>
            
            <p className="text-slate-400 mb-8 max-w-xs mx-auto">
                {isSuspended 
                    ? "Il tuo accesso è stato temporaneamente bloccato. Contatta l'amministrazione per maggiori dettagli."
                    : "La tua registrazione è avvenuta con successo. Attendi che il Master attivi il tuo profilo per accedere all'app."
                }
            </p>

            <div className="bg-slate-800 p-4 rounded-xl w-full max-w-sm mb-8">
                <p className="text-xs text-slate-500 uppercase font-bold mb-1">Stato Attuale</p>
                <div className={`text-lg font-bold ${isSuspended ? 'text-red-400' : 'text-orange-400'}`}>
                    {isSuspended ? '🚫 SOSPESO' : '⏳ PENDING'}
                </div>
                <div className="mt-2 text-sm text-slate-300">
                    {user.displayName}
                </div>
            </div>

            <button 
                onClick={logout}
                className="flex items-center gap-2 px-6 py-3 bg-slate-800 hover:bg-slate-700 rounded-lg font-bold transition-colors"
            >
                <LogOut size={18} /> Esci e Riprova
            </button>
        </div>
    );
};

// Wrapper for checking specific roles AND status
const RoleRoute: React.FC<{ children: React.ReactNode, allowedRoles: string[] }> = ({ children, allowedRoles }) => {
    const { user, loading } = useAuth();

    if (loading) return <div className="h-screen flex items-center justify-center bg-slate-50 text-slate-400">Caricamento...</div>;
    
    if (!user) return <Navigate to="/" replace />;
    
    // Check Status first (Master is exempt from locks usually, but let's be safe)
    if (user.role !== 'master' && user.status !== 'active') {
        return <AccessDenied />;
    }

    if (!allowedRoles.includes(user.role)) {
        if (user.role === 'master') return <Navigate to="/master" replace />;
        if (user.role === 'owner') return <Navigate to="/owner" replace />;
        return <Navigate to="/dashboard" replace />;
    }

    return <Layout>{children}</Layout>;
};

const LoginRedirect: React.FC = () => {
    const { user, loading } = useAuth();
    if (loading) return null;
    if (user) {
        if (user.role === 'master') return <Navigate to="/master" replace />;
        if (user.role === 'owner') return <Navigate to="/owner" replace />;
        // Check status for driver redirection too
        if (user.status !== 'active') return <AccessDenied />;
        return <Navigate to="/dashboard" replace />;
    }
    return <Login />;
}

const AppRoutes = () => {
    return (
        <Routes>
            <Route path="/" element={<LoginRedirect />} />
            
            {/* DRIVER ROUTES */}
            <Route path="/dashboard" element={
                <RoleRoute allowedRoles={['driver']}>
                    <Home />
                </RoleRoute>
            } />
            <Route path="/trip" element={
                <RoleRoute allowedRoles={['driver']}>
                    <TripForm />
                </RoleRoute>
            } />
            <Route path="/refuel" element={
                <RoleRoute allowedRoles={['driver']}>
                    <RefuelForm />
                </RoleRoute>
            } />
            <Route path="/maintenance" element={
                <RoleRoute allowedRoles={['driver']}>
                    <MaintenanceForm />
                </RoleRoute>
            } />

            {/* MASTER ROUTES */}
            <Route path="/master" element={
                <RoleRoute allowedRoles={['master']}>
                    <MasterDashboard />
                </RoleRoute>
            } />
            <Route path="/master/workshops" element={
                <RoleRoute allowedRoles={['master']}>
                    <WorkshopsManager />
                </RoleRoute>
            } />
            <Route path="/master/users" element={
                <RoleRoute allowedRoles={['master']}>
                    <UsersManager />
                </RoleRoute>
            } />

            {/* OWNER ROUTES */}
            <Route path="/owner" element={
                <RoleRoute allowedRoles={['owner']}>
                    <OwnerDashboard />
                </RoleRoute>
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