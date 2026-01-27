import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { addLog, getLastTripSector } from '../services/db';
import { ArrowLeft, Check, ChevronRight, Save, Map } from 'lucide-react';

export const TripForm: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [fetchingPrevious, setFetchingPrevious] = useState(true);

  const [formData, setFormData] = useState({
    bollaNumber: '',
    sector: '',
    departure: '',
    destination: '',
    details: 'Standard' // Default details
  });

  // Load previous sector on mount
  useEffect(() => {
    const loadPrevious = async () => {
      if (user?.uid) {
        const lastSector = await getLastTripSector(user.uid);
        if (lastSector) {
          setFormData(prev => ({ ...prev, sector: lastSector }));
        }
      }
      setFetchingPrevious(false);
    };
    loadPrevious();
  }, [user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      await addLog('logs', {
        type: 'trip',
        userId: user.uid,
        vehicleId: user.currentVehicleId || 'unknown',
        ...formData,
        date: new Date().toISOString().split('T')[0]
      });
      // Success feedback could go here
      navigate('/dashboard');
    } catch (error) {
      alert("Errore nel salvataggio");
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-slate-600 active:bg-slate-200 rounded-full">
            <ArrowLeft />
        </button>
        <h2 className="text-2xl font-bold text-slate-800">Nuovo Viaggio</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        
        {/* Card 1: Bolla & Info */}
        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 space-y-4">
            <div>
                <label className="block text-sm font-semibold text-slate-500 mb-1">Numero Bolla / DDT</label>
                <input
                    type="text"
                    name="bollaNumber"
                    required
                    placeholder="Es. 2024/001"
                    value={formData.bollaNumber}
                    onChange={handleChange}
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-lg text-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                />
            </div>
        </div>

        {/* Card 2: Settore (Smart) */}
        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 space-y-4 relative overflow-hidden">
            {fetchingPrevious && (
                <div className="absolute top-0 left-0 w-full h-1 bg-blue-100 overflow-hidden">
                    <div className="h-full bg-blue-500 animate-progress"></div>
                </div>
            )}
            
            <div>
                <div className="flex justify-between items-center mb-1">
                    <label className="block text-sm font-semibold text-slate-500">Settore / Zona</label>
                    {!fetchingPrevious && formData.sector && (
                        <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                            Recuperato <Check size={10} />
                        </span>
                    )}
                </div>
                <input
                    type="text"
                    name="sector"
                    required
                    placeholder="Es. Lombardia - Zona A"
                    value={formData.sector}
                    onChange={handleChange}
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-lg text-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-semibold text-slate-500 mb-1">Partenza</label>
                    <input
                        type="text"
                        name="departure"
                        placeholder="Città"
                        value={formData.departure}
                        onChange={handleChange}
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-blue-500"
                    />
                </div>
                <div>
                    <label className="block text-sm font-semibold text-slate-500 mb-1">Destinazione</label>
                    <input
                        type="text"
                        name="destination"
                        placeholder="Città"
                        value={formData.destination}
                        onChange={handleChange}
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-blue-500"
                    />
                </div>
            </div>
        </div>

        {/* Card 3: Dettagli (Dynamic Dropdown) */}
        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
             <div>
                <label className="block text-sm font-semibold text-slate-500 mb-1">Tipo Viaggio</label>
                <div className="relative">
                    <select
                        name="details"
                        value={formData.details}
                        onChange={handleChange}
                        className="w-full p-4 bg-slate-50 border border-slate-200 rounded-lg text-lg appearance-none outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="Standard">Consegna Standard</option>
                        <option value="Urgent">Urgente / Espresso</option>
                        <option value="Collection">Ritiro Merce</option>
                        <option value="Return">Rientro Vuoto</option>
                    </select>
                    <ChevronRight className="absolute right-4 top-1/2 transform -translate-y-1/2 rotate-90 text-slate-400 pointer-events-none" />
                </div>
            </div>
        </div>

        <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white p-4 rounded-xl font-bold text-lg shadow-lg shadow-blue-200 active:bg-blue-700 active:scale-95 transition-all flex items-center justify-center gap-2"
        >
            {loading ? 'Salvataggio...' : (
                <>
                    <Save size={20} /> REGISTRA VIAGGIO
                </>
            )}
        </button>

      </form>
    </div>
  );
};