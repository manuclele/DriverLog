import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { addLog, getLogs, deleteLog, updateLog } from '../services/db';
import { ArrowLeft, ChevronRight, Save, AlertTriangle, ChevronLeft, Trash2, Edit2, Calendar } from 'lucide-react';
import { SectorType, TripLog } from '../types';

const SECTORS: SectorType[] = ['Cisterna', 'Container', 'Centina'];
const DAYS_INITIALS = ['D', 'L', 'M', 'M', 'G', 'V', 'S']; // Domenica is 0

// Helper: Capitalize first letter of every word
const toTitleCase = (str: string) => {
    return str.replace(/\b\w/g, char => char.toUpperCase());
};

export const TripForm: React.FC = () => {
  const navigate = useNavigate();
  const { user, currentVehicle } = useAuth();
  const [loading, setLoading] = useState(false);
  
  // Refs for keyboard navigation
  const inputRefs = useRef<(HTMLInputElement | HTMLSelectElement | HTMLButtonElement | null)[]>([]);
  
  // History State
  const [history, setHistory] = useState<TripLog[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);

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

  // Load User Preferences and History
  useEffect(() => {
    if (user) {
        // 1. Check local storage for persistence (last used sector)
        const lastUsedSector = localStorage.getItem(`lastSector_${user.uid}`) as SectorType;
        const initialSector = lastUsedSector || user.assignedSector || 'Container';
        setSelectedSector(initialSector);

        // 2. Load History
        loadHistory();
    }
  }, [user]);

  const loadHistory = async () => {
      if (!user) return;
      const logs = await getLogs(user.uid, 'trip', 50); // Increase limit to allow filtering
      setHistory(logs as TripLog[]);
  };

  const handleSectorChange = (sector: SectorType) => {
      setSelectedSector(sector);
      if (user) {
          localStorage.setItem(`lastSector_${user.uid}`, sector);
      }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    let value = e.target.value;
    
    // Auto-capitalize text inputs for better data hygiene
    if (e.target.name === 'departure' || e.target.name === 'destination' || e.target.name === 'bollaNumber') {
        value = toTitleCase(value);
    }

    setFormData({ ...formData, [e.target.name]: value });
  };

  // Handle Enter Key Navigation
  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const nextInput = inputRefs.current[index + 1];
      if (nextInput) {
        nextInput.focus();
      } else {
        // If it's the last input (select), submit form
        handleSubmit(e as any);
      }
    }
  };

  // Date Navigation Logic
  const shiftDate = (days: number) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(selectedDate.getDate() + days);
    setSelectedDate(newDate);
  };

  const getVisibleDates = () => {
    const dates = [];
    for (let i = -2; i <= 2; i++) {
        const d = new Date(selectedDate);
        d.setDate(selectedDate.getDate() + i);
        dates.push(d);
    }
    return dates;
  };

  // --- CRUD ACTIONS ---

  const handleEdit = (log: TripLog) => {
      setEditingId(log.id!);
      setFormData({
          bollaNumber: log.bollaNumber,
          departure: log.departure,
          destination: log.destination,
          details: log.details || 'Standard'
      });
      setSelectedSector(log.sector);
      setSelectedDate(new Date(log.date)); // Parse string YYYY-MM-DD back to Date
      window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: string) => {
      if (!confirm("Sei sicuro di voler eliminare questo viaggio?")) return;
      await deleteLog('logs', id);
      // Remove from local state immediately for speed
      setHistory(prev => prev.filter(item => item.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !currentVehicle) {
        alert("Nessun veicolo selezionato");
        return;
    }

    setLoading(true);
    
    // Format date as YYYY-MM-DD local time
    const offset = selectedDate.getTimezoneOffset();
    const localDate = new Date(selectedDate.getTime() - (offset*60*1000));
    const formattedDate = localDate.toISOString().split('T')[0];

    const payload = {
        type: 'trip',
        userId: user.uid,
        vehicleId: currentVehicle.id,
        sector: selectedSector,
        ...formData,
        date: formattedDate,
        timestamp: selectedDate.getTime()
    };

    try {
      if (editingId) {
          await updateLog('logs', editingId, payload);
          setEditingId(null);
          // Refresh list locally
          setHistory(prev => prev.map(item => item.id === editingId ? { ...item, ...payload } as TripLog : item));
      } else {
          const docRef = await addLog('logs', payload);
          // Add to history top
          setHistory(prev => [{ id: docRef.id, ...payload, createdAt: new Date().toISOString() } as TripLog, ...prev]);
      }
      
      // Reset form but keep context
      setFormData({ bollaNumber: '', departure: '', destination: '', details: 'Standard' });
      
      // Auto-focus first field for next entry
      setTimeout(() => {
          inputRefs.current[0]?.focus();
      }, 100);

    } catch (error) {
      alert("Errore nel salvataggio");
    } finally {
        setLoading(false);
    }
  };

  const isSectorAssigned = user ? selectedSector === user.assignedSector : true;
  const monthName = selectedDate.toLocaleString('it-IT', { month: 'long', year: 'numeric' });
  const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

  // Filter history based on selected Month/Year
  const filteredHistory = history.filter(log => {
      const logDate = new Date(log.date);
      return logDate.getMonth() === selectedDate.getMonth() && logDate.getFullYear() === selectedDate.getFullYear();
  });

  return (
    <div className="space-y-5 pb-8">
      <div className="flex items-center gap-4 mb-2">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-slate-600 active:bg-slate-200 rounded-full">
            <ArrowLeft />
        </button>
        <div className="flex flex-col">
            <h2 className="text-2xl font-bold text-slate-800 leading-none">
                {editingId ? 'Modifica Viaggio' : 'Nuovo Viaggio'}
            </h2>
            {currentVehicle && <span className="text-xs text-slate-500 font-medium mt-1">Veicolo: {currentVehicle.plate}</span>}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        
        {/* SECTOR BUTTONS */}
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

        {/* DATE STRIP */}
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

        {/* Inputs */}
        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 space-y-4">
            <div>
                <label className="block text-sm font-semibold text-slate-500 mb-1">Numero Bolla / DDT</label>
                <input
                    ref={el => { if (el) inputRefs.current[0] = el; }}
                    type="text"
                    name="bollaNumber"
                    required
                    placeholder="Es. 2024/001"
                    value={formData.bollaNumber}
                    onChange={handleChange}
                    onKeyDown={(e) => handleKeyDown(e, 0)}
                    enterKeyHint="next"
                    autoCapitalize="sentences"
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-lg text-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                />
            </div>
        </div>

        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-semibold text-slate-500 mb-1">Partenza</label>
                    <input
                        ref={el => { if (el) inputRefs.current[1] = el; }}
                        type="text"
                        name="departure"
                        placeholder="Città"
                        value={formData.departure}
                        onChange={handleChange}
                        onKeyDown={(e) => handleKeyDown(e, 1)}
                        enterKeyHint="next"
                        autoCapitalize="words"
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-blue-500"
                    />
                </div>
                <div>
                    <label className="block text-sm font-semibold text-slate-500 mb-1">Destinazione</label>
                    <input
                        ref={el => { if (el) inputRefs.current[2] = el; }}
                        type="text"
                        name="destination"
                        placeholder="Città"
                        value={formData.destination}
                        onChange={handleChange}
                        onKeyDown={(e) => handleKeyDown(e, 2)}
                        enterKeyHint="next"
                        autoCapitalize="words"
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-blue-500"
                    />
                </div>
            </div>
        </div>

        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
             <div>
                <label className="block text-sm font-semibold text-slate-500 mb-1">Tipo Viaggio</label>
                <div className="relative">
                    <select
                        ref={el => { if (el) inputRefs.current[3] = el; }}
                        name="details"
                        value={formData.details}
                        onChange={handleChange}
                        onKeyDown={(e) => handleKeyDown(e, 3)}
                        // Select usually submits or finishes interaction
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
            className={`w-full text-white p-4 rounded-xl font-bold text-lg shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2
                ${editingId ? 'bg-indigo-600 shadow-indigo-200' : 'bg-blue-600 shadow-blue-200'}
            `}
        >
            {loading ? 'Salvataggio...' : (
                <>
                    <Save size={20} /> {editingId ? 'AGGIORNA VIAGGIO' : 'REGISTRA VIAGGIO'}
                </>
            )}
        </button>

        {editingId && (
            <button 
                type="button" 
                onClick={() => { setEditingId(null); setFormData({ bollaNumber: '', departure: '', destination: '', details: 'Standard' }); }}
                className="w-full py-2 text-slate-500 text-sm underline"
            >
                Annulla Modifica
            </button>
        )}

      </form>

      {/* TRIP HISTORY */}
      <div className="mt-8 pt-6 border-t border-slate-200">
          <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Calendar className="text-slate-400" size={20} />
              Viaggi: <span className="text-slate-600 capitalize">{monthName}</span>
          </h3>

          {filteredHistory.length === 0 ? (
              <div className="text-center py-8 text-slate-400 italic bg-white rounded-xl border border-dashed border-slate-300">
                  Nessun viaggio registrato in {monthName}
              </div>
          ) : (
              <div className="space-y-3">
                  {filteredHistory.map(trip => (
                      <div key={trip.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col gap-2 relative group">
                          {/* Row 1: Header */}
                          <div className="flex justify-between items-start">
                              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{trip.date}</span>
                              <div className="bg-slate-100 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                                  {trip.sector}
                              </div>
                          </div>
                          
                          {/* Row 2: Content */}
                          <div className="flex items-center gap-2">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 text-slate-800 font-bold text-lg leading-tight">
                                        <span>{trip.departure}</span>
                                        <ChevronRight size={16} className="text-slate-400" />
                                        <span>{trip.destination}</span>
                                    </div>
                                    <div className="text-sm text-slate-500 mt-0.5">
                                        Bolla: <span className="font-mono text-slate-700">{trip.bollaNumber}</span> • {trip.details}
                                    </div>
                                </div>
                          </div>

                          {/* Row 3: Actions */}
                          <div className="flex justify-end gap-3 mt-2 border-t border-slate-50 pt-2">
                              <button 
                                onClick={() => handleEdit(trip)} 
                                className="flex items-center gap-1 text-xs font-bold text-blue-600 px-3 py-1.5 bg-blue-50 rounded-lg hover:bg-blue-100"
                              >
                                  <Edit2 size={12} /> MODIFICA
                              </button>
                              <button 
                                onClick={() => handleDelete(trip.id!)} 
                                className="flex items-center gap-1 text-xs font-bold text-red-600 px-3 py-1.5 bg-red-50 rounded-lg hover:bg-red-100"
                              >
                                  <Trash2 size={12} /> ELIMINA
                              </button>
                          </div>
                      </div>
                  ))}
              </div>
          )}
      </div>
    </div>
  );
};