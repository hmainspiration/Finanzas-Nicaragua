// Fix: Implemented a full functional component instead of a placeholder.
import React, { useMemo, useState, FC } from 'react';
import { WeeklyRecord } from '../../types';
import { MONTH_NAMES } from '../../constants';

interface ResumenFinancieroTabProps {
  currentRecord: WeeklyRecord | null;
  weeklyRecords: WeeklyRecord[];
  categories: string[];
}

const StatCard: FC<{label: string, value: string, color?: string}> = ({ label, value, color = 'bg-card' }) => (
    <div className={`p-4 rounded-xl shadow-md ${color} border`}>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-2xl font-bold text-foreground mt-1">{value}</p>
    </div>
);

const ResumenFinancieroTab: FC<ResumenFinancieroTabProps> = ({ currentRecord, weeklyRecords, categories }) => {
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);

  const recordToShow = useMemo(() => {
    if (currentRecord) {
      return currentRecord;
    }
    if (selectedRecordId) {
      return weeklyRecords.find(r => r.id === selectedRecordId) || null;
    }
    return null;
  }, [currentRecord, selectedRecordId, weeklyRecords]);
  
  const calculations = useMemo(() => {
    if (!recordToShow) return null;

    const subtotals: Record<string, number> = {};
    categories.forEach(cat => { subtotals[cat] = 0; });
    recordToShow.offerings.forEach(d => {
      if (subtotals[d.category] !== undefined) {
        subtotals[d.category] += d.amount;
      }
    });

    const total = (subtotals['Diezmo'] || 0) + (subtotals['Ordinaria'] || 0);
    const diezmoDeDiezmo = Math.round(total * (recordToShow.formulas.diezmoPercentage / 100));
    const remanente = total > recordToShow.formulas.remanenteThreshold ? Math.round(total - recordToShow.formulas.remanenteThreshold) : 0;
    const gomerMinistro = Math.round(total - diezmoDeDiezmo);

    return { subtotals, total, diezmoDeDiezmo, remanente, gomerMinistro };
  }, [recordToShow, categories]);

  const sortedRecords = useMemo(() => {
    return [...weeklyRecords].sort((a, b) => new Date(b.year, b.month - 1, b.day).getTime() - new Date(a.year, a.month - 1, a.day).getTime());
  }, [weeklyRecords]);


  if (!recordToShow || !calculations) {
    return (
      <div className="p-6 text-center bg-card rounded-xl shadow-lg border">
        <h2 className="text-2xl font-bold text-foreground mb-4">Resumen Financiero</h2>
        {currentRecord ? (
          <p className="text-muted-foreground">No hay datos para mostrar.</p>
        ) : (
          <div>
            <p className="mb-4 text-muted-foreground">No hay una semana activa. Seleccione una semana guardada para ver su resumen.</p>
            <select
              onChange={(e) => setSelectedRecordId(e.target.value)}
              defaultValue=""
              className="mt-1 block w-full p-2 border-input bg-input rounded-md shadow-sm"
            >
              <option value="" disabled>-- Seleccione una semana --</option>
              {sortedRecords.map(record => (
                <option key={record.id} value={record.id}>
                  {`Semana del ${record.day} de ${MONTH_NAMES[record.month - 1]}, ${record.year}`}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="p-6 bg-card rounded-xl shadow-lg border">
        <h2 className="text-2xl font-bold text-foreground">Resumen Financiero Semanal</h2>
        <p className="text-muted-foreground">Semana del {recordToShow.day}/{recordToShow.month}/{recordToShow.year}</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <StatCard label="TOTAL (Diezmo + Ordinaria)" value={`C$ ${calculations.total.toFixed(2)}`} color="bg-card"/>
        <StatCard label="Gomer del Ministro" value={`C$ ${calculations.gomerMinistro.toFixed(2)}`} color="bg-card"/>
        <StatCard label="Diezmo de Diezmo" value={`C$ ${calculations.diezmoDeDiezmo.toFixed(2)}`} color="bg-card"/>
        <StatCard label="Remanente" value={`C$ ${calculations.remanente.toFixed(2)}`} color="bg-card"/>
      </div>

      <div className="p-6 bg-card rounded-xl shadow-lg border">
          <h3 className="text-xl font-bold text-foreground mb-4">Desglose por Categoría</h3>
          <div className="space-y-2">
              {categories.map(cat => (
                  calculations.subtotals[cat] > 0 &&
                  <div key={cat} className="flex justify-between items-center p-3 bg-secondary rounded-lg">
                      <span className="font-medium text-secondary-foreground">{cat}</span>
                      <span className="font-semibold text-secondary-foreground">C$ {calculations.subtotals[cat].toFixed(2)}</span>
                  </div>
              ))}
          </div>
      </div>
    </div>
  );
};

export default ResumenFinancieroTab;