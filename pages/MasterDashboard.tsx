import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Shield, Hammer, Truck, Users, FileText, ChevronRight, Fuel, Layers, Database, RotateCcw } from 'lucide-react';
import { seedFirestore } from '../services/db';

const AdminCard: React.FC<{
  title: string;
  desc: string;
  icon: React.ReactNode;
  color: string;
  onClick: () => void;
  badge?: string;
}> = ({ title, desc, icon, color, onClick, badge }) => (
  <button
    onClick={onClick}
    className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 flex items-center gap-4 w-full text-left hover:bg-slate-50 transition-colors active:scale-98 group"
  >
    <div className={`p-3 rounded-xl ${color} text-white shadow-md group-hover:scale-110 transition-transform`}>
        {icon}
    </div>
    <div className="flex-1">
        <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
            {title}
            {badge && <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full">{badge}</span>}
        </h3>
        <p className="text-sm text-slate-500 leading-tight">{desc}</p>
    </div>
    <ChevronRight className="text-slate-300" />
  </button>
);

export const MasterDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleSeed = async () => {
      if (confirm("Attenzione: Questa operazione scriverà dati di esempio (Settori, Veicoli demo) nel Database Cloud. Continuare?")) {
          try {
              await seedFirestore();
              alert("Database inizializzato con successo!");
          } catch (e) {
              alert("Errore durante l'inizializzazione.");
              console.error(e);
          }
      }
  };

  return (
    <div className="space-y-6 pt-2">
      {/* Welcome Card */}
      <div className="bg-slate-800 rounded-xl p-6 text-white shadow-xl shadow-slate-200">
          <div className="flex items-start justify-between">
              <div>
                  <h2 className="text-slate-400 text-sm font-bold uppercase tracking-wider mb-1">Pannello di Controllo</h2>
                  <p className="text-3xl font-bold">{user?.displayName || 'Amministratore'}</p>
              </div>
              <Shield size={32} className="text-slate-500" />
          </div>
          <div className="mt-6 flex gap-3 text-xs font-medium text-slate-300">
              <span className="bg-slate-700 px-3 py-1 rounded-full">Privilegi: FULL</span>
              <span className="bg-slate-700 px-3 py-1 rounded-full">Database: PRODUCTION</span>
          </div>
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-bold text-slate-500 uppercase ml-1">Anagrafiche & Configurazione</h3>
        
        <AdminCard 
            title="Gestione Settori & Dettagli"
            desc="Configura i tipi di viaggio e campi richiesti."
            icon={<Layers size={24} />}
            color="bg-purple-600"
            onClick={() => navigate('/master/sectors')}
            badge="NEW"
        />

        <AdminCard 
            title="Gestione Distributori"
            desc="Pompe convenzionate e metodi pagamento."
            icon={<Fuel size={24} />}
            color="bg-emerald-600"
            onClick={() => navigate('/master/fuel')}
        />

        <AdminCard 
            title="Gestione Officine"
            desc="Aggiungi o rimuovi le officine autorizzate."
            icon={<Hammer size={24} />}
            color="bg-orange-500"
            onClick={() => navigate('/master/workshops')}
        />

        <AdminCard 
            title="Gestione Flotta"
            desc="Motrici, Rimorchi e Importazione."
            icon={<Truck size={24} />}
            color="bg-blue-600"
            onClick={() => navigate('/master/vehicles')}
        />

        <AdminCard 
            title="Gestione Utenti"
            desc="Crea account autisti e assegna ruoli."
            icon={<Users size={24} />}
            color="bg-indigo-600"
            onClick={() => navigate('/master/users')}
        />
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-bold text-slate-500 uppercase ml-1">Strumenti Sistema</h3>
        
        <div className="grid grid-cols-2 gap-3">
             <button 
                onClick={handleSeed}
                className="p-5 rounded-xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center gap-2 hover:bg-slate-50 hover:border-slate-400 transition-all text-slate-400 hover:text-slate-600 bg-white"
            >
                <Database size={24} />
                <div className="text-center">
                    <h3 className="font-bold text-xs">SEED DB</h3>
                    <p className="text-[10px]">Dati Esempio</p>
                </div>
            </button>

            <button 
                onClick={() => navigate('/master/reset')}
                className="p-5 rounded-xl border-2 border-red-100 flex flex-col items-center justify-center gap-2 hover:bg-red-50 hover:border-red-300 transition-all text-red-400 hover:text-red-600 bg-white"
            >
                <RotateCcw size={24} />
                <div className="text-center">
                    <h3 className="font-bold text-xs">RESET SISTEMA</h3>
                    <p className="text-[10px]">Elimina Dati</p>
                </div>
            </button>
        </div>
      </div>
    </div>
  );
};