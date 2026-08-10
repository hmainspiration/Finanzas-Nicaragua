import React, { useState, useEffect, useRef } from 'react';
import { Member, WeeklyRecord, Offering, Formulas } from '../../types';
import { ArrowLeft, Send, CalendarDays, Check, CheckCheck } from 'lucide-react';

interface ChatScreenProps {
    chatId: string; // member.id or 'ordinaria'
    onBack: () => void;
    data: {
        members: Member[];
        categories: string[];
        weeklyRecords: WeeklyRecord[];
        formulas: Formulas;
    };
    handlers: {
        setWeeklyRecords: React.Dispatch<React.SetStateAction<WeeklyRecord[]>>;
    };
    workingDate: Date;
    setWorkingDate: (date: Date) => void;
}

type ChatMessage = {
    id: string;
    text: string;
    sender: 'user' | 'system';
    time: Date;
    type?: 'prompt_category' | 'confirmation';
    pendingAmount?: number;
};

const ChatScreen: React.FC<ChatScreenProps> = ({ chatId, onBack, data, handlers, workingDate, setWorkingDate }) => {
    const [inputText, setInputText] = useState('');
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const isGeneral = chatId === 'ordinaria';
    const member = isGeneral ? null : data.members.find(m => m.id === chatId);
    const chatName = isGeneral ? 'Ordinaria' : member?.name || 'Desconocido';

    const formattedDate = workingDate.toLocaleDateString('es-ES', { 
        weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' 
    });

    // Load actual history from weeklyRecords to show as system confirmation messages
    useEffect(() => {
        const historyMessages: ChatMessage[] = [];
        
        // Only load messages for the current workingDate to keep it relevant, or load all?
        // Let's load all for this member to simulate a real chat history.
        
        const sortedRecords = [...data.weeklyRecords].sort((a, b) => {
            const dateA = new Date(a.year, a.month - 1, a.day);
            const dateB = new Date(b.year, b.month - 1, b.day);
            return dateA.getTime() - dateB.getTime();
        });

        sortedRecords.forEach(record => {
            const date = new Date(record.year, record.month - 1, record.day);
            const offerings = record.offerings.filter(o => 
                isGeneral ? (!o.memberId || o.category === 'Ordinaria') : (o.memberId === chatId)
            );

            offerings.forEach(offering => {
                historyMessages.push({
                    id: offering.id,
                    text: `✅ Registrado: C$ ${offering.amount} en ${offering.category} (${date.toLocaleDateString()})`,
                    sender: 'system',
                    time: date,
                    type: 'confirmation'
                });
            });
        });

        setMessages(historyMessages);
    }, [chatId, data.weeklyRecords, isGeneral]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSend = () => {
        if (!inputText.trim()) return;

        const newMsg: ChatMessage = {
            id: crypto.randomUUID(),
            text: inputText.trim(),
            sender: 'user',
            time: new Date()
        };

        setMessages(prev => [...prev, newMsg]);
        processInput(inputText.trim(), newMsg.id);
        setInputText('');
    };

    const saveOffering = (amount: number, category: string) => {
        const dateKey = workingDate;
        
        const day = dateKey.getDate();
        const month = dateKey.getMonth() + 1;
        const year = dateKey.getFullYear();

        const newOffering: Offering = {
            id: crypto.randomUUID(),
            category: category,
            amount: amount,
            memberId: isGeneral ? undefined : chatId,
            memberName: isGeneral ? 'Ordinaria' : member?.name
        };

        handlers.setWeeklyRecords(prevRecords => {
            const existingRecordIndex = prevRecords.findIndex(
                r => r.day === day && r.month === month && r.year === year
            );

            if (existingRecordIndex >= 0) {
                const updatedRecords = [...prevRecords];
                const record = updatedRecords[existingRecordIndex];
                updatedRecords[existingRecordIndex] = {
                    ...record,
                    offerings: [...record.offerings, newOffering]
                };
                return updatedRecords;
            } else {
                return [...prevRecords, {
                    id: crypto.randomUUID(),
                    day, month, year,
                    minister: 'Manuel Salvador Alvarez Romero', // default
                    formulas: data.formulas,
                    offerings: [newOffering]
                }];
            }
        });

        // Add confirmation message
        setTimeout(() => {
            setMessages(prev => [...prev, {
                id: crypto.randomUUID(),
                text: `✅ Registrado: C$ ${amount} en ${category} para el ${formattedDate}`,
                sender: 'system',
                time: new Date(),
                type: 'confirmation'
            }]);
        }, 500);
    };

    const processInput = (text: string, msgId: string) => {
        const lowerText = text.toLowerCase();
        
        // Extract amount
        const amountMatch = text.match(/\d+(\.\d+)?/);
        const amount = amountMatch ? parseFloat(amountMatch[0]) : null;

        // Try to match category
        let matchedCategory = null;
        if (isGeneral) {
            matchedCategory = 'Ordinaria';
        } else {
            for (const cat of data.categories) {
                if (lowerText.includes(cat.toLowerCase())) {
                    matchedCategory = cat;
                    break;
                }
            }
        }

        if (amount !== null) {
            if (matchedCategory) {
                // We have both!
                saveOffering(amount, matchedCategory);
            } else {
                // Ask for category
                setTimeout(() => {
                    setMessages(prev => [...prev, {
                        id: crypto.randomUUID(),
                        text: `Recibido C$ ${amount}. ¿Qué categoría es?`,
                        sender: 'system',
                        time: new Date(),
                        type: 'prompt_category',
                        pendingAmount: amount
                    }]);
                }, 500);
            }
        } else if (matchedCategory) {
            // Check if there's a pending amount in the last system prompt
            const lastSystemMsg = [...messages].reverse().find(m => m.sender === 'system' && m.type === 'prompt_category');
            if (lastSystemMsg && lastSystemMsg.pendingAmount) {
                saveOffering(lastSystemMsg.pendingAmount, matchedCategory);
                // We could mark the prompt as resolved, but for simplicity we just leave it.
            } else {
                 setTimeout(() => {
                    setMessages(prev => [...prev, {
                        id: crypto.randomUUID(),
                        text: `Entendido categoría ${matchedCategory}. ¿Cuál es el monto?`,
                        sender: 'system',
                        time: new Date(),
                        type: 'prompt_category', // Re-using type to store state roughly
                    }]);
                }, 500);
            }
        } else {
            // Fallback checking for pending amounts again or just ask to specify
            setTimeout(() => {
                setMessages(prev => [...prev, {
                    id: crypto.randomUUID(),
                    text: `No entendí. Escriba el monto y la categoría (ej. "Diezmo 100").`,
                    sender: 'system',
                    time: new Date()
                }]);
            }, 500);
        }
    };

    const handleCategoryClick = (amount: number, category: string) => {
        // Send a fake user message
        const newMsg: ChatMessage = {
            id: crypto.randomUUID(),
            text: category,
            sender: 'user',
            time: new Date()
        };
        setMessages(prev => [...prev, newMsg]);
        saveOffering(amount, category);
    };

    return (
        <div className="flex flex-col h-full bg-[#efeae2] dark:bg-[#0b141a] relative">
            {/* WhatsApp Chat Background Pattern */}
            <div className="absolute inset-0 z-0 opacity-[0.06] dark:opacity-[0.03] pointer-events-none" 
                 style={{ backgroundImage: 'url("https://w0.peakpx.com/wallpaper/818/148/HD-wallpaper-whatsapp-background-solid-color-thumbnail.jpg")', backgroundRepeat: 'repeat' }}>
            </div>

            {/* Header */}
            <div className="bg-[#008069] dark:bg-[#202c33] text-white py-2 px-3 flex items-center shadow-sm z-10 sticky top-0">
                <button onClick={onBack} className="p-1 mr-1 rounded-full hover:bg-white/10 flex items-center">
                    <ArrowLeft className="w-6 h-6" />
                    <div className="w-9 h-9 rounded-full bg-[#cbd5e1] dark:bg-[#64748b] ml-1 flex items-center justify-center text-white text-lg font-medium">
                        {chatName.charAt(0).toUpperCase()}
                    </div>
                </button>
                <div className="flex-1 ml-3 truncate">
                    <h2 className="font-medium text-lg leading-tight truncate">{chatName}</h2>
                    <div className="text-xs text-white/80 flex items-center mt-0.5">
                        <div className="cursor-pointer hover:underline flex items-center relative overflow-hidden">
                            Trabajando para: {formattedDate}
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
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 z-10 space-y-3">
                <div className="flex justify-center mb-6 mt-2">
                    <div className="bg-[#fff3c8] dark:bg-[#182229] text-[#54656f] dark:text-[#ffd279] text-xs py-1.5 px-3 rounded-lg shadow-sm text-center max-w-[90%]">
                        {isGeneral 
                            ? 'Escriba el monto para registrar. Ej: "100".'
                            : 'Escriba "Monto Categoría" para registrar. Ej: "Diezmo 100".'
                        }
                    </div>
                </div>

                {messages.map((msg, index) => {
                    const isUser = msg.sender === 'user';
                    
                    // Group by date (simplified, just show date bubble if different from previous)
                    const prevMsg = index > 0 ? messages[index - 1] : null;
                    const showDate = !prevMsg || msg.time.toDateString() !== prevMsg.time.toDateString();

                    return (
                        <React.Fragment key={msg.id}>
                            {showDate && (
                                <div className="flex justify-center my-3">
                                    <div className="bg-white/90 dark:bg-[#182229]/90 text-[#54656f] dark:text-[#8696a0] text-xs py-1 px-3 rounded-full shadow-sm">
                                        {msg.time.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
                                    </div>
                                </div>
                            )}

                            <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[85%] rounded-lg px-3 py-2 shadow-sm relative ${
                                    isUser 
                                    ? 'bg-[#d9fdd3] dark:bg-[#005c4b] text-[#111b21] dark:text-[#e9edef] rounded-tr-none' 
                                    : 'bg-white dark:bg-[#202c33] text-[#111b21] dark:text-[#e9edef] rounded-tl-none'
                                }`}>
                                    <span className="text-[15px] leading-snug whitespace-pre-wrap block pr-12 pb-2">
                                        {msg.text}
                                    </span>
                                    
                                    <div className="absolute bottom-1 right-2 flex items-center space-x-1">
                                        <span className="text-[10px] text-black/40 dark:text-white/40">
                                            {msg.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                        {isUser && <CheckCheck className="w-[14px] h-[14px] text-[#53bdeb]" />}
                                    </div>

                                    {/* Action Buttons for System Prompts */}
                                    {msg.type === 'prompt_category' && msg.pendingAmount && (
                                        <div className="mt-3 flex flex-wrap gap-2 pb-1 border-t border-black/5 dark:border-white/5 pt-2">
                                            {data.categories.map(cat => (
                                                <button 
                                                    key={cat}
                                                    onClick={() => handleCategoryClick(msg.pendingAmount!, cat)}
                                                    className="bg-[#f0f2f5] dark:bg-[#2a3942] text-[#00a884] text-xs font-medium px-3 py-1.5 rounded-full hover:bg-[#e9edef] dark:hover:bg-[#32424b] transition-colors"
                                                >
                                                    {cat}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </React.Fragment>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="bg-[#f0f2f5] dark:bg-[#202c33] p-2 flex items-end z-10">
                <div className="relative flex items-center justify-center p-3 text-[#54656f] dark:text-[#8696a0] hover:text-[#00a884] transition-colors rounded-full overflow-hidden">
                    <CalendarDays className="w-6 h-6" />
                    <input 
                        type="date" 
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:cursor-pointer" 
                        value={new Date(workingDate.getTime() - (workingDate.getTimezoneOffset() * 60000)).toISOString().split('T')[0]}
                        onChange={(e) => {
                            if(e.target.value) setWorkingDate(new Date(e.target.value + 'T12:00:00'));
                        }}
                    />
                </div>
                
                <div className="flex-1 bg-white dark:bg-[#2a3942] rounded-2xl flex items-end mx-1 min-h-[44px]">
                    <textarea
                        className="w-full bg-transparent text-foreground dark:text-[#e9edef] px-4 py-3 max-h-32 focus:outline-none resize-none overflow-y-auto placeholder:text-muted-foreground/70 text-[15px]"
                        placeholder={isGeneral ? "Mensaje (ej. 100)" : "Mensaje (ej. Diezmo 100)"}
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSend();
                            }
                        }}
                        rows={1}
                        style={{ minHeight: '44px' }}
                    />
                </div>
                
                <button 
                    onClick={handleSend}
                    disabled={!inputText.trim()}
                    className={`p-3 rounded-full ml-1 flex items-center justify-center transition-colors ${
                        inputText.trim() 
                        ? 'bg-[#00a884] text-white hover:bg-[#008f6f]' 
                        : 'bg-[#00a884]/50 text-white cursor-not-allowed'
                    }`}
                >
                    <Send className="w-5 h-5 ml-1" />
                </button>
            </div>
        </div>
    );
};

export default ChatScreen;
