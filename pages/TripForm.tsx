import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { addLog } from '../services/db';
import { ArrowLeft, ChevronRight, Save, AlertTriangle, ChevronLeft } from 'lucide-react';
import { SectorType } from '../types';

const SECTORS: SectorType[] = ['Cisterna', 'Container', 'Centina'];
const DAYS_INITIALS = ['D', 'L', 'M', 'M', 'G', 'V', 'S']; // Domenica is 0

export const TripForm: React.FC = () => {
  const navigate = useNavigate();
  const { user, currentVehicle } = useAuth();
  const [loading, setLoading] = useState(false);

  // State for the Sector (Button Toggles)
  const [selectedSector, setSelectedSector] = useState<SectorType>('Container');
  
  // State for Date (Calendar Strip)
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  // State for the Form
  const [formData, setFormData] = useState({
    bollaNumber: '',
    departure: '',
    destination: '',
    details: 'Standard'
  });

  // Initialize Sector from LocalStorage OR Assigned Profile
  useEffect(() => {
    if (user) {
        // 1. Check local storage for persistence (last used sector)
        const lastUsedSector = localStorage.getItem(`lastSector_${user.uid}`) as SectorType;
        
        // 2. Fallback to assigned sector
        const initialSector = lastUsedSector || user.assignedSector || 'Container';
        
        setSelectedSector(initialSector);
    }
  }, [user]);

  const handleSectorChange = (sector: SectorType) => {
      setSelectedSector(sector);
      if (user) {
          // Persist the choice
          localStorage.setItem(`lastSector_${user.uid}`, sector);
      }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Date Navigation Logic
  const shiftDate = (days: number) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(selectedDate.getDate() + days);
    setSelectedDate(newDate);
  };

  // Generate 5 days centered on selected date
  const getVisibleDates = () => {
    const dates = [];
    for (let i = -2; i <= 2; i++) {
        const d = new Date(selectedDate);
        d.setDate(selectedDate.getDate() + i);
        dates.push(d);
    }
    return dates;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !currentVehicle) {
        alert("Nessun veicolo selezionato");
        return;
    }

    setLoading(true);
    
    // Format date as YYYY-MM-DD local time (not UTC) to avoid timezone shifts
    const offset = selectedDate.getTimezoneOffset();
    const localDate = new Date(selectedDate.getTime() - (offset*60*1000));
    const formattedDate = localDate.toISOString().split('T')[0];

    try {
      await addLog('logs', {
        type: 'trip',
        userId: user.uid,
        vehicleId: currentVehicle.id,
        sector: selectedSector, // The button value
        ...formData,
        date: formattedDate
      });
      navigate('/dashboard');
    } catch (error) {
      alert("Errore nel salvataggio");
      setLoading(false);
    }
  };

  const isSectorAssigned = user ? selectedSector === user.assignedSector : true;

  // Formatting helpers
  const monthName = selectedDate.toLocaleString('it-IT', { month: 'long', year: 'numeric' });
  const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

  return (
    <div className="space-y-5 pb-8">
      <div className="flex items-center gap-4 mb-2">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-slate-600 active:bg-slate-200 rounded-full">
            <ArrowLeft />
        </button>
        <div className="flex flex-col">
            <h2 className="text-2xl font-bold text-slate-800 leading-none">Nuovo Viaggio</h2>
            {currentVehicle && <span className="text-xs text-slate-500 font-medium mt-1">Veicolo: {currentVehicle.plate}</span>}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        
        {/* BIG SECTOR BUTTONS */}
        <div className="space-y-2">
            <div className="flex justify-between items-end">
                <label className="text-sm font-semibold text-slate-500">Settore Operativo</label>
                {!isSectorAssigned && (
                     <span className="text-[10px] text-orange-600 font-bold bg-orange-50 px-2 py-0.5 rounded-full flex items-center gap-1 border border-orange-100">
                        <AlertTriangle size={10} /> DIVERSO DA ASSEGNATO
                     </span>
                )}
            </div>
            <div className="grid grid-cols-3 gap-2">
                {SECTORS.map((sec) => {
                    const isActive = selectedSector === sec;
                    return (
                        <button
                            key={sec}
                            type="button"
                            onClick={() => handleSectorChange(sec)}
                            className={`py-3 px-1 rounded-xl font-bold text-sm transition-all border-2
                                ${isActive 
                                    ? 'bg-slate-800 text-white border-slate-800 shadow-md transform scale-[1.02]' 
                                    : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300'
                                }
                            `}
                        >
                            {sec}
                        </button>
                    );
                })}
            </div>
        </div>

        {/* DATE STRIP CALENDAR */}
        <div className="bg-white p-3 rounded-xl shadow-sm border border-slate-200">
            <div className="text-center text-sm font-bold text-slate-600 mb-3 capitalize">
                {capitalize(monthName)}
            </div>
            <div className="flex justify-between items-center gap-1">
                <button type="button" onClick={() => shiftDate(-1)} className="p-2 text-slate-400 active:text-slate-700">
                    <ChevronLeft size={24} />
                </button>
                
                <div className="flex gap-2 justify-center flex-1">
                    {getVisibleDates().map((d, i) => {
                        const isSelected = d.toDateString() === selectedDate.toDateString();
                        const isToday = d.toDateString() === new Date().toDateString();
                        
                        return (
                            <button
                                key={i}
                                type="button"
                                onClick={() => setSelectedDate(d)}
                                className={`flex flex-col items-center justify-center w-10 h-14 rounded-lg transition-all
                                    ${isSelected 
                                        ? 'bg-blue-600 text-white shadow-md scale-110 z-10' 
                                        : 'bg-slate-50 text-slate-500 border border-slate-100'
                                    }
                                `}
                            >
                                <span className={`text-[10px] font-bold mb-0.5 uppercase ${isSelected ? 'text-blue-200' : 'text-slate-400'}`}>
                                    {DAYS_INITIALS[d.getDay()]}
                                </span>
                                <span className={`text-lg font-bold leading-none ${isSelected ? 'text-white' : 'text-slate-700'}`}>
                                    {d.getDate()}
                                </span>
                                {isToday && !isSelected && <span className="w-1 h-1 bg-blue-500 rounded-full mt-1"></span>}
                            </button>
                        );
                    })}
                </div>

                <button type="button" onClick={() => shiftDate(1)} className="p-2 text-slate-400 active:text-slate-700">
                    <ChevronRight size={24} />
                </button>
            </div>
        </div>

        {/* Card 1: Bolla & Info */}
        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 space-y-4">
            <div>
                <label className="block text-sm font-semibold text-slate-500 mb-1">Numero Bolla / DDT</label>
                <input
                    type="text"
                    name="bollaNumber"
                    required
                    placeholder="Es. 2024/001"
                    value={formData.bollaNumber}
                    onChange={handleChange}
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-lg text-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                />
            </div>
        </div>

        {/* Card 2: Tratta (Partenza/Destinazione) */}
        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-semibold text-slate-500 mb-1">Partenza</label>
                    <input
                        type="text"
                        name="departure"
                        placeholder="Città"
                        value={formData.departure}
                        onChange={handleChange}
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-blue-500"
                    />
                </div>
                <div>
                    <label className="block text-sm font-semibold text-slate-500 mb-1">Destinazione</label>
                    <input
                        type="text"
                        name="destination"
                        placeholder="Città"
                        value={formData.destination}
                        onChange={handleChange}
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-blue-500"
                    />
                </div>
            </div>
        </div>

        {/* Card 3: Dettagli (Dynamic Dropdown) */}
        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
             <div>
                <label className="block text-sm font-semibold text-slate-500 mb-1">Tipo Viaggio</label>
                <div className="relative">
                    <select
                        name="details"
                        value={formData.details}
                        onChange={handleChange}
                        className="w-full p-4 bg-slate-50 border border-slate-200 rounded-lg text-lg appearance-none outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="Standard">Consegna Standard</option>
                        <option value="Urgent">Urgente / Espresso</option>
                        <option value="Collection">Ritiro Merce</option>
                        <option value="Return">Rientro Vuoto</option>
                    </select>
                    <ChevronRight className="absolute right-4 top-1/2 transform -translate-y-1/2 rotate-90 text-slate-400 pointer-events-none" />
                </div>
            </div>
        </div>

        <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white p-4 rounded-xl font-bold text-lg shadow-lg shadow-blue-200 active:bg-blue-700 active:scale-95 transition-all flex items-center justify-center gap-2"
        >
            {loading ? 'Salvataggio...' : (
                <>
                    <Save size={20} /> REGISTRA VIAGGIO
                </>
            )}
        </button>

      </form>
    </div>
  );
};