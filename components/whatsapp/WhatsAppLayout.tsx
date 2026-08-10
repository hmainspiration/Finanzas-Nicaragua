import React from 'react';
import { MessageCircle, FileText, Settings, LogOut, Moon, Sun } from 'lucide-react';

interface WhatsAppLayoutProps {
    children: React.ReactNode;
    activeTab: 'chats' | 'reports' | 'settings';
    onChangeTab: (tab: 'chats' | 'reports' | 'settings') => void;
    selectedChatId: string | null;
    theme: string;
    toggleTheme: () => void;
    onLogout: () => void;
}

const WhatsAppLayout: React.FC<WhatsAppLayoutProps> = ({ 
    children, 
    activeTab, 
    onChangeTab, 
    selectedChatId,
    theme,
    toggleTheme,
    onLogout
}) => {
    // If a chat is selected, we usually hide the bottom navigation in WhatsApp
    const hideBottomNav = selectedChatId !== null;

    return (
        <div className="flex flex-col h-[100dvh] bg-[#eae6df] dark:bg-[#0b141a] max-w-2xl mx-auto border-x border-border shadow-2xl relative overflow-hidden">
            {/* Main Content Area */}
            <div className="flex-1 overflow-hidden relative">
                {children}
            </div>

            {/* Bottom Navigation */}
            {!hideBottomNav && (
                <div className="bg-[#f0f2f5] dark:bg-[#202c33] border-t border-[#d1d7db] dark:border-[#222d34] flex justify-around items-center p-2 pb-safe">
                    <button 
                        onClick={() => onChangeTab('chats')}
                        className={`flex flex-col items-center p-2 rounded-xl transition-colors ${activeTab === 'chats' ? 'text-[#00a884]' : 'text-[#54656f] dark:text-[#8696a0]'}`}
                    >
                        <MessageCircle className="w-6 h-6 mb-1" fill={activeTab === 'chats' ? 'currentColor' : 'none'} />
                        <span className="text-[10px] font-medium">Chats</span>
                    </button>
                    
                    <button 
                        onClick={() => onChangeTab('reports')}
                        className={`flex flex-col items-center p-2 rounded-xl transition-colors ${activeTab === 'reports' ? 'text-[#00a884]' : 'text-[#54656f] dark:text-[#8696a0]'}`}
                    >
                        <FileText className="w-6 h-6 mb-1" fill={activeTab === 'reports' ? 'currentColor' : 'none'} />
                        <span className="text-[10px] font-medium">Reportes</span>
                    </button>
                    
                    <button 
                        onClick={() => onChangeTab('settings')}
                        className={`flex flex-col items-center p-2 rounded-xl transition-colors ${activeTab === 'settings' ? 'text-[#00a884]' : 'text-[#54656f] dark:text-[#8696a0]'}`}
                    >
                        <Settings className="w-6 h-6 mb-1" fill={activeTab === 'settings' ? 'currentColor' : 'none'} />
                        <span className="text-[10px] font-medium">Ajustes</span>
                    </button>
                </div>
            )}
        </div>
    );
};

export default WhatsAppLayout;
