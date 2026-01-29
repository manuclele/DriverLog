import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { addLog, getLogs, deleteLog, updateLog } from '../services/db';
import { ArrowLeft, Save, Wrench, Disc, Edit2, Trash2, History, ChevronLeft, ChevronRight, AlertTriangle, Hammer, ChevronDown, FileText, Info, Lock } from 'lucide-react';
import { MaintenanceLog } from '../types';

const DAYS_INITIALS = ['D', 'L', 'M', 'M', 'G', 'V', 'S'];
const EDIT_LIMIT_MS = 24 * 60 * 60 * 1000; // 24 Hours

// --- STATIC DATA CONFIGURATION ---

const MECHANIC_OPTIONS = [
    "Tagliando Completo",
    "Sostituzione Batterie",
    "Sostituzione Torpless (2° Asse)",
    "Sostituzione Freni / Pastiglie",
    "Sostituzione Frizione",
    "Riparazione Impianto Elettrico",
    "Revisione Ministeriale",
    "Rabbocco Olio / Liquidi",
    "Altro / Specificare..."
];

const TYRE_OPTIONS = [
    "Pneumatici Nuovi (1° Asse)",
    "Pneumatici Nuovi (2° Asse)",
    "Pneumatici Nuovi (3° Asse)",
    "Pneumatici Nuovi (Tutti)",
    "Inversione Pneumatici",
    "Riparazione Foratura",
    "Serraggio Bulloni",
    "Altro / Specificare..."
];

// Mock Workshops List with Provinces
// In a real scenario, this would be fetched from a 'workshops' collection
const WORKSHOPS_LIST = [
    { name: "Officina Autorizzata Rossi", province: "MI" },
    { name: "Truck Service Milano Est", province: "MI" },
    { name: "Gommista Express Linate", province: "MI" },
    { name: "Diesel Center Bergamo", province: "BG" },
    { name: "Elettrauto F.lli Bianchi", province: "BS" },
    { name: "Officina Grandi Mezzi", province: "RM" },
    { name: "Centro Gomme Roma Sud", province: "RM" },
    { name: "Napoli Truck Repair", province: "NA" },
    { name: "Vesuvio Service", province: "NA" },
    { name: "Torino Trucks", province: "TO" },
];

// Group workshops by province for the dropdown
const groupedWorkshops = WORKSHOPS_LIST.reduce((acc, curr) => {
    (acc[curr.province] = acc[curr.province] || []).push(curr);
    return acc;
}, {} as Record<string, typeof WORKSHOPS_LIST>);

const sortedProvinces = Object.keys(groupedWorkshops).sort();

const toTitleCase = (str: string) => {
    return str.replace(/\b\w/g, char => char.toUpperCase());
};

