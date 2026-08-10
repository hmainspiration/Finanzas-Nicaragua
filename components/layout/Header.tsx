import React from 'react';
import { Sun, Moon, RotateCw, LogOut } from 'lucide-react';
import { Logo } from '../Logo';

interface NavItem {
    id: string;
    label: string;
    icon: React.ElementType;
}
interface HeaderProps {
    onLogout: () => void;
    onSwitchVersion: () => void;
    showSwitchVersion: boolean;
    theme: string;
    toggleTheme: () => void;
    navItems: NavItem[];
    activeTab: string;
    setActiveTab: (tab: string) => void;
}

const Header: React.FC<HeaderProps> = ({ 
    onLogout, 
    onSwitchVersion, 
    showSwitchVersion, 
    theme, 
    toggleTheme,
    navItems,
    activeTab,
    setActiveTab
}) => {
    return (
        <header className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-lg sticky top-0 z-50 border-b border-gray-200/50 dark:border-zinc-800/50 transition-colors duration-300">
            <div className="max-w-6xl mx-auto">
                {/* Top Bar */}
                <div className="px-4 py-3 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="bg-blue-50 dark:bg-blue-900/20 p-1.5 rounded-xl">
                            <Logo className="w-8 h-8" />
                        </div>
                        <div>
                            <h1 className="text-lg font-bold text-gray-900 dark:text-white leading-tight">Sistema de Finanzas</h1>
                            <p className="text-[10px] text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wider hidden sm:block">La Luz del Mundo</p>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-1 sm:gap-2">
                        {showSwitchVersion && (
                            <button
                                onClick={onSwitchVersion}
                                className="p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-zinc-800 hover:text-blue-600 rounded-full transition-all duration-200"
                                aria-label="Cambiar versión"
                                title="Cambiar versión"
                            >
                                <RotateCw className="w-5 h-5" />
                            </button>
                        )}
                        
                        <div className="h-6 w-px bg-gray-200 dark:bg-zinc-700 mx-1 hidden sm:block"></div>

                        <button
                            onClick={toggleTheme}
                            className="p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-zinc-800 hover:text-yellow-500 rounded-full transition-all duration-200"
                            aria-label="Cambiar tema"
                            title={theme === 'light' ? 'Activar modo oscuro' : 'Activar modo claro'}
                        >
                            {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
                        </button>
                        
                        <button
                            onClick={onLogout}
                            className="flex items-center gap-2 ml-2 px-3 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-all duration-200"
                            aria-label="Cerrar sesión"
                        >
                            <LogOut className="w-4 h-4" />
                            <span className="hidden sm:inline">Salir</span>
                        </button>
                    </div>
                </div>

                {/* Navigation Bar */}
                <nav className="px-2 pb-2 sm:px-4">
                    <div className="flex justify-between sm:justify-center overflow-x-auto no-scrollbar gap-1 sm:gap-2 p-1 bg-gray-100/50 dark:bg-zinc-800/50 rounded-2xl">
                        {navItems.map((item) => {
                            const isActive = activeTab === item.id;
                            return (
                                <button
                                    key={item.id}
                                    onClick={() => setActiveTab(item.id)}
                                    className={`
                                        flex flex-1 sm:flex-none items-center justify-center sm:justify-start gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 whitespace-nowrap
                                        ${isActive 
                                            ? 'bg-white dark:bg-zinc-700 text-blue-600 dark:text-white shadow-sm scale-[1.02]' 
                                            : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-200/50 dark:hover:bg-zinc-700/50'
                                        }
                                    `}
                                >
                                    <item.icon className={`w-4 h-4 ${isActive ? 'text-blue-600 dark:text-white' : 'opacity-70'}`} />
                                    <span className={isActive ? 'block' : 'hidden sm:block'}>{item.label}</span>
                                </button>
                            );
                        })}
                    </div>
                </nav>
            </div>
        </header>
    );
};

export default Header;