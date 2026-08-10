import React, { useState, useRef } from 'react';
import { Member, Formulas, ChurchInfo, Comisionado, WeeklyRecord, MonthlyReport } from '../../types';
import { useSupabase } from '../../context/SupabaseContext';
import { UserPlus, Pencil, Trash2, Check, X, Server, Wifi, AlertTriangle, Save } from 'lucide-react';
import { APP_VERSION, DEFAULT_FORMULAS, DEFAULT_CHURCH_INFO } from '../../constants';

const SupabaseStatusIndicator: React.FC = () => {
    const { supabase, error } = useSupabase();

    if (error) {
        const isCorsError = error.toLowerCase().includes('failed to fetch');

        return (
            <div className="p-4 text-sm text-left text-destructive-foreground bg-destructive/20 border border-destructive/30 rounded-lg" style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-bold">Error de conexión a la Nube (Supabase)</p>
                    {isCorsError ? (
                        <div className="mt-2 space-y-2">
                            <p><strong>Error detectado:</strong> Falló la conexión (TypeError: Failed to fetch). Este es comúnmente un <strong>problema de CORS</strong>.</p>
                            <p>CORS es un mecanismo de seguridad del navegador que impide que una página web solicite recursos de un dominio diferente. Para solucionarlo, debe autorizar explícitamente el dominio de esta aplicación en la configuración de su proyecto de Supabase.</p>
                            <p className="font-semibold mt-3">Siga estos pasos para solucionarlo:</p>
                            <ol className="list-decimal list-inside space-y-1 pl-2">
                                <li>Vaya a su panel de control de Supabase en <a href="https://supabase.com/" target="_blank" rel="noopener noreferrer" className="text-primary underline">supabase.com</a>.</li>
                                <li>Seleccione su proyecto.</li>
                                <li>En el menú de la izquierda, haga clic en el ícono de <strong>Configuración del Proyecto</strong> (engranaje).</li>
                                <li>Seleccione <strong>API</strong> en la lista de configuraciones.</li>
                                <li>Busque la sección <strong>Configuración de CORS</strong> (Cross-Origin Resource Sharing).</li>
                                <li>En el campo de texto, agregue una nueva línea con <strong className="font-mono bg-muted px-1 rounded">*</strong> (un asterisco).</li>
                                <li>Haga clic en <strong>Guardar</strong>.</li>
                            </ol>
                            <p className="mt-3 text-xs"><strong>Nota de Seguridad:</strong> Usar <code className="font-mono">*</code> permite el acceso desde cualquier dominio. Para producción, es más seguro reemplazar el asterisco con la URL específica donde se alojará su aplicación.</p>
                        </div>
                    ) : (
                        <p className="mt-2">{error}</p>
                    )}
                  </div>
                </div>
            </div>
        );
    }

    if (supabase) {
        return (
            <div className="flex items-center gap-4 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                <Wifi className="w-5 h-5 text-green-500"/>
                <p className="text-sm text-green-700 dark:text-green-300">Conectado a Supabase exitosamente.</p>
            </div>
        );
    }

    return (
        <div className="flex items-center gap-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
             <Server className="w-5 h-5 text-yellow-500"/>
             <p className="text-sm text-yellow-700 dark:text-yellow-300">Inicializando conexión con Supabase...</p>
        </div>
    );
};

interface AdminPanelTabProps {
    members: Member[];
    setMembers: React.Dispatch<React.SetStateAction<Member[]>>;
    categories: string[];
    setCategories: React.Dispatch<React.SetStateAction<string[]>>;
    formulas: Formulas;
    setFormulas: React.Dispatch<React.SetStateAction<Formulas>>;
    churchInfo: ChurchInfo;
    setChurchInfo: React.Dispatch<React.SetStateAction<ChurchInfo>>;
    comisionados: Comisionado[];
    setComisionados: React.Dispatch<React.SetStateAction<Comisionado[]>>;
    weeklyRecords: WeeklyRecord[];
    setWeeklyRecords: React.Dispatch<React.SetStateAction<WeeklyRecord[]>>;
    monthlyReports: MonthlyReport[];
    setMonthlyReports: React.Dispatch<React.SetStateAction<MonthlyReport[]>>;
    theme: string;
    setTheme: React.Dispatch<React.SetStateAction<'light' | 'dark'>>;
}

