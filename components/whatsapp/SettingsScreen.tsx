import React, { useState } from 'react';
import { Settings, User, LogOut, Info, ShieldAlert } from 'lucide-react';
import AdminPanelTab from '../tabs/AdminPanelTab';

const SettingsScreen: React.FC<{ data: any, handlers: any, onLogout: () => void }> = ({ data, handlers, onLogout }) => {
    const [showAdmin, setShowAdmin] = useState(false);

    if (showAdmin) {
        return (
            <div className="flex flex-col h-full bg-background dark:bg-[#111b21]">
                 <div className="bg-[#00a884] dark:bg-[#202c33] text-white py-2 px-3 flex items-center shadow-sm z-10 sticky top-0">
                    <button onClick={() => setShowAdmin(false)} className="p-2 mr-2 rounded-full hover:bg-white/10 flex items-center">
                        <svg viewBox="0 0 24 24" width="24" height="24" className="text-white fill-current"><path d="M12 4l1.4 1.4L7.8 11H20v2H7.8l5.6 5.6L12 20l-8-8 8-8z"></path></svg>
                    </button>
                    <h2 className="font-medium text-lg leading-tight truncate">Administración</h2>
                </div>
                <div className="flex-1 overflow-y-auto p-4 bg-[#f0f2f5] dark:bg-[#111b21]">
                    <AdminPanelTab
                        members={data.members}
                        setMembers={handlers.setMembers}
                        categories={data.categories}
                        setCategories={handlers.setCategories}
                        formulas={data.formulas}
                        setFormulas={handlers.setFormulas}
                        churchInfo={data.churchInfo}
                        setChurchInfo={handlers.setChurchInfo}
                        comisionados={data.comisionados}
                        setComisionados={handlers.setComisionados}
                    />
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-[#f0f2f5] dark:bg-[#111b21]">
            <div className="bg-[#00a884] dark:bg-[#202c33] text-white pt-4 pb-4 px-4 shadow-sm z-10">
                <h1 className="text-xl font-medium">Ajustes</h1>
            </div>

            <div className="flex-1 overflow-y-auto">
                <div className="bg-white dark:bg-[#202c33] mt-3">
                    <div className="flex items-center px-4 py-4 cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                         onClick={() => setShowAdmin(true)}
                    >
                        <div className="w-10 h-10 rounded-full bg-[#00a884]/10 dark:bg-[#00a884]/20 flex items-center justify-center text-[#00a884]">
                            <Settings className="w-5 h-5" />
                        </div>
                        <div className="ml-4 flex-1">
                            <h3 className="text-[16px] text-foreground dark:text-[#e9edef]">Panel de Administración</h3>
                            <p className="text-[13px] text-muted-foreground dark:text-[#8696a0]">Miembros, Categorías, Fórmulas</p>
                        </div>
                    </div>

                    <div className="border-t border-border/50 ml-16"></div>

                    <div className="flex items-center px-4 py-4 cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                         onClick={handlers.toggleTheme}
                    >
                        <div className="w-10 h-10 rounded-full bg-blue-500/10 dark:bg-blue-500/20 flex items-center justify-center text-blue-500">
                            <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" className="css-i6dzq1"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>
                        </div>
                        <div className="ml-4 flex-1">
                            <h3 className="text-[16px] text-foreground dark:text-[#e9edef]">Cambiar Tema</h3>
                            <p className="text-[13px] text-muted-foreground dark:text-[#8696a0]">Modo Oscuro / Claro</p>
                        </div>
                    </div>
                </div>

                 <div className="bg-white dark:bg-[#202c33] mt-3">
                    <div className="flex items-center px-4 py-4 cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                         onClick={() => {
                            if (window.confirm('¿Está seguro de cerrar sesión?')) {
                                onLogout();
                            }
                         }}
                    >
                        <div className="w-10 h-10 rounded-full bg-red-500/10 dark:bg-red-500/20 flex items-center justify-center text-red-500">
                            <LogOut className="w-5 h-5" />
                        </div>
                        <div className="ml-4 flex-1">
                            <h3 className="text-[16px] text-red-500">Cerrar Sesión</h3>
                        </div>
                    </div>
                 </div>

                 <div className="mt-8 flex flex-col items-center justify-center opacity-50 pb-8">
                     <span className="text-xs">Sistema de Finanzas - Inspirado en WhatsApp</span>
                     <span className="text-xs mt-1">v2.0.0</span>
                 </div>
            </div>
        </div>
    );
};

export default SettingsScreen;
