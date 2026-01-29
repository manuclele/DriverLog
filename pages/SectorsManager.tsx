import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSectors, addSector, updateSector, deleteSector } from '../services/db';
import { Sector, SectorField, FieldType } from '../types';
import { ArrowLeft, Plus, Trash2, Edit2, Save, X, List, Layers, Settings, ChevronDown, ChevronUp } from 'lucide-react';

export const SectorsManager: React.FC = () => {
    const navigate = useNavigate();
    const [sectors, setSectors] = useState<Sector[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    // Form State
    const [sectorName, setSectorName] = useState('');
    const [fields, setFields] = useState<SectorField[]>([]);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        const data = await getSectors();
        setSectors(data);
        setLoading(false);
    };

    const resetForm = () => {
        setSectorName('');
        setFields([]);
        setEditingId(null);
        setShowForm(false);
    };

    const handleEdit = (sector: Sector) => {
        setEditingId(sector.id!);
        setSectorName(sector.name);
        setFields(sector.fields || []);
        setShowForm(true);
    };

    const handleDelete = async (id: string) => {
        if (confirm("Attenzione: Eliminando il settore, i vecchi viaggi rimarranno ma non sarà più selezionabile. Continuare?")) {
            await deleteSector(id);
            setSectors(prev => prev.filter(s => s.id !== id));
        }
    };

    // --- FIELD MANAGEMENT ---

    const addField = () => {
        const newField: SectorField = {
            id: 'field_' + Date.now(),
            label: '',
            type: 'text',
            required: false,
            options: []
        };
        setFields([...fields, newField]);
    };

    const removeField = (index: number) => {
        const newFields = [...fields];
        newFields.splice(index, 1);
        setFields(newFields);
    };

    const updateField = (index: number, key: keyof SectorField, value: any) => {
        const newFields = [...fields];
        if (key === 'options' && typeof value === 'string') {
            // Convert comma string to array
            newFields[index] = { ...newFields[index], options: value.split(',').map(s => s.trim()).filter(Boolean) };
        } else {
            newFields[index] = { ...newFields[index], [key]: value };
        }
        setFields(newFields);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!sectorName) return alert("Inserisci il nome del settore");
        if (fields.length === 0) return alert("Aggiungi almeno una caratteristica");

        // Validate labels
        for (const f of fields) {
            if (!f.label) return alert("Tutti i campi devono avere un'etichetta (Nome Caratteristica)");
            if (f.type === 'select' && (!f.options || f.options.length === 0)) {
                return alert(`Il campo '${f.label}' è di tipo Menu ma non ha opzioni.`);
            }
        }

        const payload = {
            name: sectorName,
            fields: fields
        };

        try {
            if (editingId) {
                await updateSector(editingId, payload);
            } else {
                await addSector(payload as Sector);
            }
            loadData();
            resetForm();
        } catch (err) {
            alert("Errore salvataggio");
        }
    };

    return (
        <div className="space-y-6 pb-20">
            <div className="flex items-center gap-4">
                <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-slate-600 active:bg-slate-200 rounded-full">
                    <ArrowLeft />
                </button>
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 leading-none">Gestione Settori</h2>
                    <p className="text-sm text-slate-500 mt-1">Configura tipi di viaggio e dettagli</p>
                </div>
            </div>

            {/* ADD BUTTON */}
            {!showForm && (
                <button 
                    onClick={() => { resetForm(); setShowForm(true); }}
                    className="w-full bg-blue-600 text-white p-4 rounded-xl font-bold shadow-lg shadow-blue-200 flex items-center justify-center gap-2 active:scale-95 transition-transform"
                >
                    <Plus size={24} /> NUOVO SETTORE
                </button>
            )}

            {/* FORM */}
            {showForm && (
                <form onSubmit={handleSave} className="bg-white p-5 rounded-xl shadow-lg border border-blue-100 animate-fade-in-down space-y-6">
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase">Nome Settore</label>
                        <input 
                            type="text" 
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 font-bold text-lg"
                            placeholder="Es. Container, Cisterna..."
                            value={sectorName}
                            onChange={(e) => setSectorName(e.target.value)}
                        />
                    </div>

                    <div className="space-y-3">
                        <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                            <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                                <List size={14}/> Caratteristiche (Campi da compilare)
                            </label>
                            <button type="button" onClick={addField} className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full hover:bg-blue-100">
                                + AGGIUNGI CAMPO
                            </button>
                        </div>
                        
                        {fields.length === 0 && (
                            <p className="text-sm text-slate-400 italic text-center py-4">Nessuna caratteristica definita.</p>
                        )}

                        {fields.map((field, idx) => (
                            <div key={field.id} className="bg-slate-50 p-3 rounded-lg border border-slate-200 relative">
                                <button type="button" onClick={() => removeField(idx)} className="absolute top-2 right-2 text-slate-400 hover:text-red-500">
                                    <X size={16} />
                                </button>
                                
                                <div className="grid gap-3">
                                    {/* Row 1: Label & Type */}
                                    <div className="grid grid-cols-2 gap-2 pr-6">
                                        <input 
                                            type="text"
                                            placeholder="Nome Campo (es. Quantità)"
                                            className="p-2 border rounded text-sm font-bold"
                                            value={field.label}
                                            onChange={(e) => updateField(idx, 'label', e.target.value)}
                                        />
                                        <select
                                            className="p-2 border rounded text-sm bg-white"
                                            value={field.type}
                                            onChange={(e) => updateField(idx, 'type', e.target.value as FieldType)}
                                        >
                                            <option value="text">Testo Libero</option>
                                            <option value="number">Numero</option>
                                            <option value="select">Menu a Tendina</option>
                                        </select>
                                    </div>
                                    
                                    {/* Row 2: Options (if select) */}
                                    {field.type === 'select' && (
                                        <input 
                                            type="text"
                                            placeholder="Opzioni separate da virgola (es. 20, 40, 40HC)"
                                            className="p-2 border rounded text-sm w-full bg-white"
                                            value={field.options?.join(', ') || ''}
                                            onChange={(e) => updateField(idx, 'options', e.target.value)}
                                        />
                                    )}

                                    {/* Row 3: Flags */}
                                    <div className="flex items-center gap-2">
                                        <input 
                                            type="checkbox"
                                            id={`req_${field.id}`}
                                            checked={field.required}
                                            onChange={(e) => updateField(idx, 'required', e.target.checked)}
                                            className="w-4 h-4 text-blue-600 rounded"
                                        />
                                        <label htmlFor={`req_${field.id}`} className="text-xs text-slate-600">Obbligatorio</label>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="flex gap-3 pt-4 border-t border-slate-100">
                        <button 
                            type="button" 
                            onClick={resetForm}
                            className="flex-1 py-3 bg-slate-100 text-slate-600 font-bold rounded-lg"
                        >
                            ANNULLA
                        </button>
                        <button 
                            type="submit" 
                            className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-lg shadow-md flex items-center justify-center gap-2"
                        >
                            <Save size={18} /> SALVA SETTORE
                        </button>
                    </div>
                </form>
            )}

            {/* LIST */}
            <div className="space-y-4">
                {sectors.map(sector => (
                    <div key={sector.id} className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 relative group">
                        <div className="flex justify-between items-start mb-3">
                            <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                                <Layers size={20} className="text-blue-500" />
                                {sector.name}
                            </h3>
                            <div className="flex gap-2">
                                <button onClick={() => handleEdit(sector)} className="p-2 text-slate-400 hover:text-blue-600 bg-slate-50 rounded-full">
                                    <Edit2 size={16} />
                                </button>
                                <button onClick={() => handleDelete(sector.id!)} className="p-2 text-slate-400 hover:text-red-600 bg-slate-50 rounded-full">
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>

                        <div className="bg-slate-50 rounded-lg p-3 text-sm text-slate-600">
                            <p className="text-xs font-bold text-slate-400 uppercase mb-2">Caratteristiche Configurate:</p>
                            <ul className="space-y-1">
                                {sector.fields.map(f => (
                                    <li key={f.id} className="flex items-center gap-2">
                                        <span className="w-1.5 h-1.5 bg-slate-300 rounded-full"></span>
                                        <span className="font-semibold">{f.label}</span>
                                        <span className="text-[10px] bg-white border px-1.5 rounded uppercase">{f.type === 'select' ? 'Menu' : f.type}</span>
                                        {f.required && <span className="text-[10px] text-red-500">*Req</span>}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};