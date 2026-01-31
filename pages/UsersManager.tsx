import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUsers, updateUserProfile, deleteUserProfile, getVehicles } from '../services/db';
import { UserProfile, Vehicle, Role, SectorType, UserStatus } from '../types';
import { ArrowLeft, User, Shield, Briefcase, Truck, Save, CheckCircle, XCircle, Trash2, Clock, Ban } from 'lucide-react';

// Helper: Title Case (Mario Rossi)
const toTitleCase = (str: string) => {
    if (!str) return '';
    return str.toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
};

export const UsersManager: React.FC = () => {
    const navigate = useNavigate();
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingUser, setEditingUser] = useState<string | null>(null);
    
    // Form State for Editing
    const [role, setRole] = useState<Role>('driver');
    const [status, setStatus] = useState<UserStatus>('pending');
    const [assignedVehicle, setAssignedVehicle] = useState<string>('');
    const [sector, setSector] = useState<SectorType>('Container');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        const [uData, vData] = await Promise.all([getUsers(), getVehicles()]);
        setUsers(uData);
        setVehicles(vData);
        setLoading(false);
    };

    const startEdit = (user: UserProfile) => {
        setEditingUser(user.uid);
        setRole(user.role);
        setStatus(user.status || 'pending');
        setAssignedVehicle(user.assignedVehicleId || '');
        setSector(user.assignedSector || 'Container');
    };

    const handleSave = async (uid: string) => {
        await updateUserProfile(uid, {
            role,
            status,
            assignedVehicleId: assignedVehicle,
            assignedSector: sector
        });
        
        // Update local state
        setUsers(prev => prev.map(u => u.uid === uid ? { ...u, role, status, assignedVehicleId: assignedVehicle, assignedSector: sector } : u));
        setEditingUser(null);
    };

    const handleDeleteUser = async (uid: string, name: string) => {
        if (!confirm(`SEI SICURO? Stai per eliminare definitivamente ${name}.\nL'utente non potrà più accedere.`)) {
            return;
        }
        await deleteUserProfile(uid);
        setUsers(prev => prev.filter(u => u.uid !== uid));
        setEditingUser(null);
    };

    const getRoleBadge = (role: Role) => {
        switch(role) {
            case 'owner': return <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-200">TITOLARE</span>;
            case 'master': return <span className="bg-indigo-100 text-indigo-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-indigo-200">MASTER</span>;
            default: return <span className="bg-slate-100 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded-full border border-slate-200">AUTISTA</span>;
        }
    };

    const getStatusBadge = (status: UserStatus) => {
        switch(status) {
            case 'active': return <span className="flex items-center gap-1 text-green-600 text-xs font-bold"><CheckCircle size={12}/> ATTIVO</span>;
            case 'suspended': return <span className="flex items-center gap-1 text-red-600 text-xs font-bold"><Ban size={12}/> SOSPESO</span>;
            default: return <span className="flex items-center gap-1 text-orange-500 text-xs font-bold"><Clock size={12}/> IN ATTESA</span>;
        }
    };

    return (
        <div className="space-y-6 pb-10">
            <div className="flex items-center gap-4">
                <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-slate-600 active:bg-slate-200 rounded-full">
                    <ArrowLeft />
                </button>
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 leading-none">Gestione Utenti</h2>
                    <p className="text-sm text-slate-500 mt-1">Approvazione e ruoli</p>
                </div>
            </div>

            {loading ? (
                <div className="text-center py-10 text-slate-400">Caricamento utenti...</div>
            ) : (
                <div className="space-y-4">
                    {users.map(u => {
                        const isEditing = editingUser === u.uid;
                        const v = vehicles.find(veh => veh.id === u.assignedVehicleId);
                        
                        // Logic to show both name and email
                        const hasName = u.displayName && u.displayName !== 'Utente';
                        const mainLabel = hasName ? toTitleCase(u.displayName!) : (u.email || 'Utente Sconosciuto');
                        const subLabel = hasName ? u.email : null;

                        if (isEditing) {
                            return (
                                <div key={u.uid} className="bg-white p-5 rounded-xl shadow-lg border-2 border-blue-500 animate-fade-in-down">
                                    <h3 className="font-bold text-lg leading-tight text-slate-800">{mainLabel}</h3>
                                    {subLabel && <p className="text-sm text-slate-500 mb-4">{subLabel}</p>}
                                    {!subLabel && <div className="mb-4"></div>}
                                    
                                    <div className="space-y-4">
                                        {/* STATUS SELECTOR */}
                                        <div>
                                            <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Stato Account</label>
                                            <div className="grid grid-cols-3 gap-2">
                                                <button
                                                    onClick={() => setStatus('active')}
                                                    className={`py-2 text-xs font-bold rounded-lg border flex flex-col items-center gap-1 ${status === 'active' ? 'bg-green-50 border-green-500 text-green-700' : 'bg-slate-50 border-slate-200 text-slate-400'}`}
                                                >
                                                    <CheckCircle size={16} /> ATTIVO
                                                </button>
                                                <button
                                                    onClick={() => setStatus('pending')}
                                                    className={`py-2 text-xs font-bold rounded-lg border flex flex-col items-center gap-1 ${status === 'pending' ? 'bg-orange-50 border-orange-500 text-orange-700' : 'bg-slate-50 border-slate-200 text-slate-400'}`}
                                                >
                                                    <Clock size={16} /> ATTESA
                                                </button>
                                                <button
                                                    onClick={() => setStatus('suspended')}
                                                    className={`py-2 text-xs font-bold rounded-lg border flex flex-col items-center gap-1 ${status === 'suspended' ? 'bg-red-50 border-red-500 text-red-700' : 'bg-slate-50 border-slate-200 text-slate-400'}`}
                                                >
                                                    <Ban size={16} /> SOSPESO
                                                </button>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Ruolo</label>
                                                <select 
                                                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm"
                                                    value={role}
                                                    onChange={(e) => setRole(e.target.value as Role)}
                                                >
                                                    <option value="driver">Autista</option>
                                                    <option value="master">Master</option>
                                                    <option value="owner">Titolare</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Settore</label>
                                                <select 
                                                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm"
                                                    value={sector}
                                                    onChange={(e) => setSector(e.target.value as SectorType)}
                                                >
                                                    <option value="Container">Container</option>
                                                    <option value="Cisterna">Cisterna</option>
                                                    <option value="Centina">Centina</option>
                                                </select>
                                            </div>
                                        </div>

                                        <div>
                                            <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Veicolo Assegnato</label>
                                            <select 
                                                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg outline-none"
                                                value={assignedVehicle}
                                                onChange={(e) => setAssignedVehicle(e.target.value)}
                                            >
                                                <option value="">-- Nessun Veicolo --</option>
                                                {vehicles.map(veh => (
                                                    <option key={veh.id} value={veh.id}>{veh.plate} - {veh.code}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    <div className="flex gap-3 mt-6 border-t border-slate-100 pt-4">
                                        <button 
                                            onClick={() => handleDeleteUser(u.uid, mainLabel || '')} 
                                            className="p-3 bg-red-100 text-red-600 rounded-lg hover:bg-red-200"
                                            title="Elimina Utente"
                                        >
                                            <Trash2 size={20} />
                                        </button>
                                        <div className="flex-1 flex gap-2">
                                            <button onClick={() => setEditingUser(null)} className="flex-1 py-3 bg-slate-100 font-bold text-slate-600 rounded-lg">ANNULLA</button>
                                            <button onClick={() => handleSave(u.uid)} className="flex-1 py-3 bg-blue-600 font-bold text-white rounded-lg shadow-md flex justify-center items-center gap-2">
                                                <Save size={18} /> SALVA
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        }

                        return (
                            <div key={u.uid} className={`bg-white p-4 rounded-xl shadow-sm border flex items-center justify-between ${u.status === 'pending' ? 'border-orange-300 ring-2 ring-orange-100' : 'border-slate-100'}`}>
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-full ${u.status === 'pending' ? 'bg-orange-100 text-orange-600' : 'bg-slate-100 text-slate-500'}`}>
                                        <User size={20} />
                                    </div>
                                    <div className="flex-1 min-w-0 pr-2">
                                        <div className="flex items-center flex-wrap gap-2 mb-0.5">
                                            <span className="font-bold text-slate-800 text-sm">{mainLabel}</span>
                                            {getRoleBadge(u.role)}
                                        </div>
                                        {subLabel && <div className="text-xs text-slate-500 font-medium mb-1 truncate">{subLabel}</div>}
                                        
                                        <div className="flex flex-col gap-0.5">
                                            {getStatusBadge(u.status || 'pending')}
                                            <span className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                                                <Truck size={10} /> {v ? v.plate : 'Nessun veicolo'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => startEdit(u)}
                                    className="px-4 py-2 bg-slate-50 text-blue-600 text-xs font-bold rounded-lg border border-slate-200 shrink-0"
                                >
                                    GESTISCI
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};