import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { resetSystemData } from '../services/db';
import { ArrowLeft, AlertTriangle, Trash2, Database, Users, Truck, RotateCcw, X, CheckCircle } from 'lucide-react';

export const SystemReset: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    
    // Modal State
    const [showModal, setShowModal] = useState(false);
    const [pendingAction, setPendingAction] = useState<{ scope: 'logs' | 'vehicles' | 'users' | 'all', title: string, desc: string } | null>(null);
    const [confirmText, setConfirmText] = useState('');

    const initiateReset = (scope: 'logs' | 'vehicles' | 'users' | 'all') => {
        let title = "";
        let desc = "";

        switch(scope) {
            case 'logs': 
                title = "Svuota Registri";
                desc = "Stai per eliminare TUTTI i registri (Viaggi, Rifornimenti, Manutenzioni, Statistiche). Gli utenti e i veicoli rimarranno.";
                break;
            case 'vehicles': 
                title = "Svuota Flotta";
                desc = "Stai per eliminare TUTTE le Motrici e i Rimorchi. I registri collegati potrebbero non mostrare più i dettagli del veicolo.";
                break;
            case 'users': 
                title = "Elimina Utenti";
                desc = "Stai per eliminare TUTTI gli account autisti. Dovranno registrarsi nuovamente. Il tuo account Master NON verrà toccato.";
                break;
            case 'all': 
                title = "FACTORY RESET (Totale)";
                desc = "ATTENZIONE: Questa operazione riporta l'applicazione allo stato iniziale (vuota). Cancella Log, Veicoli e Utenti.";
                break;
        }

        setPendingAction({ scope, title, desc });
        setConfirmText('');
        setShowModal(true);
    };

    const confirmReset = async () => {
        if (!user || !pendingAction) return;
        
        // Double safety for Factory Reset
        if (pendingAction.scope === 'all' && confirmText.toUpperCase() !== 'ELIMINA') {
            return;
        }

        setLoading(true);
        try {
            await resetSystemData(pendingAction.scope, user.uid);
            setShowModal(false);
            alert("Reset completato con successo.");
            if (pendingAction.scope === 'all' || pendingAction.scope === 'users') {
                 window.location.reload();
            }
        } catch (e) {
            console.error(e);
            alert("Errore durante il reset. Controlla la console.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6 pb-10 relative">
            <div className="flex items-center gap-4">
                <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-slate-600 active:bg-slate-200 rounded-full">
                    <ArrowLeft />
                </button>
                <div>
                    <h2 className="text-2xl font-bold text-red-700 leading-none flex items-center gap-2">
                        <AlertTriangle className="text-red-600" /> Reset Sistema
                    </h2>
                    <p className="text-sm text-slate-500 mt-1">Area Pericolosa</p>
                </div>
            </div>

            <div className="bg-red-50 border border-red-200 p-4 rounded-xl text-sm text-red-800">
                <strong>Attenzione:</strong> Le azioni in questa pagina sono <u>irreversibili</u>.
                I dati cancellati non potranno essere recuperati.
            </div>

            <div className="grid grid-cols-1 gap-4">
                {/* LOGS RESET */}
                <button 
                    onClick={() => initiateReset('logs')}
                    className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 flex items-start gap-4 text-left hover:bg-orange-50 transition-colors group"
                >
                    <div className="bg-orange-100 p-3 rounded-lg text-orange-600 group-hover:bg-orange-200">
                        <Database size={24} />
                    </div>
                    <div className="flex-1">
                        <h3 className="font-bold text-slate-800">Svuota Registri</h3>
                        <p className="text-xs text-slate-500">
                            Elimina storico Viaggi, Rifornimenti e Manutenzioni.
                        </p>
                    </div>
                    <Trash2 className="text-slate-300 group-hover:text-orange-500" />
                </button>

                {/* VEHICLES RESET */}
                <button 
                    onClick={() => initiateReset('vehicles')}
                    className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 flex items-start gap-4 text-left hover:bg-orange-50 transition-colors group"
                >
                    <div className="bg-orange-100 p-3 rounded-lg text-orange-600 group-hover:bg-orange-200">
                        <Truck size={24} />
                    </div>
                    <div className="flex-1">
                        <h3 className="font-bold text-slate-800">Svuota Flotta</h3>
                        <p className="text-xs text-slate-500">
                            Elimina anagrafiche Veicoli e Rimorchi.
                        </p>
                    </div>
                    <Trash2 className="text-slate-300 group-hover:text-orange-500" />
                </button>

                {/* USERS RESET */}
                <button 
                    onClick={() => initiateReset('users')}
                    className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 flex items-start gap-4 text-left hover:bg-orange-50 transition-colors group"
                >
                    <div className="bg-orange-100 p-3 rounded-lg text-orange-600 group-hover:bg-orange-200">
                        <Users size={24} />
                    </div>
                    <div className="flex-1">
                        <h3 className="font-bold text-slate-800">Reset Utenti</h3>
                        <p className="text-xs text-slate-500">
                            Elimina tutti gli autisti. (Il Master rimane).
                        </p>
                    </div>
                    <Trash2 className="text-slate-300 group-hover:text-orange-500" />
                </button>

                {/* FACTORY RESET */}
                <button 
                    onClick={() => initiateReset('all')}
                    className="bg-red-50 p-5 rounded-xl shadow-md border-2 border-red-200 flex items-start gap-4 text-left hover:bg-red-100 transition-colors group mt-4"
                >
                    <div className="bg-red-200 p-3 rounded-lg text-red-800 group-hover:bg-red-300">
                        <RotateCcw size={24} />
                    </div>
                    <div className="flex-1">
                        <h3 className="font-bold text-red-900 text-lg">FACTORY RESET (Totale)</h3>
                        <p className="text-xs text-red-700">
                            Formatta completamente il database.
                        </p>
                    </div>
                    <AlertTriangle className="text-red-400 group-hover:text-red-600" />
                </button>
            </div>

            {/* SAFETY MODAL */}
            {showModal && pendingAction && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white w-full max-w-sm rounded-2xl p-6 shadow-2xl animate-fade-in-up">
                        <div className="flex justify-between items-start mb-4">
                            <h3 className="text-xl font-bold text-slate-800">{pendingAction.title}</h3>
                            <button onClick={() => setShowModal(false)} className="p-1 hover:bg-slate-100 rounded-full">
                                <X size={24} className="text-slate-400" />
                            </button>
                        </div>
                        
                        <div className="bg-red-50 border border-red-100 p-3 rounded-lg mb-6">
                            <p className="text-sm text-red-800 font-medium leading-relaxed">
                                {pendingAction.desc}
                            </p>
                        </div>

                        {/* Special Check for Factory Reset */}
                        {pendingAction.scope === 'all' ? (
                            <div className="mb-6">
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                                    Digita "ELIMINA" per confermare
                                </label>
                                <input 
                                    type="text"
                                    value={confirmText}
                                    onChange={e => setConfirmText(e.target.value)}
                                    placeholder="ELIMINA"
                                    className="w-full p-3 border-2 border-red-200 rounded-lg font-bold text-center text-red-600 focus:border-red-500 outline-none uppercase tracking-widest"
                                    autoFocus
                                />
                            </div>
                        ) : (
                            <p className="text-sm text-slate-500 mb-6 text-center">
                                Sei sicuro di voler procedere?
                            </p>
                        )}

                        <div className="grid grid-cols-2 gap-3">
                            <button 
                                onClick={() => setShowModal(false)}
                                className="py-3 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200"
                            >
                                ANNULLA
                            </button>
                            <button 
                                onClick={confirmReset}
                                disabled={loading || (pendingAction.scope === 'all' && confirmText.toUpperCase() !== 'ELIMINA')}
                                className="py-3 bg-red-600 text-white font-bold rounded-xl shadow-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {loading ? <RotateCcw className="animate-spin" /> : <Trash2 size={18} />}
                                CONFERMA
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};