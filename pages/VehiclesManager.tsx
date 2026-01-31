import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getVehicles, addVehicle, updateVehicle, deleteVehicle, batchImportVehicles } from '../services/db';
import { Vehicle, VehicleType, TrailerSubType } from '../types';
import { ArrowLeft, Plus, Trash2, Truck, Container, Edit2, Link as LinkIcon, Upload, Save, X, CheckSquare, Square } from 'lucide-react';

export const VehiclesManager: React.FC = () => {
    const navigate = useNavigate();
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState<VehicleType>('tractor');
    
    // UI States
    const [showForm, setShowForm] = useState(false);
    const [showImport, setShowImport] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    // Form State
    const [formData, setFormData] = useState<Partial<Vehicle>>({
        plate: '',
        code: '',
        type: 'tractor',
        subType: null,
        defaultTrailerId: ''
    });

    // Import State
    const [importData, setImportData] = useState('');
    const [importCandidates, setImportCandidates] = useState<Vehicle[]>([]);
    const [selectedImportIndices, setSelectedImportIndices] = useState<Set<number>>(new Set());

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        const data = await getVehicles();
        setVehicles(data);
        setLoading(false);
    };

    // --- FORM HANDLERS ---

    const resetForm = () => {
        setFormData({ plate: '', code: '', type: tab, subType: null, defaultTrailerId: '' });
        setEditingId(null);
        setShowForm(false);
    };

    const handleEdit = (v: Vehicle) => {
        setEditingId(v.id);
        setFormData(v);
        setTab(v.type); // Switch to correct tab
        setShowForm(true);
    };

    const handleDelete = async (id: string) => {
        if (confirm("Eliminare definitivamente questo veicolo?")) {
            await deleteVehicle(id);
            setVehicles(prev => prev.filter(v => v.id !== id));
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.plate || !formData.code) {
            alert("Targa e Codice sono obbligatori");
            return;
        }

        const payload: any = {
            plate: formData.plate.toUpperCase().replace(/\s/g, ''),
            code: formData.code.toUpperCase(),
            type: formData.type,
            subType: formData.type === 'trailer' ? formData.subType : null,
            defaultTrailerId: formData.type === 'tractor' ? formData.defaultTrailerId : null
        };

        try {
            if (editingId) {
                await updateVehicle(editingId, payload);
                setVehicles(prev => prev.map(v => v.id === editingId ? { ...v, ...payload } : v));
            } else {
                const newId = await addVehicle(payload as Vehicle);
                setVehicles(prev => [...prev, { ...payload, id: newId }]);
            }
            resetForm();
        } catch (error) {
            alert("Errore nel salvataggio");
        }
    };

    // --- IMPORT HANDLERS ---

    const resetImport = () => {
        setImportData('');
        setImportCandidates([]);
        setSelectedImportIndices(new Set());
        setShowImport(false);
    };

    const analyzeImport = () => {
        try {
            const parsed = JSON.parse(importData);
            const rawList = parsed.veicoli || (Array.isArray(parsed) ? parsed : null);

            if (!rawList || !Array.isArray(rawList)) {
                throw new Error("Formato non valido. Atteso oggetto con chiave 'veicoli' o un array.");
            }
            
            const candidates: Vehicle[] = rawList.map((v: any, idx: number) => {
                let type: VehicleType = 'tractor';
                let subType: TrailerSubType = null;

                if (v.tipo === 'Motrice') {
                    type = 'tractor';
                } else if (v.tipo && v.tipo.toLowerCase().includes('semi')) {
                    type = 'trailer';
                }

                if (type === 'trailer') {
                    const s = (v.settore || v.tipo || '').toLowerCase();
                    if (s.includes('cisterna')) subType = 'cisterna';
                    else if (s.includes('centina')) subType = 'centina';
                    else subType = 'container';
                }

                return {
                    id: v.id || `imp_${Date.now()}_${idx}`, 
                    plate: v.targa ? v.targa.toUpperCase() : '???',
                    code: v.codiceInterno ? v.codiceInterno.toUpperCase() : '???',
                    type: type,
                    subType: subType,
                    defaultTrailerId: (type === 'tractor' && v.abbinatoA) ? v.abbinatoA : null
                };
            });

            setImportCandidates(candidates);
            // Default select all
            setSelectedImportIndices(new Set(candidates.map((_, i) => i)));
        } catch (err) {
            alert("Errore Analisi JSON: Verifica il formato.");
            console.error(err);
        }
    };

    const toggleSelection = (index: number) => {
        const newSet = new Set(selectedImportIndices);
        if (newSet.has(index)) {
            newSet.delete(index);
        } else {
            newSet.add(index);
        }
        setSelectedImportIndices(newSet);
    };

    const toggleAll = () => {
        if (selectedImportIndices.size === importCandidates.length) {
            setSelectedImportIndices(new Set());
        } else {
            setSelectedImportIndices(new Set(importCandidates.map((_, i) => i)));
        }
    };

    const executeImport = async () => {
        if (selectedImportIndices.size === 0) {
            alert("Seleziona almeno un veicolo da importare.");
            return;
        }

        const toImport = importCandidates.filter((_, i) => selectedImportIndices.has(i));

        try {
            await batchImportVehicles(toImport);
            alert(`Importati ${toImport.length} veicoli con successo!`);
            resetImport();
            loadData();
        } catch (err) {
            alert("Errore durante l'importazione nel database.");
        }
    };

    // --- RENDER HELPERS ---

    const getTrailers = () => vehicles.filter(v => v.type === 'trailer');
    const getTractors = () => vehicles.filter(v => v.type === 'tractor');
    
    const visibleVehicles = tab === 'tractor' ? getTractors() : getTrailers();

    return (
        <div className="space-y-6 pb-10">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-slate-600 active:bg-slate-200 rounded-full">
                        <ArrowLeft />
                    </button>
                    <div>
                        <h2 className="text-2xl font-bold text-slate-800 leading-none">Flotta</h2>
                        <p className="text-sm text-slate-500 mt-1">Gestione Veicoli e Rimorchi</p>
                    </div>
                </div>
                <button 
                    onClick={() => setShowImport(true)}
                    className="p-2 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg"
                    title="Importa da App Esterna"
                >
                    <Upload size={20} />
                </button>
            </div>

            {/* TABS */}
            <div className="flex p-1 bg-slate-200 rounded-xl">
                <button
                    onClick={() => { setTab('tractor'); setShowForm(false); }}
                    className={`flex-1 py-2 text-sm font-bold rounded-lg flex items-center justify-center gap-2 transition-all ${tab === 'tractor' ? 'bg-white shadow text-slate-800' : 'text-slate-500'}`}
                >
                    <Truck size={16} /> MOTRICI
                </button>
                <button
                    onClick={() => { setTab('trailer'); setShowForm(false); }}
                    className={`flex-1 py-2 text-sm font-bold rounded-lg flex items-center justify-center gap-2 transition-all ${tab === 'trailer' ? 'bg-white shadow text-slate-800' : 'text-slate-500'}`}
                >
                    <Container size={16} /> RIMORCHI
                </button>
            </div>

            {/* ADD BUTTON */}
            {!showForm && !showImport && (
                <button 
                    onClick={() => { setShowForm(true); setFormData({ plate: '', code: '', type: tab, subType: null, defaultTrailerId: '' }); }}
                    className="w-full bg-slate-800 text-white p-4 rounded-xl font-bold shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-transform"
                >
                    <Plus size={24} /> AGGIUNGI {tab === 'tractor' ? 'MOTRICE' : 'RIMORCHIO'}
                </button>
            )}

            {/* IMPORT MODAL */}
            {showImport && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white w-full max-w-lg rounded-2xl p-6 shadow-2xl animate-fade-in-up flex flex-col max-h-[90vh]">
                        <div className="flex justify-between items-start mb-4">
                            <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                                <Upload size={20} className="text-blue-600"/> Importazione Massiva
                            </h3>
                            <button onClick={resetImport} className="p-1 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-800">
                                <X size={24}/>
                            </button>
                        </div>
                        
                        {/* STEP 1: PASTE JSON */}
                        {importCandidates.length === 0 ? (
                            <>
                                <p className="text-sm text-slate-500 mb-4">
                                    Incolla il JSON esportato. Il sistema analizzerà i veicoli contenuti.
                                </p>
                                <textarea 
                                    className="w-full h-40 p-3 bg-slate-50 border border-slate-200 rounded-lg font-mono text-xs mb-4 focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder='{ "veicoli": [ ... ] }'
                                    value={importData}
                                    onChange={(e) => setImportData(e.target.value)}
                                />
                                <button 
                                    onClick={analyzeImport}
                                    disabled={!importData.trim()}
                                    className="w-full py-3 bg-blue-600 text-white font-bold rounded-lg shadow-md hover:bg-blue-700 disabled:opacity-50"
                                >
                                    ANALIZZA FILE
                                </button>
                            </>
                        ) : (
                        /* STEP 2: SELECT VEHICLES */
                            <>
                                <div className="flex justify-between items-center mb-2 px-2">
                                    <span className="text-sm text-slate-500">
                                        Trovati <strong>{importCandidates.length}</strong> veicoli.
                                    </span>
                                    <button 
                                        onClick={toggleAll}
                                        className="text-xs font-bold text-blue-600 hover:underline"
                                    >
                                        {selectedImportIndices.size === importCandidates.length ? 'Deseleziona Tutti' : 'Seleziona Tutti'}
                                    </button>
                                </div>
                                
                                <div className="flex-1 overflow-y-auto border border-slate-200 rounded-lg bg-slate-50 mb-4">
                                    {importCandidates.map((v, idx) => {
                                        const isSelected = selectedImportIndices.has(idx);
                                        return (
                                            <div 
                                                key={idx} 
                                                onClick={() => toggleSelection(idx)}
                                                className={`p-3 border-b border-slate-200 flex items-center gap-3 cursor-pointer hover:bg-slate-100 ${isSelected ? 'bg-blue-50' : ''}`}
                                            >
                                                <div className={isSelected ? 'text-blue-600' : 'text-slate-300'}>
                                                    {isSelected ? <CheckSquare size={20} /> : <Square size={20} />}
                                                </div>
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-bold text-slate-800">{v.plate}</span>
                                                        <span className="text-xs font-mono bg-white border px-1 rounded text-slate-500">{v.code}</span>
                                                    </div>
                                                    <div className="text-xs text-slate-500">
                                                        {v.type === 'tractor' ? 'Motrice' : `Rimorchio (${v.subType || '-'})`}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                                
                                <div className="grid grid-cols-2 gap-3">
                                    <button 
                                        onClick={resetImport}
                                        className="py-3 bg-slate-100 text-slate-600 font-bold rounded-lg hover:bg-slate-200"
                                    >
                                        ANNULLA
                                    </button>
                                    <button 
                                        onClick={executeImport}
                                        disabled={selectedImportIndices.size === 0}
                                        className="py-3 bg-blue-600 text-white font-bold rounded-lg shadow-md hover:bg-blue-700 disabled:opacity-50"
                                    >
                                        IMPORTA ({selectedImportIndices.size})
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* FORM */}
            {showForm && (
                <form onSubmit={handleSave} className="bg-white p-5 rounded-xl shadow-lg border-l-4 border-slate-800 animate-fade-in-down space-y-4">
                    <h3 className="font-bold text-lg text-slate-800">
                        {editingId ? 'Modifica Veicolo' : `Nuova ${tab === 'tractor' ? 'Motrice' : 'Semirimorchio'}`}
                    </h3>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase">Targa</label>
                            <input 
                                type="text" 
                                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 uppercase font-mono"
                                placeholder="AA 000 BB"
                                value={formData.plate}
                                onChange={(e) => setFormData({...formData, plate: e.target.value})}
                                required
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase">Codice Interno</label>
                            <input 
                                type="text" 
                                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 uppercase"
                                placeholder={tab === 'tractor' ? 'TR-01' : 'SR-01'}
                                value={formData.code}
                                onChange={(e) => setFormData({...formData, code: e.target.value})}
                                required
                            />
                        </div>
                    </div>

                    {tab === 'trailer' && (
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase">Tipologia Rimorchio</label>
                            <select 
                                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg outline-none"
                                value={formData.subType || ''}
                                onChange={(e) => setFormData({...formData, subType: e.target.value as TrailerSubType})}
                            >
                                <option value="">-- Seleziona Tipo --</option>
                                <option value="container">Semirimorchio Container</option>
                                <option value="centina">Semirimorchio Centina</option>
                                <option value="cisterna">Semirimorchio Cisterna</option>
                            </select>
                        </div>
                    )}

                    {tab === 'tractor' && (
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1">
                                <LinkIcon size={12} /> Abbinamento Predefinito
                            </label>
                            <select 
                                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg outline-none"
                                value={formData.defaultTrailerId || ''}
                                onChange={(e) => setFormData({...formData, defaultTrailerId: e.target.value})}
                            >
                                <option value="">-- Nessun Rimorchio --</option>
                                {getTrailers().map(t => (
                                    <option key={t.id} value={t.id}>{t.plate} ({t.code})</option>
                                ))}
                            </select>
                            <p className="text-[10px] text-slate-400 mt-1">Opzionale. Seleziona il rimorchio agganciato abitualmente.</p>
                        </div>
                    )}

                    <div className="flex gap-3 pt-2">
                        <button 
                            type="button" 
                            onClick={resetForm}
                            className="flex-1 py-3 bg-slate-100 text-slate-600 font-bold rounded-lg"
                        >
                            ANNULLA
                        </button>
                        <button 
                            type="submit" 
                            className="flex-1 py-3 bg-slate-800 text-white font-bold rounded-lg shadow-md flex items-center justify-center gap-2"
                        >
                            <Save size={18} /> SALVA
                        </button>
                    </div>
                </form>
            )}

            {/* LIST */}
            {loading ? (
                <div className="text-center py-10 text-slate-400">Caricamento flotta...</div>
            ) : (
                <div className="space-y-3">
                    {visibleVehicles.length === 0 ? (
                        <div className="text-center py-10 bg-white rounded-xl border border-dashed text-slate-400">
                            Nessun veicolo trovato in questa categoria.
                        </div>
                    ) : (
                        visibleVehicles.map(v => {
                            const linked = v.defaultTrailerId ? vehicles.find(t => t.id === v.defaultTrailerId) : null;
                            return (
                                <div key={v.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex justify-between items-center group relative overflow-hidden">
                                    <div className="flex items-center gap-3 relative z-10">
                                        <div className={`p-3 rounded-xl ${v.type === 'tractor' ? 'bg-indigo-50 text-indigo-600' : 'bg-orange-50 text-orange-600'}`}>
                                            {v.type === 'tractor' ? <Truck size={20} /> : <Container size={20} />}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-slate-800 text-lg">{v.plate}</span>
                                                <span className="bg-slate-100 text-slate-500 text-[10px] px-1.5 py-0.5 rounded font-mono border border-slate-200">{v.code}</span>
                                            </div>
                                            <div className="text-xs text-slate-500 capitalize">
                                                {v.type === 'trailer' && v.subType ? `Semi. ${v.subType}` : (v.type === 'tractor' ? 'Motrice Stradale' : 'Veicolo')}
                                            </div>
                                            {linked && (
                                                <div className="flex items-center gap-1 text-[10px] text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full mt-1 w-fit">
                                                    <LinkIcon size={10} /> Linked: {linked.plate}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 relative z-10">
                                        <button 
                                            onClick={() => handleEdit(v)}
                                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                                        >
                                            <Edit2 size={18} />
                                        </button>
                                        <button 
                                            onClick={() => handleDelete(v.id)}
                                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            )}
        </div>
    );
};