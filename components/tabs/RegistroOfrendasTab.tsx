// Fix: Implemented a full functional component instead of a placeholder.
import React, { useState } from 'react';
import { WeeklyRecord, Member, Offering, Formulas, ChurchInfo } from '../../types';
import { MONTH_NAMES } from '../../constants';
import { Trash2, Plus, Calendar, X } from 'lucide-react';
import { useSupabase } from '../../context/SupabaseContext';

// Autocomplete component, similar to the one in SemanasRegistradasTab
const AutocompleteInput: React.FC<{ members: Member[], onSelect: (member: Member) => void }> = ({ members, onSelect }) => {
    const [inputValue, setInputValue] = useState('');
    const [suggestions, setSuggestions] = useState<Member[]>([]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setInputValue(value);
        if (value) {
            setSuggestions(
                members.filter(m => m.name.toLowerCase().includes(value.toLowerCase())).slice(0, 5)
            );
        } else {
            setSuggestions([]);
        }
    };

    const handleSelect = (member: Member) => {
        onSelect(member);
        setInputValue(''); // Clear input after selection
        setSuggestions([]);
    };

    return (
        <div className="relative">
            <input type="text" value={inputValue} onChange={handleChange} placeholder="Buscar o escribir nombre..." className="w-full p-3 bg-input border-border rounded-lg shadow-sm focus:ring-2 focus:ring-ring focus:border-transparent text-foreground placeholder:text-muted-foreground"/>
            {suggestions.length > 0 && (
                <ul className="absolute z-10 w-full mt-1 overflow-y-auto bg-popover border rounded-lg shadow-lg max-h-60 text-popover-foreground">
                    {suggestions.map(member => (
                        <li key={member.id} onClick={() => handleSelect(member)} className="px-4 py-2 cursor-pointer hover:bg-accent hover:text-accent-foreground">
                            {member.name}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

interface RegistroOfrendasTabProps {
  currentRecord: WeeklyRecord | null;
  setCurrentRecord: React.Dispatch<React.SetStateAction<WeeklyRecord | null>>;
  members: Member[];
  setMembers: React.Dispatch<React.SetStateAction<Member[]>>;
  categories: string[];
  setCategories: React.Dispatch<React.SetStateAction<string[]>>;
  onSaveRecord: () => void;
  onStartNew: () => void;
  defaultFormulas: Formulas;
  weeklyRecords: WeeklyRecord[];
  churchInfo: ChurchInfo;
}

const RegistroOfrendasTab: React.FC<RegistroOfrendasTabProps> = ({
  currentRecord, setCurrentRecord, members, setMembers, categories, setCategories, onSaveRecord, onStartNew, defaultFormulas, churchInfo
}) => {
    const { addItem } = useSupabase();
    // State for creating a new record
    const [dateInfo, setDateInfo] = useState({
        day: new Date().getDate().toString(),
        month: (new Date().getMonth() + 1).toString(),
        year: new Date().getFullYear().toString(),
    });

    // State for adding a donation
    const [selectedMember, setSelectedMember] = useState<Member | null>(null);
    const [amount, setAmount] = useState('');
    const [category, setCategory] = useState(categories.find(c => c === "Diezmo") || categories[0]);

    // State for modal
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [newMemberName, setNewMemberName] = useState('');
    const [newCategoryName, setNewCategoryName] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleCreateRecord = () => {
        const newRecord: WeeklyRecord = {
            id: `wr-${Date.now()}`,
            day: parseInt(dateInfo.day),
            month: parseInt(dateInfo.month),
            year: parseInt(dateInfo.year),
            minister: churchInfo.defaultMinister,
            offerings: [],
            formulas: defaultFormulas,
        };
        setCurrentRecord(newRecord);
    };

    const handleAddOffering = () => {
        if (!currentRecord || !selectedMember || !amount || parseFloat(amount) <= 0) {
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
        setCurrentRecord({ ...currentRecord, offerings: [...currentRecord.offerings, newOffering] });
        setSelectedMember(null);
        setAmount('');
    };

    const handleRemoveOffering = (offeringId: string) => {
        if (currentRecord) {
            setCurrentRecord({
                ...currentRecord,
                offerings: currentRecord.offerings.filter(d => d.id !== offeringId),
            });
        }
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
            setCategory(newCategoryItem.name);
            setNewCategoryName('');
            alert(`Categoría "${newCategoryItem.name}" agregada.`);
        } catch (error) {
            alert(`Error al agregar categoría: ${error instanceof Error ? error.message : String(error)}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!currentRecord) {
        return (
            <div className="p-6 bg-card text-card-foreground rounded-xl shadow-lg h-full flex flex-col justify-center border">
                <div className="text-center">
                    <Calendar className="w-16 h-16 mx-auto text-primary" />
                    <h2 className="text-3xl font-bold text-foreground mt-4 mb-2">Iniciar Nuevo Registro Semanal</h2>
                    <p className="text-muted-foreground mb-6">Seleccione la fecha de cierre de la semana (usualmente domingo).</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                        <label htmlFor="day-reg" className="block text-sm font-medium text-muted-foreground">Día</label>
                        <input type="number" name="day" id="day-reg" value={dateInfo.day} onChange={e => setDateInfo({...dateInfo, day: e.target.value})} className="mt-1 block w-full p-2 border-input bg-input rounded-md text-foreground"/>
                    </div>
                    <div>
                        <label htmlFor="month-reg" className="block text-sm font-medium text-muted-foreground">Mes</label>
                        <select name="month" id="month-reg" value={dateInfo.month} onChange={e => setDateInfo({...dateInfo, month: e.target.value})} className="mt-1 block w-full p-2 border-input bg-input rounded-md text-foreground">
                            {MONTH_NAMES.map((name, index) => <option key={name} value={index + 1}>{name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="year-reg" className="block text-sm font-medium text-muted-foreground">Año</label>
                        <input type="number" name="year" id="year-reg" value={dateInfo.year} onChange={e => setDateInfo({...dateInfo, year: e.target.value})} className="mt-1 block w-full p-2 border-input bg-input rounded-md text-foreground"/>
                    </div>
                </div>
                <button onClick={handleCreateRecord} className="w-full mt-6 py-3 font-bold text-primary-foreground text-lg transition-colors bg-primary rounded-lg hover:bg-primary/90">
                    Crear Registro
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {isAddModalOpen && (
                <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex justify-center items-center p-4">
                    <div className="bg-card text-card-foreground rounded-2xl shadow-2xl w-full max-w-md relative border">
                        <button onClick={() => setIsAddModalOpen(false)} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground">
                            <X className="w-8 h-8"/>
                        </button>
                        <div className="p-6 space-y-6">
                            <div>
                                <h3 className="text-xl font-bold text-foreground mb-3">Agregar Nuevo Miembro</h3>
                                <div className="flex gap-2">
                                    <input type="text" value={newMemberName} onChange={e => setNewMemberName(e.target.value)} placeholder="Nombre completo" className="flex-grow p-2 border-input bg-input rounded-md text-foreground placeholder:text-muted-foreground"/>
                                    <button onClick={handleAddNewMember} disabled={isSubmitting} className="px-4 py-2 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90 disabled:bg-opacity-50">Guardar</button>
                                </div>
                            </div>
                            <div className="border-t pt-6 border-border">
                                <h3 className="text-xl font-bold text-foreground mb-3">Agregar Nueva Categoría</h3>
                                <div className="flex gap-2">
                                    <input type="text" value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} placeholder="Nombre de categoría" className="flex-grow p-2 border-input bg-input rounded-md text-foreground placeholder:text-muted-foreground"/>
                                    <button onClick={handleAddNewCategory} disabled={isSubmitting} className="px-4 py-2 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90 disabled:bg-opacity-50">Guardar</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="p-6 bg-card text-card-foreground rounded-xl shadow-lg border">
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <h2 className="text-2xl font-bold text-foreground">Registro de Ofrendas</h2>
                        <p className="text-muted-foreground">{`Semana del ${currentRecord.day} de ${MONTH_NAMES[currentRecord.month - 1]}, ${currentRecord.year}`}</p>
                    </div>
                    <button onClick={() => setIsAddModalOpen(true)} className="flex-shrink-0 flex items-center justify-center w-12 h-12 bg-primary/10 text-primary rounded-full hover:bg-primary/20 transition-colors" title="Agregar Miembro/Categoría">
                        <Plus className="w-6 h-6"/>
                    </button>
                </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                    <div>
                        <AutocompleteInput members={members} onSelect={setSelectedMember} />
                        {selectedMember && (
                            <div className="mt-2 p-2 bg-accent rounded-lg flex justify-between items-center">
                                <p className="text-sm font-medium text-accent-foreground">
                                    Miembro: <span className="font-bold">{selectedMember.name}</span>
                                </p>
                                <button onClick={() => setSelectedMember(null)} className="text-muted-foreground hover:text-foreground" aria-label="Limpiar selección">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        )}
                    </div>
                    <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="Cantidad C$" className="w-full p-3 border-input bg-input rounded-lg text-foreground placeholder:text-muted-foreground"/>
                    <select value={category} onChange={e => setCategory(e.target.value)} className="w-full p-3 border-input bg-input rounded-lg text-foreground">
                        {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                    <button onClick={handleAddOffering} className="flex items-center justify-center gap-2 w-full py-3 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90">
                       <Plus className="w-5 h-5"/> Agregar Ofrenda
                    </button>
                </div>
            </div>

            <div className="p-6 bg-card text-card-foreground rounded-xl shadow-lg border">
                 <h3 className="text-xl font-bold text-foreground mb-4">Ofrendas Registradas</h3>
                 <div className="space-y-2 max-h-96 overflow-y-auto">
                    {currentRecord.offerings.length > 0 ? (
                        [...currentRecord.offerings].reverse().map(offering => (
                            <div key={offering.id} className="flex items-center justify-between p-3 bg-secondary rounded-lg">
                                <div>
                                    <p className="font-semibold text-secondary-foreground">{offering.memberName}</p>
                                    <p className="text-sm text-muted-foreground">{offering.category} - C$ {offering.amount.toFixed(2)}</p>
                                </div>
                                <button onClick={() => handleRemoveOffering(offering.id)} className="text-destructive hover:text-destructive/80 p-2"><Trash2 className="w-5 h-5" /></button>
                            </div>
                        ))
                    ) : (
                        <p className="text-center text-muted-foreground py-8">Aún no hay ofrendas para esta semana.</p>
                    )}
                 </div>
            </div>

            <div className="p-4 bg-card rounded-xl shadow-lg flex flex-col sm:flex-row gap-4 border">
                <button onClick={onSaveRecord} className="flex-1 py-3 font-semibold text-white transition-colors bg-green-600 rounded-lg hover:bg-green-700">Guardar y Cerrar Semana</button>
                <button onClick={onStartNew} className="flex-1 py-3 font-semibold text-secondary-foreground bg-secondary rounded-lg hover:bg-secondary/80">Iniciar Nueva Semana</button>
            </div>
        </div>
    );
};

export default RegistroOfrendasTab;