import React, { useState } from 'react';
import { Member, WeeklyRecord, Formulas, MonthlyReport, ChurchInfo, Comisionado } from '../../types';
import WhatsAppLayout from './WhatsAppLayout';
import ChatList from './ChatList';
import ChatScreen from './ChatScreen';
import ReportsScreen from './ReportsScreen';
import SettingsScreen from './SettingsScreen';

interface AppData {
    members: Member[];
    categories: string[];
    weeklyRecords: WeeklyRecord[];
    currentRecord: WeeklyRecord | null;
    formulas: Formulas;
    monthlyReports: MonthlyReport[];
    churchInfo: ChurchInfo;
    comisionados: Comisionado[];
}

interface AppHandlers {
    setMembers: React.Dispatch<React.SetStateAction<Member[]>>;
    setCategories: React.Dispatch<React.SetStateAction<string[]>>;
    setWeeklyRecords: React.Dispatch<React.SetStateAction<WeeklyRecord[]>>;
    setCurrentRecord: React.Dispatch<React.SetStateAction<WeeklyRecord | null>>;
    setFormulas: React.Dispatch<React.SetStateAction<Formulas>>;
    setMonthlyReports: React.Dispatch<React.SetStateAction<MonthlyReport[]>>;
    setChurchInfo: React.Dispatch<React.SetStateAction<ChurchInfo>>;
    setComisionados: React.Dispatch<React.SetStateAction<Comisionado[]>>;
    setTheme: React.Dispatch<React.SetStateAction<'light' | 'dark'>>;
}

interface WhatsAppAppProps {
  onLogout: () => void;
  data: AppData;
  handlers: AppHandlers;
  theme: string;
  toggleTheme: () => void;
}

const WhatsAppApp: React.FC<WhatsAppAppProps> = ({ onLogout, data, handlers, theme, toggleTheme }) => {
    // Determine the working date for entering new records. Defaults to today.
    const [workingDate, setWorkingDate] = useState<Date>(new Date());
    
    // activeTab: 'chats' | 'reports' | 'settings'
    const [activeTab, setActiveTab] = useState<'chats' | 'reports' | 'settings'>('chats');
    
    // selectedChat: memberId or 'ordinaria' or null
    const [selectedChatId, setSelectedChatId] = useState<string | null>(null);

    const handleBack = () => setSelectedChatId(null);

    return (
        <WhatsAppLayout 
            activeTab={activeTab} 
            onChangeTab={setActiveTab}
            selectedChatId={selectedChatId}
            theme={theme}
            toggleTheme={toggleTheme}
            onLogout={onLogout}
        >
            {selectedChatId ? (
                <ChatScreen 
                    chatId={selectedChatId} 
                    onBack={handleBack}
                    data={data}
                    handlers={handlers}
                    workingDate={workingDate}
                    setWorkingDate={setWorkingDate}
                />
            ) : (
                <>
                    {activeTab === 'chats' && (
                        <ChatList 
                            data={data} 
                            onSelectChat={setSelectedChatId} 
                            workingDate={workingDate}
                            setWorkingDate={setWorkingDate}
                        />
                    )}
                    {activeTab === 'reports' && (
                        <ReportsScreen 
                            data={data} 
                            handlers={handlers} 
                            workingDate={workingDate}
                            setWorkingDate={setWorkingDate}
                        />
                    )}
                    {activeTab === 'settings' && (
                        <SettingsScreen data={data} handlers={handlers} onLogout={onLogout} toggleTheme={toggleTheme} />
                    )}
                </>
            )}
        </WhatsAppLayout>
    );
};

export default WhatsAppApp;
