import React, { useState, useMemo, useEffect } from 'react';
import { Tab, WeeklyRecord, Member, Formulas, MonthlyReport, ChurchInfo, Comisionado } from '../types';
import Header from '../components/layout/Header';
// import BottomNav from '../components/layout/BottomNav'; // No longer used
import RegistroOfrendasTab from '../components/tabs/RegistroOfrendasTab';
import ResumenFinancieroTab from '../components/tabs/ResumenFinancieroTab';
import SemanasRegistradasTab from '../components/tabs/SemanasRegistradasTab';
import ResumenMensualTab from '../components/tabs/ResumenMensualTab';
import AdminPanelTab from '../components/tabs/AdminPanelTab';
import InformeMensualTab from '../components/tabs/InformeMensualTab';
import { useSupabase } from '../context/SupabaseContext';
import { MONTH_NAMES } from '../constants';
import { CirclePlus, BarChart2, CalendarDays, PieChart, Settings, FileText } from 'lucide-react';


// Define props based on what App.tsx passes
interface AppData {
    members: Member[];
    categories: string[];
    weeklyRecords: WeeklyRecord[];
    currentRecord: WeeklyRecord | null;
    formulas: Formulas;
    monthlyReports: MonthlyReport[];
    churchInfo: ChurchInfo;
    comisionados: Comisionado[];
}

interface AppHandlers {
    setMembers: React.Dispatch<React.SetStateAction<Member[]>>;
    setCategories: React.Dispatch<React.SetStateAction<string[]>>;
    setWeeklyRecords: React.Dispatch<React.SetStateAction<WeeklyRecord[]>>;
    setCurrentRecord: React.Dispatch<React.SetStateAction<WeeklyRecord | null>>;
    setFormulas: React.Dispatch<React.SetStateAction<Formulas>>;
    setMonthlyReports: React.Dispatch<React.SetStateAction<MonthlyReport[]>>;
    setChurchInfo: React.Dispatch<React.SetStateAction<ChurchInfo>>;
    setComisionados: React.Dispatch<React.SetStateAction<Comisionado[]>>;
    setTheme: React.Dispatch<React.SetStateAction<'light' | 'dark'>>;
}

interface MainAppProps {
  onLogout: () => void;
  onSwitchVersion: () => void;
  data: AppData;
  handlers: AppHandlers;
  theme: string;
  toggleTheme: () => void;
}

const navItems = [
  { id: 'register', label: 'Registro', icon: CirclePlus },
  { id: 'summary', label: 'Resumen', icon: BarChart2 },
  { id: 'history', label: 'Semanas', icon: CalendarDays },
  { id: 'monthly', label: 'Mensual', icon: PieChart },
  { id: 'informe', label: 'Informe', icon: FileText },
  { id: 'admin', label: 'Admin', icon: Settings },
];

const MainApp: React.FC<MainAppProps> = ({ onLogout, onSwitchVersion, data, handlers, theme, toggleTheme }) => {
  const [activeTab, setActiveTab] = useState<Tab>('register');
  const [isSaving, setIsSaving] = useState(false);
  const { uploadFile, supabase } = useSupabase();
  
  // Destructure props for easier use
  const { members, categories, weeklyRecords, currentRecord, formulas, monthlyReports, churchInfo, comisionados } = data;
  const { setMembers, setCategories, setWeeklyRecords, setCurrentRecord, setFormulas, setMonthlyReports, setChurchInfo, setComisionados, setTheme } = handlers;

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
    if (!currentRecord) return;
    setIsSaving(true);

    const existingIndex = weeklyRecords.findIndex(r => r.id === currentRecord.id);
    let updatedRecords = [...weeklyRecords];
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
        alert(`Semana guardada localmente, pero falló la subida a la nube.\nError: ${uploadResult.error?.message}\n\nPuede reintentar desde la pestaña 'Semanas'.`);
    }

    setCurrentRecord(null);
    setActiveTab('history');
    setIsSaving(false);
  };

  const startNewRecord = () => {
    setCurrentRecord(null);
    setActiveTab('register');
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'register':
        return (
          // FIX: Corrected component props to match definition.
          <RegistroOfrendasTab
            currentRecord={currentRecord}
            setCurrentRecord={setCurrentRecord}
            members={members}
            setMembers={setMembers}
            categories={categories}
            setCategories={setCategories}
            onSaveRecord={handleSaveCurrentRecord}
            onStartNew={startNewRecord}
            defaultFormulas={formulas}
            weeklyRecords={weeklyRecords}
            churchInfo={churchInfo}
          />
        );
      case 'summary':
        // FIX: Corrected component props to match definition.
        // FIX: Added missing weeklyRecords prop.
        return <ResumenFinancieroTab currentRecord={currentRecord} weeklyRecords={weeklyRecords} categories={categories} />;
      case 'history':
        return <SemanasRegistradasTab 
                    records={weeklyRecords} 
                    setRecords={setWeeklyRecords}
                    members={members}
                    categories={categories}
                    formulas={formulas}
                    churchInfo={churchInfo}
                />;
      case 'monthly':
        return <ResumenMensualTab records={weeklyRecords} categories={categories} formulas={formulas} />;
      case 'informe':
        return <InformeMensualTab 
                    records={weeklyRecords} 
                    formulas={formulas} 
                    savedReports={monthlyReports}
                    setSavedReports={setMonthlyReports}
                    churchInfo={churchInfo}
                    comisionados={comisionados}
                    members={members}
                />;
      case 'admin':
        return (
          <AdminPanelTab
            members={members}
            setMembers={setMembers}
            categories={categories}
            setCategories={setCategories}
            formulas={formulas}
            setFormulas={setFormulas}
            churchInfo={churchInfo}
            setChurchInfo={setChurchInfo}
            comisionados={comisionados}
            setComisionados={setComisionados}
            weeklyRecords={weeklyRecords}
            setWeeklyRecords={setWeeklyRecords}
            monthlyReports={monthlyReports}
            setMonthlyReports={setMonthlyReports}
            theme={theme}
            setTheme={setTheme}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-screen">
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
      <main className="flex-grow p-4 pb-4 overflow-y-auto bg-background">
        <div className="max-w-4xl mx-auto">
         {renderContent()}
        </div>
      </main>
       {isSaving && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-card text-card-foreground p-6 rounded-lg flex items-center gap-4 border">
                    <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-lg font-semibold">Guardando y Subiendo...</span>
                </div>
            </div>
        )}
    </div>
  );
};

export default MainApp;