import React, { useMemo, useState, useEffect, FC } from 'react';
import { WeeklyRecord, Formulas, ChurchInfo, Member } from '../../types';
import { MONTH_NAMES, DEFAULT_FORMULAS, DEFAULT_CHURCH_INFO } from '../../constants';
import { useSupabase } from '../../context/SupabaseContext';
import { uploadWeeklyRecordToCloud, syncAllWeeklyRecords, getWeeklyRecordFileName } from '../../utils/syncService';
import { 
  CloudUpload, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  Copy, 
  Check, 
  ChevronDown, 
  Calendar, 
  Users, 
  Pencil, 
  Trash2, 
  Plus, 
  X, 
  ShieldCheck
} from 'lucide-react';

interface ResumenFinancieroTabProps {
  currentRecord?: WeeklyRecord | null;
  weeklyRecords: WeeklyRecord[];
  setWeeklyRecords?: React.Dispatch<React.SetStateAction<WeeklyRecord[]>>;
  categories: string[];
  workingDate?: Date;
  setWorkingDate?: (date: Date) => void;
  formulas?: Formulas;
  churchInfo?: ChurchInfo;
  members?: Member[];
}

const StatCard: FC<{ label: string; value: string; helper?: string; accent?: 'emerald' | 'blue' | 'amber' | 'purple' }> = ({ 
  label, 
  value, 
  helper,
  accent = 'emerald' 
}) => {
  const accentStyles = {
    emerald: 'border-l-4 border-emerald-500 dark:border-emerald-400 bg-card text-card-foreground',
    blue: 'border-l-4 border-blue-500 dark:border-blue-400 bg-card text-card-foreground',
    amber: 'border-l-4 border-amber-500 dark:border-amber-400 bg-card text-card-foreground',
    purple: 'border-l-4 border-purple-500 dark:border-purple-400 bg-card text-card-foreground',
  };

  return (
    <div className={`p-4 rounded-xl shadow-sm border border-border/80 ${accentStyles[accent]}`}>
      <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">{label}</p>
      <p className="text-2xl font-bold text-foreground mt-1">{value}</p>
      {helper && <p className="text-xs text-muted-foreground mt-0.5">{helper}</p>}
    </div>
  );
};

