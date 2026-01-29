import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { addLog, getLogs, deleteLog, updateLog } from '../services/db';
import { ArrowLeft, Save, Camera, Euro, Droplet, Gauge, Edit2, Trash2, History, ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { RefuelLog } from '../types';

const DAYS_INITIALS = ['D', 'L', 'M', 'M', 'G', 'V', 'S']; // Domenica is 0

// Helper to format currency/liters while typing: "1.200,50"
const formatDecimalInput = (value: string): string => {
    // 1. Allow only digits, comma, dot
    let val = value.replace(/[^0-9,.]/g, '');
    
    // 2. Normalize dot to comma for Italian standard
    val = val.replace('.', ',');

    // 3. Prevent multiple commas
    const parts = val.split(',');
    if (parts.length > 2) {
        val = parts[0] + ',' + parts.slice(1).join('');
    }

    // 4. Split Integer and Decimal part
    const split = val.split(',');
    let intPart = split[0];
    const decPart = split.length > 1 ? split[1] : null;

    // 5. Format Integer part with thousands separator (dot)
    // Remove existing dots first to re-calculate
    intPart = intPart.replace(/\./g, '');
    // Add dots every 3 digits
    intPart = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");

    if (decPart !== null) {
        // Limit decimals to 2 chars
        return `${intPart},${decPart.slice(0, 2)}`;
    }
    
    // If user typed a comma/dot, ensure it stays
    return (value.includes(',') || value.includes('.')) ? `${intPart},` : intPart;
};

// Helper to format Integers (Km): "120.000"
const formatIntegerInput = (value: string): string => {
    let val = value.replace(/\D/g, ''); // Remove all non-digits
    return val.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};

// Parse string "1.200,50" -> number 1200.50
const parseLocaleNumber = (val: string): number => {
    if (!val) return 0;
    // Remove thousands separator (dot) and replace decimal comma with dot
    const clean = val.replace(/\./g, '').replace(',', '.');
    const num = parseFloat(clean);
    return isNaN(num) ? 0 : num;
};

// Helper for Title Case
const toTitleCase = (str: string) => {
    return str.replace(/\b\w/g, char => char.toUpperCase());
};

export const RefuelForm: React.FC = () => {
  const navigate = useNavigate();
  const { user, currentVehicle } = useAuth();
  const [loading, setLoading] = useState(false);
  
  // Input Refs for Navigation
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // History State
  const [history, setHistory] = useState<RefuelLog[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Date State
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const [formData, setFormData] = useState({
    stationName: '',
    liters: '',
    cost: '',
    kmAtRefuel: ''
  });

  useEffect(() => {
      if (user) {
          loadHistory();
      }
  }, [user]);

  const loadHistory = async () => {
      if (!user) return;
      const logs = await getLogs(user.uid, 'refuel', 50); 
      setHistory(logs as RefuelLog[]);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;
    const name = e.target.name;

    if (name === 'stationName') {
        value = toTitleCase(value);
    } 
    else if (name === 'liters' || name === 'cost') {
        value = formatDecimalInput(value);
    } 
    else if (name === 'kmAtRefuel') {
        value = formatIntegerInput(value);
    }

    setFormData({ ...formData, [name]: value });
  };

  // Handle Enter Key Navigation
  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const nextInput = inputRefs.current[index + 1];
      if (nextInput) {
        nextInput.focus();
      } else {
        // Last input submit
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

  const handleEdit = (log: RefuelLog) => {
      setEditingId(log.id!);
      setFormData({
          stationName: log.stationName,
          // Format numbers back to locale string for editing
          liters: log.liters.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
          cost: log.cost.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
          kmAtRefuel: log.kmAtRefuel.toLocaleString('it-IT')
      });
      // Set the date from the log
      setSelectedDate(new Date(log.timestamp));
      window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: string) => {
      if (!confirm("Eliminare questo rifornimento?")) return;
      await deleteLog('logs', id);
      setHistory(prev => prev.filter(item => item.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !currentVehicle) {
        alert("Errore veicolo");
        return;
    }
    setLoading(true);
    
    const isToday = selectedDate.toDateString() === new Date().toDateString();
    const timestamp = isToday ? Date.now() : selectedDate.setHours(12, 0, 0, 0);

    // Parse formatted strings back to numbers
    const payload = {
        type: 'refuel',
        userId: user.uid,
        vehicleId: currentVehicle.id,
        stationName: formData.stationName,
        liters: parseLocaleNumber(formData.liters),
        cost: parseLocaleNumber(formData.cost),
        kmAtRefuel: parseLocaleNumber(formData.kmAtRefuel),
        receiptUrl: null,
        timestamp: timestamp
    };

    try {
      if (editingId) {
          await updateLog('logs', editingId, payload);
          setEditingId(null);
          setHistory(prev => prev.map(item => item.id === editingId ? { ...item, ...payload } as RefuelLog : item));
      } else {
          const docRef = await addLog('logs', payload);
          setHistory(prev => [{ id: docRef.id, ...payload, createdAt: new Date().toISOString() } as RefuelLog, ...prev]);
      }
      
      // Reset
      setFormData({ stationName: '', liters: '', cost: '', kmAtRefuel: '' });
      
      // Auto-focus first field for next entry
      setTimeout(() => {
          inputRefs.current[0]?.focus();
      }, 100);

    } catch (error) {
      alert("Errore salvataggio");
    } finally {
        setLoading(false);
    }
  };

  const monthName = selectedDate.toLocaleString('it-IT', { month: 'long', year: 'numeric' });
  const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  const formatDate = (ts: number) => new Date(ts).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

  const filteredHistory = history.filter(log => {
      const logDate = new Date(log.timestamp);
      return logDate.getMonth() === selectedDate.getMonth() && logDate.getFullYear() === selectedDate.getFullYear();
  });

  return (
    <div className="space-y-6 pb-8">
      <div className="flex items-center gap-4 mb-2">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-slate-600 active:bg-slate-200 rounded-full">
            <ArrowLeft />
        </button>
        <div className="flex flex-col">
            <h2 className="text-2xl font-bold text-slate-800 leading-none">
                {editingId ? 'Modifica Rifornimento' : 'Rifornimento'}
            </h2>
             {currentVehicle && <span className="text-xs text-slate-500 font-medium mt-1">Veicolo: {currentVehicle.plate}</span>}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        
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
                                        ? 'bg-emerald-600 text-white shadow-md scale-110 z-10' 
                                        : 'bg-slate-50 text-slate-500 border border-slate-100'
                                    }
                                `}
                            >
                                <span className={`text-[10px] font-bold mb-0.5 uppercase ${isSelected ? 'text-emerald-200' : 'text-slate-400'}`}>
                                    {DAYS_INITIALS[d.getDay()]}
                                </span>
                                <span className={`text-lg font-bold leading-none ${isSelected ? 'text-white' : 'text-slate-700'}`}>
                                    {d.getDate()}
                                </span>
                                {isToday && !isSelected && <span className="w-1 h-1 bg-emerald-500 rounded-full mt-1"></span>}
                            </button>
                        );
                    })}
                </div>

                <button type="button" onClick={() => shiftDate(1)} className="p-2 text-slate-400 active:text-slate-700">
                    <ChevronRight size={24} />
                </button>
            </div>
        </div>

        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 space-y-4">
            <div>
                <label className="block text-sm font-semibold text-slate-500 mb-1">Distributore</label>
                <input
                    ref={el => { if (el) inputRefs.current[0] = el; }}
                    type="text"
                    name="stationName"
                    required
                    autoCapitalize="words"
                    placeholder="Es. Eni Station - Km 44"
                    value={formData.stationName}
                    onChange={handleChange}
                    onKeyDown={(e) => handleKeyDown(e, 0)}
                    enterKeyHint="next"
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-lg text-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                />
            </div>
        </div>

        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 space-y-4">
             {/* Litri */}
            <div className="relative">
                <label className="block text-sm font-semibold text-slate-500 mb-1">Totale Litri</label>
                <div className="relative">
                    <Droplet className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input
                        ref={el => { if (el) inputRefs.current[1] = el; }}
                        type="text"
                        inputMode="decimal"
                        name="liters"
                        required
                        placeholder="0,00"
                        value={formData.liters}
                        onChange={handleChange}
                        onKeyDown={(e) => handleKeyDown(e, 1)}
                        enterKeyHint="next"
                        className="w-full pl-12 p-4 bg-slate-50 border border-slate-200 rounded-lg text-xl font-mono focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                </div>
            </div>

            {/* Euro */}
            <div className="relative">
                <label className="block text-sm font-semibold text-slate-500 mb-1">Importo (€)</label>
                <div className="relative">
                    <Euro className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input
                        ref={el => { if (el) inputRefs.current[2] = el; }}
                        type="text"
                        inputMode="decimal"
                        name="cost"
                        required
                        placeholder="0,00"
                        value={formData.cost}
                        onChange={handleChange}
                        onKeyDown={(e) => handleKeyDown(e, 2)}
                        enterKeyHint="next"
                        className="w-full pl-12 p-4 bg-slate-50 border border-slate-200 rounded-lg text-xl font-mono focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                </div>
            </div>
            
             {/* Km */}
             <div className="relative">
                <label className="block text-sm font-semibold text-slate-500 mb-1">Km Totali Attuali</label>
                <div className="relative">
                    <Gauge className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input
                        ref={el => { if (el) inputRefs.current[3] = el; }}
                        type="text"
                        inputMode="numeric"
                        name="kmAtRefuel"
                        required
                        placeholder="Es. 120.500"
                        value={formData.kmAtRefuel}
                        onChange={handleChange}
                        onKeyDown={(e) => handleKeyDown(e, 3)}
                        enterKeyHint="done"
                        className="w-full pl-12 p-4 bg-slate-50 border border-slate-200 rounded-lg text-xl font-mono focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                </div>
            </div>
        </div>

        {/* Receipt Upload Placeholder */}
        {!editingId && (
            <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 border-dashed border-2 flex flex-col items-center justify-center gap-3 py-8 cursor-pointer active:bg-slate-50 transition-colors relative">
                <input type="file" accept="image/*" className="absolute inset-0 opacity-0 w-full h-full" />
                <div className="bg-emerald-100 p-3 rounded-full">
                    <Camera className="text-emerald-600" size={24} />
                </div>
                <span className="text-sm font-medium text-slate-600">Fotografa Scontrino (Opzionale)</span>
            </div>
        )}

        <button
            type="submit"
            disabled={loading}
            className={`w-full text-white p-4 rounded-xl font-bold text-lg shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2
                ${editingId ? 'bg-teal-600 shadow-teal-200' : 'bg-emerald-600 shadow-emerald-200'}
            `}
        >
            {loading ? 'Salvataggio...' : (
                <>
                    <Save size={20} /> {editingId ? 'AGGIORNA RIFORNIMENTO' : 'REGISTRA RIFORNIMENTO'}
                </>
            )}
        </button>
        
        {editingId && (
            <button 
                type="button" 
                onClick={() => { setEditingId(null); setFormData({ stationName: '', liters: '', cost: '', kmAtRefuel: '' }); }}
                className="w-full py-2 text-slate-500 text-sm underline"
            >
                Annulla Modifica
            </button>
        )}

      </form>

      {/* REFUEL HISTORY */}
      <div className="mt-8 pt-6 border-t border-slate-200">
          <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <History className="text-slate-400" size={20} />
              Rifornimenti: <span className="text-slate-600 capitalize">{monthName}</span>
          </h3>

          {filteredHistory.length === 0 ? (
              <div className="text-center py-8 text-slate-400 italic bg-white rounded-xl border border-dashed border-slate-300">
                  Nessun rifornimento in {monthName}
              </div>
          ) : (
              <div className="space-y-3">
                  {filteredHistory.map(refuel => (
                      <div key={refuel.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col gap-2 relative">
                          {/* Header */}
                          <div className="flex justify-between items-start">
                               <div className="font-bold text-slate-800 text-lg">{refuel.stationName}</div>
                               <div className="text-xs text-slate-400 font-medium">{formatDate(refuel.timestamp)}</div>
                          </div>
                          
                          {/* Stats */}
                          <div className="flex gap-4 my-1">
                                <div className="bg-emerald-50 px-2 py-1 rounded-md text-emerald-800 font-bold text-sm">
                                    {refuel.liters.toLocaleString('it-IT', { minimumFractionDigits: 2 })} L
                                </div>
                                <div className="bg-slate-100 px-2 py-1 rounded-md text-slate-700 font-bold text-sm">
                                    € {refuel.cost.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                                </div>
                                <div className="text-slate-400 text-sm flex items-center">
                                    {refuel.kmAtRefuel.toLocaleString('it-IT')} km
                                </div>
                          </div>

                          {/* Actions */}
                          <div className="flex justify-end gap-3 mt-2 border-t border-slate-50 pt-2">
                              <button 
                                onClick={() => handleEdit(refuel)} 
                                className="flex items-center gap-1 text-xs font-bold text-blue-600 px-3 py-1.5 bg-blue-50 rounded-lg hover:bg-blue-100"
                              >
                                  <Edit2 size={12} /> MODIFICA
                              </button>
                              <button 
                                onClick={() => handleDelete(refuel.id!)} 
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