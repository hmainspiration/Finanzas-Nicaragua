import React, { useState, useMemo } from 'react';
import { WeeklyRecord, Member, Offering, Formulas, ChurchInfo } from '../types';
import Header from '../components/layout/Header';
import { CirclePlus, BarChart2, CalendarDays, Trash2, Plus, X, Search, Wallet } from 'lucide-react';
import { MONTH_NAMES } from '../constants';
import { useSupabase } from '../context/SupabaseContext';

// --- Componentes Internos para la UI Sencilla ---

interface AutocompleteInputProps {
  members: Member[];
  onSelect: (member: Member) => void;
  value: string;
  setValue: (value: string) => void;
}

const SimpleAutocompleteInput: React.FC<AutocompleteInputProps> = ({ members, onSelect, value, setValue }) => {
  const [suggestions, setSuggestions] = useState<Member[]>([]);
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setValue(val);
    if (val) {
      setSuggestions(
        members.filter(m => m.name.toLowerCase().includes(val.toLowerCase())).slice(0, 5)
      );
    } else {
      setSuggestions([]);
    }
  };
  const handleSelect = (member: Member) => {
    onSelect(member);
    setValue(member.name);
    setSuggestions([]);
  };
  return (
    <div className="relative">
      <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input 
            type="text" 
            value={value} 
            onChange={handleChange} 
            placeholder="Buscar miembro..." 
            className="w-full pl-11 pr-4 py-4 text-lg bg-gray-50 border-0 ring-1 ring-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all dark:bg-zinc-800 dark:ring-zinc-700 dark:text-white dark:focus:bg-zinc-900"
          />
      </div>
      {suggestions.length > 0 && (
        <ul className="absolute z-20 w-full mt-2 overflow-hidden bg-white/90 dark:bg-zinc-800/95 backdrop-blur-md border border-gray-100 dark:border-zinc-700 rounded-2xl shadow-xl max-h-60">
          {suggestions.map(member => (
            <li key={member.id} onClick={() => handleSelect(member)} className="px-5 py-3 text-lg cursor-pointer hover:bg-blue-50 dark:text-gray-200 dark:hover:bg-zinc-700/70 transition-colors border-b border-gray-50 dark:border-zinc-700/50 last:border-0">
                {member.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};


// --- Pestañas de la UI Sencilla ---

const RegistroSencilloTab: React.FC<{record: WeeklyRecord, setRecord: React.Dispatch<React.SetStateAction<WeeklyRecord | null>>, members: Member[], setMembers: React.Dispatch<React.SetStateAction<Member[]>>, categories: string[], setCategories: React.Dispatch<React.SetStateAction<string[]>>}> = ({ record, setRecord, members, setMembers, categories, setCategories }) => {
    const { addItem } = useSupabase();
    const [selectedMember, setSelectedMember] = useState<Member | null>(null);
    const [memberNameInput, setMemberNameInput] = useState('');
    const [amount, setAmount] = useState('');
    const [category, setCategory] = useState(categories.find(c => c === "Diezmo") || categories[0]);
    
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [newMemberName, setNewMemberName] = useState('');
    const [newCategoryName, setNewCategoryName] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);


    const handleAddOffering = () => {
        if (!selectedMember || !amount || parseFloat(amount) <= 0) {
            alert("Por favor, seleccione un miembro y una cantidad válida.");
            return;
        }
        const newOffering: Offering = {
            id: `d-${Date.now()}`,
            memberId: selectedMember.id,
            memberName: selectedMember.name,
            category: category,
            amount: parseFloat(amount),
        };
        setRecord(prev => prev ? { ...prev, offerings: [...prev.offerings, newOffering] } : null);
        setSelectedMember(null);
        setMemberNameInput('');
        setAmount('');
    };
    
    const handleRemoveOffering = (offeringId: string) => {
        setRecord(prev => prev ? { ...prev, offerings: prev.offerings.filter(d => d.id !== offeringId) } : null);
    };
    
    const handleAddNewMember = async () => {
        if (!newMemberName.trim() || members.some(m => m.name.toLowerCase() === newMemberName.trim().toLowerCase())) {
            alert('El nombre del miembro no puede estar vacío o ya existe.');
            return;
        }
        setIsSubmitting(true);
        try {
            const newMember = await addItem('members', { name: newMemberName.trim() });
            setMembers(prev => [...prev, newMember].sort((a,b) => a.name.localeCompare(b.name)));
            setNewMemberName('');
            alert(`Miembro "${newMember.name}" agregado.`);
        } catch (error) {
            alert(`Error al agregar miembro: ${error instanceof Error ? error.message : String(error)}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleAddNewCategory = async () => {
        if (!newCategoryName.trim() || categories.includes(newCategoryName.trim())) {
            alert('La categoría no puede estar vacía o ya existe.');
            return;
        }
        setIsSubmitting(true);
        try {
            const newCategoryItem = await addItem('categories', { name: newCategoryName.trim() });
            setCategories(prev => [...prev, newCategoryItem.name].sort());
            setCategory(newCategoryItem.name); // Select the new category by default
            setNewCategoryName('');
            alert(`Categoría "${newCategoryItem.name}" agregada.`);
        } catch (error) {
            alert(`Error al agregar categoría: ${error instanceof Error ? error.message : String(error)}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="space-y-6 pb-20">
             {isAddModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-center items-center p-4 transition-opacity animate-in fade-in">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md relative dark:bg-zinc-900 overflow-hidden border border-gray-100 dark:border-zinc-800">
                        <div className="p-4 border-b border-gray-100 dark:border-zinc-800 flex justify-between items-center bg-gray-50/50 dark:bg-zinc-800/50">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Administración Rápida</h3>
                            <button onClick={() => setIsAddModalOpen(false)} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors text-gray-500 dark:text-gray-400">
                                <X className="w-5 h-5"/>
                            </button>
                        </div>
                        
                        <div className="p-6 space-y-8">
                            <div>
                                <h4 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Nuevo Miembro</h4>
                                <div className="flex gap-2">
                                    <input type="text" value={newMemberName} onChange={e => setNewMemberName(e.target.value)} placeholder="Nombre completo" className="flex-grow p-3 bg-gray-50 border border-gray-200 rounded-xl dark:bg-zinc-800 dark:border-zinc-700 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"/>
                                    <button onClick={handleAddNewMember} disabled={isSubmitting} className="px-4 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors">
                                        <Plus className="w-5 h-5"/>
                                    </button>
                                </div>
                            </div>
                            
                            <div className="relative">
                                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                                    <div className="w-full border-t border-gray-100 dark:border-zinc-800"></div>
                                </div>
                                <div className="relative flex justify-center">
                                    <span className="px-2 bg-white dark:bg-zinc-900 text-xs text-gray-400">O</span>
                                </div>
                            </div>

                            <div>
                                <h4 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Nueva Categoría</h4>
                                <div className="flex gap-2">
                                    <input type="text" value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} placeholder="Ej. Ofrenda Especial" className="flex-grow p-3 bg-gray-50 border border-gray-200 rounded-xl dark:bg-zinc-800 dark:border-zinc-700 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"/>
                                    <button onClick={handleAddNewCategory} disabled={isSubmitting} className="px-4 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors">
                                        <Plus className="w-5 h-5"/>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            
            <div className="bg-white dark:bg-zinc-900 rounded-[2rem] shadow-sm border border-gray-100 dark:border-zinc-800 overflow-hidden">
                <div className="p-6 bg-gradient-to-br from-blue-50 to-white dark:from-zinc-800 dark:to-zinc-900 border-b border-gray-100 dark:border-zinc-800 flex justify-between items-center">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Registrar</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400 font-medium mt-1">{MONTH_NAMES[record.month - 1]} {record.day}, {record.year}</p>
                    </div>
                     <button onClick={() => setIsAddModalOpen(true)} className="w-10 h-10 bg-white dark:bg-zinc-700 text-blue-600 dark:text-blue-400 rounded-full shadow-sm border border-gray-100 dark:border-zinc-600 flex items-center justify-center hover:scale-110 transition-transform" title="Agregar">
                        <Plus className="w-5 h-5"/>
                    </button>
                </div>

                <div className="p-6 space-y-5">
                    <SimpleAutocompleteInput members={members} onSelect={setSelectedMember} value={memberNameInput} setValue={setMemberNameInput}/>
                    
                    <div className="flex gap-4">
                        <div className="flex-1 relative">
                             <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <span className="text-gray-400 font-bold">C$</span>
                            </div>
                            <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" className="w-full pl-10 pr-4 py-4 text-lg bg-gray-50 border-0 ring-1 ring-gray-200 rounded-2xl focus:ring-2 focus:ring-green-500 focus:bg-white transition-all dark:bg-zinc-800 dark:ring-zinc-700 dark:text-white dark:focus:bg-zinc-900 font-mono"/>
                        </div>
                        
                        <div className="flex-1">
                            <select value={category} onChange={e => setCategory(e.target.value)} className="w-full h-full px-4 text-lg bg-gray-50 border-0 ring-1 ring-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all dark:bg-zinc-800 dark:ring-zinc-700 dark:text-white cursor-pointer appearance-none">
                                {categories.map(cat => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <button onClick={handleAddOffering} className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-lg rounded-2xl shadow-lg shadow-blue-500/30 active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2">
                        <Wallet className="w-6 h-6" />
                        <span>Ingresar Ofrenda</span>
                    </button>
                </div>
            </div>
            
            <div>
                <div className="flex items-center justify-between mb-4 px-2">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">Historial Reciente</h3>
                    <span className="text-xs font-medium bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-gray-300 px-2 py-1 rounded-lg">{record.offerings.length} reg.</span>
                </div>
                
                 <div className="space-y-3">
                    {record.offerings.length > 0 ? (
                        [...record.offerings].reverse().map(offering => (
                            <div key={offering.id} className="group flex items-center justify-between p-4 bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800 hover:border-blue-200 dark:hover:border-blue-900 transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-sm">
                                        {offering.memberName?.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <p className="font-bold text-gray-900 dark:text-white">{offering.memberName}</p>
                                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">{offering.category}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <span className="font-mono font-bold text-gray-900 dark:text-white">C$ {offering.amount.toFixed(2)}</span>
                                    <button onClick={() => handleRemoveOffering(offering.id)} className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-all">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="flex flex-col items-center justify-center py-12 text-center bg-white dark:bg-zinc-900 rounded-[2rem] border border-dashed border-gray-200 dark:border-zinc-800">
                            <div className="p-4 bg-gray-50 dark:bg-zinc-800 rounded-full mb-3">
                                <Wallet className="w-8 h-8 text-gray-300 dark:text-gray-600" />
                            </div>
                            <p className="text-gray-500 dark:text-gray-400 font-medium">Sin ofrendas hoy</p>
                        </div>
                    )}
                 </div>
            </div>
        </div>
    );
};


const ResumenSencilloTab: React.FC<{record: WeeklyRecord, categories: string[]}> = ({ record, categories }) => {
    const totals = useMemo(() => {
        const subtotals: Record<string, number> = {};
        categories.forEach(cat => { subtotals[cat] = 0; });
        record.offerings.forEach(d => {
          if (subtotals[d.category] !== undefined) subtotals[d.category] += d.amount;
        });
        const total = (subtotals['Diezmo'] || 0) + (subtotals['Ordinaria'] || 0);
        const diezmoDeDiezmo = Math.round(total * (record.formulas.diezmoPercentage / 100));
        const remanente = total > record.formulas.remanenteThreshold ? Math.round(total - record.formulas.remanenteThreshold) : 0;
        const gomerMinistro = Math.round(total - diezmoDeDiezmo);
        return { subtotals, total, diezmoDeDiezmo, remanente, gomerMinistro };
    }, [record, categories]);
    
    const StatCard: React.FC<{label: string, value: string, colorClass: string, bgClass: string}> = ({ label, value, colorClass, bgClass }) => (
        <div className={`p-5 rounded-2xl border ${bgClass} ${colorClass} flex flex-col justify-between h-full shadow-sm`}>
            <p className="text-sm font-medium opacity-80 uppercase tracking-wider">{label}</p>
            <p className="text-3xl font-bold mt-2 tracking-tight">{value}</p>
        </div>
    );

    return (
        <div className="space-y-6 pb-20">
            <div className="text-center py-4">
                 <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Resumen</h2>
                 <p className="text-gray-500 dark:text-gray-400 text-sm font-medium uppercase tracking-wide">{`${record.day} de ${MONTH_NAMES[record.month - 1]}, ${record.year}`}</p>
            </div>
            
            <div className="grid grid-cols-1 gap-4">
                <div className="p-6 rounded-3xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-xl shadow-blue-600/20">
                    <p className="text-blue-100 font-medium mb-1">Total Ingresado</p>
                    <p className="text-5xl font-bold tracking-tighter">C$ {totals.total.toFixed(2)}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                    <StatCard label="Gomer Ministro" value={`C$ ${totals.gomerMinistro.toFixed(2)}`} colorClass="text-green-700 dark:text-green-400 border-green-100 dark:border-green-900" bgClass="bg-green-50 dark:bg-green-900/20" />
                    <StatCard label="Diezmo de Diezmo" value={`C$ ${totals.diezmoDeDiezmo.toFixed(2)}`} colorClass="text-purple-700 dark:text-purple-400 border-purple-100 dark:border-purple-900" bgClass="bg-purple-50 dark:bg-purple-900/20" />
                </div>
                <StatCard label="Remanente" value={`C$ ${totals.remanente.toFixed(2)}`} colorClass="text-amber-700 dark:text-amber-400 border-amber-100 dark:border-amber-900" bgClass="bg-amber-50 dark:bg-amber-900/20" />
            </div>

             <div className="bg-white dark:bg-zinc-900 rounded-[2rem] shadow-sm border border-gray-100 dark:border-zinc-800 overflow-hidden">
                <div className="p-5 bg-gray-50 dark:bg-zinc-800/50 border-b border-gray-100 dark:border-zinc-800">
                    <h3 className="font-bold text-gray-900 dark:text-white">Desglose por Categoría</h3>
                </div>
                <div className="divide-y divide-gray-100 dark:divide-zinc-800">
                    {categories.map(cat => (
                        totals.subtotals[cat] > 0 &&
                        <div key={cat} className="flex justify-between items-center p-5">
                            <span className="font-medium text-gray-600 dark:text-gray-300">{cat}</span>
                            <span className="font-bold text-gray-900 dark:text-white font-mono">C$ {totals.subtotals[cat].toFixed(2)}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

const HistorialSencilloTab: React.FC<{records: WeeklyRecord[], onSelectRecord: (record: WeeklyRecord) => void, onStartNew: () => void, setActiveTab: (tab: 'register' | 'summary' | 'history') => void}> = ({records, onSelectRecord, onStartNew, setActiveTab}) => {
    
    const handleSelect = (record: WeeklyRecord) => {
        onSelectRecord(record);
        setActiveTab('register');
    }

    return (
        <div className="space-y-6 pb-20">
             <div className="flex justify-between items-center px-2">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Semanas</h2>
                <button onClick={onStartNew} className="flex items-center gap-2 px-5 py-2.5 font-bold text-white transition-all duration-300 bg-blue-600 rounded-full shadow-lg shadow-blue-500/30 hover:bg-blue-700 hover:scale-105 active:scale-95">
                    <Plus className="w-5 h-5" /> Nueva
                </button>
            </div>
            
            <div className="space-y-4">
                {records.length > 0 ? (
                    records
                        .sort((a, b) => new Date(b.year, b.month - 1, b.day).getTime() - new Date(a.year, a.month - 1, a.day).getTime())
                        .map(record => (
                            <button key={record.id} onClick={() => handleSelect(record)} className="group w-full text-left p-5 bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800 flex justify-between items-center hover:border-blue-300 dark:hover:border-blue-700 transition-all duration-200">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-gray-100 dark:bg-zinc-800 rounded-xl flex flex-col items-center justify-center text-gray-600 dark:text-gray-300 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                        <span className="text-xs font-bold uppercase">{MONTH_NAMES[record.month - 1].substring(0, 3)}</span>
                                        <span className="text-lg font-bold leading-none">{record.day}</span>
                                    </div>
                                    <div>
                                        <p className="font-bold text-gray-900 dark:text-white text-lg">{record.year}</p>
                                        <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">{record.offerings.length} registros</p>
                                    </div>
                                </div>
                                <div className="w-8 h-8 rounded-full bg-gray-50 dark:bg-zinc-800 flex items-center justify-center group-hover:bg-blue-50 dark:group-hover:bg-blue-900/30">
                                    <div className="text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
                                    </div>
                                </div>
                            </button>
                        ))
                ) : (
                    <div className="p-12 text-center bg-gray-50 dark:bg-zinc-900/50 rounded-[2rem] border-2 border-dashed border-gray-200 dark:border-zinc-800">
                        <CalendarDays className="w-12 h-12 mx-auto text-gray-300 dark:text-zinc-700 mb-4" />
                        <p className="text-gray-500 dark:text-gray-400 font-medium">No hay semanas guardadas.</p>
                        <p className="text-sm text-gray-400 dark:text-zinc-600 mt-1">Crea una nueva para comenzar.</p>
                    </div>
                )}
            </div>
        </div>
    );
};


// --- Componente Principal de la App Sencilla ---

interface SimpleAppData {
    members: Member[];
    categories: string[];
    weeklyRecords: WeeklyRecord[];
    currentRecord: WeeklyRecord | null;
    formulas: Formulas;
    churchInfo: ChurchInfo;
}
interface SimpleAppHandlers {
    setMembers: React.Dispatch<React.SetStateAction<Member[]>>;
    setCategories: React.Dispatch<React.SetStateAction<string[]>>;
    setWeeklyRecords: React.Dispatch<React.SetStateAction<WeeklyRecord[]>>;
    setCurrentRecord: React.Dispatch<React.SetStateAction<WeeklyRecord | null>>;
}
interface MainAppSencilloProps {
  onLogout: () => void;
  onSwitchVersion: () => void;
  data: SimpleAppData;
  handlers: SimpleAppHandlers;
  theme: string;
  toggleTheme: () => void;
}

const navItems = [
  { id: 'register', label: 'Registrar', icon: CirclePlus },
  { id: 'summary', label: 'Resumen', icon: BarChart2 },
  { id: 'history', label: 'Semanas', icon: CalendarDays },
];

const MainAppSencillo: React.FC<MainAppSencilloProps> = ({ onLogout, onSwitchVersion, data, handlers, theme, toggleTheme }) => {
    const [activeTab, setActiveTab] = useState<'register' | 'summary' | 'history'>('register');
    const { members, categories, weeklyRecords, currentRecord, formulas, churchInfo } = data;
    const { setMembers, setWeeklyRecords, setCurrentRecord, setCategories } = handlers;
    const { uploadFile, supabase } = useSupabase();
    const [isSaving, setIsSaving] = useState(false);
    
    const [dateInfo, setDateInfo] = useState({
        day: new Date().getDate().toString(),
        month: (new Date().getMonth() + 1).toString(),
        year: new Date().getFullYear().toString(),
    });

    const uploadRecordToSupabase = async (record: WeeklyRecord) => {
        if (!supabase) {
            console.error("Supabase client not available for upload.");
            return { success: false, error: new Error("Supabase client not initialized.") };
        }
    
        const churchName = (window as any).CHURCH_NAME || 'La_Empresa';
        const monthName = MONTH_NAMES[record.month - 1];
        const yearShort = record.year.toString().slice(-2);
        const dayPadded = record.day.toString().padStart(2, '0');
        const fileName = `${dayPadded}-${monthName}-${yearShort}_${churchName.replace(/ /g, '_')}.xlsx`;
    
        // Generate detailed report with summary
        const subtotals: Record<string, number> = {};
        categories.forEach(cat => { subtotals[cat] = 0; });
        record.offerings.forEach(d => {
            if (subtotals[d.category] !== undefined) {
                subtotals[d.category] += d.amount;
            }
        });
        const total = (subtotals['Diezmo'] || 0) + (subtotals['Ordinaria'] || 0);
        const diezmoDeDiezmo = Math.round(total * (record.formulas.diezmoPercentage / 100));
        const remanente = total > record.formulas.remanenteThreshold ? Math.round(total - record.formulas.remanenteThreshold) : 0;
        const gomerMinistro = Math.round(total - diezmoDeDiezmo);

        const summaryData = [
            ["Resumen Semanal"], [], ["Fecha:", `${record.day}/${record.month}/${record.year}`], ["Ministro:", record.minister], [],
            ["Concepto", "Monto (C$)"], ...categories.map(cat => [cat, subtotals[cat] || 0]), [],
            ["Cálculos Finales", ""], ["TOTAL (Diezmo + Ordinaria)", total], [`Diezmo de Diezmo (${record.formulas.diezmoPercentage}%)`, diezmoDeDiezmo],
            [`Remanente (Umbral C$ ${record.formulas.remanenteThreshold})`, remanente], ["Gomer del Ministro", gomerMinistro]
        ];
        const offeringsData = record.offerings.map(d => ({ Miembro: d.memberName, Categoría: d.category, Monto: d.amount }));

        const wb = (window as any).XLSX.utils.book_new();
        const wsSummary = (window as any).XLSX.utils.aoa_to_sheet(summaryData);
        (window as any).XLSX.utils.book_append_sheet(wb, wsSummary, "Resumen");
        
        const wsOfferings = (window as any).XLSX.utils.json_to_sheet(offeringsData);
        (window as any).XLSX.utils.book_append_sheet(wb, wsOfferings, "Detalle de Ofrendas");
        
        const excelBuffer = (window as any).XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
        const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    
        try {
            await uploadFile('reportes-semanales', fileName, blob, true);
            return { success: true, fileName };
        } catch (err) {
            console.error("Upload failed:", err);
            let errorMessage = 'Ocurrió un error desconocido durante la subida.';
            if (err instanceof Error) {
                errorMessage = err.message;
            } else if (err && typeof err === 'object' && 'message' in err) {
                errorMessage = String((err as { message: string }).message);
            } else {
                errorMessage = String(err);
            }

            if (errorMessage.toLowerCase().includes('failed to fetch')) {
                errorMessage = 'Falló la conexión con el servidor al intentar subir el archivo. Esto puede ser un problema de CORS o de red. Verifique la configuración de CORS en su panel de Supabase y su conexión a internet.';
            } else if (errorMessage.toLowerCase().includes('bucket not found')) {
                errorMessage = `El contenedor de almacenamiento ('bucket') 'reportes-semanales' no fue encontrado en Supabase. Por favor, asegúrese de que exista y sea público.`;
            }

            return { success: false, error: new Error(errorMessage) };
        }
      };

    const handleSaveCurrentRecord = async () => {
        if (!currentRecord) {
             alert("No hay una semana activa para guardar.");
             return;
        }
        setIsSaving(true);

        const existingIndex = weeklyRecords.findIndex(r => r.id === currentRecord.id);
        const updatedRecords = [...weeklyRecords];
        if (existingIndex > -1) {
            updatedRecords[existingIndex] = currentRecord;
        } else {
            updatedRecords.push(currentRecord);
        }
        setWeeklyRecords(updatedRecords);

        const uploadResult = await uploadRecordToSupabase(currentRecord);

        if (uploadResult.success) {
            alert(`Semana guardada localmente y subida a la nube como:\n${uploadResult.fileName}`);
        } else {
            alert(`Semana guardada localmente, pero falló la subida a la nube.\nError: ${uploadResult.error?.message}\n\nPuede reintentar desde la pestaña 'Semanas' en la versión completa.`);
        }
        
        setCurrentRecord(null); 
        setIsSaving(false);
        setActiveTab('history');
    };

    const startNewRecordFlow = () => {
        setCurrentRecord(null);
        setActiveTab('register');
    };

    const handleCreateRecord = () => {
        if (!dateInfo.day || !dateInfo.month || !dateInfo.year) {
          alert('Por favor, complete todos los campos de fecha.');
          return;
        }
        const newRecord: WeeklyRecord = {
          id: `wr-${Date.now()}`,
          day: parseInt(dateInfo.day),
          month: parseInt(dateInfo.month),
          year: parseInt(dateInfo.year),
          minister: churchInfo.defaultMinister,
          offerings: [],
          formulas: formulas,
        };
        setCurrentRecord(newRecord);
    };

    const handleDateChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setDateInfo({ ...dateInfo, [e.target.name]: e.target.value });
    };

    const renderContent = () => {
        if (!currentRecord && activeTab !== 'history') {
             return (
                <div className="p-8 bg-white dark:bg-zinc-900 rounded-[2rem] shadow-xl border border-gray-100 dark:border-zinc-800 h-full flex flex-col justify-center">
                    <div className="text-center mb-8">
                        <div className="inline-flex p-4 rounded-full bg-blue-50 dark:bg-blue-900/20 mb-4">
                            <CalendarDays className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                        </div>
                        <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Nueva Semana</h2>
                        <p className="text-gray-500 dark:text-gray-400 mt-2">Configure la fecha de corte para comenzar a registrar.</p>
                    </div>
                    
                    <div className="space-y-4 bg-gray-50 dark:bg-zinc-800/50 p-6 rounded-2xl">
                        <div className="grid grid-cols-3 gap-4">
                            <div className="col-span-1">
                                <label htmlFor="day-s" className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Día</label>
                                <input type="number" name="day" id="day-s" value={dateInfo.day} onChange={handleDateChange} className="w-full p-3 text-center text-lg font-bold bg-white border border-gray-200 rounded-xl shadow-sm dark:bg-zinc-700 dark:border-zinc-600 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"/>
                            </div>
                            <div className="col-span-2">
                                <label htmlFor="month-s" className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Mes</label>
                                <select name="month" id="month-s" value={dateInfo.month} onChange={handleDateChange} className="w-full p-3 text-lg font-bold bg-white border border-gray-200 rounded-xl shadow-sm dark:bg-zinc-700 dark:border-zinc-600 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none appearance-none">
                                    {MONTH_NAMES.map((name, index) => <option key={name} value={index + 1}>{name}</option>)}
                                </select>
                            </div>
                        </div>
                        <div>
                            <label htmlFor="year-s" className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Año</label>
                            <input type="number" name="year" id="year-s" value={dateInfo.year} onChange={handleDateChange} className="w-full p-3 text-center text-lg font-bold bg-white border border-gray-200 rounded-xl shadow-sm dark:bg-zinc-700 dark:border-zinc-600 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"/>
                        </div>
                    </div>
                    
                    <button onClick={handleCreateRecord} className="w-full mt-8 py-4 font-bold text-white text-lg transition-all duration-200 bg-blue-600 rounded-2xl shadow-lg shadow-blue-600/30 hover:bg-blue-700 hover:shadow-blue-600/40 active:scale-[0.98]">
                        Comenzar Registro
                    </button>
                </div>
            );
        }

        switch (activeTab) {
            case 'register': return <RegistroSencilloTab record={currentRecord!} setRecord={setCurrentRecord} members={members} setMembers={setMembers} categories={categories} setCategories={setCategories} />;
            case 'summary': 
                if (!currentRecord) return <p>Seleccione un registro</p>;
                return <ResumenSencilloTab record={currentRecord} categories={categories} />;
            case 'history': return <HistorialSencilloTab records={weeklyRecords} onSelectRecord={setCurrentRecord} onStartNew={startNewRecordFlow} setActiveTab={setActiveTab} />;
            default: return null;
        }
    };
    
    return (
        <div className="flex flex-col h-screen bg-gray-50 dark:bg-zinc-950">
            <Header 
                onLogout={onLogout} 
                onSwitchVersion={onSwitchVersion} 
                showSwitchVersion={true} 
                theme={theme} 
                toggleTheme={toggleTheme}
                navItems={navItems}
                activeTab={activeTab}
                setActiveTab={setActiveTab as (tab: string) => void}
            />
            <main className="flex-grow overflow-y-auto">
                <div className="max-w-2xl mx-auto h-full p-4 pb-24">
                    {renderContent()}
                </div>
                
                {/* Floating Save Button for Register Tab */}
                {currentRecord && activeTab === 'register' && (
                    <div className="fixed bottom-6 left-0 right-0 px-4 flex justify-center pointer-events-none z-30">
                        <div className="pointer-events-auto max-w-2xl w-full flex justify-end">
                            <button onClick={handleSaveCurrentRecord} className="flex items-center gap-2 px-6 py-3.5 bg-green-600 text-white font-bold rounded-full shadow-xl shadow-green-600/30 hover:bg-green-700 hover:scale-105 active:scale-95 transition-all duration-300">
                                <span className="text-lg">Guardar Semana</span>
                                <div className="bg-white/20 p-1 rounded-full">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                                </div>
                            </button>
                        </div>
                    </div>
                )}
            </main>
            {isSaving && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in">
                    <div className="bg-white dark:bg-zinc-900 p-8 rounded-3xl flex flex-col items-center gap-4 shadow-2xl">
                        <div className="relative">
                            <div className="w-16 h-16 border-4 border-blue-100 dark:border-zinc-700 rounded-full"></div>
                            <div className="absolute top-0 left-0 w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                        <div className="text-center">
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white">Guardando...</h3>
                            <p className="text-gray-500 dark:text-gray-400 text-sm">Sincronizando con la nube</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MainAppSencillo;