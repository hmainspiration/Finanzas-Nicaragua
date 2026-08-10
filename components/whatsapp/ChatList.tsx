import React, { useState } from 'react';
import { Member, WeeklyRecord } from '../../types';
import { Search, CalendarDays } from 'lucide-react';

interface ChatListProps {
    data: {
        members: Member[];
        weeklyRecords: WeeklyRecord[];
        categories: string[];
    };
    onSelectChat: (id: string) => void;
    workingDate: Date;
    setWorkingDate: (date: Date) => void;
}

const ChatList: React.FC<ChatListProps> = ({ data, onSelectChat, workingDate, setWorkingDate }) => {
    const [searchQuery, setSearchQuery] = useState('');

    const formattedDate = workingDate.toLocaleDateString('es-ES', { 
        weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' 
    });

    const activeMembers = data.members.filter(m => m.isActive);
    
    // Sort members alphabetically
    const sortedMembers = [...activeMembers].sort((a, b) => a.name.localeCompare(b.name));

    const filteredChats = sortedMembers.filter(m => 
        m.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Get today's offerings for summary (using workingDate)
    const todayRecord = data.weeklyRecords.find(r => 
        r.day === workingDate.getDate() && 
        r.month === workingDate.getMonth() + 1 && 
        r.year === workingDate.getFullYear()
    );

    const getChatSubtitle = (memberId: string) => {
        if (!todayRecord) return 'Sin ofrendas hoy';
        const memberOfferings = todayRecord.offerings.filter(o => o.memberId === memberId);
        if (memberOfferings.length === 0) return 'Sin ofrendas hoy';
        
        const total = memberOfferings.reduce((sum, o) => sum + o.amount, 0);
        const categories = memberOfferings.map(o => o.category).join(', ');
        return `C$ ${total} (${categories})`;
    };

    const getOrdinariaSubtitle = () => {
        if (!todayRecord) return 'Sin ofrendas hoy';
        const ordOfferings = todayRecord.offerings.filter(o => !o.memberId || o.category === 'Ordinaria');
        if (ordOfferings.length === 0) return 'Sin ofrendas hoy';
        
        const total = ordOfferings.reduce((sum, o) => sum + o.amount, 0);
        return `C$ ${total} recolectado`;
    };

    return (
        <div className="flex flex-col h-full bg-background dark:bg-[#111b21]">
            {/* Header */}
            <div className="bg-[#00a884] dark:bg-[#202c33] text-white pt-4 pb-2 px-4 shadow-sm z-10">
                <div className="flex justify-between items-center mb-4">
                    <h1 className="text-xl font-medium">Finanzas LLDM</h1>
                    <div className="flex items-center space-x-4">
                        <div className="relative cursor-pointer flex items-center bg-black/20 hover:bg-black/30 px-3 py-1.5 rounded-full transition-colors overflow-hidden">
                            <CalendarDays className="w-4 h-4 mr-2" />
                            <span className="text-sm font-medium">{formattedDate}</span>
                            <input 
                                type="date" 
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:cursor-pointer" 
                                value={new Date(workingDate.getTime() - (workingDate.getTimezoneOffset() * 60000)).toISOString().split('T')[0]}
                                onChange={(e) => {
                                    if(e.target.value) setWorkingDate(new Date(e.target.value + 'T12:00:00'));
                                }}
                            />
                        </div>
                    </div>
                </div>
                
                {/* Search Bar */}
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-4 w-4 text-white/70" />
                    </div>
                    <input
                        type="text"
                        placeholder="Buscar miembro..."
                        className="w-full bg-white/10 dark:bg-[#2a3942] text-white placeholder-white/70 rounded-lg pl-10 pr-4 py-2 focus:outline-none focus:ring-2 focus:ring-white/30"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            {/* Chat List */}
            <div className="flex-1 overflow-y-auto">
                {/* Special Chat: Ofrenda General/Ordinaria */}
                {!searchQuery && (
                    <div 
                        className="flex items-center px-4 py-3 hover:bg-black/5 dark:hover:bg-[#202c33] cursor-pointer border-b border-border/50"
                        onClick={() => onSelectChat('ordinaria')}
                    >
                        <div className="w-12 h-12 rounded-full bg-[#00a884] flex-shrink-0 flex items-center justify-center text-white text-xl font-bold">
                            O
                        </div>
                        <div className="ml-4 flex-1 border-b border-transparent">
                            <div className="flex justify-between items-baseline">
                                <h2 className="text-foreground dark:text-[#e9edef] font-medium text-lg">Ofrenda General</h2>
                            </div>
                            <p className="text-muted-foreground dark:text-[#8696a0] text-sm truncate">
                                {getOrdinariaSubtitle()}
                            </p>
                        </div>
                    </div>
                )}

                {/* Member Chats */}
                {filteredChats.map(member => (
                    <div 
                        key={member.id}
                        className="flex items-center px-4 py-3 hover:bg-black/5 dark:hover:bg-[#202c33] cursor-pointer"
                        onClick={() => onSelectChat(member.id)}
                    >
                        <div className="w-12 h-12 rounded-full bg-[#cbd5e1] dark:bg-[#64748b] flex-shrink-0 flex items-center justify-center text-white text-xl font-medium">
                            {member.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="ml-4 flex-1 border-b border-border/50 pb-3 mt-3">
                            <div className="flex justify-between items-baseline">
                                <h2 className="text-foreground dark:text-[#e9edef] font-medium text-lg truncate pr-2">{member.name}</h2>
                            </div>
                            <p className="text-muted-foreground dark:text-[#8696a0] text-sm truncate">
                                {getChatSubtitle(member.id)}
                            </p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ChatList;
