import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { addLog, getLogs, deleteLog, updateLog } from '../services/db';
import { ArrowLeft, Save, Camera, Euro, Droplet, Gauge, Edit2, Trash2, History, ChevronLeft, ChevronRight, Fuel, Image as ImageIcon, X } from 'lucide-react';
import { RefuelLog } from '../types';

const DAYS_INITIALS = ['D', 'L', 'M', 'M', 'G', 'V', 'S']; // Domenica is 0

// Helper to format currency/liters while typing: "1.200,50"
const formatDecimalInput = (value: string): string => {
    let val = value.replace(/[^0-9,.]/g, '');
    val = val.replace('.', ',');
    const parts = val.split(',');
    if (parts.length > 2) {
        val = parts[0] + ',' + parts.slice(1).join('');
    }
    const split = val.split(',');
    let intPart = split[0];
    const decPart = split.length > 1 ? split[1] : null;
    intPart = intPart.replace(/\./g, '');
    intPart = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    if (decPart !== null) {
        return `${intPart},${decPart.slice(0, 2)}`;
    }
    return (value.includes(',') || value.includes('.')) ? `${intPart},` : intPart;
};

// Helper to format Integers (Km): "120.000"
const formatIntegerInput = (value: string): string => {
    let val = value.replace(/\D/g, ''); 
    return val.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};

const parseLocaleNumber = (val: string): number => {
    if (!val) return 0;
    const clean = val.replace(/\./g, '').replace(',', '.');
    const num = parseFloat(clean);
    return isNaN(num) ? 0 : num;
};

const toTitleCase = (str: string) => {
    return str.replace(/\b\w/g, char => char.toUpperCase());
};

// --- IMAGE COMPRESSION UTILS ---
const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 1024; // Resize to max width
                const scaleSize = MAX_WIDTH / img.width;
                
                // Only resize if bigger than max width
                if (scaleSize < 1) {
                    canvas.width = MAX_WIDTH;
                    canvas.height = img.height * scaleSize;
                } else {
                    canvas.width = img.width;
                    canvas.height = img.height;
                }

                const ctx = canvas.getContext('2d');
                ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
                
                // Compress to JPEG at 70% quality
                const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
                resolve(dataUrl);
            };
            img.onerror = (err) => reject(err);
        };
        reader.onerror = (err) => reject(err);
    });
};