export const MaintenanceForm: React.FC = () => {
  const navigate = useNavigate();
  const { user, currentVehicle, availableVehicles } = useAuth();
  const [loading, setLoading] = useState(false);
  
  // State
  const [history, setHistory] = useState<MaintenanceLog[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  
  // LOGIC: Maintenance Type
  const [maintType, setMaintType] = useState<'mechanic' | 'tyres'>('mechanic');
  
  // LOGIC: Target Vehicle
  const [targetVehicleId, setTargetVehicleId] = useState<string>('');

  const [formData, setFormData] = useState({
    workshopSelect: '',
    workshopCustom: '',
    descriptionSelect: '',
    descriptionCustom: '',
    notes: '' 
  });

  useEffect(() => {
      if (user) {
          loadHistory();
      }
      if (currentVehicle) {
          setTargetVehicleId(currentVehicle.id);
      }
  }, [user, currentVehicle]);

  // Reset dropdown when type changes
  useEffect(() => {
     if (!editingId) {
         setFormData(prev => ({ ...prev, descriptionSelect: '', descriptionCustom: '' }));
     }
  }, [maintType]);

  const loadHistory = async () => {
      if (!user) return;
      const logs = await getLogs(user.uid, 'maintenance', 50); 
      setHistory(logs as MaintenanceLog[]);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    let value = e.target.value;
    const name = e.target.name;

    if (name === 'workshopCustom') {
        value = toTitleCase(value);
    } 
    if (name === 'descriptionCustom' || name === 'notes') {
        value = value.charAt(0).toUpperCase() + value.slice(1);
    }

    setFormData({ ...formData, [name]: value });
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

  const canEdit = (log: MaintenanceLog) => {
      if (user?.role === 'master') return true;
      const createdAt = new Date(log.createdAt).getTime();
      return (Date.now() - createdAt) < EDIT_LIMIT_MS;
  };

  const handleEdit = (log: MaintenanceLog) => {
      if (!canEdit(log)) {
          alert("Tempo massimo per le modifiche scaduto (24h). Contatta il Master.");
          return;
      }
      setEditingId(log.id!);
      setMaintType(log.subType);
      setTargetVehicleId(log.vehicleId);
      
      // 1. Logic for Description
      const options = log.subType === 'mechanic' ? MECHANIC_OPTIONS : TYRE_OPTIONS;
      const isStandardDesc = options.includes(log.description);

      // 2. Logic for Workshop
      const isStandardWorkshop = WORKSHOPS_LIST.some(w => w.name === log.workshop);

      setFormData({
          workshopSelect: isStandardWorkshop ? log.workshop : 'Altra Officina...',
          workshopCustom: isStandardWorkshop ? '' : log.workshop,
          descriptionSelect: isStandardDesc ? log.description : 'Altro / Specificare...',
          descriptionCustom: isStandardDesc ? '' : log.description,
          notes: log.notes || ''
      });
      
      setSelectedDate(new Date(log.timestamp));
      window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: string, log: MaintenanceLog) => {
      if (!canEdit(log)) return;
      if (!confirm("Eliminare questa registrazione?")) return;
      await deleteLog('logs', id);
      setHistory(prev => prev.filter(item => item.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !targetVehicleId) {
        alert("Seleziona un veicolo");
        return;
    }
    
    // Validate Description
    let finalDescription = formData.descriptionSelect;
    if (formData.descriptionSelect === 'Altro / Specificare...') {
        if (!formData.descriptionCustom.trim()) {
            alert("Specificare la descrizione dell'intervento");
            return;
        }
        finalDescription = formData.descriptionCustom;
    } else if (!finalDescription) {
        alert("Selezionare un tipo di intervento");
        return;
    }

    // Validate Workshop
    let finalWorkshop = formData.workshopSelect;
    if (formData.workshopSelect === 'Altra Officina...') {
        if (!formData.workshopCustom.trim()) {
            alert("Inserire il nome della nuova officina");
            return;
        }
        finalWorkshop = formData.workshopCustom;
    } else if (!finalWorkshop) {
        alert("Selezionare l'officina");
        return;
    }

    setLoading(true);
    
    const isToday = selectedDate.toDateString() === new Date().toDateString();
    const timestamp = isToday ? Date.now() : selectedDate.setHours(12, 0, 0, 0);

    const payload = {
        type: 'maintenance',
        subType: maintType,
        userId: user.uid,
        vehicleId: targetVehicleId,
        description: finalDescription,
        workshop: finalWorkshop,
        notes: formData.notes,
        timestamp: timestamp
    };

    try {
      if (editingId) {
          await updateLog('logs', editingId, payload);
          setEditingId(null);
          setHistory(prev => prev.map(item => item.id === editingId ? { ...item, ...payload } as MaintenanceLog : item));
      } else {
          const docRef = await addLog('logs', payload);
          setHistory(prev => [{ id: docRef.id, ...payload, createdAt: new Date().toISOString() } as MaintenanceLog, ...prev]);
      }
      
      setFormData({ 
          workshopSelect: '', workshopCustom: '', 
          descriptionSelect: '', descriptionCustom: '', 
          notes: '' 
      });
      // Don't reset vehicle ID

    } catch (error) {
      alert("Errore salvataggio");
    } finally {
        setLoading(false);
    }
  };

  const monthName = selectedDate.toLocaleString('it-IT', { month: 'long', year: 'numeric' });
  const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  const formatDate = (ts: number) => new Date(ts).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' });

  const filteredHistory = history.filter(log => {
      const logDate = new Date(log.timestamp);
      return logDate.getMonth() === selectedDate.getMonth() && logDate.getFullYear() === selectedDate.getFullYear();
  });

  const isMechanic = maintType === 'mechanic';
  const currentOptions = isMechanic ? MECHANIC_OPTIONS : TYRE_OPTIONS;
  
  // Theme Colors
  const buttonBg = isMechanic ? 'bg-orange-500 shadow-orange-200' : 'bg-slate-600 shadow-slate-200';
  const buttonBgEdit = isMechanic ? 'bg-orange-600' : 'bg-slate-700';

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-2">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-slate-600 active:bg-slate-200 rounded-full">
            <ArrowLeft />
        </button>
        <div className="flex flex-col">
            <h2 className="text-2xl font-bold text-slate-800 leading-none">
                {editingId ? 'Modifica Manutenzione' : 'Registro Manutenzione'}
            </h2>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">

        {/* VEHICLE SELECTOR */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
             <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-2">
                 <AlertTriangle size={14} className="text-orange-500"/>
                 Veicolo Oggetto dell'intervento
             </label>
             <select
                value={targetVehicleId}
                onChange={(e) => setTargetVehicleId(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-300 rounded-lg font-bold text-slate-800 text-lg outline-none focus:ring-2 focus:ring-blue-500"
             >
                 <option value="" disabled>-- Seleziona Veicolo --</option>
                 {availableVehicles.map(v => (
                     <option key={v.id} value={v.id}>
                         {v.plate} - {v.code}
                     </option>
                 ))}
             </select>
             {targetVehicleId && targetVehicleId !== currentVehicle?.id && (
                 <p className="text-xs text-orange-600 mt-2 font-medium">
                     Stai registrando per un veicolo diverso da quello in uso.
                 </p>
             )}
        </div>

        {/* TYPE TOGGLES */}
        <div className="grid grid-cols-2 gap-4">
            <button
                type="button"
                onClick={() => setMaintType('mechanic')}
                className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all
                    ${isMechanic 
                        ? 'bg-orange-50 border-orange-500 text-orange-800 shadow-md transform scale-[1.02]' 
                        : 'bg-white border-slate-200 text-slate-400 opacity-60 hover:opacity-100'
                    }
                `}
            >
                <Wrench size={32} />
                <span className="font-bold uppercase tracking-wide">Meccanica</span>
            </button>

            <button
                type="button"
                onClick={() => setMaintType('tyres')}
                className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all
                    ${!isMechanic 
                        ? 'bg-slate-100 border-slate-600 text-slate-800 shadow-md transform scale-[1.02]' 
                        : 'bg-white border-slate-200 text-slate-400 opacity-60 hover:opacity-100'
                    }
                `}
            >
                <Disc size={32} />
                <span className="font-bold uppercase tracking-wide">Pneumatici</span>
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
                        const selectedBg = isMechanic ? 'bg-orange-500' : 'bg-slate-600';
                        const selectedText = isMechanic ? 'text-orange-100' : 'text-slate-200';

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
                                {isToday && !isSelected && <span className={`w-1 h-1 ${isMechanic ? 'bg-orange-500' : 'bg-slate-600'} rounded-full mt-1`}></span>}
                            </button>
                        );
                    })}
                </div>

                <button type="button" onClick={() => shiftDate(1)} className="p-2 text-slate-400 active:text-slate-700">
                    <ChevronRight size={24} />
                </button>
            </div>
        </div>

        {/* INPUTS */}
        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 space-y-4">
            
            {/* WORKSHOP DROPDOWN */}
            <div>
                <label className="block text-sm font-semibold text-slate-500 mb-1">Officina / Esecutore</label>
                <div className="relative">
                     <select
                        name="workshopSelect"
                        value={formData.workshopSelect}
                        onChange={handleChange}
                        className={`w-full p-4 pl-12 pr-10 appearance-none bg-slate-50 border border-slate-200 rounded-lg text-lg font-bold text-slate-800 outline-none focus:ring-2 ${isMechanic ? 'focus:ring-orange-200' : 'focus:ring-slate-200'}`}
                    >
                        <option value="" disabled>-- Seleziona Officina --</option>
                        {sortedProvinces.map(prov => (
                            <optgroup key={prov} label={`Provincia di ${prov}`}>
                                {groupedWorkshops[prov].map((w, idx) => (
                                    <option key={`${prov}-${idx}`} value={w.name}>{w.name}</option>
                                ))}
                            </optgroup>
                        ))}
                        <option value="Altra Officina..." className="font-bold text-blue-600">
                            + Altra Officina (Inserimento Manuale)
                        </option>
                    </select>
                    <Hammer className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={20} />
                </div>
            </div>

            {/* CUSTOM WORKSHOP INPUT */}
            {formData.workshopSelect === 'Altra Officina...' && (
                <div className="animate-fade-in-down space-y-2">
                    <label className="block text-sm font-semibold text-slate-500">Nome Nuova Officina</label>
                    <input
                        type="text"
                        name="workshopCustom"
                        placeholder="Inserisci nome officina..."
                        value={formData.workshopCustom}
                        onChange={handleChange}
                        className={`w-full p-4 bg-white border-2 border-slate-300 rounded-lg text-lg focus:ring-2 outline-none ${isMechanic ? 'focus:ring-orange-200 focus:border-orange-400' : 'focus:ring-slate-200 focus:border-slate-400'}`}
                    />
                    <div className="bg-yellow-50 text-yellow-800 text-xs p-3 rounded-lg border border-yellow-200 flex gap-2 items-start">
                        <Info size={16} className="mt-0.5 flex-shrink-0" />
                        <span>
                            <strong>Nota:</strong> Hai selezionato un'officina non in elenco.
                            Ricorda di segnalare questa nuova anagrafica al Master per l'inserimento ufficiale.
                        </span>
                    </div>
                </div>
            )}

            {/* INTERVENTION TYPE DROPDOWN */}
            <div>
                <label className="block text-sm font-semibold text-slate-500 mb-1">Tipo Intervento</label>
                <div className="relative">
                    <select
                        name="descriptionSelect"
                        value={formData.descriptionSelect}
                        onChange={handleChange}
                        className={`w-full p-4 pr-10 appearance-none bg-slate-50 border border-slate-200 rounded-lg text-lg font-medium focus:ring-2 outline-none ${isMechanic ? 'focus:ring-orange-200' : 'focus:ring-slate-200'}`}
                    >
                        <option value="" disabled>-- Seleziona Intervento --</option>
                        {currentOptions.map((opt, i) => (
                            <option key={i} value={opt}>{opt}</option>
                        ))}
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={20} />
                </div>
            </div>

            {/* CUSTOM DESCRIPTION (Shown only if 'Altro' is selected) */}
            {formData.descriptionSelect === 'Altro / Specificare...' && (
                <div className="animate-fade-in-down">
                    <label className="block text-sm font-semibold text-slate-500 mb-1">Specificare Dettagli</label>
                    <input
                        type="text"
                        name="descriptionCustom"
                        placeholder="Descrivi l'intervento effettuato..."
                        value={formData.descriptionCustom}
                        onChange={handleChange}
                        className={`w-full p-4 bg-white border-2 border-slate-300 rounded-lg text-lg focus:ring-2 outline-none ${isMechanic ? 'focus:ring-orange-200 focus:border-orange-400' : 'focus:ring-slate-200 focus:border-slate-400'}`}
                    />
                </div>
            )}
            
            {/* NOTES (Optional) */}
            <div>
                <label className="block text-sm font-semibold text-slate-500 mb-1">Note (Opzionale)</label>
                <div className="relative">
                    <FileText className="absolute left-4 top-4 text-slate-400" size={20} />
                    <textarea
                        name="notes"
                        rows={2}
                        placeholder="Es. Richiesta verifica tra 5000km..."
                        value={formData.notes}
                        onChange={handleChange}
                        className={`w-full pl-12 p-4 bg-slate-50 border border-slate-200 rounded-lg text-lg focus:ring-2 outline-none ${isMechanic ? 'focus:ring-orange-200' : 'focus:ring-slate-200'}`}
                    />
                </div>
            </div>
        </div>

        <button
            type="submit"
            disabled={loading}
            className={`w-full text-white p-4 rounded-xl font-bold text-lg shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2
                ${editingId ? buttonBgEdit : buttonBg}
            `}
        >
            {loading ? 'Salvataggio...' : (
                <>
                    <Save size={20} /> {editingId ? 'AGGIORNA REGISTRAZIONE' : 'REGISTRA INTERVENTO'}
                </>
            )}
        </button>
        
        {editingId && (
            <button 
                type="button" 
                onClick={() => { setEditingId(null); setFormData({ workshopSelect: '', workshopCustom: '', descriptionSelect: '', descriptionCustom: '', notes: '' }); }}
                className="w-full py-2 text-slate-500 text-sm underline"
            >
                Annulla Modifica
            </button>
        )}

      </form>

      {/* HISTORY */}
      <div className="mt-8 pt-6 border-t border-slate-200">
          <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <History className="text-slate-400" size={20} />
              Storico Interventi: <span className="text-slate-600 capitalize">{monthName}</span>
          </h3>

          {filteredHistory.length === 0 ? (
              <div className="text-center py-8 text-slate-400 italic bg-white rounded-xl border border-dashed border-slate-300">
                  Nessuna manutenzione registrata in {monthName}
              </div>
          ) : (
              <div className="space-y-3">
                  {filteredHistory.map(log => {
                      const isLogMechanic = log.subType === 'mechanic';
                      const badgeColor = isLogMechanic ? 'bg-orange-100 text-orange-800' : 'bg-slate-200 text-slate-800';
                      const vehicle = availableVehicles.find(v => v.id === log.vehicleId);
                      const editable = canEdit(log);

                      return (
                          <div key={log.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col gap-2 relative">
                              <div className="flex justify-between items-start">
                                   <div className="flex items-center gap-2">
                                       <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${badgeColor}`}>
                                            {isLogMechanic ? 'Meccanica' : 'Pneumatici'}
                                       </span>
                                       <span className="text-xs font-bold text-slate-500 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                                           {vehicle?.plate || 'Targa N.D.'}
                                       </span>
                                   </div>
                                   <div className="text-xs text-slate-400 font-medium">{formatDate(log.timestamp)}</div>
                              </div>
                              
                              <p className="text-lg text-slate-800 font-bold leading-tight my-1">
                                  {log.description}
                              </p>

                              <div className="flex items-center gap-2 text-sm text-slate-500">
                                  <Hammer size={14} />
                                  <span className="font-medium">{log.workshop}</span>
                              </div>
                              
                              {log.notes && (
                                  <div className="mt-2 bg-slate-50 p-2 rounded-lg border border-slate-100 flex gap-2">
                                      <FileText size={14} className="text-slate-400 flex-shrink-0 mt-0.5" />
                                      <p className="text-xs text-slate-600 italic leading-relaxed">
                                          {log.notes}
                                      </p>
                                  </div>
                              )}

                              <div className="flex justify-end gap-3 mt-2 border-t border-slate-50 pt-2">
                                  {editable ? (
                                    <>
                                      <button 
                                        onClick={() => handleEdit(log)} 
                                        className="flex items-center gap-1 text-xs font-bold text-blue-600 px-3 py-1.5 bg-blue-50 rounded-lg hover:bg-blue-100"
                                      >
                                          <Edit2 size={12} /> MODIFICA
                                      </button>
                                      <button 
                                        onClick={() => handleDelete(log.id!, log)} 
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
          )}
      </div>

    </div>
  );
};