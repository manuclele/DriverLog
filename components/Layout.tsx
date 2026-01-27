import React from 'react';
import { useAuth } from '../context/AuthContext';
import { LogOut, Truck } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout, currentVehicle } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans max-w-md mx-auto shadow-2xl relative">
      {/* Header */}
      <header className="bg-slate-900 text-white p-4 sticky top-0 z-50 flex justify-between items-center shadow-md">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/dashboard')}>
          <div className="bg-blue-600 p-1.5 rounded-lg">
            <Truck size={20} className="text-white" />
          </div>
          <h1 className="font-bold text-lg tracking-tight">DriverLog</h1>
        </div>
        
        {user && (
          <div className="flex items-center gap-3">
             <div className="text-right hidden sm:block">
                <p className="text-xs text-slate-400">Autista</p>
                <p className="text-sm font-medium leading-none">{user.displayName || 'Utente'}</p>
             </div>
             <button 
                onClick={logout}
                className="p-2 bg-slate-800 rounded-full hover:bg-slate-700 transition-colors"
                aria-label="Logout"
             >
               <LogOut size={18} />
             </button>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="p-4 pb-24">
        {children}
      </main>

      {/* Bottom Status Bar */}
      {user && (
        <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white border-t border-slate-200 p-3 text-xs text-center text-slate-500 flex justify-between px-6 z-40">
            <span>Veicolo: <strong>{currentVehicle ? currentVehicle.plate : 'Nessuno'}</strong></span>
            <span>Versione 1.1</span>
        </div>
      )}
    </div>
  );
};