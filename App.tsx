import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
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
import { VehiclesManager } from './pages/VehiclesManager';
import { FuelStationsManager } from './pages/FuelStationsManager';
import { SectorsManager } from './pages/SectorsManager';
import { SystemReset } from './pages/SystemReset';
import { Clock, Lock, LogOut } from 'lucide-react';

// --- COMPONENT: Access Denied ---
const AccessDenied: React.FC = () => {
    const { user, logout } = useAuth();
    if (!user) return <Navigate to="/" />;

    const isSuspended = user.status === 'suspended';

    return (
        <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-white text-center animate-fade-in">
            <div className={`p-5 rounded-full mb-6 ${isSuspended ? 'bg-red-500/20 text-red-500' : 'bg-orange-500/20 text-orange-500'}`}>
                {isSuspended ? <Lock size={48} /> : <Clock size={48} />}
            </div>
            
            <h1 className="text-2xl font-bold mb-2">
                {isSuspended ? 'Account Sospeso' : 'In Attesa di Approvazione'}
            </h1>
            
            <p className="text-slate-400 mb-8 max-w-xs mx-auto">
                {isSuspended 
                    ? "Il tuo accesso è stato temporaneamente bloccato. Contatta l'amministrazione."
                    : "Registrazione avvenuta. Attendi l'attivazione del profilo da parte del Master."
                }
            </p>

            <button 
                onClick={logout}
                className="flex items-center gap-2 px-6 py-3 bg-slate-800 hover:bg-slate-700 rounded-lg font-bold transition-colors border border-slate-700"
            >
                <LogOut size={18} /> Esci e Riprova
            </button>
        </div>
    );
};

// --- COMPONENT: Role Route Wrapper ---
const RoleRoute: React.FC<{ children: React.ReactNode, allowedRoles: string[] }> = ({ children, allowedRoles }) => {
    const { user, loading } = useAuth();

    if (loading) return <div className="h-screen flex items-center justify-center bg-slate-50 text-slate-400">Caricamento...</div>;
    
    if (!user) return <Navigate to="/" replace />;
    
    // Status Check
    if (user.role !== 'master' && user.status !== 'active') {
        return <AccessDenied />;
    }

    // Role Check
    if (!allowedRoles.includes(user.role)) {
        if (user.role === 'master') return <Navigate to="/master" replace />;
        if (user.role === 'owner') return <Navigate to="/owner" replace />;
        return <Navigate to="/dashboard" replace />;
    }

    return <Layout>{children}</Layout>;
};

// --- COMPONENT: Root Redirector ---
const LoginRedirect: React.FC = () => {
    const { user, loading } = useAuth();
    if (loading) return null; // Or a splash screen
    if (user) {
        if (user.role === 'master') return <Navigate to="/master" replace />;
        if (user.role === 'owner') return <Navigate to="/owner" replace />;
        if (user.status !== 'active') return <AccessDenied />;
        return <Navigate to="/dashboard" replace />;
    }
    return <Login />;
}

// --- MAIN ROUTES ---
const AppRoutes = () => {
    const { pathname } = useLocation();
    
    // Scroll to top on route change
    useEffect(() => {
        window.scrollTo(0, 0);
    }, [pathname]);

    return (
        <Routes>
            <Route path="/" element={<LoginRedirect />} />
            
            {/* DRIVER */}
            <Route path="/dashboard" element={<RoleRoute allowedRoles={['driver']}><Home /></RoleRoute>} />
            <Route path="/trip" element={<RoleRoute allowedRoles={['driver']}><TripForm /></RoleRoute>} />
            <Route path="/refuel" element={<RoleRoute allowedRoles={['driver']}><RefuelForm /></RoleRoute>} />
            <Route path="/maintenance" element={<RoleRoute allowedRoles={['driver']}><MaintenanceForm /></RoleRoute>} />

            {/* MASTER */}
            <Route path="/master" element={<RoleRoute allowedRoles={['master']}><MasterDashboard /></RoleRoute>} />
            <Route path="/master/workshops" element={<RoleRoute allowedRoles={['master']}><WorkshopsManager /></RoleRoute>} />
            <Route path="/master/users" element={<RoleRoute allowedRoles={['master']}><UsersManager /></RoleRoute>} />
            <Route path="/master/vehicles" element={<RoleRoute allowedRoles={['master']}><VehiclesManager /></RoleRoute>} />
            <Route path="/master/fuel" element={<RoleRoute allowedRoles={['master']}><FuelStationsManager /></RoleRoute>} />
            <Route path="/master/sectors" element={<RoleRoute allowedRoles={['master']}><SectorsManager /></RoleRoute>} />
            <Route path="/master/reset" element={<RoleRoute allowedRoles={['master']}><SystemReset /></RoleRoute>} />

            {/* OWNER */}
            <Route path="/owner" element={<RoleRoute allowedRoles={['owner']}><OwnerDashboard /></RoleRoute>} />

            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
}

const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;