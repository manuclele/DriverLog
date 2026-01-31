import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Truck, Shield, Briefcase, Info, X, Share, MoreVertical, Mail, Lock, User, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const InstallInstructions: React.FC<{ onClose: () => void }> = ({ onClose }) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
        <div className="bg-white rounded-2xl w-full max-w-sm p-6 relative">
            <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-800">
                <X size={24} />
            </button>
            <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                <Info className="text-blue-600" />
                Come installare l'App
            </h3>
            
            <div className="space-y-6 text-slate-600">
                <div>
                    <h4 className="font-bold text-slate-800 mb-1 flex items-center gap-2">
                        <span className="bg-slate-100 p-1 rounded">🍏</span> Su iPhone (iOS)
                    </h4>
                    <p className="text-sm">
                        1. Tocca il tasto <strong>Condividi</strong> <Share size={12} className="inline" /> nella barra in basso di Safari.<br/>
                        2. Scorri e seleziona <strong>"Aggiungi alla schermata Home"</strong>.
                    </p>
                </div>

                <div className="border-t border-slate-100 pt-4">
                    <h4 className="font-bold text-slate-800 mb-1 flex items-center gap-2">
                        <span className="bg-slate-100 p-1 rounded">🤖</span> Su Android
                    </h4>
                    <p className="text-sm">
                        1. Tocca i <strong>tre puntini</strong> <MoreVertical size={12} className="inline" /> in alto a destra su Chrome.<br/>
                        2. Seleziona <strong>"Installa app"</strong> o <strong>"Aggiungi a schermata Home"</strong>.
                    </p>
                </div>
            </div>

            <button onClick={onClose} className="mt-6 w-full py-3 bg-blue-600 text-white font-bold rounded-xl">
                HO CAPITO
            </button>
        </div>
    </div>
);

