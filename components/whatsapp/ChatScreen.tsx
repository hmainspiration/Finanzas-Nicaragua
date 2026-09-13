import React, { useState, useEffect, useRef } from 'react';
import { Member, WeeklyRecord, Offering, Formulas } from '../../types';
import { ArrowLeft, Send, CalendarDays, Check, CheckCheck, Tag, Plus, Flame, Zap, Droplets, HelpCircle } from 'lucide-react';
import { useSupabase } from '../../context/SupabaseContext';

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
        setCategories?: React.Dispatch<React.SetStateAction<string[]>>;
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
    resolved?: boolean;
    selectedCategory?: string;
};

// Normalizar texto para comparaciones sin tildes ni mayúsculas
const normalize = (str: string): string => 
    str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

// Servicios Públicos Oficiales: Agua, Luz, Internet, Cable, Tel, Gas, Imp.
const isServiceCategoryName = (name: string): boolean => {
    const clean = normalize(name);
    return ['gas', 'luz', 'agua', 'internet', 'wifi', 'cable', 'tel', 'imp', 'servicio'].some(s => 
        clean === s || clean.startsWith(s) || clean.includes(` ${s}`) || clean.includes(s)
    );
};

const ChatScreen: React.FC<ChatScreenProps> = ({ chatId, onBack, data, handlers, workingDate, setWorkingDate }) => {
    const [inputText, setInputText] = useState('');
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [customCatModalOpen, setCustomCatModalOpen] = useState<{ open: boolean; msgId?: string; amount?: number }>({ open: false });
    const [customCatInput, setCustomCatInput] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const { addItem } = useSupabase();

    const isGeneral = chatId === 'ordinaria';
    const member = isGeneral ? null : data.members.find(m => m.id === chatId);
    const chatName = isGeneral ? 'Ordinaria' : member?.name || 'Desconocido';

    const formattedDate = workingDate.toLocaleDateString('es-ES', { 
        weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' 
    });

    // Load actual history from weeklyRecords to show as system confirmation messages
    useEffect(() => {
        const historyMessages: ChatMessage[] = [];
        
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
                const isService = isServiceCategoryName(offering.category);
                const serviceTag = isService ? ' (Servicios Públicos)' : '';
                historyMessages.push({
                    id: offering.id,
                    text: `✅ Registrado: C$ ${offering.amount} en ${offering.category}${serviceTag} (${date.toLocaleDateString()})`,
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

    // Registrar ofrenda y asegurar que la categoría exista en el sistema
    const saveOffering = (amount: number, category: string) => {
        const dateKey = workingDate;
        
        const day = dateKey.getDate();
        const month = dateKey.getMonth() + 1;
        const year = dateKey.getFullYear();

        // Si la categoría no existe en data.categories (ej. "Gas"), agregarla para que esté disponible en toda la app
        if (handlers.setCategories && !data.categories.includes(category)) {
            handlers.setCategories(prev => {
                if (prev.includes(category)) return prev;
                return [...prev, category];
            });
            try {
                addItem('categories', { name: category }).catch(() => {});
            } catch (e) {
                // Ignore silent db failure
            }
        }

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
        const isService = isServiceCategoryName(category);
        const serviceSuffix = isService ? ' (Servicios Públicos)' : '';

        setTimeout(() => {
            setMessages(prev => [...prev, {
                id: crypto.randomUUID(),
                text: `✅ Registrado: C$ ${amount} en ${category}${serviceSuffix} para el ${formattedDate}`,
                sender: 'system',
                time: new Date(),
                type: 'confirmation'
            }]);
        }, 400);
    };

    // Detección inteligente de categoría y Servicios Públicos
    const detectSmartCategory = (text: string): { category: string; isService: boolean } | null => {
        const clean = normalize(text);

        // 1. Coincidencia con categorías existentes del sistema
        for (const cat of data.categories) {
            const cleanCat = normalize(cat);
            const regex = new RegExp(`\\b${cleanCat}\\b`, 'i');
            if (regex.test(clean) || clean.includes(cleanCat)) {
                return { category: cat, isService: isServiceCategoryName(cat) };
            }
        }

        // 2. Logística de Pago de Servicios Públicos (Agua, Luz, Internet, Cable, Tel, Gas, Imp.)
        // Tel = Teléfono, Imp = Impuestos
        if (/\bgas\b/i.test(clean)) {
            const existing = data.categories.find(c => normalize(c) === 'gas');
            return { category: existing || 'Gas', isService: true };
        }
        if (/\b(luz|energia|electricidad)\b/i.test(clean)) {
            const existing = data.categories.find(c => normalize(c) === 'luz');
            return { category: existing || 'Luz', isService: true };
        }
        if (/\bagua\b/i.test(clean)) {
            const existing = data.categories.find(c => normalize(c) === 'agua');
            return { category: existing || 'Agua', isService: true };
        }
        if (/\b(internet|wifi|wi-fi|fibra)\b/i.test(clean)) {
            const existing = data.categories.find(c => normalize(c).includes('internet'));
            return { category: existing || 'Internet', isService: true };
        }
        if (/\b(cable|tv)\b/i.test(clean)) {
            const existing = data.categories.find(c => normalize(c).includes('cable'));
            return { category: existing || 'Cable', isService: true };
        }
        if (/\b(tel|telefono|celular|recarga)\b/i.test(clean)) {
            const existing = data.categories.find(c => normalize(c).includes('tel'));
            return { category: existing || 'Teléfono', isService: true };
        }
        if (/\b(imp|impuesto|impuestos|alcaldia)\b/i.test(clean)) {
            const existing = data.categories.find(c => normalize(c).includes('imp'));
            return { category: existing || 'Impuestos', isService: true };
        }
        if (/\b(servicio|servicios)\b/i.test(clean)) {
            const existing = data.categories.find(c => normalize(c).includes('servicio'));
            return { category: existing || 'Servicios Públicos', isService: true };
        }

        // 3. Otras categorías estándar
        if (/\bdiezmo\b/i.test(clean)) return { category: 'Diezmo', isService: false };
        if (/\b(ordinaria|ofrenda)\b/i.test(clean)) return { category: 'Ordinaria', isService: false };
        if (/\bprimicia[s]?\b/i.test(clean)) return { category: 'Primicias', isService: false };
        if (/\bceremonial\b/i.test(clean)) return { category: 'Ceremonial', isService: false };
        if (/\b(construccion|pro-construccion|proconstruccion|pro\s+construccion)\b/i.test(clean)) return { category: 'Construcción Local', isService: false };

        return null;
    };

    const processInput = (text: string, msgId: string) => {
        // Extraer monto numérico (ej. 20, 20.50, 100, C$ 50)
        const amountMatch = text.match(/\d+(\.\d+)?/);
        const amount = amountMatch ? parseFloat(amountMatch[0]) : null;

        // Si es el chat Ordinaria General, categoría fija
        let matchedCategoryInfo = isGeneral ? { category: 'Ordinaria', isService: false } : detectSmartCategory(text);

        if (amount !== null) {
            if (matchedCategoryInfo) {
                // Tenemos monto y categoría identificada (ej. "Gas 50" o "Diezmo 100")
                saveOffering(amount, matchedCategoryInfo.category);
            } else {
                // Solo tenemos monto -> Preguntar categoría con botones grandes para personas mayores
                setTimeout(() => {
                    setMessages(prev => [...prev, {
                        id: crypto.randomUUID(),
                        text: `Recibido C$ ${amount}. ¿Qué categoría es?`,
                        sender: 'system',
                        time: new Date(),
                        type: 'prompt_category',
                        pendingAmount: amount,
                        resolved: false
                    }]);
                }, 400);
            }
        } else if (matchedCategoryInfo) {
            // El usuario escribió solo una categoría (ej. "Gas" o "Diezmo")
            // Revisar si había un monto pendiente en la última solicitud del sistema
            const lastSystemMsg = [...messages].reverse().find(m => 
                m.sender === 'system' && m.type === 'prompt_category' && !m.resolved && m.pendingAmount
            );

            if (lastSystemMsg && lastSystemMsg.pendingAmount) {
                // Marcar ese mensaje como resuelto
                setMessages(prev => prev.map(m => m.id === lastSystemMsg.id ? { ...m, resolved: true, selectedCategory: matchedCategoryInfo!.category } : m));
                saveOffering(lastSystemMsg.pendingAmount, matchedCategoryInfo.category);
            } else {
                const serviceNote = matchedCategoryInfo.isService ? ' (Servicios Públicos)' : '';
                setTimeout(() => {
                    setMessages(prev => [...prev, {
                        id: crypto.randomUUID(),
                        text: `Entendido categoría ${matchedCategoryInfo!.category}${serviceNote}. ¿Cuál es el monto? (ej. 50)`,
                        sender: 'system',
                        time: new Date(),
                        type: 'prompt_category',
                    }]);
                }, 400);
            }
        } else {
            // No entendió
            setTimeout(() => {
                setMessages(prev => [...prev, {
                    id: crypto.randomUUID(),
                    text: `No entendí. Escriba el monto y la categoría (ej. "Diezmo 100" o "Gas 50").`,
                    sender: 'system',
                    time: new Date()
                }]);
            }, 400);
        }
    };

    const handleCategoryClick = (systemMsgId: string, amount: number, category: string) => {
        // 1. Marcar el mensaje como resuelto para bloquear doble clic involuntario
        setMessages(prev => prev.map(m => m.id === systemMsgId ? { ...m, resolved: true, selectedCategory: category } : m));

        // 2. Enviar mensaje del usuario en el chat
        const userMsg: ChatMessage = {
            id: crypto.randomUUID(),
            text: category,
            sender: 'user',
            time: new Date()
        };
        setMessages(prev => [...prev, userMsg]);

        // 3. Guardar ofrenda
        saveOffering(amount, category);
    };

    const handleCustomCategorySubmit = () => {
        if (!customCatInput.trim() || !customCatModalOpen.amount || !customCatModalOpen.msgId) return;
        const cat = customCatInput.trim();
        handleCategoryClick(customCatModalOpen.msgId, customCatModalOpen.amount, cat);
        setCustomCatModalOpen({ open: false });
        setCustomCatInput('');
    };

    // Obtener lista ordenada de categorías asegurando la presencia de "Gas" y los principales servicios
    const getOrderedCategories = (): string[] => {
        const priorityCategories = ['Diezmo', 'Ordinaria', 'Primicias', 'Luz', 'Agua', 'Gas', 'Ceremonial', 'Construcción Local'];
        const uniqueSet = new Set<string>();

        // Primero las prioritarias si existen o son Gas
        priorityCategories.forEach(c => {
            if (data.categories.includes(c) || c === 'Gas') {
                uniqueSet.add(c);
            }
        });

        // Luego las demás que el usuario haya creado
        data.categories.forEach(c => uniqueSet.add(c));

        return Array.from(uniqueSet);
    };

    const displayCategories = getOrderedCategories();

    return (
        <div className="flex flex-col h-full bg-[#efeae2] dark:bg-[#0b141a] relative">
            {/* WhatsApp Chat Background Pattern */}
            <div className="absolute inset-0 z-0 opacity-[0.06] dark:opacity-[0.03] pointer-events-none" 
                 style={{ backgroundImage: 'url("https://w0.peakpx.com/wallpaper/818/148/HD-wallpaper-whatsapp-background-solid-color-thumbnail.jpg")', backgroundRepeat: 'repeat' }}>
            </div>

            {/* Header */}
            <div className="bg-[#008069] dark:bg-[#202c33] text-white py-2.5 px-3 flex items-center shadow-sm z-10 sticky top-0">
                <button onClick={onBack} className="p-1 mr-1 rounded-full hover:bg-white/10 flex items-center">
                    <ArrowLeft className="w-6 h-6" />
                    <div className="w-10 h-10 rounded-full bg-[#cbd5e1] dark:bg-[#64748b] ml-1 flex items-center justify-center text-white text-lg font-bold">
                        {chatName.charAt(0).toUpperCase()}
                    </div>
                </button>
                <div className="flex-1 ml-3 truncate">
                    <h2 className="font-semibold text-lg leading-tight truncate">{chatName}</h2>
                    <div className="text-xs text-white/90 flex items-center mt-0.5">
                        <div className="cursor-pointer hover:underline flex items-center relative overflow-hidden font-medium">
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
            <div className="flex-1 overflow-y-auto p-3 sm:p-4 z-10 space-y-3">
                <div className="flex justify-center mb-5 mt-1">
                    <div className="bg-[#fff3c8] dark:bg-[#182229] text-[#54656f] dark:text-[#ffd279] text-xs sm:text-sm font-medium py-2 px-3.5 rounded-lg shadow-sm text-center max-w-[95%] border border-[#f0e3ad] dark:border-white/5">
                        {isGeneral 
                            ? 'Escriba el monto para registrar. Ej: "100".'
                            : 'Escriba "Monto Categoría" para registrar. Ej: "Diezmo 100" o "Gas 50".'
                        }
                    </div>
                </div>

                {messages.map((msg, index) => {
                    const isUser = msg.sender === 'user';
                    const isPromptCategory = msg.type === 'prompt_category' && !!msg.pendingAmount;
                    
                    const prevMsg = index > 0 ? messages[index - 1] : null;
                    const showDate = !prevMsg || msg.time.toDateString() !== prevMsg.time.toDateString();

                    return (
                        <React.Fragment key={msg.id}>
                            {showDate && (
                                <div className="flex justify-center my-3">
                                    <div className="bg-white/90 dark:bg-[#182229]/90 text-[#54656f] dark:text-[#8696a0] text-xs font-medium py-1 px-3.5 rounded-full shadow-sm">
                                        {msg.time.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
                                    </div>
                                </div>
                            )}

                            <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                                <div className={`rounded-xl px-3.5 py-2.5 shadow-sm relative transition-all ${
                                    isUser 
                                    ? 'bg-[#d9fdd3] dark:bg-[#005c4b] text-[#111b21] dark:text-[#e9edef] rounded-tr-none max-w-[85%]' 
                                    : isPromptCategory
                                        ? 'bg-white dark:bg-[#202c33] text-[#111b21] dark:text-[#e9edef] rounded-tl-none w-full max-w-[96%] sm:max-w-[85%] border border-black/5 dark:border-white/10 shadow-md'
                                        : 'bg-white dark:bg-[#202c33] text-[#111b21] dark:text-[#e9edef] rounded-tl-none max-w-[85%]'
                                }`}>
                                    
                                    {/* Encabezado del mensaje normal o de selección */}
                                    {isPromptCategory ? (
                                        <div className="pr-12 pb-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-2xl sm:text-3xl font-black text-[#008069] dark:text-[#25d366] tracking-tight">
                                                    C$ {msg.pendingAmount}
                                                </span>
                                                <span className="text-[11px] uppercase tracking-wider font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 px-2 py-0.5 rounded">
                                                    Monto recibido
                                                </span>
                                            </div>
                                            <p className="text-[15px] sm:text-[16px] text-[#111b21] dark:text-[#e9edef] font-semibold leading-tight">
                                                ¿A qué categoría corresponde este aporte?
                                            </p>
                                        </div>
                                    ) : (
                                        <span className="text-[15px] sm:text-[16px] leading-snug whitespace-pre-wrap block pr-12 pb-2">
                                            {msg.text}
                                        </span>
                                    )}
                                    
                                    {/* Hora y checks de mensaje */}
                                    <div className="absolute bottom-1.5 right-2.5 flex items-center space-x-1">
                                        <span className="text-[10px] text-black/40 dark:text-white/40 font-medium">
                                            {msg.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                        {isUser && <CheckCheck className="w-[14px] h-[14px] text-[#53bdeb]" />}
                                    </div>

                                    {/* VISTA DE OPCIONES DE CATEGORÍAS MEJORADA PARA PERSONAS MAYORES */}
                                    {isPromptCategory && (
                                        <div className="mt-3 pt-2.5 border-t border-black/10 dark:border-white/10">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-xs sm:text-[13px] font-bold text-[#008069] dark:text-[#25d366] flex items-center gap-1.5">
                                                    <Tag className="w-3.5 h-3.5" />
                                                    Toque una categoría para registrar:
                                                </span>
                                                {msg.resolved && (
                                                    <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/60 px-2.5 py-0.5 rounded-full border border-emerald-300 dark:border-emerald-700">
                                                        ✓ Registrado
                                                    </span>
                                                )}
                                            </div>

                                            {/* Cuadrícula de 2 columnas con botones táctiles grandes para evitar toques erróneos */}
                                            <div className="grid grid-cols-2 gap-2.5 sm:gap-3 my-1">
                                                {displayCategories.map(cat => {
                                                    const isSelected = msg.resolved && msg.selectedCategory === cat;
                                                    const isPublicService = isServiceCategoryName(cat);

                                                    return (
                                                        <button 
                                                            key={cat}
                                                            disabled={msg.resolved}
                                                            onClick={() => handleCategoryClick(msg.id, msg.pendingAmount!, cat)}
                                                            className={`
                                                                relative min-h-[56px] sm:min-h-[60px] px-3 py-2 rounded-xl
                                                                flex flex-col items-center justify-center text-center
                                                                transition-all duration-150 select-none
                                                                ${isSelected
                                                                    ? 'bg-[#008069] text-white border-2 border-[#008069] shadow-md font-bold'
                                                                    : msg.resolved
                                                                        ? 'bg-gray-100 dark:bg-[#182229] text-gray-400 border-2 border-transparent opacity-50'
                                                                        : 'bg-white dark:bg-[#202c33] text-[#111b21] dark:text-[#e9edef] border-2 border-[#00a884]/40 hover:border-[#00a884] hover:bg-emerald-50/60 dark:hover:bg-[#2a3942] active:scale-[0.96] shadow-sm'
                                                                }
                                                            `}
                                                        >
                                                            <span className="text-[15px] sm:text-[16px] font-bold leading-tight line-clamp-2">
                                                                {cat}
                                                            </span>
                                                            {isPublicService && (
                                                                <span className={`text-[10px] sm:text-[11px] font-semibold mt-0.5 ${
                                                                    isSelected ? 'text-emerald-100' : 'text-[#008069] dark:text-[#25d366]'
                                                                }`}>
                                                                    Serv. Público
                                                                </span>
                                                            )}
                                                            {isSelected && (
                                                                <span className="absolute top-1 right-1 bg-white text-[#008069] rounded-full p-0.5">
                                                                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                                                                </span>
                                                            )}
                                                        </button>
                                                    );
                                                })}
                                            </div>

                                            {/* Botón para otra categoría personalizada */}
                                            {!msg.resolved && (
                                                <button
                                                    onClick={() => setCustomCatModalOpen({ open: true, msgId: msg.id, amount: msg.pendingAmount })}
                                                    className="w-full mt-2 min-h-[46px] flex items-center justify-center gap-1.5 text-xs sm:text-sm font-semibold text-[#008069] dark:text-[#25d366] bg-emerald-50 dark:bg-[#1c282f] border border-dashed border-[#00a884]/50 rounded-xl hover:bg-emerald-100 dark:hover:bg-[#24333c] transition-colors"
                                                >
                                                    <Plus className="w-4 h-4" />
                                                    ¿Otra categoría no listada? Escribir aquí
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </React.Fragment>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>

            {/* Modal para ingresar categoría personalizada si se necesita */}
            {customCatModalOpen.open && (
                <div className="absolute inset-0 bg-black/60 z-30 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-background dark:bg-[#202c33] rounded-2xl p-5 w-full max-w-sm shadow-2xl border border-border space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-bold text-foreground dark:text-[#e9edef] flex items-center gap-2">
                                <Tag className="w-5 h-5 text-[#00a884]" />
                                Otra Categoría
                            </h3>
                            <button 
                                onClick={() => setCustomCatModalOpen({ open: false })}
                                className="text-muted-foreground hover:text-foreground text-sm font-bold p-1"
                            >
                                ✕
                            </button>
                        </div>
                        <p className="text-sm text-muted-foreground">
                            Ingrese el nombre de la categoría para registrar los <strong>C$ {customCatModalOpen.amount}</strong>:
                        </p>
                        <input 
                            type="text"
                            autoFocus
                            placeholder="Ej. Gas, Internet, Flores..."
                            value={customCatInput}
                            onChange={(e) => setCustomCatInput(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleCustomCategorySubmit();
                            }}
                            className="w-full p-3 rounded-xl border border-border bg-card dark:bg-[#2a3942] text-foreground text-base focus:outline-none focus:ring-2 focus:ring-[#00a884]"
                        />
                        <div className="flex gap-2 justify-end">
                            <button
                                onClick={() => setCustomCatModalOpen({ open: false })}
                                className="px-4 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:bg-muted"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleCustomCategorySubmit}
                                disabled={!customCatInput.trim()}
                                className="px-5 py-2.5 rounded-xl text-sm font-bold bg-[#00a884] text-white hover:bg-[#008f6f] disabled:opacity-50"
                            >
                                Guardar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Input Area */}
            <div className="bg-[#f0f2f5] dark:bg-[#202c33] p-2 sm:p-2.5 flex items-end z-10 border-t border-black/5 dark:border-white/5">
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
                
                <div className="flex-1 bg-white dark:bg-[#2a3942] rounded-2xl flex items-end mx-1 min-h-[46px] border border-black/5 dark:border-white/5 shadow-sm">
                    <textarea
                        className="w-full bg-transparent text-foreground dark:text-[#e9edef] px-4 py-3 max-h-32 focus:outline-none resize-none overflow-y-auto placeholder:text-muted-foreground/70 text-[16px]"
                        placeholder={isGeneral ? "Mensaje (ej. 100)" : "Escriba (ej. Diezmo 100, Gas 50, o 20)"}
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSend();
                            }
                        }}
                        rows={1}
                        style={{ minHeight: '46px' }}
                    />
                </div>
                
                <button 
                    onClick={handleSend}
                    disabled={!inputText.trim()}
                    className={`p-3 rounded-full ml-1 flex items-center justify-center transition-colors min-w-[46px] min-h-[46px] shadow-sm ${
                        inputText.trim() 
                        ? 'bg-[#00a884] text-white hover:bg-[#008f6f]' 
                        : 'bg-[#00a884]/50 text-white cursor-not-allowed'
                    }`}
                >
                    <Send className="w-5 h-5 ml-0.5" />
                </button>
            </div>
        </div>
    );
};

export default ChatScreen;