export const RefuelForm: React.FC = () => {
  const navigate = useNavigate();
  const { user, currentVehicle } = useAuth();
  const [loading, setLoading] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // State
  const [history, setHistory] = useState<RefuelLog[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [refuelType, setRefuelType] = useState<'diesel' | 'adblue'>('diesel');
  
  // Image State
  const [receiptImage, setReceiptImage] = useState<string | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);

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

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          const file = e.target.files[0];
          setIsCompressing(true);
          try {
              const compressedBase64 = await compressImage(file);
              setReceiptImage(compressedBase64);
          } catch (err) {
              alert("Errore durante l'elaborazione dell'immagine");
              console.error(err);
          } finally {
              setIsCompressing(false);
          }
      }
  };

  const removeImage = () => {
      setReceiptImage(null);
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
      setRefuelType(log.subType || 'diesel');
      setFormData({
          stationName: log.stationName,
          liters: log.liters.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
          cost: log.cost.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
          kmAtRefuel: log.kmAtRefuel.toLocaleString('it-IT')
      });
      setSelectedDate(new Date(log.timestamp));
      // Load image if exists (mock mode support)
      setReceiptImage(log.receiptData || null);
      
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

    const payload = {
        type: 'refuel',
        subType: refuelType,
        userId: user.uid,
        vehicleId: currentVehicle.id,
        stationName: formData.stationName,
        liters: parseLocaleNumber(formData.liters),
        cost: parseLocaleNumber(formData.cost),
        kmAtRefuel: parseLocaleNumber(formData.kmAtRefuel),
        receiptUrl: null, // Placeholder for cloud url
        receiptData: receiptImage || undefined, // Base64 data
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
      
      setFormData({ ...formData, liters: '', cost: '' });
      setReceiptImage(null);
      
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

  const isDiesel = refuelType === 'diesel';
  const ringColor = isDiesel ? 'focus:ring-emerald-500' : 'focus:ring-blue-500';
  const buttonBg = isDiesel ? 'bg-emerald-600 shadow-emerald-200' : 'bg-blue-600 shadow-blue-200';
  const buttonBgEdit = isDiesel ? 'bg-teal-600 shadow-teal-200' : 'bg-indigo-600 shadow-indigo-200';

  return (
    <div className="space-y-6 pb-8">
      <div className="flex items-center gap-4 mb-2">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-slate-600 active:bg-slate-200 rounded-full">
            <ArrowLeft />
        </button>
        <div className="flex flex-col">
            <h2 className="text-2xl font-bold text-slate-800 leading-none">
                {editingId ? 'Modifica Rifornimento' : 'Nuovo Rifornimento'}
            </h2>
             {currentVehicle && <span className="text-xs text-slate-500 font-medium mt-1">Veicolo: {currentVehicle.plate}</span>}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">

        {/* REFUEL TYPE TOGGLES */}
        <div className="grid grid-cols-2 gap-4">
            <button
                type="button"
                onClick={() => setRefuelType('diesel')}
                className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all
                    ${isDiesel 
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-800 shadow-md transform scale-[1.02]' 
                        : 'bg-white border-slate-200 text-slate-400 opacity-60 hover:opacity-100'
                    }
                `}
            >
                <Fuel size={32} />
                <span className="font-bold uppercase tracking-wide">Diesel</span>
            </button>

            <button
                type="button"
                onClick={() => setRefuelType('adblue')}
                className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all
                    ${!isDiesel 
                        ? 'bg-blue-50 border-blue-500 text-blue-800 shadow-md transform scale-[1.02]' 
                        : 'bg-white border-slate-200 text-slate-400 opacity-60 hover:opacity-100'
                    }
                `}
            >
                <Droplet size={32} />
                <span className="font-bold uppercase tracking-wide">AdBlue</span>
            </button>
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
                        const selectedBg = isDiesel ? 'bg-emerald-600' : 'bg-blue-600';
                        const selectedText = isDiesel ? 'text-emerald-200' : 'text-blue-200';
                        const dotColor = isDiesel ? 'bg-emerald-500' : 'bg-blue-500';

                        return (
                            <button
                                key={i}
                                type="button"
                                onClick={() => setSelectedDate(d)}
                                className={`flex flex-col items-center justify-center w-10 h-14 rounded-lg transition-all
                                    ${isSelected 
                                        ? `${selectedBg} text-white shadow-md scale-110 z-10` 
                                        : 'bg-slate-50 text-slate-500 border border-slate-100'
                                    }
                                `}
                            >
                                <span className={`text-[10px] font-bold mb-0.5 uppercase ${isSelected ? selectedText : 'text-slate-400'}`}>
                                    {DAYS_INITIALS[d.getDay()]}
                                </span>
                                <span className={`text-lg font-bold leading-none ${isSelected ? 'text-white' : 'text-slate-700'}`}>
                                    {d.getDate()}
                                </span>
                                {isToday && !isSelected && <span className={`w-1 h-1 ${dotColor} rounded-full mt-1`}></span>}
                            </button>
                        );
                    })}
                </div>

                <button type="button" onClick={() => shiftDate(1)} className="p-2 text-slate-400 active:text-slate-700">
                    <ChevronRight size={24} />
                </button>
            </div>
        </div>

        {/* FIELDS */}
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
                    className={`w-full p-4 bg-slate-50 border border-slate-200 rounded-lg text-lg focus:ring-2 outline-none ${ringColor}`}
                />
            </div>
        </div>

        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 space-y-4">
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
                        className={`w-full pl-12 p-4 bg-slate-50 border border-slate-200 rounded-lg text-xl font-mono focus:ring-2 outline-none ${ringColor}`}
                    />
                </div>
            </div>

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
                        className={`w-full pl-12 p-4 bg-slate-50 border border-slate-200 rounded-lg text-xl font-mono focus:ring-2 outline-none ${ringColor}`}
                    />
                </div>
            </div>
            
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
                        className={`w-full pl-12 p-4 bg-slate-50 border border-slate-200 rounded-lg text-xl font-mono focus:ring-2 outline-none ${ringColor}`}
                    />
                </div>
            </div>
        </div>

        {/* RECEIPT UPLOAD SECTION */}
        <div className={`rounded-xl shadow-sm border-2 overflow-hidden transition-all ${receiptImage ? 'bg-white border-solid border-slate-200' : 'bg-slate-50 border-dashed border-slate-300'}`}>
            {receiptImage ? (
                <div className="relative p-2">
                    <img src={receiptImage} alt="Scontrino" className="w-full h-48 object-cover rounded-lg" />
                    <button 
                        type="button" 
                        onClick={removeImage}
                        className="absolute top-4 right-4 bg-red-600 text-white p-2 rounded-full shadow-lg"
                    >
                        <X size={20} />
                    </button>
                    <div className="px-2 pt-2 text-center text-xs text-green-600 font-bold flex items-center justify-center gap-1">
                        <ImageIcon size={12} /> Scontrino allegato
                    </div>
                </div>
            ) : (
                <div className="relative">
                    <input 
                        type="file" 
                        accept="image/*" 
                        capture="environment" // Forces rear camera on mobile
                        onChange={handleImageUpload}
                        className="absolute inset-0 w-full h-full opacity-0 z-10 cursor-pointer" 
                    />
                    <div className="flex flex-col items-center justify-center py-8 gap-3">
                        <div className={`${isDiesel ? 'bg-emerald-100' : 'bg-blue-100'} p-4 rounded-full shadow-sm`}>
                            {isCompressing ? (
                                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-slate-600"></div>
                            ) : (
                                <Camera className={isDiesel ? 'text-emerald-600' : 'text-blue-600'} size={28} />
                            )}
                        </div>
                        <div className="text-center">
                            <span className="block text-sm font-bold text-slate-700">FOTOGRAFA SCONTRINO</span>
                            <span className="text-xs text-slate-400">Clicca qui per aprire la fotocamera</span>
                        </div>
                    </div>
                </div>
            )}
        </div>

        <button
            type="submit"
            disabled={loading || isCompressing}
            className={`w-full text-white p-4 rounded-xl font-bold text-lg shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2
                ${editingId ? buttonBgEdit : buttonBg}
                ${(loading || isCompressing) ? 'opacity-70 cursor-not-allowed' : ''}
            `}
        >
            {loading ? 'Salvataggio...' : (
                <>
                    <Save size={20} /> {editingId ? `AGGIORNA ${isDiesel ? 'DIESEL' : 'ADBLUE'}` : `REGISTRA ${isDiesel ? 'DIESEL' : 'ADBLUE'}`}
                </>
            )}
        </button>
        
        {editingId && (
            <button 
                type="button" 
                onClick={() => { setEditingId(null); setFormData({ stationName: '', liters: '', cost: '', kmAtRefuel: '' }); setReceiptImage(null); }}
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
              Storico: <span className="text-slate-600 capitalize">{monthName}</span>
          </h3>

          {filteredHistory.length === 0 ? (
              <div className="text-center py-8 text-slate-400 italic bg-white rounded-xl border border-dashed border-slate-300">
                  Nessun rifornimento in {monthName}
              </div>
          ) : (
              <div className="space-y-3">
                  {filteredHistory.map(refuel => {
                      const isRefuelDiesel = !refuel.subType || refuel.subType === 'diesel';
                      const badgeColor = isRefuelDiesel ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800';

                      return (
                          <div key={refuel.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col gap-2 relative">
                              {/* Header */}
                              <div className="flex justify-between items-start">
                                   <div className="flex items-center gap-2">
                                       <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${badgeColor}`}>
                                            {isRefuelDiesel ? 'Diesel' : 'AdBlue'}
                                       </span>
                                       <div className="font-bold text-slate-800">{refuel.stationName}</div>
                                   </div>
                                   <div className="flex flex-col items-end">
                                       <div className="text-xs text-slate-400 font-medium">{formatDate(refuel.timestamp)}</div>
                                       {refuel.receiptData && <ImageIcon size={14} className="text-green-500 mt-1" />}
                                   </div>
                              </div>
                              
                              {/* Stats */}
                              <div className="flex gap-4 my-1">
                                    <div className={`px-2 py-1 rounded-md font-bold text-sm ${isRefuelDiesel ? 'bg-emerald-50 text-emerald-800' : 'bg-blue-50 text-blue-800'}`}>
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
                      );
                  })}
              </div>
          )}
      </div>

    </div>
  );
};