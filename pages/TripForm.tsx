import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { addLog, getLogs, deleteLog, updateLog, getSectors } from '../services/db';
import { ArrowLeft, ChevronRight, Save, AlertTriangle, ChevronLeft, Trash2, Edit2, Calendar, Lock, MapPin, Truck, Layers, ChevronDown } from 'lucide-react';
import { TripLog, Sector } from '../types';

const DAYS_INITIALS = ['D', 'L', 'M', 'M', 'G', 'V', 'S']; // Domenica is 0
const EDIT_LIMIT_MS = 24 * 60 * 60 * 1000; // 24 Hours

// Helper: Capitalize first letter of every word
const toTitleCase = (str: string) => {
    return str.replace(/\b\w/g, char => char.toUpperCase());
};

// Helper: Format YYYY-MM-DD to DD/MM/YYYY
const toEuroDate = (isoDate: string) => {
    if (!isoDate) return '';
    const [y, m, d] = isoDate.split('-');
    return `${d}/${m}/${y}`;
};

export const TripForm: React.FC = () => {
  const navigate = useNavigate();
  const { user, currentVehicle, availableVehicles } = useAuth();
  const [loading, setLoading] = useState(false);
  
  // State
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [history, setHistory] = useState<TripLog[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form Selections
  const [selectedSectorId, setSelectedSectorId] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  // Form Fields
  const [formData, setFormData] = useState({
    bollaNumber: '',
    departure: '',
    destination: ''
  });
  
  // Dynamic Answers Store
  const [dynamicAnswers, setDynamicAnswers] = useState<Record<string, string | number>>({});

  const inputRefs = useRef<(HTMLInputElement | HTMLSelectElement | HTMLButtonElement | null)[]>([]);

  // Load Initial Data
  useEffect(() => {
    const init = async () => {
        const [sectorData, logs] = await Promise.all([
            getSectors(),
            user ? getLogs(user.uid, 'trip', 50) : []
        ]);
        
        setSectors(sectorData);
        setHistory(logs as TripLog[]);

        // Logic: Set Initial Sector
        if (user) {
            // 1. Try local storage
            const lastUsedSectorId = localStorage.getItem(`lastSectorId_${user.uid}`);
            
            // 2. Try assigned sector (match name to ID)
            const assignedSector = sectorData.find(s => s.name === user.assignedSector);
            
            // 3. Fallback to first sector
            const initialId = lastUsedSectorId || (assignedSector ? assignedSector.id : sectorData[0]?.id);
            
            if (initialId) setSelectedSectorId(initialId);
        }
    };
    init();
  }, [user]);

  const handleSectorChange = (id: string) => {
      setSelectedSectorId(id);
      // Reset dynamic answers when switching sector
      setDynamicAnswers({});
      if (user) {
          localStorage.setItem(`lastSectorId_${user.uid}`, id);
      }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;
    
    // Auto-capitalize text inputs
    if (e.target.name === 'departure' || e.target.name === 'destination' || e.target.name === 'bollaNumber') {
        value = toTitleCase(value);
    }

    setFormData({ ...formData, [e.target.name]: value });
  };

  const handleDynamicChange = (label: string, value: string | number) => {
      setDynamicAnswers(prev => ({
          ...prev,
          [label]: value
      }));
  };

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const nextInput = inputRefs.current[index + 1];
      if (nextInput) {
        nextInput.focus();
      } else {
        handleSubmit(e as any);
      }
    }
  };

  // Date Navigation
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

  const canEdit = (log: TripLog) => {
      if (user?.role === 'master') return true;
      const createdAt = new Date(log.createdAt).getTime();
      return (Date.now() - createdAt) < EDIT_LIMIT_MS;
  };

  const handleEdit = (log: TripLog) => {
      if (!canEdit(log)) {
          alert("Tempo massimo per le modifiche scaduto (24h). Contatta il Master.");
          return;
      }
      setEditingId(log.id!);
      setFormData({
          bollaNumber: log.bollaNumber,
          departure: log.departure,
          destination: log.destination
      });
      
      // Match Sector ID by Name if stored log doesn't have ID (legacy support)
      const sec = sectors.find(s => s.id === log.sectorId) || sectors.find(s => s.name === log.sector);
      if (sec) setSelectedSectorId(sec.id!);

      setDynamicAnswers(log.customData || {});
      setSelectedDate(new Date(log.date)); 
      window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: string, log: TripLog) => {
      if (!canEdit(log)) return;
      if (!confirm("Sei sicuro di voler eliminare questo viaggio?")) return;
      await deleteLog('logs', id);
      setHistory(prev => prev.filter(item => item.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !currentVehicle) {
        alert("Nessun veicolo selezionato");
        return;
    }
    
    // Validate Dynamic Fields
    const activeSector = sectors.find(s => s.id === selectedSectorId);
    if (activeSector) {
        for (const field of activeSector.fields) {
            if (field.required && !dynamicAnswers[field.label]) {
                alert(`Il campo '${field.label}' è obbligatorio.`);
                return;
            }
        }
    }

    setLoading(true);
    
    const offset = selectedDate.getTimezoneOffset();
    const localDate = new Date(selectedDate.getTime() - (offset*60*1000));
    const formattedDate = localDate.toISOString().split('T')[0];

    const payload = {
        type: 'trip',
        userId: user.uid,
        vehicleId: currentVehicle.id,
        sectorId: selectedSectorId,
        sector: activeSector ? activeSector.name : 'Unknown',
        ...formData,
        customData: dynamicAnswers,
        date: formattedDate,
        timestamp: selectedDate.getTime()
    };

    try {
      if (editingId) {
          await updateLog('logs', editingId, payload);
          setEditingId(null);
          setHistory(prev => prev.map(item => item.id === editingId ? { ...item, ...payload } as TripLog : item));
      } else {
          const docRef = await addLog('logs', payload);
          setHistory(prev => [{ id: docRef.id, ...payload, createdAt: new Date().toISOString() } as TripLog, ...prev]);
      }
      
      setFormData({ bollaNumber: '', departure: '', destination: '' });
      setDynamicAnswers({});
      
      setTimeout(() => {
          inputRefs.current[0]?.focus();
      }, 100);

    } catch (error) {
      alert("Errore nel salvataggio");
    } finally {
        setLoading(false);
    }
  };

  const activeSector = sectors.find(s => s.id === selectedSectorId);
  const isSectorAssigned = user ? activeSector?.name === user.assignedSector : true;
  const monthName = selectedDate.toLocaleString('it-IT', { month: 'long', year: 'numeric' });
  const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

  // Group History
  const filteredHistory = history.filter(log => {
      const logDate = new Date(log.date);
      return logDate.getMonth() === selectedDate.getMonth() && logDate.getFullYear() === selectedDate.getFullYear();
  });

  const groupedHistory = filteredHistory.reduce((groups, log) => {
      const date = log.date;
      if (!groups[date]) groups[date] = [];
      groups[date].push(log);
      return groups;
  }, {} as Record<string, TripLog[]>);

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
        
        {/* SECTOR BUTTONS (Dynamic) */}
        <div className="space-y-2">
            <div className="flex justify-between items-end">
                <label className="text-sm font-semibold text-slate-500">Settore Operativo</label>
                {!isSectorAssigned && (
                     <span className="text-[10px] text-orange-600 font-bold bg-orange-50 px-2 py-0.5 rounded-full flex items-center gap-1 border border-orange-100">
                        <AlertTriangle size={10} /> DIVERSO DA ASSEGNATO
                     </span>
                )}
            </div>
            <div className="flex flex-wrap gap-2">
                {sectors.map((sec) => {
                    const isActive = selectedSectorId === sec.id;
                    return (
                        <button
                            key={sec.id}
                            type="button"
                            onClick={() => handleSectorChange(sec.id!)}
                            className={`flex-1 py-3 px-2 rounded-xl font-bold text-sm transition-all border-2 min-w-[30%]
                                ${isActive 
                                    ? 'bg-slate-800 text-white border-slate-800 shadow-md transform scale-[1.02]' 
                                    : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300'
                                }
                            `}
                        >
                            {sec.name}
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

        {/* BASIC FIELDS */}
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

        {/* DYNAMIC FIELDS BASED ON SECTOR */}
        {activeSector && activeSector.fields && activeSector.fields.length > 0 && (
            <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 space-y-4 animate-fade-in">
                <div className="flex items-center gap-2 mb-2 border-b border-slate-100 pb-2">
                    <Layers size={16} className="text-blue-500" />
                    <h3 className="font-bold text-slate-700">Dettagli {activeSector.name}</h3>
                </div>

                {activeSector.fields.map((field, idx) => (
                    <div key={field.id}>
                        <label className="block text-sm font-semibold text-slate-500 mb-1">
                            {field.label} {field.required && <span className="text-red-500">*</span>}
                        </label>
                        
                        {field.type === 'select' ? (
                            <div className="relative">
                                <select
                                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-lg text-lg appearance-none outline-none focus:ring-2 focus:ring-blue-500"
                                    value={dynamicAnswers[field.label] || ''}
                                    onChange={(e) => handleDynamicChange(field.label, e.target.value)}
                                >
                                    <option value="">-- Seleziona --</option>
                                    {field.options?.map(opt => (
                                        <option key={opt} value={opt}>{opt}</option>
                                    ))}
                                </select>
                                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={20} />
                            </div>
                        ) : (
                            <input 
                                type={field.type === 'number' ? 'number' : 'text'}
                                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-lg text-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                value={dynamicAnswers[field.label] || ''}
                                onChange={(e) => handleDynamicChange(field.label, e.target.value)}
                                placeholder={field.type === 'number' ? '0' : '...'}
                            />
                        )}
                    </div>
                ))}
            </div>
        )}

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
                onClick={() => { setEditingId(null); setFormData({ bollaNumber: '', departure: '', destination: '' }); setDynamicAnswers({}); }}
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

          {Object.keys(groupedHistory).length === 0 ? (
              <div className="text-center py-8 text-slate-400 italic bg-white rounded-xl border border-dashed border-slate-300">
                  Nessun viaggio registrato in {monthName}
              </div>
          ) : (
              <div className="space-y-6">
                  {Object.entries(groupedHistory).map(([date, logs]) => (
                      <div key={date} className="animate-fade-in">
                          {/* Date Header */}
                          <div className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur py-2 mb-2 border-b border-slate-200 flex items-center gap-2">
                              <span className="bg-slate-800 text-white text-xs font-bold px-2 py-1 rounded">
                                  {toEuroDate(date)}
                              </span>
                          </div>

                          <div className="space-y-3">
                              {(logs as TripLog[]).map(trip => {
                                  const editable = canEdit(trip);
                                  const vehicle = availableVehicles.find(v => v.id === trip.vehicleId);
                                  const isCurrentVehicle = currentVehicle && trip.vehicleId === currentVehicle.id;
                                  
                                  return (
                                      <div key={trip.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col gap-2 relative group">
                                          {/* Row 1: Header */}
                                          <div className="flex justify-between items-start">
                                              <div className="flex items-center gap-2">
                                                  <div className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${isCurrentVehicle ? 'bg-slate-100 text-slate-500 border-slate-200' : 'bg-yellow-100 text-yellow-800 border-yellow-200'}`}>
                                                      <Truck size={10} />
                                                      {vehicle?.plate || 'Targa N.D.'}
                                                  </div>
                                                  <div className="text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded uppercase">
                                                      {trip.sector}
                                                  </div>
                                              </div>
                                          </div>
                                          
                                          {/* Row 2: Route */}
                                          <div className="flex items-center gap-2 text-slate-800 font-bold text-lg leading-tight mt-1">
                                                <span>{trip.departure}</span>
                                                <ChevronRight size={16} className="text-slate-400" />
                                                <span>{trip.destination}</span>
                                          </div>
                                          <div className="text-sm text-slate-500 flex items-center gap-2">
                                                <MapPin size={12} /> Bolla: <span className="font-mono text-slate-700 bg-slate-50 px-1 rounded border border-slate-100">{trip.bollaNumber}</span>
                                          </div>

                                          {/* Row 3: Custom Data (Dynamic Display) */}
                                          {trip.customData && Object.keys(trip.customData).length > 0 && (
                                              <div className="mt-2 bg-slate-50 p-2 rounded-lg border border-slate-100 grid grid-cols-2 gap-x-4 gap-y-1">
                                                  {Object.entries(trip.customData).map(([key, val]) => (
                                                      <div key={key} className="text-xs">
                                                          <span className="text-slate-400 font-medium">{key}: </span>
                                                          <span className="text-slate-700 font-bold">{val}</span>
                                                      </div>
                                                  ))}
                                              </div>
                                          )}

                                          {/* Row 4: Actions */}
                                          <div className="flex justify-end gap-3 mt-2 border-t border-slate-100 pt-2">
                                              {editable ? (
                                                <>
                                                  <button 
                                                    onClick={() => handleEdit(trip)} 
                                                    className="flex items-center gap-1 text-xs font-bold text-blue-600 px-3 py-1.5 bg-blue-50 rounded-lg hover:bg-blue-100"
                                                  >
                                                      <Edit2 size={12} /> MODIFICA
                                                  </button>
                                                  <button 
                                                    onClick={() => handleDelete(trip.id!, trip)} 
                                                    className="flex items-center gap-1 text-xs font-bold text-red-600 px-3 py-1.5 bg-red-50 rounded-lg hover:bg-red-100"
                                                  >
                                                      <Trash2 size={12} /> ELIMINA
                                                  </button>
                                                </>
                                              ) : (
                                                  <span className="flex items-center gap-1 text-[10px] text-slate-400 bg-slate-100 px-2 py-1 rounded">
                                                      <Lock size={10} /> BLOCCATO (24h)
                                                  </span>
                                              )}
                                          </div>
                                      </div>
                                  );
                              })}
                          </div>
                      </div>
                  ))}
              </div>
          )}
      </div>
    </div>
  );
};