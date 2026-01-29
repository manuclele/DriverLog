import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getWorkshops, addWorkshop, deleteWorkshop } from '../services/db';
import { Workshop } from '../types';
import { ArrowLeft, Plus, Trash2, Hammer, MapPin } from 'lucide-react';

export const WorkshopsManager: React.FC = () => {
    const navigate = useNavigate();
    const [workshops, setWorkshops] = useState<Workshop[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    
    // Form State
    const [newName, setNewName] = useState('');
    const [newProvince, setNewProvince] = useState('');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        const data = await getWorkshops();
        setWorkshops(data);
        setLoading(false);
    };

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newName || !newProvince) {
            alert("Compila tutti i campi");
            return;
        }

        try {
            await addWorkshop({
                name: newName.replace(/\b\w/g, c => c.toUpperCase()),
                province: newProvince.toUpperCase()
            });
            setNewName('');
            setNewProvince('');
            setShowForm(false);
            loadData(); // Refresh list
        } catch (error) {
            alert("Errore nell'aggiunta");
        }
    };

    const handleDelete = async (id: string) => {
        if (confirm("Eliminare definitivamente questa officina?")) {
            await deleteWorkshop(id);
            setWorkshops(prev => prev.filter(w => w.id !== id));
        }
    };

    // Group for display
    const grouped = workshops.reduce((acc, curr) => {
        (acc[curr.province] = acc[curr.province] || []).push(curr);
        return acc;
    }, {} as Record<string, Workshop[]>);
    
    const sortedProvinces = Object.keys(grouped).sort();

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-slate-600 active:bg-slate-200 rounded-full">
                    <ArrowLeft />
                </button>
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 leading-none">Gestione Officine</h2>
                    <p className="text-sm text-slate-500 mt-1">Anagrafica officine autorizzate</p>
                </div>
            </div>

            {/* ADD BUTTON */}
            {!showForm && (
                <button 
                    onClick={() => setShowForm(true)}
                    className="w-full bg-blue-600 text-white p-4 rounded-xl font-bold shadow-lg shadow-blue-200 flex items-center justify-center gap-2 active:scale-95 transition-transform"
                >
                    <Plus size={24} /> NUOVA OFFICINA
                </button>
            )}

            {/* ADD FORM */}
            {showForm && (
                <form onSubmit={handleAdd} className="bg-white p-5 rounded-xl shadow-lg border border-blue-100 animate-fade-in-down space-y-4">
                    <h3 className="font-bold text-lg text-slate-800">Inserisci Nuova Officina</h3>
                    
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase">Nome Officina</label>
                        <input 
                            type="text" 
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Es. Meccanica Rossi"
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                        />
                    </div>
                    
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase">Provincia (Sigla)</label>
                        <input 
                            type="text" 
                            maxLength={2}
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 uppercase"
                            placeholder="Es. MI"
                            value={newProvince}
                            onChange={(e) => setNewProvince(e.target.value)}
                        />
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
                <div className="text-center py-10 text-slate-400">Caricamento anagrafiche...</div>
            ) : (
                <div className="space-y-6">
                    {sortedProvinces.length === 0 ? (
                        <div className="text-center py-10 bg-white rounded-xl border border-dashed text-slate-400">
                            Nessuna officina presente in elenco.
                        </div>
                    ) : (
                        sortedProvinces.map(prov => (
                            <div key={prov}>
                                <div className="sticky top-16 z-10 bg-slate-50/95 backdrop-blur py-2 px-1 border-b border-slate-200 mb-2 flex items-center gap-2">
                                    <span className="bg-slate-200 text-slate-700 text-xs font-bold px-2 py-1 rounded">
                                        {prov}
                                    </span>
                                    <span className="text-xs font-semibold text-slate-400">Provincia</span>
                                </div>
                                
                                <div className="space-y-2">
                                    {grouped[prov].map(w => (
                                        <div key={w.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex justify-between items-center group">
                                            <div className="flex items-center gap-3">
                                                <div className="bg-orange-50 p-2 rounded-lg text-orange-600">
                                                    <Hammer size={18} />
                                                </div>
                                                <span className="font-bold text-slate-700">{w.name}</span>
                                            </div>
                                            <button 
                                                onClick={() => handleDelete(w.id!)}
                                                className="p-2 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
};