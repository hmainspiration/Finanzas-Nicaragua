import React, { useState } from 'react';
import { Eye, EyeOff, ChevronRight } from 'lucide-react';
import { APP_VERSION } from '../constants';
import { Logo } from './Logo';

interface LoginScreenProps {
  onLoginSuccess: () => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        // NOTE: The password check is now handled by a variable in the window scope.
        if (password === (window as any).CHURCH_PASSWORD) {
            onLoginSuccess();
        } else {
            setError('Contraseña incorrecta. Inténtelo de nuevo.');
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 dark:bg-zinc-950 p-6 relative overflow-hidden">
            {/* Background Decor */}
            <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-blue-50 to-transparent dark:from-blue-950/20 dark:to-transparent -z-10"></div>

            <div className="w-full max-w-md">
                <div className="bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl dark:shadow-black/50 border border-gray-100 dark:border-zinc-800 p-8 md:p-10 backdrop-blur-sm transition-all duration-300">
                    <div className="flex flex-col items-center justify-center mb-8">
                        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-full mb-6 shadow-inner">
                            <Logo className="w-24 h-24" />
                        </div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight text-center">
                            Sistema de Finanzas
                        </h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 font-medium tracking-wide uppercase">
                            Iglesia La Luz del Mundo
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <label htmlFor="password" className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase ml-1">
                                Contraseña de Acceso
                            </label>
                            <div className="relative group">
                                <input
                                    id="password"
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Ingrese su clave..."
                                    className="w-full py-3.5 px-4 border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800/50 rounded-2xl text-gray-900 dark:text-white placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition-all duration-200"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-700 transition-colors"
                                >
                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>
                        
                        {error && (
                            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/30 text-center animate-in fade-in slide-in-from-top-2">
                                <p className="text-red-600 dark:text-red-400 text-sm font-medium">{error}</p>
                            </div>
                        )}

                        <button
                            type="submit"
                            className="w-full py-4 px-6 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 text-white font-bold text-lg rounded-2xl shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 transform hover:-translate-y-0.5 transition-all duration-200"
                        >
                            <span>Entrar al Sistema</span>
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    </form>
                    
                    <div className="mt-8 pt-6 border-t border-gray-100 dark:border-zinc-800 text-center">
                        <p className="text-xs text-gray-400 dark:text-gray-500 font-mono">
                           Versión {APP_VERSION}
                        </p>
                    </div>
                </div>
                
                <div className="mt-8 text-center space-y-1">
                    <p className="text-xs text-gray-400 dark:text-zinc-600">Jurisdicción Nicaragua, C.A.</p>
                    <p className="text-xs text-gray-300 dark:text-zinc-700">&copy; {new Date().getFullYear()} Derechos Reservados</p>
                </div>
            </div>
        </div>
    );
};

export default LoginScreen;