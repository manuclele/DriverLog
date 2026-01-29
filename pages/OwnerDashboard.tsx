import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Briefcase, BarChart3, FileText, ChevronRight } from 'lucide-react';

const StatCard: React.FC<{
    label: string;
    value: string;
    color: string;
}> = ({ label, value, color }) => (
    <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col">
        <span className="text-xs font-bold text-slate-400 uppercase">{label}</span>
        <span className={`text-2xl font-bold ${color}`}>{value}</span>
    </div>
);

const MenuCard: React.FC<{
  title: string;
  desc: string;
  icon: React.ReactNode;
  onClick: () => void;
}> = ({ title, desc, icon, onClick }) => (
  <button
    onClick={onClick}
    className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 flex items-center gap-4 w-full text-left hover:bg-slate-50 transition-colors active:scale-98"
  >
    <div className="p-3 rounded-xl bg-slate-100 text-slate-600">
        {icon}
    </div>
    <div className="flex-1">
        <h3 className="font-bold text-slate-800 text-lg">{title}</h3>
        <p className="text-sm text-slate-500">{desc}</p>
    </div>
    <ChevronRight className="text-slate-300" />
  </button>
);

export const OwnerDashboard: React.FC = () => {
  const { user } = useAuth();
  // const navigate = useNavigate();

  return (
    <div className="space-y-6 pt-2">
      {/* Header */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl p-6 text-white shadow-xl">
          <div className="flex items-start justify-between">
              <div>
                  <h2 className="text-slate-400 text-sm font-bold uppercase tracking-wider mb-1">Area Titolare</h2>
                  <p className="text-3xl font-bold">Buongiorno, {user?.displayName ? user.displayName.split(' ')[0] : 'Titolare'}</p>
              </div>
              <Briefcase size={32} className="text-emerald-400" />
          </div>
      </div>

      {/* Quick Stats (Mock for now) */}
      <div className="grid grid-cols-2 gap-4">
          <StatCard label="Flotta Attiva" value="3 Veicoli" color="text-blue-600" />
          <StatCard label="Viaggi Mese" value="128" color="text-indigo-600" />
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-bold text-slate-500 uppercase ml-1">Reportistica</h3>
        
        <MenuCard 
            title="Registro Globale"
            desc="Visualizza tutti i movimenti degli autisti."
            icon={<FileText size={24} />}
            onClick={() => alert('Work in progress: Registro Globale')}
        />

        <MenuCard 
            title="Analisi Costi"
            desc="Report carburante e manutenzioni."
            icon={<BarChart3 size={24} />}
            onClick={() => alert('Work in progress: Statistiche')}
        />
      </div>
    </div>
  );
};