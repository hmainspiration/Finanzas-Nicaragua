import React, { useState, useMemo, useEffect, Dispatch, SetStateAction, FC, ChangeEvent } from 'react';
import { WeeklyRecord, Member, Offering, Formulas, ChurchInfo } from '../../types';
import { Pencil, Trash2, X, Plus, CloudUpload, FileDown, Download, RefreshCw, CheckCircle2 } from 'lucide-react';
import { MONTH_NAMES } from '../../constants';
import { useSupabase } from '../../context/SupabaseContext';
import { 
  uploadWeeklyRecordToCloud, 
  parseWeeklyRecordFromExcel, 
  mergeWeeklyRecords, 
  syncAllWeeklyRecords,
  getWeeklyRecordFileName 
} from '../../utils/syncService';

// AutocompleteInput for Member selection inside modal
interface AutocompleteInputProps {
  members: Member[];
  onSelect: (member: Member) => void;
}

const AutocompleteInput: FC<AutocompleteInputProps> = ({ members, onSelect }) => {
  const [inputValue, setInputValue] = useState('');
  const [suggestions, setSuggestions] = useState<Member[]>([]);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
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
    setInputValue('');
    setSuggestions([]);
  };

  return (
    <div className="relative">
      <input
        type="text"
        value={inputValue}
        onChange={handleChange}
        placeholder="Escriba el nombre del miembro..."
        className="w-full p-3 bg-input border-border rounded-lg shadow-sm focus:ring-2 focus:ring-ring focus:border-transparent text-foreground placeholder:text-muted-foreground"
      />
      {suggestions.length > 0 && (
        <ul className="absolute z-20 w-full mt-1 overflow-y-auto bg-popover border rounded-lg shadow-lg max-h-60 text-popover-foreground">
          {suggestions.map(member => (
            <li
              key={member.id}
              onClick={() => handleSelect(member)}
              className="px-4 py-2 cursor-pointer hover:bg-accent hover:text-accent-foreground"
            >
              {member.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

const UploadedReportsList: FC<{
    records: WeeklyRecord[];
    setRecords: Dispatch<SetStateAction<WeeklyRecord[]>>;
    formulas: Formulas;
    churchInfo: ChurchInfo;
    categories: string[];
}> = ({ records, setRecords, formulas, churchInfo, categories }) => {
    const [files, setFiles] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { supabase, listFiles, getPublicUrl, uploadFile } = useSupabase();
    const [isLoadingToApp, setIsLoadingToApp] = useState<string | null>(null);
    const [isSyncingAll, setIsSyncingAll] = useState(false);
    const [statusMsg, setStatusMsg] = useState<string | null>(null);

    const fetchFiles = async () => {
        if (!supabase) return;
        try {
            setLoading(true);
            setError(null);
            const fileList = await listFiles('reportes-semanales');
            setFiles(fileList || []);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Error al cargar los reportes.');
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchFiles();
    }, [supabase, listFiles]);
    
    // Load and merge a single file from cloud
    const handleLoadToApp = async (file: any) => {
        setIsLoadingToApp(file.id);
        setStatusMsg(null);
        try {
            const url = getPublicUrl('reportes-semanales', file.name);
            const response = await fetch(url);
            if (!response.ok) throw new Error("No se pudo descargar el archivo de la nube.");
            const arrayBuffer = await response.arrayBuffer();
            
            const cloudRecord = parseWeeklyRecordFromExcel(arrayBuffer, file.name, formulas, churchInfo);
            if (!cloudRecord) {
                throw new Error("El archivo no tiene el formato de reporte semanal esperado.");
            }

            setRecords(prev => mergeWeeklyRecords(prev, [cloudRecord]));
            setStatusMsg(`¡Semana del ${cloudRecord.day}/${cloudRecord.month}/${cloudRecord.year} cargada y fusionada sin duplicados!`);
        } catch (e) {
            alert(`Error al cargar reporte: ${e instanceof Error ? e.message : String(e)}`);
        } finally {
            setIsLoadingToApp(null);
        }
    };

    // Full bi-directional sync
    const handleSyncAll = async () => {
        if (!supabase) return;
        setIsSyncingAll(true);
        setStatusMsg(null);
        try {
            const res = await syncAllWeeklyRecords(
                supabase,
                listFiles,
                getPublicUrl,
                uploadFile,
                records,
                categories,
                formulas,
                churchInfo
            );
            if (res.success) {
                setRecords(res.mergedRecords);
                await fetchFiles();
                setStatusMsg(`Sincronización completa: ${res.cloudCount} semanas en nube combinadas sin duplicados.`);
            } else {
                alert(`Error en sincronización: ${res.error}`);
            }
        } catch (e) {
            alert(`Error al sincronizar: ${e instanceof Error ? e.message : String(e)}`);
        } finally {
            setIsSyncingAll(false);
        }
    };

    if (loading) {
        return <div className="p-4 text-center text-muted-foreground">Cargando reportes de la nube...</div>;
    }

    if (error) {
        return <div className="p-4 text-center text-destructive bg-destructive/10 rounded-lg">{error}</div>;
    }
    
    return (
        <div className="p-5 bg-card text-card-foreground rounded-2xl shadow-sm border border-border">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                <div>
                    <h2 className="text-xl font-bold text-foreground">Reportes Semanales en la Nube</h2>
                    <p className="text-xs text-muted-foreground">Archivos guardados en el almacenamiento de Supabase</p>
                </div>
                <button
                    onClick={handleSyncAll}
                    disabled={isSyncingAll}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-[#00a884] text-white hover:bg-[#008f6f] active:scale-95 transition-all disabled:opacity-50"
                >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSyncingAll ? 'animate-spin' : ''}`} />
                    <span>{isSyncingAll ? 'Sincronizando...' : 'Sincronizar todo'}</span>
                </button>
            </div>

            {statusMsg && (
                <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 text-emerald-800 dark:text-emerald-200 border border-emerald-500/20 text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                    <span>{statusMsg}</span>
                </div>
            )}

            {files.length > 0 ? (
                <ul className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                    {files.map(file => (
                        <li key={file.id} className="flex flex-col sm:flex-row justify-between sm:items-center p-3 bg-secondary/70 rounded-xl border border-border/80 gap-2">
                           <div className="min-w-0">
                                <p className="font-medium text-sm text-foreground truncate">{file.name}</p>
                                <p className="text-xs text-muted-foreground">Subido: {new Date(file.created_at).toLocaleString('es-ES')}</p>
                           </div>
                           <div className="flex items-center gap-2 flex-shrink-0">
                                <button
                                    onClick={() => handleLoadToApp(file)}
                                    disabled={isLoadingToApp === file.id}
                                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-primary-foreground bg-primary rounded-lg hover:bg-primary/90 disabled:opacity-50"
                                >
                                    {isLoadingToApp === file.id
                                        ? <div className="w-3.5 h-3.5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                                        : <Download className="w-3.5 h-3.5"/>
                                    }
                                    <span>{isLoadingToApp === file.id ? 'Cargando...' : 'Fusionar / Cargar'}</span>
                                </button>
                                <a 
                                 href={getPublicUrl('reportes-semanales', file.name)}
                                 target="_blank"
                                 rel="noopener noreferrer"
                                 className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700"
                                >
                                   <FileDown className="w-3.5 h-3.5"/>
                                   <span>Descargar</span>
                                </a>
                           </div>
                        </li>
                    ))}
                </ul>
            ) : (
                <p className="text-center text-muted-foreground py-4 text-xs">No hay reportes semanales en la nube todavía.</p>
            )}
        </div>
    );
};

interface SemanasRegistradasTabProps {
  records: WeeklyRecord[];
  setRecords: Dispatch<SetStateAction<WeeklyRecord[]>>;
  members: Member[];
  categories: string[];
  formulas: Formulas;
  churchInfo: ChurchInfo;
}

const SemanasRegistradasTab: FC<SemanasRegistradasTabProps> = ({ 
  records, 
  setRecords, 
  members, 
  categories, 
  formulas, 
  churchInfo 
}) => {
  const [editingRecord, setEditingRecord] = useState<WeeklyRecord | null>(null);
  const [tempRecord, setTempRecord] = useState<WeeklyRecord | null>(null);
  const [isUploading, setIsUploading] = useState<string | null>(null);
  const { uploadFile, supabase } = useSupabase();

  // Modal form state
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState(categories[0] || '');

  useEffect(() => {
    if (editingRecord) {
      setTempRecord(JSON.parse(JSON.stringify(editingRecord)));
    } else {
      setTempRecord(null);
    }
  }, [editingRecord]);

  const handleOpenEditModal = (record: WeeklyRecord) => {
    setEditingRecord(record);
  };

  const handleCloseModal = () => {
    setEditingRecord(null);
  };

  const handleSaveChanges = () => {
    if (tempRecord) {
      setRecords(prevRecords => prevRecords.map(r => r.id === tempRecord.id ? tempRecord : r));
      handleCloseModal();
    }
  };

  const handleDelete = (recordId: string) => {
    if (window.confirm('¿Está seguro de que desea eliminar esta semana registrada? Esta acción no se puede deshacer.')) {
        setRecords(prevRecords => prevRecords.filter(r => r.id !== recordId));
    }
  };

  const handleModalInputChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    if (tempRecord) {
      const { name, value } = e.target;
      setTempRecord({ ...tempRecord, [name]: value });
    }
  };

  const handleAddOfferingInModal = () => {
    if (!tempRecord || !selectedMember || !amount || parseFloat(amount) <= 0) {
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
    setTempRecord({ ...tempRecord, offerings: [...tempRecord.offerings, newOffering] });
    setSelectedMember(null);
    setAmount('');
  };

  const handleRemoveOfferingInModal = (offeringId: string) => {
    if (tempRecord) {
      setTempRecord({
        ...tempRecord,
        offerings: tempRecord.offerings.filter(d => d.id !== offeringId),
      });
    }
  };

  const handleReupload = async (recordId: string) => {
    const recordToUpload = records.find(r => r.id === recordId);
    if (!recordToUpload || !supabase) {
        alert("No se puede subir el reporte. El registro no fue encontrado o Supabase no está conectado.");
        return;
    }

    setIsUploading(recordId);
    try {
        await uploadWeeklyRecordToCloud(uploadFile, recordToUpload, categories);
        alert(`Reporte para la semana del ${recordToUpload.day}/${recordToUpload.month}/${recordToUpload.year} ha sido subido a la nube.`);
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        alert(`Falló la subida del reporte.\nError: ${errorMessage}`);
    } finally {
        setIsUploading(null);
    }
  };
  
  const sortedRecords = useMemo(() => {
    return [...records].sort((a, b) => new Date(b.year, b.month - 1, b.day).getTime() - new Date(a.year, a.month - 1, a.day).getTime());
  }, [records]);
  
  return (
    <div className="space-y-4 max-w-4xl mx-auto pb-8">
      <UploadedReportsList 
        records={records} 
        setRecords={setRecords} 
        formulas={formulas} 
        churchInfo={churchInfo}
        categories={categories}
      />

      <div className="p-5 bg-card text-card-foreground rounded-2xl shadow-sm border border-border">
        <h2 className="text-xl font-bold text-foreground mb-3">Semanas Guardadas (En este dispositivo)</h2>
        {sortedRecords.length > 0 ? (
          <ul className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
            {sortedRecords.map(record => (
              <li key={record.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 bg-secondary/70 rounded-xl border border-border/80 gap-2">
                <div>
                  <p className="font-bold text-sm text-foreground">{`Semana del ${record.day} de ${MONTH_NAMES[record.month - 1]}, ${record.year}`}</p>
                  <p className="text-xs text-muted-foreground">{`${record.offerings.length} ofrendas registradas`}</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <button onClick={() => handleReupload(record.id)} disabled={isUploading === record.id} title="Subir a la nube" className="p-2 text-white bg-[#00a884] rounded-lg hover:bg-[#008f6f] disabled:opacity-50">
                    {isUploading === record.id ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <CloudUpload className="w-4 h-4" />}
                  </button>
                  <button onClick={() => handleOpenEditModal(record)} title="Editar" className="p-2 text-white bg-amber-500 rounded-lg hover:bg-amber-600"><Pencil className="w-4 h-4" /></button>
                  <button onClick={() => handleDelete(record.id)} title="Eliminar" className="p-2 text-destructive-foreground bg-destructive rounded-lg hover:bg-destructive/90"><Trash2 className="w-4 h-4" /></button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-center text-muted-foreground py-6 text-xs">No hay semanas guardadas localmente.</p>
        )}
      </div>

      {editingRecord && tempRecord && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex justify-center items-center z-50 p-4">
          <div className="bg-card text-card-foreground rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col border border-border animate-in fade-in zoom-in-95 duration-200">
            <header className="flex justify-between items-center p-4 border-b border-border flex-shrink-0">
              <h3 className="text-lg font-bold text-foreground">Editar Semana</h3>
              <button onClick={handleCloseModal} className="p-1 rounded-lg text-muted-foreground hover:text-foreground"><X className="w-5 h-5"/></button>
            </header>
            
            <main className="p-5 overflow-y-auto space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">Fecha</label>
                    <input type="text" value={`${tempRecord.day}/${tempRecord.month}/${tempRecord.year}`} readOnly className="w-full p-2 bg-input text-foreground border border-border rounded-lg text-sm" />
                  </div>
                  <div>
                    <label htmlFor="minister" className="block text-xs font-medium text-muted-foreground mb-1">Ministro</label>
                    <input type="text" id="minister" name="minister" value={tempRecord.minister} onChange={handleModalInputChange} className="w-full p-2 border border-border bg-input rounded-lg text-foreground text-sm" />
                  </div>
              </div>

              <div className="p-4 border border-border rounded-xl bg-secondary/30">
                <h4 className="font-semibold text-sm mb-2 text-foreground">Añadir Ofrenda</h4>
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
                    <AutocompleteInput members={members} onSelect={setSelectedMember} />
                    <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="Cantidad C$" className="w-full p-3 border border-border bg-input rounded-lg text-foreground placeholder:text-muted-foreground text-sm"/>
                    <select value={category} onChange={e => setCategory(e.target.value)} className="w-full p-3 border border-border bg-input rounded-lg text-foreground text-sm">
                        {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                    <button onClick={handleAddOfferingInModal} className="flex items-center justify-center gap-1.5 w-full py-3 bg-[#00a884] text-white font-semibold rounded-lg hover:bg-[#008f6f] text-sm">
                       <Plus className="w-4 h-4"/> Añadir
                    </button>
                </div>
                 {selectedMember && <p className="text-xs mt-2 text-[#00a884]">Seleccionado: {selectedMember.name}</p>}
              </div>

              <div>
                <h4 className="font-semibold text-sm mb-2 text-foreground">Ofrendas ({tempRecord.offerings.length})</h4>
                <div className="space-y-1.5 max-h-60 overflow-y-auto border border-border rounded-xl p-2 bg-background">
                    {tempRecord.offerings.length > 0 ? [...tempRecord.offerings].reverse().map(offering => (
                        <div key={offering.id} className="flex justify-between items-center p-2 bg-secondary rounded-lg text-xs">
                            <div>
                                <p className="font-medium text-foreground">{offering.memberName}</p>
                                <p className="text-muted-foreground">{offering.category} - C$ {offering.amount.toFixed(2)}</p>
                            </div>
                            <button onClick={() => handleRemoveOfferingInModal(offering.id)} className="text-destructive hover:text-destructive/80 p-1"><Trash2 className="w-4 h-4" /></button>
                        </div>
                    )) : <p className="text-center text-muted-foreground py-4 text-xs">No hay ofrendas.</p>}
                </div>
              </div>
            </main>

            <footer className="flex justify-end gap-2 p-4 border-t border-border flex-shrink-0">
              <button onClick={handleCloseModal} className="px-4 py-2 text-xs font-semibold text-secondary-foreground bg-secondary rounded-lg hover:bg-secondary/80">Cancelar</button>
              <button onClick={handleSaveChanges} className="px-4 py-2 text-xs font-semibold bg-[#00a884] text-white rounded-lg hover:bg-[#008f6f]">Guardar Cambios</button>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
};

export default SemanasRegistradasTab;
