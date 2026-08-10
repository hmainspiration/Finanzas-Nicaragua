import React from 'react';
import { Monitor, Smartphone, ArrowRight } from 'lucide-react';

interface VersionSelectionScreenProps {
    onSelect: (version: 'sencillo' | 'completo') => void;
}

const VersionSelectionScreen: React.FC<VersionSelectionScreenProps> = ({ onSelect }) => {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 dark:bg-zinc-950 p-6">
            <div className="w-full max-w-4xl mx-auto">
                <div className="text-center mb-12 space-y-2">
                    <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white tracking-tight">
                        Bienvenido
                    </h1>
                    <p className="text-lg text-gray-500 dark:text-gray-400 font-medium">
                        Seleccione el modo de experiencia que mejor se adapte a su dispositivo.
                    </p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
                    {/* Card Sencillo */}
                    <button
                        onClick={() => onSelect('sencillo')}
                        className="group relative flex flex-col items-start text-left p-8 h-full bg-white dark:bg-zinc-900 rounded-[2rem] shadow-xl shadow-gray-200/50 dark:shadow-black/30 border border-gray-100 dark:border-zinc-800 hover:border-blue-500/50 dark:hover:border-blue-500/50 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
                    >
                        <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity duration-300">
                            <Smartphone className="w-32 h-32 text-blue-600 dark:text-blue-400 transform rotate-12 group-hover:rotate-0 transition-transform duration-500" />
                        </div>
                        
                        <div className="w-16 h-16 mb-6 rounded-2xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 group-hover:bg-blue-600 group-hover:text-white transition-colors duration-300">
                             <Smartphone className="w-8 h-8" />
                        </div>
                        
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                            Versión Sencilla
                        </h2>
                        <p className="text-gray-500 dark:text-gray-400 mb-8 leading-relaxed">
                            Interfaz optimizada para móviles. Ideal para un registro rápido de ofrendas durante el servicio.
                        </p>
                        
                        <div className="mt-auto flex items-center gap-2 text-sm font-bold text-blue-600 dark:text-blue-400 group-hover:translate-x-2 transition-transform duration-300">
                            <span>Iniciar Modo Móvil</span>
                            <ArrowRight className="w-4 h-4" />
                        </div>
                    </button>
                    
                    {/* Card Completo */}
                    <button
                        onClick={() => onSelect('completo')}
                        className="group relative flex flex-col items-start text-left p-8 h-full bg-white dark:bg-zinc-900 rounded-[2rem] shadow-xl shadow-gray-200/50 dark:shadow-black/30 border border-gray-100 dark:border-zinc-800 hover:border-indigo-500/50 dark:hover:border-indigo-500/50 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
                    >
                        <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity duration-300">
                            <Monitor className="w-32 h-32 text-indigo-600 dark:text-indigo-400 transform -rotate-6 group-hover:rotate-0 transition-transform duration-500" />
                        </div>

                        <div className="w-16 h-16 mb-6 rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white transition-colors duration-300">
                            <Monitor className="w-8 h-8" />
                        </div>
                        
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                            Versión Completa
                        </h2>
                        <p className="text-gray-500 dark:text-gray-400 mb-8 leading-relaxed">
                            Panel de administración total. Acceso a informes, gestión de miembros, impresión de PDFs y análisis.
                        </p>
                        
                        <div className="mt-auto flex items-center gap-2 text-sm font-bold text-indigo-600 dark:text-indigo-400 group-hover:translate-x-2 transition-transform duration-300">
                            <span>Iniciar Modo Escritorio</span>
                            <ArrowRight className="w-4 h-4" />
                        </div>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default VersionSelectionScreen;