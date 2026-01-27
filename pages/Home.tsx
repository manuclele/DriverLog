import React from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Fuel, Wrench, CalendarCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const ActionCard: React.FC<{
  title: string;
  icon: React.ReactNode;
  colorClass: string;
  onClick: () => void;
  subtext?: string;
}> = ({ title, icon, colorClass, onClick, subtext }) => (
  <button
    onClick={onClick}
    className={`${colorClass} w-full text-white p-6 rounded-2xl shadow-lg transform transition-all active:scale-95 flex flex-col items-center justify-center gap-3 h-40 relative overflow-hidden group`}
  >
    <div className="absolute -right-4 -top-4 opacity-20 transform rotate-12 group-hover:scale-110 transition-transform">
        {React.cloneElement(icon as React.ReactElement, { size: 100 })}
    </div>
    <div className="z-10 bg-white/20 p-4 rounded-full backdrop-blur-sm">
        {React.cloneElement(icon as React.ReactElement, { size: 32 })}
    </div>
    <span className="z-10 text-2xl font-bold tracking-wide">{title}</span>
    {subtext && <span className="z-10 text-xs opacity-90 font-medium bg-black/20 px-2 py-0.5 rounded-full">{subtext}</span>}
  </button>
);

export const Home: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div className="flex flex-col gap-6 pt-2">
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 mb-2">
         <h2 className="text-slate-500 text-sm font-medium uppercase tracking-wider mb-1">Benvenuto</h2>
         <p className="text-2xl font-bold text-slate-800">{user?.displayName || 'Autista'}</p>
         <div className="mt-2 text-sm text-slate-600 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            Turno Attivo &bull; {new Date().toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })}
         </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        <ActionCard
          title="NUOVO VIAGGIO"
          subtext="Bolla, Settore, Km"
          icon={<MapPin />}
          colorClass="bg-gradient-to-br from-blue-600 to-blue-700 shadow-blue-200"
          onClick={() => navigate('/trip')}
        />

        <ActionCard
          title="RIFORNIMENTO"
          subtext="Litri, Costo, Foto"
          icon={<Fuel />}
          colorClass="bg-gradient-to-br from-emerald-600 to-emerald-700 shadow-emerald-200"
          onClick={() => navigate('/refuel')}
        />

        <ActionCard
          title="MANUTENZIONE"
          subtext="Guasti, Lavaggio, AdBlue"
          icon={<Wrench />}
          colorClass="bg-gradient-to-br from-orange-500 to-orange-600 shadow-orange-200"
          onClick={() => navigate('/maintenance')} // Placeholder
        />
      </div>

      {/* Monthly Setup Mini-Card */}
      <button className="mt-4 bg-slate-200 text-slate-600 p-4 rounded-xl flex items-center justify-between group active:bg-slate-300 transition-colors">
         <div className="flex items-center gap-3">
            <CalendarCheck size={20} />
            <span className="font-semibold">Setup Mese</span>
         </div>
         <span className="text-xs bg-slate-300 px-2 py-1 rounded text-slate-700 group-active:bg-slate-400">Km Iniziali / Finali</span>
      </button>
    </div>
  );
};