import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Fuel, Wrench, AlertTriangle, ChevronLeft, ChevronRight, Gauge, Calculator, History, AlertCircle, User, Truck, ChevronDown } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { saveMonthlyStats, getPreviousMonthStats, getUserMonthlyStats } from '../services/db';
import { MonthlyStats, Vehicle } from '../types';

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
        {React.cloneElement(icon as React.ReactElement<any>, { size: 100 })}
    </div>
    <div className="z-10 bg-white/20 p-4 rounded-full backdrop-blur-sm">
        {React.cloneElement(icon as React.ReactElement<any>, { size: 32 })}
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

// Helper: Title Case (Mario Rossi)
const toTitleCase = (str: string) => {
    if (!str) return '';
    return str.toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
};

// --- SUB-COMPONENT FOR INDIVIDUAL VEHICLE ROW ---
const VehicleStatRow: React.FC<{
    vehicle: Vehicle;
    monthKey: string;
    userId: string;
    isAssigned: boolean;
    initialStats: MonthlyStats | null;
    onStatsUpdate: () => void;
}> = ({ vehicle, monthKey, userId, isAssigned, initialStats, onStatsUpdate }) => {
    const [inputs, setInputs] = useState({ 
        initial: initialStats?.initialKm ? initialStats.initialKm.toString() : '', 
        final: initialStats?.finalKm ? initialStats.finalKm.toString() : '' 
    });
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        const tryAutoFill = async () => {
            if (!inputs.initial) {
                 const prevData = await getPreviousMonthStats(userId, vehicle.id, monthKey);
                 if (prevData?.finalKm) {
                     setInputs(prev => ({ ...prev, initial: prevData.finalKm!.toString() }));
                 }
            }
        };
        tryAutoFill();
    }, [vehicle.id, monthKey]);

    const handleChange = (field: 'initial' | 'final', value: string) => {
        const raw = value.replace(/\D/g, '');
        setInputs(prev => ({ ...prev, [field]: raw }));
    };

    const handleSave = async () => {
        if (!inputs.initial && !inputs.final) return; 
        setIsSaving(true);
        const newStats: MonthlyStats = {
            ...initialStats, 
            userId,
            vehicleId: vehicle.id,
            monthKey,
            initialKm: inputs.initial ? parseInt(inputs.initial) : null,
            finalKm: inputs.final ? parseInt(inputs.final) : null
        };
        await saveMonthlyStats(newStats);
        setIsSaving(false);
        onStatsUpdate(); 
    };

    const start = inputs.initial ? parseInt(inputs.initial) : 0;
    const end = inputs.final ? parseInt(inputs.final) : 0;
    const delta = (inputs.final && inputs.initial && end >= start) ? end - start : 0;

    return (
        <div className={`p-4 border-b border-slate-100 ${isAssigned ? 'bg-white' : 'bg-yellow-50/80'}`}>
             <div className="flex items-center justify-between mb-2">
                 {/* Only Plate, removed Code */}
                 <div className="flex items-center gap-2">
                     <span className={`text-sm font-black font-mono px-2 py-0.5 rounded border-2 ${isAssigned ? 'bg-white border-slate-900 text-slate-900' : 'bg-white border-yellow-600 text-yellow-800'}`}>
                         {vehicle.plate}
                     </span>
                 </div>
                 {!isAssigned && (
                     <div className="flex items-center gap-1 text-[10px] font-bold text-yellow-600 bg-white px-2 py-0.5 rounded-full shadow-sm">
                         <AlertCircle size={10} /> VEICOLO PROVVISORIO
                     </div>
                 )}
             </div>
             
             <div className="grid grid-cols-2 gap-4">
                 <div>
                    <label className="text-[10px] text-slate-400 font-bold uppercase mb-1 block">Inizio</label>
                    <input 
                        type="text" 
                        inputMode="numeric"
                        placeholder="0"
                        value={formatNumber(inputs.initial)}
                        onChange={(e) => handleChange('initial', e.target.value)}
                        onBlur={handleSave}
                        className={`w-full border focus:ring-2 outline-none p-2 text-lg font-mono rounded-lg transition-all text-center
                            ${isAssigned 
                                ? 'bg-slate-50 border-slate-200 focus:border-blue-500 focus:ring-blue-100 text-slate-700' 
                                : 'bg-white border-yellow-200 focus:border-yellow-500 focus:ring-yellow-200 text-yellow-900'
                            }`}
                    />
                 </div>
                 <div>
                    <label className="text-[10px] text-slate-400 font-bold uppercase mb-1 block">Fine</label>
                    <input 
                        type="text" 
                        inputMode="numeric"
                        placeholder="0"
                        value={formatNumber(inputs.final)}
                        onChange={(e) => handleChange('final', e.target.value)}
                        onBlur={handleSave}
                        className={`w-full border focus:ring-2 outline-none p-2 text-lg font-mono rounded-lg transition-all text-center
                            ${isAssigned 
                                ? 'bg-slate-50 border-slate-200 focus:border-blue-500 focus:ring-blue-100 text-slate-700' 
                                : 'bg-white border-yellow-200 focus:border-yellow-500 focus:ring-yellow-200 text-yellow-900'
                            }`}
                    />
                 </div>
             </div>
             
             {delta > 0 && (
                 <div className="text-right mt-2 text-xs font-medium text-slate-400">
                     Parziale: <span className="text-slate-600 font-bold">{formatNumber(delta)} km</span>
                 </div>
             )}
             {isSaving && <div className="h-0.5 bg-blue-500 animate-progress mt-2 w-full rounded-full opacity-50"></div>}
        </div>
    );
};