const ResumenFinancieroTab: FC<ResumenFinancieroTabProps> = ({ 
  currentRecord, 
  weeklyRecords, 
  setWeeklyRecords,
  categories,
  workingDate,
  setWorkingDate,
  formulas = DEFAULT_FORMULAS,
  churchInfo = DEFAULT_CHURCH_INFO,
  members = []
}) => {
  const { supabase, uploadFile, listFiles, getPublicUrl } = useSupabase();
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  
  // Cloud sync states
  const [isUploading, setIsUploading] = useState(false);
  const [isSyncingAll, setIsSyncingAll] = useState(false);
  const [syncStatusMsg, setSyncStatusMsg] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [cloudFileNames, setCloudFileNames] = useState<Set<string>>(new Set());

  // Auto-sync states & settings
  const [autoSyncEnabled, setAutoSyncEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('app_auto_sync_enabled');
      return saved !== null ? JSON.parse(saved) : true;
    } catch {
      return true;
    }
  });
  const [autoSyncStatus, setAutoSyncStatus] = useState<'idle' | 'saving' | 'synced' | 'offline' | 'error'>('idle');
  const [lastSyncedTime, setLastSyncedTime] = useState<string | null>(null);
  const lastUploadedContentRef = React.useRef<string>('');

  // Offering editing & management states
  const [editingOfferingId, setEditingOfferingId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<{
    memberName: string;
    category: string;
    amount: string;
    memberId?: string;
  }>({ memberName: '', category: 'Ordinaria', amount: '' });
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // New offering form state
  const [isAddingOffering, setIsAddingOffering] = useState(false);
  const [newOfferingData, setNewOfferingData] = useState<{
    memberName: string;
    category: string;
    amount: string;
    memberId?: string;
  }>({ memberName: 'Ordinaria', category: 'Ordinaria', amount: '' });

  // Toggle auto-sync preference
  const toggleAutoSync = () => {
    setAutoSyncEnabled(prev => {
      const next = !prev;
      localStorage.setItem('app_auto_sync_enabled', JSON.stringify(next));
      return next;
    });
  };

  // Check cloud files on mount or when supabase is ready
  useEffect(() => {
    if (!supabase) return;
    listFiles('reportes-semanales')
      .then(files => {
        if (files) {
          setCloudFileNames(new Set(files.map(f => f.name)));
        }
      })
      .catch(err => console.error("Error fetching cloud files:", err));
  }, [supabase, listFiles]);

  // Sort weekly records descending by date
  const sortedRecords = useMemo(() => {
    return [...weeklyRecords].sort((a, b) => 
      new Date(b.year, b.month - 1, b.day).getTime() - new Date(a.year, a.month - 1, a.day).getTime()
    );
  }, [weeklyRecords]);

  // Determine active record:
  // 1. If explicit selectedRecordId matches
  // 2. Else if workingDate matches a record in weeklyRecords
  // 3. Else if currentRecord is given
  // 4. Else default to the newest record in sortedRecords
  const recordToShow = useMemo(() => {
    if (selectedRecordId) {
      const found = weeklyRecords.find(r => r.id === selectedRecordId);
      if (found) return found;
    }

    if (workingDate) {
      const workingDay = workingDate.getDate();
      const workingMonth = workingDate.getMonth() + 1;
      const workingYear = workingDate.getFullYear();
      const matchingWorking = weeklyRecords.find(
        r => r.day === workingDay && r.month === workingMonth && r.year === workingYear
      );
      if (matchingWorking) return matchingWorking;
    }

    if (currentRecord) return currentRecord;
    if (sortedRecords.length > 0) return sortedRecords[0];
    return null;
  }, [selectedRecordId, workingDate, currentRecord, weeklyRecords, sortedRecords]);

  // Auto-set selectedRecordId when recordToShow changes
  useEffect(() => {
    if (recordToShow && recordToShow.id !== selectedRecordId) {
      setSelectedRecordId(recordToShow.id);
    }
  }, [recordToShow?.id]);

  // Calculations for the selected record
  const calculations = useMemo(() => {
    if (!recordToShow) return null;

    const recordFormulas = recordToShow.formulas || formulas;
    const subtotals: Record<string, number> = {};
    categories.forEach(cat => { subtotals[cat] = 0; });
    
    (recordToShow.offerings || []).forEach(d => {
      if (subtotals[d.category] !== undefined) {
        subtotals[d.category] += d.amount;
      } else {
        subtotals[d.category] = d.amount;
      }
    });

    const totalDiezmo = subtotals['Diezmo'] || 0;
    const totalOrdinaria = subtotals['Ordinaria'] || 0;
    const total = totalDiezmo + totalOrdinaria;
    
    const diezmoPercentage = recordFormulas?.diezmoPercentage ?? 10;
    const remanenteThreshold = recordFormulas?.remanenteThreshold ?? 4500;

    const diezmoDeDiezmo = Math.round(total * (diezmoPercentage / 100));
    const remanente = total > remanenteThreshold ? Math.round(total - remanenteThreshold) : 0;
    const gomerMinistro = Math.round(total - diezmoDeDiezmo);

    const totalGeneral = Object.values(subtotals).reduce((sum, val) => sum + val, 0);

    return { 
      subtotals, 
      total, 
      diezmoPercentage,
      diezmoDeDiezmo, 
      remanenteThreshold,
      remanente, 
      gomerMinistro,
      totalGeneral
    };
  }, [recordToShow, categories, formulas]);

  // Auto-sync debounced effect: saves automatically to cloud when recordToShow changes
  useEffect(() => {
    if (!autoSyncEnabled || !supabase || !recordToShow || !uploadFile) return;
    if (!recordToShow.offerings || recordToShow.offerings.length === 0) return;

    const signature = `${recordToShow.id}-${recordToShow.offerings.length}-${recordToShow.offerings.map(o => `${o.id || ''}:${o.memberName || ''}:${o.category || ''}:${o.amount}`).join('|')}`;
    
    // Si ya coincide con lo subido, no repetir
    if (lastUploadedContentRef.current === signature) {
      return;
    }

    setAutoSyncStatus('saving');
    const timer = setTimeout(async () => {
      try {
        const fileName = await uploadWeeklyRecordToCloud(uploadFile, recordToShow, categories);
        setCloudFileNames(prev => new Set([...prev, fileName]));
        lastUploadedContentRef.current = signature;
        setAutoSyncStatus('synced');
        setLastSyncedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      } catch (err) {
        console.error("Auto-sync error:", err);
        setAutoSyncStatus('offline');
      }
    }, 2200);

    return () => clearTimeout(timer);
  }, [recordToShow, autoSyncEnabled, supabase, uploadFile, categories]);

  // Handlers para edición de ofrendas
  const handleStartEditOffering = (offering: any, index: number) => {
    const id = offering.id || `offering-${index}`;
    setEditingOfferingId(id);
    setEditFormData({
      memberName: offering.memberName || 'Ordinaria',
      category: offering.category || 'Ordinaria',
      amount: offering.amount ? offering.amount.toString() : '',
      memberId: offering.memberId
    });
    setDeleteConfirmId(null);
  };

  const handleCancelEditOffering = () => {
    setEditingOfferingId(null);
  };

  const handleSaveEditOffering = async (targetId: string, index: number) => {
    if (!setWeeklyRecords || !recordToShow) return;
    const cleanAmount = parseFloat(String(editFormData.amount).replace(/[^0-9.-]/g, ''));
    if (isNaN(cleanAmount) || cleanAmount <= 0) {
      alert("Por favor ingrese un monto válido mayor a 0.");
      return;
    }

    const memberNameTrimmed = editFormData.memberName.trim() || 'Ordinaria';
    const isOrd = memberNameTrimmed.toLowerCase() === 'ordinaria';
    const matchedMember = members.find(m => m.name.toLowerCase() === memberNameTrimmed.toLowerCase());

    setWeeklyRecords(prev => prev.map(rec => {
      if (rec.id !== recordToShow.id) return rec;
      const updatedOfferings = [...rec.offerings];
      const idx = updatedOfferings.findIndex((o, i) => (o.id ? o.id === targetId : `offering-${i}` === targetId) || i === index);
      if (idx >= 0) {
        updatedOfferings[idx] = {
          ...updatedOfferings[idx],
          id: updatedOfferings[idx].id || crypto.randomUUID(),
          memberName: isOrd ? 'Ordinaria' : memberNameTrimmed,
          category: editFormData.category,
          amount: cleanAmount,
          memberId: isOrd ? undefined : (matchedMember ? matchedMember.id : updatedOfferings[idx].memberId)
        };
      }
      return { ...rec, offerings: updatedOfferings };
    }));

    setEditingOfferingId(null);
  };

  const handleDeleteOffering = (targetId: string, index: number) => {
    if (!setWeeklyRecords || !recordToShow) return;
    setWeeklyRecords(prev => prev.map(rec => {
      if (rec.id !== recordToShow.id) return rec;
      const updatedOfferings = rec.offerings.filter((o, i) => {
        if (o.id) return o.id !== targetId;
        return i !== index;
      });
      return { ...rec, offerings: updatedOfferings };
    }));
    setDeleteConfirmId(null);
    if (editingOfferingId === targetId) setEditingOfferingId(null);
  };

  const handleSaveNewOffering = () => {
    if (!setWeeklyRecords || !recordToShow) return;
    const cleanAmount = parseFloat(String(newOfferingData.amount).replace(/[^0-9.-]/g, ''));
    if (isNaN(cleanAmount) || cleanAmount <= 0) {
      alert("Por favor ingrese un monto válido mayor a 0.");
      return;
    }

    const memberNameTrimmed = newOfferingData.memberName.trim() || 'Ordinaria';
    const isOrd = memberNameTrimmed.toLowerCase() === 'ordinaria';
    const matchedMember = members.find(m => m.name.toLowerCase() === memberNameTrimmed.toLowerCase());

    const newOff = {
      id: crypto.randomUUID(),
      memberName: isOrd ? 'Ordinaria' : memberNameTrimmed,
      category: newOfferingData.category || 'Ordinaria',
      amount: cleanAmount,
      memberId: isOrd ? undefined : (matchedMember ? matchedMember.id : undefined)
    };

    setWeeklyRecords(prev => prev.map(rec => {
      if (rec.id !== recordToShow.id) return rec;
      return {
        ...rec,
        offerings: [...(rec.offerings || []), newOff]
      };
    }));

    // Reset form
    setNewOfferingData({ memberName: 'Ordinaria', category: 'Ordinaria', amount: '' });
    setIsAddingOffering(false);
  };

  // Check if current active record is uploaded in cloud
  const isCurrentRecordInCloud = useMemo(() => {
    if (!recordToShow) return false;
    const fileName = getWeeklyRecordFileName(recordToShow);
    return cloudFileNames.has(fileName);
  }, [recordToShow, cloudFileNames]);

  // Handle uploading the current record to Supabase
  const handleUploadCurrentToCloud = async () => {
    if (!recordToShow) return;
    if (!supabase) {
      setSyncStatusMsg({
        type: 'error',
        text: 'Supabase no está inicializado. Verifique su conexión.'
      });
      return;
    }

    setIsUploading(true);
    setSyncStatusMsg(null);
    try {
      const fileName = await uploadWeeklyRecordToCloud(uploadFile, recordToShow, categories);
      setCloudFileNames(prev => new Set([...prev, fileName]));
      setSyncStatusMsg({
        type: 'success',
        text: `¡Reporte del ${recordToShow.day}/${recordToShow.month}/${recordToShow.year} guardado en la nube!`
      });
    } catch (e) {
      console.error("Error subiendo reporte:", e);
      setSyncStatusMsg({
        type: 'error',
        text: `Error al subir: ${e instanceof Error ? e.message : String(e)}`
      });
    } finally {
      setIsUploading(false);
    }
  };

  // Handle full bi-directional sync
  const handleSyncAll = async () => {
    if (!supabase) {
      setSyncStatusMsg({
        type: 'error',
        text: 'Supabase no está disponible para sincronizar.'
      });
      return;
    }

    setIsSyncingAll(true);
    setSyncStatusMsg(null);
    try {
      const result = await syncAllWeeklyRecords(
        supabase,
        listFiles,
        getPublicUrl,
        uploadFile,
        weeklyRecords,
        categories,
        formulas,
        churchInfo
      );

      if (result.success) {
        if (setWeeklyRecords) {
          setWeeklyRecords(result.mergedRecords);
        }
        // Refresh cloud file names
        const files = await listFiles('reportes-semanales');
        if (files) setCloudFileNames(new Set(files.map(f => f.name)));

        setSyncStatusMsg({
          type: 'success',
          text: `Sincronización completa: ${result.cloudCount} semanas en nube, datos fusionados sin duplicados.`
        });
      } else {
        setSyncStatusMsg({
          type: 'error',
          text: result.error || 'No se pudo completar la sincronización.'
        });
      }
    } catch (e) {
      setSyncStatusMsg({
        type: 'error',
        text: `Error en sincronización: ${e instanceof Error ? e.message : String(e)}`
      });
    } finally {
      setIsSyncingAll(false);
    }
  };

  // Copy text summary to clipboard
  const handleCopySummary = () => {
    if (!recordToShow || !calculations) return;
    const dateStr = `${recordToShow.day} de ${MONTH_NAMES[recordToShow.month - 1]}, ${recordToShow.year}`;
    const churchStr = (window as any).CHURCH_NAME || 'La Empresa';
    
    let text = `📋 *REPORTE FINANCIERO SEMANAL*\n`;
    text += `🏛️ Iglesia: ${churchStr}\n`;
    text += `📅 Fecha: ${dateStr}\n`;
    text += `👤 Ministro: ${recordToShow.minister || churchInfo.defaultMinister}\n\n`;
    text += `💵 *Ingresos por Categoría:*\n`;
    categories.forEach(cat => {
      const amt = calculations.subtotals[cat] || 0;
      if (amt > 0) {
        text += `• ${cat}: C$ ${amt.toLocaleString('es-NI', { minimumFractionDigits: 2 })}\n`;
      }
    });
    text += `\n📊 *Cálculos Finales:*\n`;
    text += `• TOTAL (Diezmo + Ordinaria): C$ ${calculations.total.toLocaleString('es-NI', { minimumFractionDigits: 2 })}\n`;
    text += `• Diezmo de Diezmo (${calculations.diezmoPercentage}%): C$ ${calculations.diezmoDeDiezmo.toLocaleString('es-NI', { minimumFractionDigits: 2 })}\n`;
    text += `• Remanente: C$ ${calculations.remanente.toLocaleString('es-NI', { minimumFractionDigits: 2 })}\n`;
    text += `• Gomer del Ministro: C$ ${calculations.gomerMinistro.toLocaleString('es-NI', { minimumFractionDigits: 2 })}\n`;

    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  // Download Excel
  const handleDownloadExcel = () => {
    if (!recordToShow) return;
    try {
      const fileName = getWeeklyRecordFileName(recordToShow);
      const url = getPublicUrl('reportes-semanales', fileName);
      window.open(url, '_blank');
    } catch (e) {
      alert("Para descargar, asegúrese de haber subido el reporte a la nube primero.");
    }
  };

  return (
    <div className="space-y-4 pb-8 max-w-4xl mx-auto">
      
      {/* Top Header Card with Week Selector */}
      <div className="p-4 sm:p-5 bg-card rounded-2xl shadow-sm border border-border">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-[#00a884]" />
              <h2 className="text-xl font-bold text-foreground">Resumen Financiero Semanal</h2>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              {recordToShow 
                ? `Mostrando semana del ${recordToShow.day} de ${MONTH_NAMES[recordToShow.month - 1]}, ${recordToShow.year}`
                : 'Selecciona una fecha o ingresa ofrendas en la pestaña Chats'}
            </p>
          </div>

          {/* Week Selector Dropdown */}
          <div className="w-full md:w-auto min-w-[260px]">
            <label className="block text-xs font-semibold text-muted-foreground mb-1">
              Cambiar Semana / Histórico:
            </label>
            <div className="relative">
              <select
                value={recordToShow?.id || ''}
                onChange={(e) => {
                  const val = e.target.value;
                  setSelectedRecordId(val);
                  const selectedRec = weeklyRecords.find(r => r.id === val);
                  if (selectedRec && setWorkingDate) {
                    setWorkingDate(new Date(selectedRec.year, selectedRec.month - 1, selectedRec.day, 12, 0, 0));
                  }
                }}
                className="w-full bg-secondary/80 hover:bg-secondary text-foreground text-sm font-medium py-2.5 pl-3 pr-8 rounded-xl border border-border/80 focus:ring-2 focus:ring-[#00a884] focus:outline-none appearance-none cursor-pointer"
              >
                {sortedRecords.length === 0 ? (
                  <option value="" disabled>No hay semanas registradas</option>
                ) : (
                  sortedRecords.map((r) => {
                    const isTodayMatch = workingDate && 
                      r.day === workingDate.getDate() && 
                      r.month === (workingDate.getMonth() + 1) && 
                      r.year === workingDate.getFullYear();
                    return (
                      <option key={r.id} value={r.id}>
                        {`${r.day} de ${MONTH_NAMES[r.month - 1]}, ${r.year} (${(r.offerings || []).length} ofrendas)${isTodayMatch ? ' • [Activa hoy]' : ''}`}
                      </option>
                    );
                  })
                )}
              </select>
              <ChevronDown className="w-4 h-4 text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Sync & Cloud Action Bar */}
        <div className="mt-4 pt-4 border-t border-border/60 flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 flex-wrap">
            {autoSyncStatus === 'saving' || isUploading ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/30 animate-pulse">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-600" />
                Guardando automáticamente en la nube...
              </span>
            ) : (autoSyncStatus === 'synced' || isCurrentRecordInCloud) ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                Sincronizado en la nube {lastSyncedTime ? `(${lastSyncedTime})` : ''}
              </span>
            ) : autoSyncStatus === 'offline' ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                <AlertCircle className="w-3.5 h-3.5" />
                Guardado en el equipo (Sin internet)
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                <AlertCircle className="w-3.5 h-3.5" />
                Pendiente de subir
              </span>
            )}

            {/* Auto-sync indicator badge */}
            <button
              type="button"
              onClick={toggleAutoSync}
              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border transition-colors ${
                autoSyncEnabled 
                  ? 'bg-[#00a884]/10 text-[#008f6f] dark:text-[#25d366] border-[#00a884]/30 hover:bg-[#00a884]/20'
                  : 'bg-muted text-muted-foreground border-border hover:bg-muted/80'
              }`}
              title={autoSyncEnabled ? 'Auto-sincronización activada. Clic para pausar.' : 'Auto-sincronización pausada. Clic para activar.'}
            >
              <ShieldCheck className="w-3 h-3" />
              <span>Auto-Sync: {autoSyncEnabled ? 'Activo' : 'Pausado'}</span>
            </button>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Upload Current Week to Cloud (Manual override) */}
            <button
              onClick={handleUploadCurrentToCloud}
              disabled={isUploading || !recordToShow}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-[#00a884] text-white hover:bg-[#008f6f] active:scale-95 transition-all shadow-sm disabled:opacity-50"
              title="Sube manualmente este reporte a la nube en este momento"
            >
              {isUploading ? (
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <CloudUpload className="w-3.5 h-3.5" />
              )}
              <span>{isUploading ? 'Subiendo...' : 'Subir reporte a la nube'}</span>
            </button>

            {/* Sync All with Deduplication */}
            <button
              onClick={handleSyncAll}
              disabled={isSyncingAll}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-secondary hover:bg-secondary/80 text-foreground active:scale-95 transition-all border border-border disabled:opacity-50"
              title="Descarga y combina reportes de la nube sin duplicar datos"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncingAll ? 'animate-spin text-[#00a884]' : ''}`} />
              <span>{isSyncingAll ? 'Sincronizando...' : 'Sincronizar todo'}</span>
            </button>

            {/* Copy Summary */}
            <button
              onClick={handleCopySummary}
              disabled={!recordToShow}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-secondary hover:bg-secondary/80 text-foreground active:scale-95 transition-all border border-border disabled:opacity-50"
              title="Copiar texto del resumen para WhatsApp"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? '¡Copiado!' : 'Copiar'}</span>
            </button>
          </div>
        </div>

        {/* Sync message alert banner */}
        {syncStatusMsg && (
          <div className={`mt-3 p-3 rounded-xl text-xs flex items-center gap-2 ${
            syncStatusMsg.type === 'success' 
              ? 'bg-emerald-500/10 text-emerald-800 dark:text-emerald-200 border border-emerald-500/20'
              : syncStatusMsg.type === 'error'
              ? 'bg-destructive/10 text-destructive border border-destructive/20'
              : 'bg-blue-500/10 text-blue-800 dark:text-blue-200 border border-blue-500/20'
          }`}>
            {syncStatusMsg.type === 'success' && <CheckCircle2 className="w-4 h-4 flex-shrink-0" />}
            {syncStatusMsg.type === 'error' && <AlertCircle className="w-4 h-4 flex-shrink-0" />}
            <span>{syncStatusMsg.text}</span>
          </div>
        )}
      </div>

      {/* When no record is selected or available */}
      {(!recordToShow || !calculations) ? (
        <div className="p-8 text-center bg-card rounded-2xl shadow-sm border border-border">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-3 text-muted-foreground">
            <Calendar className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-foreground">No hay ofrendas registradas para esta semana</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
            Ve a la pestaña <strong>Chats</strong>, ingresa las ofrendas del día para cada miembro, y al volver a esta pestaña verás el reporte automáticamente calculado.
          </p>
          <div className="mt-4 flex justify-center gap-2">
            <button 
              onClick={handleSyncAll}
              disabled={isSyncingAll}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncingAll ? 'animate-spin' : ''}`} />
              <span>Cargar reportes de la nube</span>
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Main Key Figures Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard 
              label="Total Diezmo + Ordinaria" 
              value={`C$ ${calculations.total.toLocaleString('es-NI', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              helper="Base para fórmulas"
              accent="emerald"
            />
            <StatCard 
              label="Gomer del Ministro" 
              value={`C$ ${calculations.gomerMinistro.toLocaleString('es-NI', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              helper="Total - Diezmo de Diezmo"
              accent="blue"
            />
            <StatCard 
              label={`Diezmo de Diezmo (${calculations.diezmoPercentage}%)`} 
              value={`C$ ${calculations.diezmoDeDiezmo.toLocaleString('es-NI', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              helper="Aporte a la Administración"
              accent="purple"
            />
            <StatCard 
              label="Remanente" 
              value={`C$ ${calculations.remanente.toLocaleString('es-NI', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              helper={`Excedente de C$ ${calculations.remanenteThreshold}`}
              accent="amber"
            />
          </div>

          {/* Breakdown by Category */}
          <div className="p-4 sm:p-5 bg-card rounded-2xl shadow-sm border border-border">
            <h3 className="text-base font-bold text-foreground mb-3 flex items-center justify-between">
              <span>Desglose por Categorías</span>
              <span className="text-xs font-normal text-muted-foreground">
                Recaudación Total: <strong className="text-foreground">C$ {calculations.totalGeneral.toLocaleString('es-NI', { minimumFractionDigits: 2 })}</strong>
              </span>
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {categories.map(cat => {
                const amount = calculations.subtotals[cat] || 0;
                const count = (recordToShow.offerings || []).filter(o => o.category === cat).length;
                return (
                  <div 
                    key={cat} 
                    className={`flex items-center justify-between p-3 rounded-xl border ${
                      amount > 0 
                        ? 'bg-secondary/60 border-border/80' 
                        : 'bg-muted/20 border-border/30 opacity-60'
                    }`}
                  >
                    <div>
                      <p className="font-semibold text-sm text-foreground">{cat}</p>
                      <p className="text-xs text-muted-foreground">{count} {count === 1 ? 'registro' : 'registros'}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-foreground">
                        C$ {amount.toLocaleString('es-NI', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Offerings Details / Individual List */}
          <div className="p-4 sm:p-5 bg-card rounded-2xl shadow-sm border border-border">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-[#00a884]" />
                <h3 className="text-base font-bold text-foreground">Detalle de Ofrendas Registradas</h3>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-secondary text-muted-foreground font-semibold">
                  {(recordToShow.offerings || []).length} aportaciones
                </span>
              </div>
              
              <button
                type="button"
                onClick={() => {
                  setIsAddingOffering(prev => !prev);
                  setEditingOfferingId(null);
                  setDeleteConfirmId(null);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-[#00a884]/10 hover:bg-[#00a884]/20 text-[#008f6f] dark:text-[#25d366] border border-[#00a884]/30 transition-all active:scale-95"
              >
                {isAddingOffering ? (
                  <>
                    <X className="w-3.5 h-3.5" />
                    <span>Cerrar formulario</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Añadir ofrenda</span>
                  </>
                )}
              </button>
            </div>

            {/* Formulario para agregar una nueva ofrenda manualmente */}
            {isAddingOffering && (
              <div className="mb-4 p-3.5 sm:p-4 rounded-xl bg-secondary/70 border border-[#00a884]/40 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#008f6f] dark:text-[#25d366]">
                    Añadir ofrenda a esta semana
                  </h4>
                  <button
                    type="button"
                    onClick={() => setIsAddingOffering(false)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {/* Miembro */}
                  <div>
                    <label className="block text-[11px] font-semibold text-muted-foreground mb-1">
                      Miembro / Donante:
                    </label>
                    <select
                      value={newOfferingData.memberName}
                      onChange={(e) => {
                        const val = e.target.value;
                        const found = members.find(m => m.name === val);
                        setNewOfferingData(prev => ({
                          ...prev,
                          memberName: val,
                          memberId: found ? found.id : undefined
                        }));
                      }}
                      className="w-full bg-background text-foreground text-xs font-medium py-2 px-2.5 rounded-lg border border-border focus:ring-2 focus:ring-[#00a884] focus:outline-none"
                    >
                      <option value="Ordinaria">Ordinaria (General / Colecta)</option>
                      {members.filter(m => m.isActive).map(m => (
                        <option key={m.id} value={m.name}>{m.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Categoría */}
                  <div>
                    <label className="block text-[11px] font-semibold text-muted-foreground mb-1">
                      Categoría:
                    </label>
                    <select
                      value={newOfferingData.category}
                      onChange={(e) => setNewOfferingData(prev => ({ ...prev, category: e.target.value }))}
                      className="w-full bg-background text-foreground text-xs font-medium py-2 px-2.5 rounded-lg border border-border focus:ring-2 focus:ring-[#00a884] focus:outline-none"
                    >
                      {categories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  {/* Monto */}
                  <div>
                    <label className="block text-[11px] font-semibold text-muted-foreground mb-1">
                      Monto (C$ Córdobas):
                    </label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">C$</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        value={newOfferingData.amount}
                        onChange={(e) => setNewOfferingData(prev => ({ ...prev, amount: e.target.value }))}
                        className="w-full bg-background text-foreground text-xs font-medium py-2 pl-8 pr-2.5 rounded-lg border border-border focus:ring-2 focus:ring-[#00a884] focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsAddingOffering(false)}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-muted text-muted-foreground hover:bg-muted/80"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveNewOffering}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-[#00a884] text-white hover:bg-[#008f6f] shadow-sm active:scale-95"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Guardar ofrenda</span>
                  </button>
                </div>
              </div>
            )}

            {(recordToShow.offerings || []).length === 0 ? (
              <div className="text-center py-6 border border-dashed border-border rounded-xl">
                <p className="text-xs text-muted-foreground">No hay ofrendas registradas para esta semana.</p>
                <button
                  type="button"
                  onClick={() => setIsAddingOffering(true)}
                  className="mt-2 text-xs font-semibold text-[#00a884] hover:underline inline-flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Registrar la primera ofrenda
                </button>
              </div>
            ) : (
              <div className="divide-y divide-border/60 max-h-96 overflow-y-auto pr-1">
                {(recordToShow.offerings || []).map((offering, idx) => {
                  const targetId = offering.id || `offering-${idx}`;
                  const isEditing = editingOfferingId === targetId;
                  const isDeleting = deleteConfirmId === targetId;

                  if (isEditing) {
                    return (
                      <div key={targetId} className="py-3 px-3 my-1 rounded-xl bg-secondary/80 border border-primary/40 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-foreground">
                            Editando ofrenda #{idx + 1}
                          </span>
                          <button 
                            onClick={handleCancelEditOffering} 
                            className="text-muted-foreground hover:text-foreground"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          {/* Selector Miembro */}
                          <div>
                            <label className="block text-[10px] font-semibold text-muted-foreground mb-0.5">Miembro / Donante</label>
                            <select
                              value={editFormData.memberName}
                              onChange={(e) => {
                                const val = e.target.value;
                                const found = members.find(m => m.name === val);
                                setEditFormData(prev => ({
                                  ...prev,
                                  memberName: val,
                                  memberId: found ? found.id : undefined
                                }));
                              }}
                              className="w-full bg-background text-foreground text-xs font-medium py-1.5 px-2 rounded-lg border border-border focus:ring-2 focus:ring-[#00a884] focus:outline-none"
                            >
                              <option value="Ordinaria">Ordinaria (General)</option>
                              {members.filter(m => m.isActive).map(m => (
                                <option key={m.id} value={m.name}>{m.name}</option>
                              ))}
                              {!members.some(m => m.name.toLowerCase() === editFormData.memberName.toLowerCase()) && editFormData.memberName !== 'Ordinaria' && (
                                <option value={editFormData.memberName}>{editFormData.memberName} (Personalizado)</option>
                              )}
                            </select>
                          </div>

                          {/* Selector Categoría */}
                          <div>
                            <label className="block text-[10px] font-semibold text-muted-foreground mb-0.5">Categoría</label>
                            <select
                              value={editFormData.category}
                              onChange={(e) => setEditFormData(prev => ({ ...prev, category: e.target.value }))}
                              className="w-full bg-background text-foreground text-xs font-medium py-1.5 px-2 rounded-lg border border-border focus:ring-2 focus:ring-[#00a884] focus:outline-none"
                            >
                              {categories.map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                              ))}
                            </select>
                          </div>

                          {/* Monto */}
                          <div>
                            <label className="block text-[10px] font-semibold text-muted-foreground mb-0.5">Monto (C$)</label>
                            <div className="relative">
                              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">C$</span>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={editFormData.amount}
                                onChange={(e) => setEditFormData(prev => ({ ...prev, amount: e.target.value }))}
                                className="w-full bg-background text-foreground text-xs font-medium py-1.5 pl-7 pr-2 rounded-lg border border-border focus:ring-2 focus:ring-[#00a884] focus:outline-none"
                              />
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-1">
                          <button
                            type="button"
                            onClick={handleCancelEditOffering}
                            className="px-3 py-1 text-xs font-semibold rounded-lg bg-muted text-muted-foreground hover:bg-muted/80"
                          >
                            Cancelar
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSaveEditOffering(targetId, idx)}
                            className="inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded-lg bg-[#00a884] text-white hover:bg-[#008f6f] shadow-sm"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Guardar cambios</span>
                          </button>
                        </div>
                      </div>
                    );
                  }

                  if (isDeleting) {
                    return (
                      <div key={targetId} className="py-2.5 px-3 my-1 rounded-xl bg-destructive/10 border border-destructive/30 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div className="text-xs text-foreground font-medium">
                          ¿Seguro de eliminar la ofrenda de <strong className="font-bold">{offering.memberName || 'Ordinaria'}</strong> por <strong className="font-bold">C$ {offering.amount.toFixed(2)}</strong>?
                        </div>
                        <div className="flex items-center gap-1.5 self-end sm:self-auto">
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmId(null)}
                            className="px-2.5 py-1 text-xs font-medium rounded-md bg-muted text-muted-foreground hover:bg-muted/80"
                          >
                            Cancelar
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteOffering(targetId, idx)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Sí, eliminar</span>
                          </button>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div key={targetId} className="py-2.5 flex items-center justify-between text-sm group hover:bg-secondary/40 px-2 rounded-xl transition-colors">
                      <div className="min-w-0 pr-2">
                        <p className="font-semibold text-foreground truncate">
                          {offering.memberName || 'Ordinaria'}
                        </p>
                        <span className="inline-block px-2 py-0.5 rounded text-[11px] font-semibold bg-muted text-muted-foreground">
                          {offering.category}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <div className="text-right font-bold text-foreground text-sm">
                          C$ {offering.amount.toLocaleString('es-NI', { minimumFractionDigits: 2 })}
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleStartEditOffering(offering, idx)}
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-[#00a884] hover:bg-[#00a884]/10 transition-colors"
                            title="Editar esta ofrenda (miembro, categoría o monto)"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setDeleteConfirmId(targetId);
                              setEditingOfferingId(null);
                            }}
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                            title="Eliminar esta ofrenda"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default ResumenFinancieroTab;
