import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Truck, Shield, Briefcase } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const Login: React.FC = () => {
  const { login, demoLogin, user } = useAuth();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (user) {
        navigate('/dashboard');
    }
  }, [user, navigate]);

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-white">
      <div className="bg-blue-600 p-4 rounded-2xl mb-6 shadow-xl shadow-blue-900/50">
        <Truck size={48} />
      </div>
      <h1 className="text-3xl font-bold mb-2">DriverLog</h1>
      <p className="text-slate-400 mb-10 text-center max-w-xs">
        Gestisci viaggi, rifornimenti e manutenzione in modo semplice e veloce.
      </p>

      <div className="w-full max-w-sm space-y-4">
        <button
            onClick={login}
            className="w-full bg-white text-slate-900 p-4 rounded-xl font-bold text-lg shadow-lg hover:bg-slate-100 transition-colors flex items-center justify-center gap-2"
        >
            <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="w-6 h-6" alt="G" />
            Accedi con Google
        </button>

        <div className="relative py-4">
            <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-slate-700" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-slate-900 px-2 text-slate-500">Modalità Demo</span>
            </div>
        </div>

        <div className="grid grid-cols-1 gap-3">
            <button
                onClick={() => demoLogin('driver')}
                className="w-full bg-slate-800 text-slate-200 p-3 rounded-xl font-semibold text-sm border border-slate-700 hover:bg-slate-700 transition-colors flex items-center justify-center gap-2"
            >
                <Truck size={16} />
                Demo Autista
            </button>
            
            <div className="grid grid-cols-2 gap-3">
                <button
                    onClick={() => demoLogin('master')}
                    className="w-full bg-slate-800 text-indigo-300 p-3 rounded-xl font-semibold text-sm border border-slate-700 hover:bg-slate-700 transition-colors flex items-center justify-center gap-2"
                >
                    <Shield size={16} />
                    Demo Master
                </button>
                <button
                    onClick={() => demoLogin('owner')}
                    className="w-full bg-slate-800 text-emerald-300 p-3 rounded-xl font-semibold text-sm border border-slate-700 hover:bg-slate-700 transition-colors flex items-center justify-center gap-2"
                >
                    <Briefcase size={16} />
                    Demo Owner
                </button>
            </div>
        </div>
      </div>
      
      <p className="mt-8 text-xs text-slate-600">
        v1.1 • Demo Mode Enabled
      </p>
    </div>
  );
};