export const Home: React.FC = () => {
  const navigate = useNavigate();
  const { user, currentVehicle, availableVehicles, setVehicle, isDrivingAssigned } = useAuth();
  
  const [viewDate, setViewDate] = useState(new Date());
  const [activeVehiclesList, setActiveVehiclesList] = useState<{ vehicle: Vehicle, stats: MonthlyStats | null }[]>([]);
  const [driverTotalKm, setDriverTotalKm] = useState<number>(0);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const getMonthKey = (date: Date) => date.toISOString().slice(0, 7);
  const monthKey = getMonthKey(viewDate);

  // Filter only TRACTORS for the selector
  const tractorsOnly = availableVehicles.filter(v => v.type === 'tractor');

  useEffect(() => {
    const loadData = async () => {
      if (!user || !currentVehicle) return;
      
      const allStats = await getUserMonthlyStats(user.uid, monthKey);
      
      const vehicleIdsToShow = new Set<string>();
      vehicleIdsToShow.add(currentVehicle.id);
      allStats.forEach(s => vehicleIdsToShow.add(s.vehicleId));

      const list = Array.from(vehicleIdsToShow).map(vId => {
          const v = availableVehicles.find(av => av.id === vId);
          if (!v) return null;
          const s = allStats.find(stat => stat.vehicleId === vId) || null;
          return { vehicle: v, stats: s };
      }).filter(Boolean) as { vehicle: Vehicle, stats: MonthlyStats | null }[];

      list.sort((a, b) => {
          if (a.vehicle.id === user.assignedVehicleId) return -1;
          if (b.vehicle.id === user.assignedVehicleId) return 1;
          return 0;
      });

      setActiveVehiclesList(list);

      let total = 0;
      list.forEach(item => {
          if (item.stats?.initialKm && item.stats?.finalKm && item.stats.finalKm >= item.stats.initialKm) {
              total += (item.stats.finalKm - item.stats.initialKm);
          }
      });
      setDriverTotalKm(total);
    };

    loadData();
  }, [viewDate, currentVehicle, user, availableVehicles, refreshTrigger]);

  const changeMonth = (delta: number) => {
    const newDate = new Date(viewDate);
    newDate.setDate(1); 
    newDate.setMonth(viewDate.getMonth() + delta);
    setViewDate(newDate);
  };

  const monthName = viewDate.toLocaleString('it-IT', { month: 'long', year: 'numeric' });

  // Formatting logic for Driver Name
  const displayedName = (user?.displayName && user.displayName !== 'Utente') ? toTitleCase(user.displayName) : 'Autista';
  const displayedEmail = user?.email || '';

  return (
    <div className="flex flex-col gap-5 pt-2">
      
      {/* 
          CLEAN HEADER - Horizontal Layout with Truncation
      */}
      <div className={`bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between gap-4 ${!isDrivingAssigned ? 'border-orange-200 bg-orange-50/30' : ''}`}>
         
         {/* LEFT: Driver Info */}
         <div className="flex-1 min-w-0">
             <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Autista</span>
             
             {/* Name truncates with ellipsis if too long */}
             <h2 className="text-xl font-bold text-slate-800 leading-none truncate pr-2" title={displayedName}>
                 {displayedName}
             </h2>
             {/* Email below name in small text */}
             <p className="text-xs text-slate-500 font-medium truncate mt-0.5">{displayedEmail}</p>
             
             {!isDrivingAssigned && (
                 <span className="text-[10px] text-orange-600 font-bold flex items-center gap-1 mt-1.5">
                     <AlertTriangle size={12} /> Veicolo Provvisorio
                 </span>
             )}
         </div>

         {/* RIGHT: Vehicle Selector (Shrink-0 prevents it from squishing) */}
         <div className="text-right shrink-0">
             <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Motrice</span>
             <div className="relative inline-block">
                 <select 
                     value={currentVehicle?.id || ''}
                     onChange={(e) => setVehicle(e.target.value)}
                     className="appearance-none bg-blue-50 text-blue-700 font-bold py-2 pl-4 pr-10 rounded-xl border border-blue-100 outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer transition-all active:scale-95 text-lg w-full max-w-[140px]"
                 >
                     {tractorsOnly.map(v => (
                         <option key={v.id} value={v.id}>
                             {v.plate}
                         </option>
                     ))}
                 </select>
                 <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-500 pointer-events-none" size={18} />
             </div>
         </div>
      </div>

      {/* MULTI-VEHICLE MONTHLY STATS CARD */}
      <div className="bg-white rounded-xl shadow-md border border-slate-100 overflow-hidden relative">
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

         {/* Vehicle List */}
         <div className="max-h-80 overflow-y-auto">
             {activeVehiclesList.map((item) => (
                 <VehicleStatRow 
                    key={item.vehicle.id}
                    vehicle={item.vehicle}
                    monthKey={monthKey}
                    userId={user!.uid}
                    isAssigned={item.vehicle.id === user?.assignedVehicleId}
                    initialStats={item.stats}
                    onStatsUpdate={() => setRefreshTrigger(prev => prev + 1)}
                 />
             ))}
         </div>
         
         {/* Grand Total Bar (Driver's Monthly Total) */}
         <div className="bg-emerald-50 px-4 py-3 flex justify-between items-center border-t border-emerald-100 relative z-10 shadow-[0_-5px_10px_rgba(0,0,0,0.05)]">
            <div className="flex flex-col">
                <span className="text-emerald-800 text-xs font-bold flex items-center gap-1 uppercase tracking-tight">
                    <History size={14} /> Totale Autista
                </span>
                <span className="text-[10px] text-emerald-600 font-medium leading-none">
                    Mese di {viewDate.toLocaleString('it-IT', { month: 'long' })}
                </span>
            </div>
            <span className="text-3xl font-black text-emerald-600 tracking-tight">
                {formatNumber(driverTotalKm)} <span className="text-sm font-medium text-emerald-500">km</span>
            </span>
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
          onClick={() => navigate('/maintenance')} 
        />
      </div>
    </div>
  );
};