export const Login: React.FC = () => {
  const { login, loginWithEmail, registerWithEmail, demoLogin, user } = useAuth();
  const navigate = useNavigate();
  const [showInstallHelp, setShowInstallHelp] = useState(false);
  
  // Email/Pass State
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    if (user) {
        navigate('/dashboard');
    }
  }, [user, navigate]);

  const validateName = (name: string) => {
      const parts = name.trim().split(/\s+/);
      return parts.length >= 2;
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
      e.preventDefault();
      setError('');
      setLoading(true);

      try {
          if (mode === 'register') {
              if (!validateName(displayName)) {
                  throw new Error("Devi inserire NOME e COGNOME.");
              }
              await registerWithEmail(email, password, displayName);
          } else {
              await loginWithEmail(email, password);
          }
      } catch (err: any) {
          console.error(err);
          let msg = "Errore generico.";
          if (err.code === 'auth/invalid-email') msg = "Email non valida.";
          if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') msg = "Credenziali non valide.";
          if (err.code === 'auth/wrong-password') msg = "Password errata.";
          if (err.code === 'auth/email-already-in-use') msg = "Email già registrata.";
          if (err.code === 'auth/weak-password') msg = "Password troppo debole (min 6 caratteri).";
          if (err.code === 'auth/operation-not-allowed') msg = "Login Email non abilitato in Firebase Console.";
          if (err.message) msg = err.message;
          
          if (err.code === 'auth/operation-not-allowed') {
             msg = "Login disabilitato. Usa i tasti 'Accesso Rapido Demo' in basso.";
          }
          
          setError(msg);
      } finally {
          setLoading(false);
      }
  };

  const handleGoogleLogin = async () => {
      setError('');
      try {
          await login();
      } catch (e: any) {
          console.error(e);
          if (e.code === 'auth/operation-not-allowed' || e.code === 'auth/unauthorized-domain') {
              setError("Login Google non configurato. Usa i tasti 'Accesso Rapido Demo'.");
          } else {
              setError("Impossibile accedere con Google.");
          }
      }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-white relative">
      
      {showInstallHelp && <InstallInstructions onClose={() => setShowInstallHelp(false)} />}

      <button 
        onClick={() => setShowInstallHelp(true)}
        className="absolute top-4 right-4 text-slate-400 hover:text-white flex items-center gap-1 text-xs font-medium bg-slate-800 px-3 py-1.5 rounded-full"
      >
        <Info size={14} /> Installazione
      </button>

      <div className="bg-blue-600 p-4 rounded-2xl mb-4 shadow-xl shadow-blue-900/50">
        <Truck size={48} />
      </div>
      <h1 className="text-3xl font-bold mb-1">DriverLog</h1>
      <p className="text-slate-400 mb-6 text-center max-w-xs text-sm">
        Gestione flotta e viaggi semplificata.
      </p>

      <div className="w-full max-w-sm space-y-4 pb-10">
        
        {/* EMAIL FORM */}
        <form onSubmit={handleEmailAuth} className="bg-white p-5 rounded-xl shadow-lg space-y-3 animate-fade-in-up">
            <h3 className="text-slate-800 font-bold text-center mb-2">
                {mode === 'login' ? 'Accedi con Email' : 'Crea Account'}
            </h3>
            
            {error && (
                <div className="bg-red-50 text-red-600 p-3 rounded-lg text-xs font-bold flex items-start gap-2 border border-red-100">
                    <AlertCircle size={16} className="shrink-0 mt-0.5"/> 
                    <span>{error}</span>
                </div>
            )}

            {mode === 'register' && (
                <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                        type="text" 
                        placeholder="Nome e Cognome (Obbligatorio)"
                        className="w-full pl-10 p-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                        value={displayName}
                        onChange={e => setDisplayName(e.target.value)}
                        required
                    />
                </div>
            )}

            <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                    type="email" 
                    placeholder="Email"
                    className="w-full pl-10 p-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                />
            </div>

            <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                    type="password" 
                    placeholder="Password"
                    className="w-full pl-10 p-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    minLength={6}
                />
            </div>

            <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white p-3 rounded-lg font-bold shadow-md hover:bg-blue-700 active:scale-95 transition-all flex justify-center items-center gap-2"
            >
                {loading ? 'Elaborazione...' : (mode === 'login' ? 'ACCEDI' : 'REGISTRATI')}
            </button>

            <div className="text-center pt-2">
                <button 
                    type="button"
                    onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}
                    className="text-xs text-slate-500 underline hover:text-blue-600"
                >
                    {mode === 'login' ? 'Non hai un account? Registrati' : 'Hai già un account? Accedi'}
                </button>
            </div>
        </form>

        <div className="relative py-2">
            <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-slate-700" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-slate-900 px-2 text-slate-500">Oppure</span>
            </div>
        </div>

        <button
            onClick={handleGoogleLogin}
            className="w-full bg-white text-slate-900 p-3 rounded-xl font-bold text-sm shadow-lg hover:bg-slate-100 transition-colors flex items-center justify-center gap-2"
        >
            <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="w-5 h-5" alt="G" />
            Accedi con Google
        </button>

        {/* DEMO SECTION */}
        <div className="pt-6 space-y-3">
            <div className="text-center">
                <span className="text-xs font-bold text-slate-500 uppercase">Accesso Rapido Demo (Senza Account)</span>
            </div>
            
            <button
                onClick={() => demoLogin('driver')}
                className="w-full bg-slate-800 text-slate-200 p-3 rounded-xl font-semibold text-sm border border-slate-700 hover:bg-slate-700 transition-colors flex items-center justify-center gap-2"
            >
                <Truck size={16} />
                Demo Autista
            </button>
            
            <div className="grid grid-cols-2 gap-3">
                <button
                    onClick={() => demoLogin('master')}
                    className="w-full bg-slate-800 text-indigo-300 p-3 rounded-xl font-semibold text-sm border border-slate-700 hover:bg-slate-700 transition-colors flex items-center justify-center gap-2"
                >
                    <Shield size={16} />
                    Demo Master
                </button>
                <button
                    onClick={() => demoLogin('owner')}
                    className="w-full bg-slate-800 text-emerald-300 p-3 rounded-xl font-semibold text-sm border border-slate-700 hover:bg-slate-700 transition-colors flex items-center justify-center gap-2"
                >
                    <Briefcase size={16} />
                    Demo Owner
                </button>
            </div>
        </div>

      </div>
    </div>
  );
};