const AdminPanelTab: React.FC<AdminPanelTabProps> = ({
    members, setMembers, categories, setCategories, formulas, setFormulas, churchInfo, setChurchInfo, comisionados, setComisionados,
    weeklyRecords, setWeeklyRecords, monthlyReports, setMonthlyReports, theme, setTheme
}) => {
    const { addItem, updateItem, deleteItem } = useSupabase();
    const [newMemberName, setNewMemberName] = useState('');
    const [newCategory, setNewCategory] = useState('');
    const [tempFormulas, setTempFormulas] = useState<Formulas>(formulas);
    const [tempChurchInfo, setTempChurchInfo] = useState<ChurchInfo>(churchInfo);
    const [editingMember, setEditingMember] = useState<Member | null>(null);
    const [newComisionado, setNewComisionado] = useState({ nombre: '', cargo: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const importFileRef = useRef<HTMLInputElement>(null);
    
    // Helper function to map Supabase's snake_case to the app's camelCase
    const mapSupabaseMemberToAppMember = (supabaseMember: any): Member => {
        return {
            id: supabaseMember.id,
            name: supabaseMember.name,
            isActive: supabaseMember.is_active,
        };
    };

    const handleAddMember = async () => {
        if (!newMemberName.trim() || members.some(m => m.name.toLowerCase() === newMemberName.trim().toLowerCase())) {
            alert('El nombre del miembro no puede estar vacío o ya existe.');
            return;
        }
        setIsSubmitting(true);
        try {
            const newMemberFromSupabase = await addItem('members', { name: newMemberName.trim(), is_active: true });
            const appMember = mapSupabaseMemberToAppMember(newMemberFromSupabase);
            setMembers(prev => [...prev, appMember].sort((a,b) => a.name.localeCompare(b.name)));
            setNewMemberName('');
        } catch (error) {
            alert(`Error al agregar miembro: ${error instanceof Error ? error.message : String(error)}`);
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const handleToggleMemberActive = async (id: string, newStatus: boolean) => {
      try {
        const updatedMemberFromSupabase = await updateItem('members', id, { is_active: newStatus });
        const appMember = mapSupabaseMemberToAppMember(updatedMemberFromSupabase);
        setMembers(prev => prev.map(m => m.id === appMember.id ? appMember : m));
      } catch (error) {
        alert(`Error al actualizar estado: ${error instanceof Error ? error.message : String(error)}`);
      }
    };

    const handleStartEdit = (member: Member) => {
        setEditingMember(JSON.parse(JSON.stringify(member)));
    };

    const handleSaveEdit = async () => {
        if (editingMember) {
            setIsSubmitting(true);
            try {
                const updatedMemberFromSupabase = await updateItem('members', editingMember.id, { name: editingMember.name });
                const appMember = mapSupabaseMemberToAppMember(updatedMemberFromSupabase);
                setMembers(prev => prev.map(m => m.id === appMember.id ? appMember : m));
                setEditingMember(null);
            } catch (error) {
                 alert(`Error al guardar cambios: ${error instanceof Error ? error.message : String(error)}`);
            } finally {
                 setIsSubmitting(false);
            }
        }
    };

    const handleDeleteMember = async (id: string) => {
        if (window.confirm("¿Seguro que quiere eliminar este miembro?")) {
            try {
                await deleteItem('members', id);
                setMembers(prev => prev.filter(m => m.id !== id));
            } catch (error) {
                alert(`Error al eliminar miembro: ${error instanceof Error ? error.message : String(error)}`);
            }
        }
    };

    const handleAddCategory = async () => {
        if (!newCategory.trim() || categories.includes(newCategory.trim())) {
            alert('La categoría no puede estar vacía o ya existe.');
            return;
        }
        setIsSubmitting(true);
        try {
            const newItem = await addItem('categories', { name: newCategory.trim() });
            setCategories(prev => [...prev, newItem.name].sort());
            setNewCategory('');
        } catch (error) {
            alert(`Error al agregar categoría: ${error instanceof Error ? error.message : String(error)}`);
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const handleDeleteCategory = async (catToDelete: string) => {
        if (window.confirm("¿Seguro que quiere eliminar esta categoría?")) {
            try {
                const categoryToDelete = await (window as any).supabase.from('categories').select('id').eq('name', catToDelete).single();
                if (categoryToDelete.data) {
                    await deleteItem('categories', categoryToDelete.data.id);
                    setCategories(prev => prev.filter(c => c !== catToDelete));
                } else {
                    throw new Error("Categoría no encontrada en la base de datos.");
                }
            } catch (error) {
                alert(`Error al eliminar categoría: ${error instanceof Error ? error.message : String(error)}`);
            }
        }
    };

    const handleFormulaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setTempFormulas(prev => ({...prev, [name]: parseFloat(value) }));
    };

    const handleSaveFormulas = () => {
        setFormulas(tempFormulas);
        alert("Fórmulas guardadas.");
    };

    const handleChurchInfoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setTempChurchInfo(prev => ({...prev, [name]: value }));
    };

    const handleSaveChurchInfo = () => {
        setChurchInfo(tempChurchInfo);
        alert("Información predeterminada guardada.");
    };

    const handleSignatureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 500 * 1024) { // 500 KB limit
                alert("El archivo es muy grande. El tamaño máximo es 500KB.");
                return;
            }
            if (!['image/png', 'image/jpeg'].includes(file.type)) {
                alert("Formato de archivo no válido. Por favor, suba un archivo PNG o JPG.");
                return;
            }
            const reader = new FileReader();
            reader.onloadend = () => {
                setTempChurchInfo(prev => ({ ...prev, ministerSignature: reader.result as string }));
            };
            reader.readAsDataURL(file);
        }
    };

    const handleRemoveSignature = () => {
        setTempChurchInfo(prev => ({ ...prev, ministerSignature: '' }));
    };

    const handleAddComisionado = async () => {
        if (!newComisionado.nombre.trim() || !newComisionado.cargo.trim()) {
            alert('Nombre y cargo son requeridos.');
            return;
        }
        setIsSubmitting(true);
        try {
            const added = await addItem('comisionados', newComisionado);
            setComisionados(prev => [...prev, added].sort((a,b) => a.nombre.localeCompare(b.nombre)));
            setNewComisionado({ nombre: '', cargo: '' });
        } catch (error) {
            alert(`Error al agregar comisionado: ${error instanceof Error ? error.message : String(error)}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteComisionado = async (id: string) => {
        if (window.confirm("¿Seguro que quiere eliminar este comisionado?")) {
            try {
                await deleteItem('comisionados', id);
                setComisionados(prev => prev.filter(c => c.id !== id));
            } catch (error) {
                alert(`Error al eliminar comisionado: ${error instanceof Error ? error.message : String(error)}`);
            }
        }
    };

    const handleComisionadoSignatureChange = (e: React.ChangeEvent<HTMLInputElement>, comisionadoId: string) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 500 * 1024) {
                alert("El archivo es muy grande. El tamaño máximo es 500KB.");
                return;
            }
            if (!['image/png', 'image/jpeg'].includes(file.type)) {
                alert("Formato de archivo no válido. Por favor, suba un archivo PNG o JPG.");
                return;
            }
            const reader = new FileReader();
            reader.onloadend = () => {
                const signature = reader.result as string;
                setComisionados(prev => prev.map(c => c.id === comisionadoId ? { ...c, signature } : c));
            };
            reader.readAsDataURL(file);
        }
        e.target.value = '';
    };

    const handleRemoveComisionadoSignature = (comisionadoId: string) => {
        setComisionados(prev => prev.map(c => c.id === comisionadoId ? { ...c, signature: '' } : c));
    };

    const handleExportData = () => {
        try {
            const dataToExport = {
                version: APP_VERSION,
                exportDate: new Date().toISOString(),
                data: {
                    weeklyRecords,
                    monthlyReports,
                    formulas,
                    churchInfo,
                    theme,
                    // Cloud-synced data is included for reference but won't be auto-imported to Supabase
                    members,
                    categories,
                    comisionados
                }
            };

            const jsonString = JSON.stringify(dataToExport, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });
            const href = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = href;
            const date = new Date().toISOString().split('T')[0];
            link.download = `sistema_finanzas_backup_${date}.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(href);

            alert("Copia de seguridad local exportada exitosamente.");
        } catch (error) {
            console.error("Failed to export data:", error);
            alert(`Error al exportar los datos: ${error instanceof Error ? error.message : String(error)}`);
        }
    };
    
    const handleTriggerImport = () => {
        importFileRef.current?.click();
    };

    const handleImportData = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const text = e.target?.result;
                if (typeof text !== 'string') {
                    throw new Error("El archivo no se pudo leer.");
                }
                const importedData = JSON.parse(text);

                // Basic validation
                if (!importedData.data || !importedData.data.weeklyRecords) {
                    throw new Error("El archivo de copia de seguridad no tiene el formato correcto.");
                }

                if (!window.confirm("¿Está seguro de que desea importar estos datos? Se sobrescribirán todos los datos locales actuales (registros semanales, informes, configuraciones). Esta acción no se puede deshacer.")) {
                    return;
                }
                
                // Restore localStorage data
                setWeeklyRecords(importedData.data.weeklyRecords || []);
                setMonthlyReports(importedData.data.monthlyReports || []);
                setFormulas(importedData.data.formulas || DEFAULT_FORMULAS);
                setChurchInfo(importedData.data.churchInfo || DEFAULT_CHURCH_INFO);
                setTheme(importedData.data.theme || 'light');

                alert("Importación completada. Los registros semanales, informes y configuraciones han sido restaurados. Los datos de miembros y categorías se actualizarán desde la nube al recargar la página.");

            } catch (error) {
                 console.error("Failed to import data:", error);
                 alert(`Error al importar los datos: ${error instanceof Error ? error.message : String(error)}`);
            } finally {
                // Reset input value to allow re-importing the same file
                if (importFileRef.current) {
                    importFileRef.current.value = "";
                }
            }
        };
        reader.readAsText(file);
    };

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-foreground">Panel de Administración</h2>
            <SupabaseStatusIndicator />
            
            <div className="p-4 bg-card rounded-xl shadow-lg border">
                <h3 className="text-xl font-bold text-foreground mb-4">Copia de Seguridad y Restauración</h3>
                <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                        Guarde todos los datos locales (semanas, informes, configuraciones) en un archivo. Esto es crucial si necesita limpiar la caché de su navegador o mover datos a otro dispositivo.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4">
                        <button onClick={handleExportData} className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90">
                            Exportar Datos Locales
                        </button>
                        <button onClick={handleTriggerImport} className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700">
                            Importar Datos Locales
                        </button>
                        <input type="file" ref={importFileRef} onChange={handleImportData} accept="application/json" className="hidden" />
                    </div>
                </div>
            </div>

            <div className="p-4 bg-card rounded-xl shadow-lg border">
                <h3 className="text-xl font-bold text-foreground mb-4">Gestión de Miembros</h3>
                <div className="flex gap-2 mb-4">
                    <input type="text" value={newMemberName} onChange={(e) => setNewMemberName(e.target.value)} placeholder="Nombre completo" className="flex-grow p-2 border-input bg-input rounded-md text-foreground"/>
                    <button onClick={handleAddMember} disabled={isSubmitting} className="flex-shrink-0 flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90 disabled:bg-opacity-50">
                        <UserPlus className="w-5 h-5"/> Añadir
                    </button>
                </div>
                <ul className="space-y-2 max-h-72 overflow-y-auto">
                    {members.map(member => (
                        <li key={member.id} className={`flex items-center justify-between p-2 rounded-md ${member.isActive ? 'bg-secondary' : 'bg-muted'}`}>
                           {editingMember?.id === member.id ? (
                                <div className="flex-grow flex gap-2 items-center">
                                    <input type="text" value={editingMember.name} onChange={(e) => setEditingMember({ ...editingMember, name: e.target.value })} className="flex-grow p-1 border-input bg-input rounded" autoFocus />
                                    <button onClick={handleSaveEdit} disabled={isSubmitting} className="p-2 text-green-500 hover:text-green-700"><Check className="w-4 h-4" /></button>
                                    <button onClick={() => setEditingMember(null)} className="p-2 text-destructive hover:text-destructive/80"><X className="w-4 h-4" /></button>
                                </div>
                            ) : (
                                <>
                                    <span className={!member.isActive ? 'text-muted-foreground' : ''}>{member.name}</span>
                                    <div className="flex items-center gap-2">
                                        <button onClick={() => handleToggleMemberActive(member.id, !member.isActive)} title={member.isActive ? "Marcar como inactivo" : "Marcar como activo"} className={`px-2 py-1 text-xs rounded-full ${member.isActive ? 'bg-green-500/20 text-green-700 dark:text-green-300' : 'bg-red-500/20 text-red-700 dark:text-red-300'}`}>
                                            {member.isActive ? "Activo" : "Inactivo"}
                                        </button>
                                        <button onClick={() => handleStartEdit(member)} className="p-2 text-muted-foreground hover:text-foreground"><Pencil className="w-4 h-4" /></button>
                                        <button onClick={() => handleDeleteMember(member.id)} className="p-2 text-destructive hover:text-destructive/80"><Trash2 className="w-4 h-4" /></button>
                                    </div>
                                </>
                            )}
                        </li>
                    ))}
                </ul>
            </div>
            
            <div className="p-4 bg-card rounded-xl shadow-lg border">
                <h3 className="text-xl font-bold text-foreground mb-4">Gestión de Categorías</h3>
                 <div className="flex gap-2 mb-4">
                    <input type="text" value={newCategory} onChange={(e) => setNewCategory(e.target.value)} placeholder="Nombre de categoría" className="flex-grow p-2 border-input bg-input rounded-md text-foreground" />
                    <button onClick={handleAddCategory} disabled={isSubmitting} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90 disabled:bg-opacity-50">Añadir</button>
                </div>
                 <ul className="flex flex-wrap gap-2">
                    {categories.map(cat => (
                        <li key={cat} className="flex items-center gap-2 px-3 py-1 bg-secondary rounded-full text-sm text-secondary-foreground">
                            <span>{cat}</span>
                            <button onClick={() => handleDeleteCategory(cat)} className="text-destructive hover:text-destructive/80"><X className="w-4 h-4"/></button>
                        </li>
                    ))}
                </ul>
            </div>

            <div className="p-4 bg-card rounded-xl shadow-lg border">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold text-foreground">Fórmulas de Cálculo</h3>
                    <button onClick={handleSaveFormulas} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700"><Save className="w-5 h-5"/> Guardar</button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-muted-foreground">Porcentaje Diezmo (%)</label>
                        <input type="number" name="diezmoPercentage" value={tempFormulas.diezmoPercentage} onChange={handleFormulaChange} className="mt-1 w-full p-2 border-input bg-input rounded-md" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-muted-foreground">Umbral Remanente (C$)</label>
                        <input type="number" name="remanenteThreshold" value={tempFormulas.remanenteThreshold} onChange={handleFormulaChange} className="mt-1 w-full p-2 border-input bg-input rounded-md" />
                    </div>
                </div>
            </div>

            <div className="p-4 bg-card rounded-xl shadow-lg border">
                 <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold text-foreground">Información de Iglesia</h3>
                    <button onClick={handleSaveChurchInfo} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700"><Save className="w-5 h-5"/> Guardar</button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-muted-foreground">Ministro por Defecto</label>
                        <input type="text" name="defaultMinister" value={tempChurchInfo.defaultMinister} onChange={handleChurchInfoChange} className="mt-1 w-full p-2 border-input bg-input rounded-md"/>
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-muted-foreground">Grado del Ministro</label>
                        <input type="text" name="ministerGrade" value={tempChurchInfo.ministerGrade} onChange={handleChurchInfoChange} className="mt-1 w-full p-2 border-input bg-input rounded-md"/>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-muted-foreground">Distrito</label>
                        <input type="text" name="district" value={tempChurchInfo.district} onChange={handleChurchInfoChange} className="mt-1 w-full p-2 border-input bg-input rounded-md"/>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-muted-foreground">Departamento</label>
                        <input type="text" name="department" value={tempChurchInfo.department} onChange={handleChurchInfoChange} className="mt-1 w-full p-2 border-input bg-input rounded-md"/>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-muted-foreground">Teléfono Ministro</label>
                        <input type="text" name="ministerPhone" value={tempChurchInfo.ministerPhone} onChange={handleChurchInfoChange} className="mt-1 w-full p-2 border-input bg-input rounded-md"/>
                    </div>
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-muted-foreground">Firma del Ministro (PNG/JPG, max 500KB)</label>
                        {tempChurchInfo.ministerSignature ? (
                            <div className="mt-1 flex items-center gap-4">
                                <img src={tempChurchInfo.ministerSignature} alt="Firma" className="h-16 w-auto bg-white dark:bg-gray-200 p-1 border rounded-md" />
                                <button onClick={handleRemoveSignature} className="px-3 py-2 text-xs bg-destructive text-destructive-foreground rounded-md hover:bg-destructive/90">Eliminar Firma</button>
                            </div>
                        ) : (
                            <input
                                type="file"
                                accept="image/png, image/jpeg"
                                onChange={handleSignatureChange}
                                className="mt-1 block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                            />
                        )}
                    </div>
                </div>
            </div>

             <div className="p-4 bg-card rounded-xl shadow-lg border">
                <h3 className="text-xl font-bold text-foreground mb-4">Comisión de Finanzas</h3>
                <div className="flex flex-col md:flex-row gap-2 mb-4">
                    <input type="text" value={newComisionado.nombre} onChange={(e) => setNewComisionado({...newComisionado, nombre: e.target.value})} placeholder="Nombre completo" className="flex-grow p-2 border-input bg-input rounded-md" />
                    <input type="text" value={newComisionado.cargo} onChange={(e) => setNewComisionado({...newComisionado, cargo: e.target.value})} placeholder="Cargo" className="flex-grow p-2 border-input bg-input rounded-md" />
                    <button onClick={handleAddComisionado} disabled={isSubmitting} className="flex-shrink-0 flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90 disabled:bg-opacity-50">Añadir</button>
                </div>
                <ul className="space-y-3">
                    {comisionados.map(com => (
                        <li key={com.id} className="p-3 bg-secondary rounded-lg border">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="font-semibold text-secondary-foreground">{com.nombre}</p>
                                    <p className="text-sm text-muted-foreground">{com.cargo}</p>
                                </div>
                                <button onClick={() => handleDeleteComisionado(com.id)} className="p-2 text-destructive hover:text-destructive/80 flex-shrink-0"><Trash2 className="w-4 h-4" /></button>
                            </div>
                            <div className="mt-3 pt-3 border-t border-border/50">
                                <label className="block text-xs font-medium text-muted-foreground mb-1">Firma (PNG/JPG, max 500KB)</label>
                                {com.signature ? (
                                    <div className="flex items-center gap-4">
                                        <img src={com.signature} alt={`Firma de ${com.nombre}`} className="h-12 w-auto bg-white dark:bg-gray-200 p-1 border rounded-md" />
                                        <button onClick={() => handleRemoveComisionadoSignature(com.id)} className="px-3 py-1 text-xs bg-destructive text-destructive-foreground rounded-md hover:bg-destructive/90">Eliminar</button>
                                    </div>
                                ) : (
                                    <input
                                        type="file"
                                        accept="image/png, image/jpeg"
                                        onChange={(e) => handleComisionadoSignatureChange(e, com.id)}
                                        className="block w-full text-xs text-muted-foreground file:mr-2 file:py-1 file:px-2 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                                    />
                                )}
                            </div>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
};

export default AdminPanelTab;