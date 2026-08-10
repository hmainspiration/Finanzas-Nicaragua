

import React, { useState, useMemo } from 'react';
import { WeeklyRecord, Formulas } from '../../types';
import { MONTH_NAMES } from '../../constants';

interface ResumenMensualTabProps {
  records: WeeklyRecord[];
  categories: string[];
  formulas: Formulas;
}

const ResumenMensualTab: React.FC<ResumenMensualTabProps> = ({ records, categories, formulas }) => {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const monthlyData = useMemo(() => {
    const filteredRecords = records.filter(r => r.month === selectedMonth && r.year === selectedYear);
    if (filteredRecords.length === 0) return null;

    const subtotals: Record<string, number> = {};
    categories.forEach(cat => { subtotals[cat] = 0 });

    let totalDiezmoDeDiezmo = 0;
    let totalRemanente = 0;

    filteredRecords.forEach(record => {
        const recordFormulas = record.formulas || formulas; // FIX: Use global formulas as fallback
        
        record.offerings.forEach(offering => {
            if (subtotals[offering.category] !== undefined) {
                subtotals[offering.category] += offering.amount;
            }
        });

        const weeklyTotal = (record.offerings.filter(d => d.category === 'Diezmo').reduce((s, d) => s + d.amount, 0)) + 
                            (record.offerings.filter(d => d.category === 'Ordinaria').reduce((s, d) => s + d.amount, 0));
        
        totalDiezmoDeDiezmo += Math.round(weeklyTotal * (recordFormulas.diezmoPercentage / 100));
        if (weeklyTotal > recordFormulas.remanenteThreshold) {
            totalRemanente += Math.round(weeklyTotal - recordFormulas.remanenteThreshold);
        }
    });
    
    const total = (subtotals['Diezmo'] || 0) + (subtotals['Ordinaria'] || 0);
    const gomerMinistro = Math.round(total - totalDiezmoDeDiezmo);

    return { subtotals, total, totalDiezmoDeDiezmo, totalRemanente, gomerMinistro };
  }, [records, selectedMonth, selectedYear, categories, formulas]);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-foreground">Resumen Mensual</h2>
      <div className="p-6 bg-card rounded-xl shadow-lg border">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="reportMonth" className="block text-sm font-medium text-muted-foreground">Mes</label>
            <select id="reportMonth" value={selectedMonth} onChange={e => setSelectedMonth(parseInt(e.target.value))} className="mt-1 block w-full p-2 border-input bg-input rounded-md shadow-sm">
              {MONTH_NAMES.map((name, index) => <option key={name} value={index + 1}>{name}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="reportYear" className="block text-sm font-medium text-muted-foreground">Año</label>
            <input type="number" id="reportYear" value={selectedYear} onChange={e => setSelectedYear(parseInt(e.target.value))} className="mt-1 block w-full p-2 border-input bg-input rounded-md shadow-sm" />
          </div>
        </div>
      </div>
      
      {monthlyData ? (
        <div className="p-6 bg-card rounded-xl shadow-lg space-y-4 border">
            <h3 className="text-xl font-bold text-foreground">Resultados para {MONTH_NAMES[selectedMonth - 1]} {selectedYear}</h3>
            <div className="p-4 space-y-2 bg-secondary rounded-lg">
              <h4 className="font-bold text-secondary-foreground">Ingresos Totales por Categoría</h4>
              {categories.map(cat => (
                <div key={cat} className="flex justify-between">
                  <span className="text-secondary-foreground">{cat}:</span>
                  <span className="font-semibold text-secondary-foreground">C$ {monthlyData.subtotals[cat]?.toFixed(2) || '0.00'}</span>
                </div>
              ))}
            </div>
             <div className="p-4 space-y-2 bg-green-500/10 rounded-lg">
              <h4 className="font-bold text-green-700 dark:text-green-300">Cálculos Totales del Mes</h4>
               <div className="flex justify-between font-bold text-lg border-b pb-2 border-border">
                  <span className="text-foreground">TOTAL (Diezmo + Ordinaria):</span>
                  <span className="text-foreground">C$ {monthlyData.total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Diezmo de Diezmo:</span>
                  <span className="font-semibold text-foreground">C$ {monthlyData.totalDiezmoDeDiezmo.toFixed(2)}</span>
                </div>
                 <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Remanente:</span>
                  <span className="font-semibold text-foreground">C$ {monthlyData.totalRemanente.toFixed(2)}</span>
                </div>
                 <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Gomer del Ministro:</span>
                  <span className="font-semibold text-foreground">C$ {monthlyData.gomerMinistro.toFixed(2)}</span>
                </div>
            </div>
        </div>
      ) : (
        <div className="p-6 text-center bg-card rounded-xl shadow-lg border">
            <p className="text-muted-foreground">No hay datos para {MONTH_NAMES[selectedMonth - 1]} de {selectedYear}.</p>
        </div>
      )}
    </div>
  );
};

export default ResumenMensualTab;