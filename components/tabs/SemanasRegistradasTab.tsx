import React, { useState, useMemo, useEffect, Dispatch, SetStateAction, FC, ChangeEvent } from 'react';
import { WeeklyRecord, Member, Offering, Formulas, ChurchInfo } from '../../types';
import { Pencil, Trash2, X, Plus, CloudUpload, FileDown, Download } from 'lucide-react';
import { MONTH_NAMES } from '../../constants';
import { useSupabase } from '../../context/SupabaseContext';

// Copied from RegistroOfrendasTab, to be used inside the modal
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
    setInputValue(''); // Clear input after selection
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
}> = ({ records, setRecords, formulas, churchInfo }) => {
    const [files, setFiles] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { supabase, listFiles, getPublicUrl } = useSupabase();
    const [isLoadingToApp, setIsLoadingToApp] = useState<string | null>(null);

    const monthNameToNumber = useMemo(() => 
        Object.fromEntries(MONTH_NAMES.map((name, i) => [name.toLowerCase(), i + 1]))
    , []);

    useEffect(() => {
        if (!supabase) return;

        const fetchFiles = async () => {
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
        fetchFiles();
    }, [supabase, listFiles]);
    
    const handleLoadToApp = async (file: any) => {
        setIsLoadingToApp(file.id);
        try {
            // 1. Parse filename to get date
            const nameParts = file.name.split('_')[0].split('-');
            if (nameParts.length < 3) throw new Error("Nombre de archivo no válido para extraer fecha.");
            
            const day = parseInt(nameParts[0]);
            const monthName = nameParts[1].toLowerCase();
            const year = 2000 + parseInt(nameParts[2]);
            const month = monthNameToNumber[monthName];

            if (!day || !month || !year) throw new Error("No se pudo extraer una fecha válida del nombre del archivo.");
            
            // 2. Fetch and parse Excel file
            const url = getPublicUrl('reportes-semanales', file.name);
            const response = await fetch(url);
            if (!response.ok) throw new Error("No se pudo descargar el archivo.");
            const arrayBuffer = await response.arrayBuffer();
            const wb = (window as any).XLSX.read(arrayBuffer, { type: 'buffer' });
            const ws = wb.Sheets['Detalle de Ofrendas'];
            if (!ws) throw new Error("La hoja 'Detalle de Ofrendas' no se encontró en el archivo.");
            const offeringsJson = (window as any).XLSX.utils.sheet_to_json(ws);
            
            const offerings: Offering[] = offeringsJson.map((d: any, index: number) => ({
                id: `d-${Date.now()}-${index}`,
                memberId: `m-cloud-${Date.now()}-${index}`,
                memberName: d['Miembro'],
                category: d['Categoría'],
                amount: d['Monto'],
            }));

            // 3. Create a new WeeklyRecord object
            const newRecord: WeeklyRecord = {
                id: `wr-cloud-${Date.now()}`,
                day, month, year,
                minister: churchInfo.defaultMinister,
                offerings,
                formulas: formulas,
            };

            // 4. Check for duplicates and update state
            const existingRecord = records.find(r => r.day === day && r.month === month && r.year === year);
            if (existingRecord) {
                if (window.confirm(`Ya existe un registro local para el ${day}/${month}/${year}. ¿Desea sobrescribirlo con los datos de la nube?`)) {
                    setRecords(prev => prev.map(r => r.id === existingRecord.id ? { ...newRecord, id: existingRecord.id } : r));
                    alert("Registro local actualizado con éxito desde la nube.");
                }
            } else {
                setRecords(prev => [...prev, newRecord]);
                alert("Registro cargado desde la nube y añadido a la lista local.");
            }

        } catch (e) {
            alert(`Error al cargar la semana en la app: ${e instanceof Error ? e.message : String(e)}`);
        } finally {
            setIsLoadingToApp(null);
        }
    };


    if (loading) {
        return <div className="p-4 text-center text-muted-foreground">Cargando reportes de la nube...</div>;
    }

    if (error) {
        return <div className="p-4 text-center text-destructive bg-destructive/10 rounded-lg">{error}</div>;
    }
    
    return (
        <div className="p-6 bg-card text-card-foreground rounded-xl shadow-lg border">
            <h2 className="text-2xl font-bold text-foreground mb-4">Reportes Semanales en la Nube</h2>
            {files.length > 0 ? (
                <ul className="space-y-3 max-h-72 overflow-y-auto">
                    {files.map(file => (
                        <li key={file.id} className="flex flex-col sm:flex-row justify-between sm:items-center p-3 bg-secondary rounded-md border">
                           <div>
                                <p className="font-medium text-secondary-foreground">{file.name}</p>
                                <p className="text-xs text-muted-foreground">Subido: {new Date(file.created_at).toLocaleString()}</p>
                           </div>
                           <div className="flex items-center gap-2 mt-2 sm:mt-0">
                                <button
                                    onClick={() => handleLoadToApp(file)}
                                    disabled={isLoadingToApp === file.id}
                                    className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-primary-foreground bg-primary rounded-lg hover:bg-primary/90 disabled:bg-opacity-50"
                                >
                                    {isLoadingToApp === file.id
                                        ? <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin"></div>
                                        : <Download className="w-4 h-4"/>
                                    }
                                    <span>{isLoadingToApp === file.id ? 'Cargando...' : 'Cargar en App'}</span>
                                </button>
                                <a 
                                 href={getPublicUrl('reportes-semanales', file.name)}
                                 target="_blank"
                                 rel="noopener noreferrer"
                                 className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-white bg-green-600 rounded-lg hover:bg-green-700"
                                >
                                   <FileDown className="w-4 h-4"/>
                                   <span>Descargar</span>
                                </a>
                           </div>
                        </li>
                    ))}
                </ul>
            ) : (
                <p className="text-center text-muted-foreground py-4">No hay reportes semanales en la nube.</p>
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

const SemanasRegistradasTab: FC<SemanasRegistradasTabProps> = ({ records, setRecords, members, categories, formulas, churchInfo }) => {
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
      setTempRecord(JSON.parse(JSON.stringify(editingRecord))); // Deep copy
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
        const churchName = (window as any).CHURCH_NAME || 'La_Empresa';
        const monthName = MONTH_NAMES[recordToUpload.month - 1];
        const yearShort = recordToUpload.year.toString().slice(-2);
        const dayPadded = recordToUpload.day.toString().padStart(2, '0');
        const fileName = `${dayPadded}-${monthName}-${yearShort}_${churchName.replace(/ /g, '_')}.xlsx`;

        const subtotals: Record<string, number> = {};
        categories.forEach(cat => { subtotals[cat] = 0; });
        recordToUpload.offerings.forEach(d => {
            if (subtotals[d.category] !== undefined) { subtotals[d.category] += d.amount; }
        });
        const total = (subtotals['Diezmo'] || 0) + (subtotals['Ordinaria'] || 0);
        const diezmoDeDiezmo = Math.round(total * (recordToUpload.formulas.diezmoPercentage / 100));
        const remanente = total > recordToUpload.formulas.remanenteThreshold ? Math.round(total - recordToUpload.formulas.remanenteThreshold) : 0;
        const gomerMinistro = Math.round(total - diezmoDeDiezmo);

        const summaryData = [
            ["Resumen Semanal"], [], ["Fecha:", `${recordToUpload.day}/${recordToUpload.month}/${recordToUpload.year}`], ["Ministro:", recordToUpload.minister], [],
            ["Concepto", "Monto (C$)"], ...categories.map(cat => [cat, subtotals[cat] || 0]), [],
            ["Cálculos Finales", ""], ["TOTAL (Diezmo + Ordinaria)", total], [`Diezmo de Diezmo (${recordToUpload.formulas.diezmoPercentage}%)`, diezmoDeDiezmo],
            [`Remanente (Umbral C$ ${recordToUpload.formulas.remanenteThreshold})`, remanente], ["Gomer del Ministro", gomerMinistro]
        ];
        const offeringsData = recordToUpload.offerings.map(d => ({ Miembro: d.memberName, Categoría: d.category, Monto: d.amount }));

        const wb = (window as any).XLSX.utils.book_new();
        const wsSummary = (window as any).XLSX.utils.aoa_to_sheet(summaryData);
        (window as any).XLSX.utils.book_append_sheet(wb, wsSummary, "Resumen");
        const wsOfferings = (window as any).XLSX.utils.json_to_sheet(offeringsData);
        (window as any).XLSX.utils.book_append_sheet(wb, wsOfferings, "Detalle de Ofrendas");
        
        const excelBuffer = (window as any).XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
        const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

        await uploadFile('reportes-semanales', fileName, blob, true);
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
    <div className="space-y-6">
      <UploadedReportsList records={records} setRecords={setRecords} formulas={formulas} churchInfo={churchInfo} />

      <div className="p-6 bg-card text-card-foreground rounded-xl shadow-lg border">
        <h2 className="text-2xl font-bold text-foreground mb-4">Semanas Guardadas (Local)</h2>
        {sortedRecords.length > 0 ? (
          <ul className="space-y-3 max-h-96 overflow-y-auto">
            {sortedRecords.map(record => (
              <li key={record.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-secondary rounded-lg border">
                <div>
                  <p className="font-bold text-lg text-primary">{`Semana del ${record.day} de ${MONTH_NAMES[record.month - 1]}, ${record.year}`}</p>
                  <p className="text-sm text-muted-foreground">{`${record.offerings.length} ofrendas registradas`}</p>
                </div>
                <div className="flex items-center gap-2 mt-3 sm:mt-0">
                  <button onClick={() => handleReupload(record.id)} disabled={isUploading === record.id} title="Volver a subir a la nube" className="p-2 text-primary-foreground bg-primary rounded-full hover:bg-primary/90 disabled:bg-opacity-50">
                    {isUploading === record.id ? <div className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin"></div> : <CloudUpload className="w-5 h-5" />}
                  </button>
                  <button onClick={() => handleOpenEditModal(record)} title="Editar" className="p-2 text-white bg-yellow-500 rounded-full hover:bg-yellow-600"><Pencil className="w-5 h-5" /></button>
                  <button onClick={() => handleDelete(record.id)} title="Eliminar" className="p-2 text-destructive-foreground bg-destructive rounded-full hover:bg-destructive/90"><Trash2 className="w-5 h-5" /></button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-center text-muted-foreground py-8">No hay semanas guardadas localmente.</p>
        )}
      </div>

      {editingRecord && tempRecord && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-30 p-4">
          <div className="bg-card text-card-foreground rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col border">
            <header className="flex justify-between items-center p-4 border-b flex-shrink-0">
              <h3 className="text-xl font-bold text-foreground">Editar Semana</h3>
              <button onClick={handleCloseModal} className="text-muted-foreground hover:text-foreground"><X className="w-6 h-6"/></button>
            </header>
            
            <main className="p-6 overflow-y-auto space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground">Fecha</label>
                    <input type="text" value={`${tempRecord.day}/${tempRecord.month}/${tempRecord.year}`} readOnly className="mt-1 w-full p-2 bg-input text-foreground border rounded-md" />
                  </div>
                  <div>
                    <label htmlFor="minister" className="block text-sm font-medium text-muted-foreground">Ministro</label>
                    <input type="text" id="minister" name="minister" value={tempRecord.minister} onChange={handleModalInputChange} className="mt-1 w-full p-2 border-input bg-input rounded-md text-foreground" />
                  </div>
              </div>
              <div className="p-4 border rounded-lg">
                <h4 className="font-semibold mb-2 text-foreground">Añadir Ofrenda</h4>
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
                    <AutocompleteInput members={members} onSelect={setSelectedMember} />
                    <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="Cantidad C$" className="w-full p-3 border-input bg-input rounded-lg text-foreground placeholder:text-muted-foreground"/>
                    <select value={category} onChange={e => setCategory(e.target.value)} className="w-full p-3 border-input bg-input rounded-lg text-foreground">
                        {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                    <button onClick={handleAddOfferingInModal} className="flex items-center justify-center gap-2 w-full py-3 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90">
                       <Plus className="w-5 h-5"/> Añadir
                    </button>
                </div>
                 {selectedMember && <p className="text-xs mt-2 text-primary">Seleccionado: {selectedMember.name}</p>}
              </div>

              <div>
                <h4 className="font-semibold mb-2 text-foreground">Ofrendas ({tempRecord.offerings.length})</h4>
                <div className="space-y-2 max-h-60 overflow-y-auto border rounded-lg p-2">
                    {tempRecord.offerings.length > 0 ? [...tempRecord.offerings].reverse().map(offering => (
                        <div key={offering.id} className="flex justify-between items-center p-2 bg-secondary rounded-md">
                            <div>
                                <p className="font-medium text-secondary-foreground">{offering.memberName}</p>
                                <p className="text-sm text-muted-foreground">{offering.category} - C$ {offering.amount.toFixed(2)}</p>
                            </div>
                            <button onClick={() => handleRemoveOfferingInModal(offering.id)} className="text-destructive hover:text-destructive/80 p-1"><Trash2 className="w-4 h-4" /></button>
                        </div>
                    )) : <p className="text-center text-muted-foreground py-4">No hay ofrendas.</p>}
                </div>
              </div>
            </main>

            <footer className="flex justify-end gap-4 p-4 border-t flex-shrink-0">
              <button onClick={handleCloseModal} className="px-4 py-2 text-secondary-foreground bg-secondary rounded-lg hover:bg-secondary/80">Cancelar</button>
              <button onClick={handleSaveChanges} className="px-4 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700">Guardar Cambios</button>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
};

export default SemanasRegistradasTab;