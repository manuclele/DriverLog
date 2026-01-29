import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getFuelStations, addFuelStation, deleteFuelStation } from '../services/db';
import { FuelStation } from '../types';
import { ArrowLeft, Plus, Trash2, Fuel, CreditCard, Building2 } from 'lucide-react';

export const FuelStationsManager: React.FC = () => {
    const navigate = useNavigate();
    const [stations, setStations] = useState<FuelStation[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    
    // Form State
    const [newName, setNewName] = useState('');
    const [isPartner, setIsPartner] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        const data = await getFuelStations();
        setStations(data);
        setLoading(false);
    };

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newName) {
            alert("Inserisci il nome del distributore");
            return;
        }

        try {
            await addFuelStation({
                name: newName.replace(/\b\w/g, c => c.toUpperCase()),
                isPartner: isPartner
            });
            setNewName('');
            setIsPartner(true);
            setShowForm(false);
            loadData(); // Refresh list
        } catch (error) {
            alert("Errore nell'aggiunta");
        }
    };

    const handleDelete = async (id: string) => {
        if (confirm("Eliminare definitivamente questo distributore?")) {
            await deleteFuelStation(id);
            setStations(prev => prev.filter(s => s.id !== id));
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-slate-600 active:bg-slate-200 rounded-full">
                    <ArrowLeft />
                </button>
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 leading-none">Distributori</h2>
                    <p className="text-sm text-slate-500 mt-1">Gestione Convenzioni</p>
                </div>
            </div>

            {/* ADD BUTTON */}
            {!showForm && (
                <button 
                    onClick={() => setShowForm(true)}
                    className="w-full bg-blue-600 text-white p-4 rounded-xl font-bold shadow-lg shadow-blue-200 flex items-center justify-center gap-2 active:scale-95 transition-transform"
                >
                    <Plus size={24} /> NUOVO DISTRIBUTORE
                </button>
            )}

            {/* ADD FORM */}
            {showForm && (
                <form onSubmit={handleAdd} className="bg-white p-5 rounded-xl shadow-lg border border-blue-100 animate-fade-in-down space-y-4">
                    <h3 className="font-bold text-lg text-slate-800">Nuovo Distributore</h3>
                    
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase">Nome Distributore</label>
                        <input 
                            type="text" 
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Es. Hub Aziendale, DKV..."
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                        />
                    </div>
                    
                    <div 
                        onClick={() => setIsPartner(!isPartner)}
                        className={`p-3 rounded-lg border-2 cursor-pointer transition-all flex items-center gap-3 ${isPartner ? 'bg-indigo-50 border-indigo-200' : 'bg-slate-50 border-slate-200'}`}
                    >
                         <div className={`p-2 rounded-full ${isPartner ? 'bg-indigo-200 text-indigo-700' : 'bg-slate-200 text-slate-400'}`}>
                             <Building2 size={20} />
                         </div>
                         <div className="flex-1">
                             <div className={`font-bold text-sm ${isPartner ? 'text-indigo-800' : 'text-slate-600'}`}>
                                 Distributore Convenzionato
                             </div>
                             <div className="text-[10px] text-slate-400">
                                 Abilita pagamento differito/fattura di default per gli autisti.
                             </div>
                         </div>
                         <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${isPartner ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300'}`}>
                            {isPartner && <span className="text-white text-xs font-bold">✓</span>}
                        </div>
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button 
                            type="button" 
                            onClick={() => setShowForm(false)}
                            className="flex-1 py-3 bg-slate-100 text-slate-600 font-bold rounded-lg"
                        >
                            ANNULLA
                        </button>
                        <button 
                            type="submit" 
                            className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-lg shadow-md"
                        >
                            SALVA
                        </button>
                    </div>
                </form>
            )}

            {/* LIST */}
            {loading ? (
                <div className="text-center py-10 text-slate-400">Caricamento distributori...</div>
            ) : (
                <div className="space-y-3">
                    {stations.length === 0 ? (
                        <div className="text-center py-10 bg-white rounded-xl border border-dashed text-slate-400">
                            Nessun distributore configurato.
                        </div>
                    ) : (
                        stations.map(s => (
                            <div key={s.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex justify-between items-center group">
                                <div className="flex items-center gap-3">
                                    <div className={`p-3 rounded-xl ${s.isPartner ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-50 text-slate-400'}`}>
                                        <Fuel size={20} />
                                    </div>
                                    <div>
                                        <div className="font-bold text-slate-800">{s.name}</div>
                                        <div className="flex items-center gap-1 mt-1">
                                            {s.isPartner ? (
                                                <span className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                                                    <Building2 size={10} /> CONVENZIONATO
                                                </span>
                                            ) : (
                                                <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                                                    <CreditCard size={10} /> PAGAMENTO DIRETTO
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => handleDelete(s.id!)}
                                    className="p-2 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
};