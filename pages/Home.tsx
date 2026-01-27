import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Fuel, Wrench, AlertTriangle, ChevronLeft, ChevronRight, Gauge, Calculator } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getMonthlyStats, saveMonthlyStats } from '../services/db';
import { MonthlyStats } from '../types';

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

// Helper to format numbers with thousands separator (1.000)
const formatNumber = (num: string | number | null): string => {
  if (num === null || num === undefined || num === '') return '';
  const n = typeof num === 'string' ? parseInt(num.replace(/\D/g, '')) : num;
  if (isNaN(n)) return '';
  return n.toLocaleString('it-IT');
};

export const Home: React.FC = () => {
  const navigate = useNavigate();
  const { user, currentVehicle, availableVehicles, setVehicle, isDrivingAssigned } = useAuth();
  
  // Month Navigation State
  const [viewDate, setViewDate] = useState(new Date());
  
  // Monthly Stats State
  const [stats, setStats] = useState<MonthlyStats | null>(null);
  const [kmInputs, setKmInputs] = useState<{ initial: string; final: string }>({ initial: '', final: '' });
  const [isSavingStats, setIsSavingStats] = useState(false);

  // Month Key Helper (YYYY-MM)
  const getMonthKey = (date: Date) => date.toISOString().slice(0, 7);

  // Load stats when date or vehicle changes
  useEffect(() => {
    const loadStats = async () => {
      if (!user || !currentVehicle) return;
      
      const key = getMonthKey(viewDate);
      const data = await getMonthlyStats(user.uid, currentVehicle.id, key);
      
      if (data) {
        setStats(data);
        setKmInputs({
          initial: data.initialKm ? data.initialKm.toString() : '',
          final: data.finalKm ? data.finalKm.toString() : ''
        });
      } else {
        setStats(null);
        setKmInputs({ initial: '', final: '' });
      }
    };
    loadStats();
  }, [viewDate, currentVehicle, user]);

  const changeMonth = (delta: number) => {
    const newDate = new Date(viewDate);
    newDate.setMonth(viewDate.getMonth() + delta);
    setViewDate(newDate);
  };

  const handleKmChange = (field: 'initial' | 'final', value: string) => {
    // Strip non-numeric chars to keep state clean, allow empty string
    const rawValue = value.replace(/\D/g, '');
    setKmInputs(prev => ({ ...prev, [field]: rawValue }));
  };

  const saveKmStats = async () => {
    if (!user || !currentVehicle) return;
    
    setIsSavingStats(true);
    const key = getMonthKey(viewDate);
    
    const newStats: MonthlyStats = {
      ...stats,
      userId: user.uid,
      vehicleId: currentVehicle.id,
      monthKey: key,
      initialKm: kmInputs.initial ? parseInt(kmInputs.initial) : null,
      finalKm: kmInputs.final ? parseInt(kmInputs.final) : null,
    };

    try {
      await saveMonthlyStats(newStats);
      setStats(newStats);
    } catch (error) {
      console.error("Failed to save stats", error);
    }
    setIsSavingStats(false);
  };

  const monthName = viewDate.toLocaleString('it-IT', { month: 'long', year: 'numeric' });

  // Calculation Logic
  const startKm = parseInt(kmInputs.initial || '0');
  const endKm = parseInt(kmInputs.final || '0');
  const totalKm = (kmInputs.final && kmInputs.initial && endKm >= startKm) ? endKm - startKm : null;

  return (
    <div className="flex flex-col gap-6 pt-2">
      {/* Welcome & Vehicle Selector Card */}
      <div className={`p-4 rounded-xl shadow-sm border transition-colors ${!isDrivingAssigned ? 'bg-orange-50 border-orange-200' : 'bg-white border-slate-100'}`}>
         
         <div className="flex justify-between items-start gap-4">
             {/* Left: Name */}
             <div>
                <h2 className="text-slate-500 text-sm font-medium uppercase tracking-wider mb-1">Benvenuto</h2>
                <p className="text-2xl font-bold text-slate-800 leading-tight">
                    {user?.displayName || 'Autista'}
                </p>
                <div className="mt-2 text-sm text-slate-600 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                    Turno Attivo
                </div>
             </div>

             {/* Right: Vehicle Selector */}
             <div className="flex flex-col items-end">
                <label className={`text-xs font-semibold mb-1 ${!isDrivingAssigned ? 'text-orange-700 flex items-center gap-1' : 'text-slate-400'}`}>
                    {!isDrivingAssigned && <AlertTriangle size={12} />}
                    VEICOLO IN USO
                </label>
                <div className="relative">
                    <select 
                        value={currentVehicle?.id || ''}
                        onChange={(e) => setVehicle(e.target.value)}
                        className={`appearance-none pl-3 pr-8 py-2 rounded-lg text-sm font-bold border-2 outline-none focus:ring-2 focus:ring-opacity-50 transition-all cursor-pointer
                            ${!isDrivingAssigned 
                                ? 'bg-white border-orange-300 text-orange-800 focus:ring-orange-500 shadow-sm' 
                                : 'bg-slate-100 border-transparent text-slate-700 focus:bg-white focus:ring-blue-500'
                            }`}
                    >
                        {availableVehicles.map(v => (
                            <option key={v.id} value={v.id}>
                                {v.plate} ({v.code})
                            </option>
                        ))}
                    </select>
                    {/* Custom Arrow */}
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
                        <svg className={`w-4 h-4 ${!isDrivingAssigned ? 'text-orange-600' : 'text-slate-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                    </div>
                </div>
                {!isDrivingAssigned && (
                    <span className="text-[10px] text-orange-600 font-medium mt-1">
                        Diverso dal veicolo assegnato
                    </span>
                )}
             </div>
         </div>
      </div>

      {/* MONTHLY STATS CARD */}
      <div className="bg-white rounded-xl shadow-md border border-slate-100 overflow-hidden">
         {/* Header / Navigator */}
         <div className="bg-slate-800 text-white p-3 flex justify-between items-center">
            <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-slate-700 rounded-full active:scale-95 transition-all">
                <ChevronLeft size={20} />
            </button>
            <h3 className="font-bold text-lg capitalize tracking-wide">{monthName}</h3>
            <button onClick={() => changeMonth(1)} className="p-2 hover:bg-slate-700 rounded-full active:scale-95 transition-all">
                <ChevronRight size={20} />
            </button>
         </div>
         
         {/* Km Inputs */}
         <div className="p-4 grid grid-cols-2 gap-4">
             <div>
                <label className="text-xs text-slate-500 font-bold uppercase mb-1 flex items-center gap-1">
                    <Gauge size={12} /> Km Inizio Mese
                </label>
                <input 
                    type="text" 
                    inputMode="numeric"
                    placeholder="0"
                    value={formatNumber(kmInputs.initial)}
                    onChange={(e) => handleKmChange('initial', e.target.value)}
                    onBlur={saveKmStats}
                    className="w-full bg-slate-50 border-b-2 border-slate-200 focus:border-blue-500 outline-none p-2 text-xl font-mono text-slate-700 transition-colors rounded-t-lg"
                />
             </div>
             <div>
                <label className="text-xs text-slate-500 font-bold uppercase mb-1 flex items-center gap-1">
                    <Gauge size={12} /> Km Fine Mese
                </label>
                <input 
                    type="text" 
                    inputMode="numeric"
                    placeholder="0"
                    value={formatNumber(kmInputs.final)}
                    onChange={(e) => handleKmChange('final', e.target.value)}
                    onBlur={saveKmStats}
                    className="w-full bg-slate-50 border-b-2 border-slate-200 focus:border-blue-500 outline-none p-2 text-xl font-mono text-slate-700 transition-colors rounded-t-lg"
                />
             </div>
         </div>
         
         {/* Calculated Total Bar */}
         {totalKm !== null && (
            <div className="bg-emerald-50 px-4 py-3 flex justify-between items-center border-t border-emerald-100">
                <span className="text-emerald-700 text-sm font-bold flex items-center gap-2">
                    <Calculator size={16} /> DISTANZA TOTALE
                </span>
                <span className="text-2xl font-black text-emerald-600 tracking-tight">
                    {formatNumber(totalKm)} <span className="text-sm font-medium text-emerald-500">km</span>
                </span>
            </div>
         )}

         {isSavingStats && (
            <div className="h-1 w-full bg-blue-100 overflow-hidden">
                <div className="h-full bg-blue-500 animate-progress"></div>
            </div>
         )}
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
          onClick={() => navigate('/maintenance')} 
        />
      </div>
    </div>
  );
};