import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { resetSystemData } from '../services/db';
import { ArrowLeft, AlertTriangle, Trash2, Database, Users, Truck, RotateCcw } from 'lucide-react';

export const SystemReset: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [confirmText, setConfirmText] = useState('');

    const handleReset = async (scope: 'logs' | 'vehicles' | 'users' | 'all') => {
        if (!user) return;
        
        let message = "";
        switch(scope) {
            case 'logs': message = "Stai per eliminare TUTTI i registri (Viaggi, Rifornimenti, Manutenzioni, Statistiche)."; break;
            case 'vehicles': message = "Stai per eliminare TUTTA la flotta (Motrici e Rimorchi)."; break;
            case 'users': message = "Stai per eliminare TUTTI gli utenti (eccetto il tuo account Master). Gli utenti dovranno registrarsi di nuovo."; break;
            case 'all': message = "ATTENZIONE: FACTORY RESET. Stai per cancellare l'intero Database."; break;
        }

        if (!confirm(`${message}\n\nSei sicuro di voler procedere? Questa azione è irreversibile.`)) return;

        if (scope === 'all') {
             if (confirmText.toUpperCase() !== 'ELIMINA') {
                 alert("Per il reset totale devi digitare 'ELIMINA' nel campo di testo.");
                 return;
             }
        }

        setLoading(true);
        try {
            await resetSystemData(scope, user.uid);
            alert("Operazione completata con successo.");
            if (scope === 'all' || scope === 'users') {
                 // Optional: reload to force state update
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
        <div className="space-y-6 pb-10">
            <div className="flex items-center gap-4">
                <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-slate-600 active:bg-slate-200 rounded-full">
                    <ArrowLeft />
                </button>
                <div>
                    <h2 className="text-2xl font-bold text-red-700 leading-none flex items-center gap-2">
                        <AlertTriangle className="text-red-600" /> Reset Sistema
                    </h2>
                    <p className="text-sm text-slate-500 mt-1">Strumenti pericolosi di amministrazione</p>
                </div>
            </div>

            <div className="bg-red-50 border border-red-200 p-4 rounded-xl text-sm text-red-800">
                <strong>Area Pericolosa:</strong> Le azioni qui sotto cancellano permanentemente i dati dal Database Cloud.
                Non è possibile annullare queste operazioni.
            </div>

            <div className="grid grid-cols-1 gap-4">
                {/* LOGS RESET */}
                <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
                    <div className="flex items-start gap-4">
                        <div className="bg-orange-100 p-3 rounded-lg text-orange-600">
                            <Database size={24} />
                        </div>
                        <div className="flex-1">
                            <h3 className="font-bold text-slate-800">Svuota Registri</h3>
                            <p className="text-xs text-slate-500 mb-4">
                                Cancella tutti i Viaggi, Rifornimenti e Manutenzioni registrati, ma mantiene Utenti e Veicoli.
                            </p>
                            <button 
                                onClick={() => handleReset('logs')}
                                disabled={loading}
                                className="w-full py-3 bg-orange-100 text-orange-700 font-bold rounded-lg border border-orange-200 hover:bg-orange-200"
                            >
                                {loading ? 'Elaborazione...' : 'ELIMINA TUTTI I LOG'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* VEHICLES RESET */}
                <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
                    <div className="flex items-start gap-4">
                        <div className="bg-orange-100 p-3 rounded-lg text-orange-600">
                            <Truck size={24} />
                        </div>
                        <div className="flex-1">
                            <h3 className="font-bold text-slate-800">Svuota Flotta</h3>
                            <p className="text-xs text-slate-500 mb-4">
                                Cancella tutte le Motrici e i Rimorchi. I registri collegati potrebbero diventare inconsistenti.
                            </p>
                            <button 
                                onClick={() => handleReset('vehicles')}
                                disabled={loading}
                                className="w-full py-3 bg-orange-100 text-orange-700 font-bold rounded-lg border border-orange-200 hover:bg-orange-200"
                            >
                                {loading ? 'Elaborazione...' : 'ELIMINA TUTTI I VEICOLI'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* USERS RESET */}
                <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
                    <div className="flex items-start gap-4">
                        <div className="bg-orange-100 p-3 rounded-lg text-orange-600">
                            <Users size={24} />
                        </div>
                        <div className="flex-1">
                            <h3 className="font-bold text-slate-800">Reset Utenti</h3>
                            <p className="text-xs text-slate-500 mb-4">
                                Rimuove tutti i profili autisti dal database. 
                                <br/><strong>Nota:</strong> Il tuo account Master attuale NON verrà eliminato.
                            </p>
                            <button 
                                onClick={() => handleReset('users')}
                                disabled={loading}
                                className="w-full py-3 bg-orange-100 text-orange-700 font-bold rounded-lg border border-orange-200 hover:bg-orange-200"
                            >
                                {loading ? 'Elaborazione...' : 'ELIMINA TUTTI GLI UTENTI'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* FACTORY RESET */}
                <div className="bg-red-50 p-5 rounded-xl shadow-md border-2 border-red-300 mt-4">
                    <div className="flex items-start gap-4">
                        <div className="bg-red-200 p-3 rounded-lg text-red-800">
                            <RotateCcw size={24} />
                        </div>
                        <div className="flex-1">
                            <h3 className="font-bold text-red-900 text-lg">FACTORY RESET (Totale)</h3>
                            <p className="text-xs text-red-700 mb-4">
                                Riporta l'app allo stato iniziale cancellando TUTTO (Log, Veicoli, Utenti, Statistiche). 
                                Il tuo account Master rimarrà attivo.
                            </p>
                            
                            <label className="text-xs font-bold text-red-800 uppercase block mb-1">
                                Digita "ELIMINA" per confermare
                            </label>
                            <input 
                                type="text"
                                value={confirmText}
                                onChange={e => setConfirmText(e.target.value)}
                                placeholder="ELIMINA"
                                className="w-full p-2 mb-3 border-2 border-red-200 rounded font-bold text-red-900 placeholder:text-red-200 outline-none focus:border-red-500 uppercase"
                            />

                            <button 
                                onClick={() => handleReset('all')}
                                disabled={loading || confirmText.toUpperCase() !== 'ELIMINA'}
                                className="w-full py-4 bg-red-600 text-white font-bold rounded-xl shadow-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Trash2 size={20} className="inline mr-2" />
                                RESETTA TUTTO
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};