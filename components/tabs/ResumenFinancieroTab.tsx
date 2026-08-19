import React, { useMemo, useState, useEffect, FC } from 'react';
import { WeeklyRecord, Formulas, ChurchInfo, Member } from '../../types';
import { MONTH_NAMES, DEFAULT_FORMULAS, DEFAULT_CHURCH_INFO } from '../../constants';
import { useSupabase } from '../../context/SupabaseContext';
import { uploadWeeklyRecordToCloud, syncAllWeeklyRecords, getWeeklyRecordFileName } from '../../utils/syncService';
import { CloudUpload, RefreshCw, CheckCircle2, AlertCircle, FileSpreadsheet, Copy, Check, ChevronDown, Calendar, Users } from 'lucide-react';

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
          <div className="flex items-center gap-2">
            {isCurrentRecordInCloud ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Guardado en la nube
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20">
                <AlertCircle className="w-3.5 h-3.5" />
                Pendiente de subir
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Upload Current Week to Cloud */}
            <button
              onClick={handleUploadCurrentToCloud}
              disabled={isUploading || !recordToShow}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-[#00a884] text-white hover:bg-[#008f6f] active:scale-95 transition-all shadow-sm disabled:opacity-50"
              title="Sube este reporte a la nube para que otros lo vean desde su computadora"
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
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-[#00a884]" />
                <h3 className="text-base font-bold text-foreground">Detalle de Ofrendas Registradas</h3>
              </div>
              <span className="text-xs px-2.5 py-1 rounded-full bg-secondary text-muted-foreground font-semibold">
                {(recordToShow.offerings || []).length} aportaciones
              </span>
            </div>

            {(recordToShow.offerings || []).length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">No hay ofrendas individuales en esta semana.</p>
            ) : (
              <div className="divide-y divide-border/60 max-h-80 overflow-y-auto pr-1">
                {(recordToShow.offerings || []).map((offering, idx) => (
                  <div key={offering.id || idx} className="py-2.5 flex items-center justify-between text-sm">
                    <div className="min-w-0 pr-2">
                      <p className="font-medium text-foreground truncate">
                        {offering.memberName || 'Ofrenda General'}
                      </p>
                      <span className="inline-block px-2 py-0.5 rounded text-[11px] font-medium bg-muted text-muted-foreground">
                        {offering.category}
                      </span>
                    </div>
                    <div className="text-right font-bold text-foreground text-sm flex-shrink-0">
                      C$ {offering.amount.toLocaleString('es-NI', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default ResumenFinancieroTab;
