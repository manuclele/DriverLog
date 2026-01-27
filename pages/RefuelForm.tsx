import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { addLog } from '../services/db';
import { ArrowLeft, Save, Camera, Euro, Droplet, Gauge } from 'lucide-react';

export const RefuelForm: React.FC = () => {
  const navigate = useNavigate();
  const { user, currentVehicle } = useAuth();
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    stationName: '',
    liters: '',
    cost: '',
    kmAtRefuel: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !currentVehicle) {
        alert("Errore veicolo");
        return;
    }
    setLoading(true);
    
    // Convert strings to numbers for DB
    const payload = {
        type: 'refuel',
        userId: user.uid,
        vehicleId: currentVehicle.id,
        stationName: formData.stationName,
        liters: parseFloat(formData.liters),
        cost: parseFloat(formData.cost),
        kmAtRefuel: parseInt(formData.kmAtRefuel),
        // In a real app, handle file upload to Storage here
        receiptUrl: null 
    };

    try {
      await addLog('logs', payload);
      navigate('/dashboard');
    } catch (error) {
      alert("Errore salvataggio");
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-slate-600 active:bg-slate-200 rounded-full">
            <ArrowLeft />
        </button>
        <div className="flex flex-col">
            <h2 className="text-2xl font-bold text-slate-800 leading-none">Rifornimento</h2>
             {currentVehicle && <span className="text-xs text-slate-500 font-medium mt-1">Veicolo: {currentVehicle.plate}</span>}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        
        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 space-y-4">
            <div>
                <label className="block text-sm font-semibold text-slate-500 mb-1">Distributore</label>
                <input
                    type="text"
                    name="stationName"
                    required
                    placeholder="Es. Eni Station - Km 44"
                    value={formData.stationName}
                    onChange={handleChange}
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
                        type="number"
                        inputMode="decimal"
                        name="liters"
                        required
                        placeholder="0.00"
                        value={formData.liters}
                        onChange={handleChange}
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
                        type="number"
                        inputMode="decimal"
                        name="cost"
                        required
                        placeholder="0.00"
                        value={formData.cost}
                        onChange={handleChange}
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
                        type="number"
                        inputMode="numeric"
                        name="kmAtRefuel"
                        required
                        placeholder="Es. 120500"
                        value={formData.kmAtRefuel}
                        onChange={handleChange}
                        className="w-full pl-12 p-4 bg-slate-50 border border-slate-200 rounded-lg text-xl font-mono focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                </div>
            </div>
        </div>

        {/* Receipt Upload Placeholder */}
        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 border-dashed border-2 flex flex-col items-center justify-center gap-3 py-8 cursor-pointer active:bg-slate-50 transition-colors relative">
            <input type="file" accept="image/*" className="absolute inset-0 opacity-0 w-full h-full" />
            <div className="bg-emerald-100 p-3 rounded-full">
                <Camera className="text-emerald-600" size={24} />
            </div>
            <span className="text-sm font-medium text-slate-600">Fotografa Scontrino (Opzionale)</span>
        </div>

        <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-600 text-white p-4 rounded-xl font-bold text-lg shadow-lg shadow-emerald-200 active:bg-emerald-700 active:scale-95 transition-all flex items-center justify-center gap-2"
        >
            {loading ? 'Salvataggio...' : (
                <>
                    <Save size={20} /> REGISTRA RIFORNIMENTO
                </>
            )}
        </button>

      </form>
    </div>
  );
};