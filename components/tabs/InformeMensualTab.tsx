import { WeeklyRecord, Formulas, MonthlyReport, MonthlyReportFormState, ChurchInfo, Comisionado, Member } from '../../types';
import { MONTH_NAMES, initialMonthlyReportFormState } from '../../constants';
import { Upload, Trash2, Save, FileDown, Eye, X, Printer, CheckCircle } from 'lucide-react';
import { useSupabase } from '../../context/SupabaseContext';
import React, { useState, useMemo, FC, useEffect, useCallback, ReactNode, memo, ChangeEvent } from 'react';
import { generateMonthlyReportSvg, generatePdfFromSvg, calculateReportTotals as calculateTotalsUtil } from '../../utils/monthlyReportSvgGenerator';

interface InformeMensualTabProps {
    records: WeeklyRecord[];
    formulas: Formulas;
    savedReports: MonthlyReport[];
    setSavedReports: React.Dispatch<React.SetStateAction<MonthlyReport[]>>;
    churchInfo: ChurchInfo;
    comisionados: Comisionado[];
    members: Member[];
}

const Accordion: FC<{ title: string; children: ReactNode; initialOpen?: boolean }> = ({ title, children, initialOpen = false }) => {
    const [isOpen, setIsOpen] = useState(initialOpen);

    return (
        <div className="bg-card rounded-xl shadow-md border">
            <button
                type="button"
                className="w-full p-5 text-left font-semibold text-lg flex justify-between items-center text-card-foreground hover:bg-muted/30 transition-colors"
                onClick={() => setIsOpen(!isOpen)}
                aria-expanded={isOpen}
            >
                <span>{title}</span>
                <svg className={`w-5 h-5 transform transition-transform text-muted-foreground ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                </svg>
            </button>
            <div
                className="overflow-hidden transition-all duration-300 ease-out"
                style={{ maxHeight: isOpen ? '3000px' : '0' }}
            >
                <div className="px-5 pb-5 pt-4 border-t">
                    {children}
                </div>
            </div>
        </div>
    );
};

const CurrencyInput: FC<{ id: string; placeholder?: string; value: string; onChange: (e: ChangeEvent<HTMLInputElement>) => void }> = memo(({ id, placeholder = '0.00', value, onChange }) => (
    <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold pointer-events-none text-xs">C$</span>
        <input
            type="number"
            step="0.01"
            id={id}
            name={id}
            placeholder={placeholder}
            value={value}
            onChange={onChange}
            className="w-full p-2 border rounded-lg pl-9 bg-input text-foreground text-sm focus:ring-2 focus:ring-primary focus:outline-none"
        />
    </div>
));

const Subheading: FC<{ title: string; color?: string }> = ({ title, color }) => (
    <h4 className={`md:col-span-2 font-bold text-sm tracking-wide mb-2 mt-4 border-b pb-1 ${color ? color : 'text-primary'}`}>
        {title}
    </h4>
);

const Field: FC<{
    id: keyof MonthlyReportFormState;
    label: string;
    isCurrency?: boolean;
    value: string;
    onChange: (e: ChangeEvent<HTMLInputElement>) => void;
}> = memo(({ id, label, isCurrency = true, value, onChange }) => (
    <div>
        <label htmlFor={id} className="block text-xs font-semibold text-muted-foreground mb-1">{label}</label>
        {isCurrency ? (
            <CurrencyInput id={id} value={value} onChange={onChange} />
        ) : (
            <input
                type="text"
                id={id}
                name={id}
                value={value}
                onChange={onChange}
                placeholder={label}
                className="w-full p-2 border rounded-lg bg-input text-foreground text-sm focus:ring-2 focus:ring-primary focus:outline-none"
            />
        )}
    </div>
));

const UploadedMonthlyReportsList: React.FC = () => {
    const [files, setFiles] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { supabase, listFiles, getPublicUrl } = useSupabase();

    useEffect(() => {
        if (!supabase) {
            setLoading(false);
            setError("Supabase client no inicializado.");
            return;
        }

        const fetchFiles = async () => {
            try {
                setLoading(true);
                setError(null);
                const fileList = await listFiles('reportes-mensuales');
                setFiles(fileList || []);
            } catch (e) {
                setError(e instanceof Error ? e.message : 'Error al cargar los reportes de la nube.');
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        fetchFiles();
    }, [supabase, listFiles]);

    if (loading) {
        return <p className="text-center text-muted-foreground py-2 text-sm">Cargando reportes de la nube...</p>;
    }

    if (error) {
        return <div className="p-3 text-center text-destructive bg-destructive/10 rounded-lg text-sm">{error}</div>;
    }

    return (
        <div className="space-y-3 max-h-60 overflow-y-auto p-1">
            {files.length > 0 ? (
                files.map(file => (
                    <div key={file.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 bg-secondary rounded-lg border">
                        <div>
                            <p className="font-semibold text-sm text-secondary-foreground">{file.name}</p>
                            <p className="text-xs text-muted-foreground">Subido: {new Date(file.created_at).toLocaleString()}</p>
                        </div>
                        <div className="flex items-center space-x-2 mt-2 sm:mt-0">
                            <a
                                href={getPublicUrl('reportes-mensuales', file.name)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-green-600 rounded-md hover:bg-green-700 transition-colors"
                            >
                                <FileDown className="w-4 h-4" />
                                Descargar
                            </a>
                        </div>
                    </div>
                ))
            ) : (
                <p className="text-center text-muted-foreground py-2 text-sm">No hay informes mensuales en la nube.</p>
            )}
        </div>
    );
};

const InformeMensualTab: React.FC<InformeMensualTabProps> = ({ records, formulas, savedReports, setSavedReports, churchInfo, comisionados, members }) => {
    const [formState, setFormState] = useState<MonthlyReportFormState>(initialMonthlyReportFormState);
    const [isGenerating, setIsGenerating] = useState(false);
    const [previewModalOpen, setPreviewModalOpen] = useState(false);
    const [previewSvg, setPreviewSvg] = useState<string>('');
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const { uploadFile, supabase } = useSupabase();

    const handleChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormState(prevState => ({ ...prevState, [name]: value }));
    }, []);

    // Calculate totals automatically based on state
    const totals = useMemo(() => {
        const getNum = (key: string) => {
            const val = formState[key];
            if (!val) return 0;
            const parsed = parseFloat(String(val).replace(/[^0-9.-]/g, ''));
            return isNaN(parsed) ? 0 : parsed;
        };

        const ingOfrendas = getNum('ing-diezmos') + getNum('ing-ofrendas-ordinarias') + getNum('ing-primicias') + getNum('ing-ayuda-encargado');
        const ingEspeciales = getNum('ing-ceremonial') + getNum('ing-ofrenda-especial-sdd') + getNum('ing-evangelizacion') + getNum('ing-santa-cena');
        const ingLocales = [
            'ing-servicios-publicos', 'ing-arreglos-locales', 'ing-mantenimiento', 'ing-construccion-local',
            'ing-muebles', 'ing-viajes-ministro', 'ing-reuniones-ministeriales', 'ing-atencion-ministros',
            'ing-viajes-extranjero', 'ing-actividades-locales', 'ing-ciudad-lldm', 'ing-adquisicion-terreno',
            'ing-otras-colectas', 'ing-reuniones-jovenes'
        ].reduce((sum, k) => sum + getNum(k), 0);

        const totalIngresos = ingOfrendas + ingEspeciales + ingLocales;
        const saldoAnterior = getNum('saldo-anterior');
        const totalDisponible = saldoAnterior + totalIngresos;

        const egrEspeciales = getNum('egr-ceremonial') + getNum('egr-ofrenda-especial-sdd') + getNum('egr-evangelizacion') + getNum('egr-santa-cena');
        const egrLocales = [
            'egr-servicios-publicos', 'egr-arreglos-locales', 'egr-mantenimiento', 'egr-traspaso-construccion',
            'egr-muebles', 'egr-viajes-ministro', 'egr-reuniones-ministeriales', 'egr-atencion-ministros',
            'egr-viajes-extranjero', 'egr-actividades-locales', 'egr-ciudad-lldm', 'egr-adquisicion-terreno',
            'egr-otras-colectas', 'egr-reuniones-jovenes'
        ].reduce((sum, k) => sum + getNum(k), 0);

        const totalSalidas = getNum('egr-gomer') + egrEspeciales + egrLocales;
        const remanente = totalDisponible - totalSalidas;

        return {
            ingOfrendas,
            ingEspeciales,
            ingLocales,
            totalIngresos,
            saldoAnterior,
            totalDisponible,
            egrEspeciales,
            egrLocales,
            totalSalidas,
            remanente,
        };
    }, [formState]);

    const handleLoadData = () => {
        const filteredRecords = records.filter(r => r.month === selectedMonth && r.year === selectedYear);
        if (filteredRecords.length === 0) {
            alert(`No se encontraron registros para ${MONTH_NAMES[selectedMonth - 1]} ${selectedYear}.`);
            return;
        }

        const publicServiceCategories = ["Luz", "Agua"];
        let totalDiezmo = 0, totalOrdinaria = 0, totalServicios = 0, totalGomer = 0, totalDiezmoDeDiezmo = 0;
        
        const activeMembersCount = members.filter(m => m.isActive).length;

        filteredRecords.forEach(record => {
            let weeklyDiezmo = 0, weeklyOrdinaria = 0;
            record.offerings.forEach(d => {
                if (d.category === "Diezmo") weeklyDiezmo += d.amount;
                if (d.category === "Ordinaria") weeklyOrdinaria += d.amount;
                if (publicServiceCategories.includes(d.category)) totalServicios += d.amount;
            });

            totalDiezmo += weeklyDiezmo;
            totalOrdinaria += weeklyOrdinaria;

            const weeklyTotal = weeklyDiezmo + weeklyOrdinaria;
            const weeklyDiezmoDeDiezmo = Math.round(weeklyTotal * (record.formulas.diezmoPercentage / 100));
            
            totalDiezmoDeDiezmo += weeklyDiezmoDeDiezmo;
            totalGomer += Math.round(weeklyTotal - weeklyDiezmoDeDiezmo);
        });

        // Compute last day of selected month
        const lastDay = new Date(selectedYear, selectedMonth, 0).getDate();

        setFormState(prev => ({
            ...prev,
            'fecha-del': '01',
            'fecha-al': lastDay.toString().padStart(2, '0'),
            'clave-iglesia': (window as any).CHURCH_NAME || 'NIMT01',
            'nombre-iglesia': (window as any).CHURCH_NAME || 'La Empresa',
            'nombre-ministro': churchInfo.defaultMinister || filteredRecords[0]?.minister || '',
            'grado-ministro': churchInfo.ministerGrade || 'O.B',
            'distrito': churchInfo.district || '2',
            'departamento': churchInfo.department || 'Matagalpa',
            'tel-ministro': churchInfo.ministerPhone || '',
            'cel-ministro': churchInfo.ministerPhone || '',
            'mes-reporte': MONTH_NAMES[selectedMonth - 1],
            'ano-reporte': selectedYear.toString(),
            'miembros-activos': activeMembersCount.toString(),
            'ing-diezmos': totalDiezmo > 0 ? totalDiezmo.toFixed(2) : '',
            'ing-ofrendas-ordinarias': totalOrdinaria > 0 ? totalOrdinaria.toFixed(2) : '',
            'ing-servicios-publicos': totalServicios > 0 ? totalServicios.toFixed(2) : '',
            'egr-servicios-publicos': totalServicios > 0 ? totalServicios.toFixed(2) : '',
            'egr-gomer': totalGomer > 0 ? totalGomer.toFixed(2) : '',
            'dist-direccion': totalDiezmoDeDiezmo > 0 ? totalDiezmoDeDiezmo.toFixed(2) : '',
            'egr-asignacion': formulas.remanenteThreshold.toString(),
            'comision-nombre-1': comisionados[0]?.nombre || prev['comision-nombre-1'] || '',
            'comision-celular-1': comisionados[0]?.celular || prev['comision-celular-1'] || '',
            'comision-nombre-2': comisionados[1]?.nombre || prev['comision-nombre-2'] || '',
            'comision-celular-2': comisionados[1]?.celular || prev['comision-celular-2'] || '',
            'comision-nombre-3': comisionados[2]?.nombre || prev['comision-nombre-3'] || '',
            'comision-celular-3': comisionados[2]?.celular || prev['comision-celular-3'] || '',
        }));
        alert(`Datos cargados para ${MONTH_NAMES[selectedMonth - 1]} ${selectedYear}.`);
    };

    const handleOpenPreview = () => {
        const svg = generateMonthlyReportSvg(formState, totals, churchInfo, comisionados);
        setPreviewSvg(svg);
        setPreviewModalOpen(true);
    };

    const generatePdfDocument = async (customState?: MonthlyReportFormState): Promise<{ blob: Blob; fileName: string }> => {
        const stateToUse = customState || formState;
        const currentTotals = customState ? {
            ingOfrendas: parseFloat(stateToUse['ing-diezmos'] || '0') + parseFloat(stateToUse['ing-ofrendas-ordinarias'] || '0') + parseFloat(stateToUse['ing-primicias'] || '0') + parseFloat(stateToUse['ing-ayuda-encargado'] || '0'),
            ingEspeciales: parseFloat(stateToUse['ing-ceremonial'] || '0') + parseFloat(stateToUse['ing-ofrenda-especial-sdd'] || '0') + parseFloat(stateToUse['ing-evangelizacion'] || '0') + parseFloat(stateToUse['ing-santa-cena'] || '0'),
            ingLocales: parseFloat(stateToUse['ing-servicios-publicos'] || '0') + parseFloat(stateToUse['ing-arreglos-locales'] || '0') + parseFloat(stateToUse['ing-mantenimiento'] || '0'),
            totalIngresos: 0,
            saldoAnterior: parseFloat(stateToUse['saldo-anterior'] || '0'),
            totalDisponible: 0,
            egrEspeciales: 0,
            egrLocales: 0,
            totalSalidas: 0,
            remanente: 0,
        } : totals;

        const svgString = generateMonthlyReportSvg(stateToUse, totals, churchInfo, comisionados);
        const mes = stateToUse['mes-reporte'] || 'Mes';
        const anio = stateToUse['ano-reporte'] || 'Año';
        const iglesia = stateToUse['nombre-iglesia'] || 'Iglesia';
        const fileName = `Informe-Mensual_${mes}-${anio}_${iglesia.replace(/\s+/g, '_')}.pdf`;

        return generatePdfFromSvg(svgString, fileName);
    };

    const processPdf = async (customState?: MonthlyReportFormState) => {
        setIsGenerating(true);
        try {
            const { blob, fileName } = await generatePdfDocument(customState);
            
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(link.href);

            if (!supabase) {
                alert(`Informe "${fileName}" generado y descargado con el nuevo formato oficial.`);
            } else {
                await uploadFile('reportes-mensuales', fileName, blob, true);
                alert(`Informe "${fileName}" generado, descargado y guardado en la nube exitosamente.`);
            }
        } catch (error) {
            console.error("PDF generation failed:", error);
            const msg = error instanceof Error ? error.message : String(error);
            alert(`Hubo un error al generar o subir el PDF: ${msg}`);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleClearForm = () => {
        if (window.confirm('¿Estás seguro de que quieres limpiar todos los campos?')) {
            setFormState(initialMonthlyReportFormState);
        }
    };
    
    const handleSaveReport = () => {
        const reportId = `report-${selectedYear}-${selectedMonth}`;
        const existingReportIndex = savedReports.findIndex(r => r.id === reportId);

        if (existingReportIndex > -1) {
            if (!window.confirm('Ya existe un informe para este mes. ¿Desea sobrescribirlo?')) {
                return;
            }
        }

        const newReport: MonthlyReport = {
            id: reportId,
            month: selectedMonth,
            year: selectedYear,
            formData: formState,
        };

        if (existingReportIndex > -1) {
            const updatedReports = [...savedReports];
            updatedReports[existingReportIndex] = newReport;
            setSavedReports(updatedReports);
        } else {
            setSavedReports(prev => [...prev, newReport]);
        }

        alert('Informe guardado exitosamente.');
    };

    const handleLoadReport = (report: MonthlyReport) => {
        const isDirty = JSON.stringify(formState) !== JSON.stringify(initialMonthlyReportFormState);
        if (isDirty && !window.confirm('¿Está seguro de que desea cargar este informe? Los datos actuales del formulario se perderán.')) {
            return;
        }
        setFormState(report.formData);
        setSelectedMonth(report.month);
        setSelectedYear(report.year);
        alert(`Informe de ${MONTH_NAMES[report.month - 1]} ${report.year} cargado.`);
    };

    const handleDeleteReport = (reportId: string) => {
        if (window.confirm('¿Está seguro de que desea eliminar este informe guardado?')) {
            setSavedReports(prev => prev.filter(r => r.id !== reportId));
        }
    };

    const sortedReports = useMemo(() => {
        return [...savedReports].sort((a, b) => {
            const dateA = new Date(a.year, a.month - 1);
            const dateB = new Date(b.year, b.month - 1);
            return dateB.getTime() - dateA.getTime();
        });
    }, [savedReports]);

    return (
        <div className="space-y-6">
            <header className="text-center p-6 bg-card rounded-xl shadow-md border">
                <div className="flex justify-center items-center gap-2 mb-2">
                    <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-bold uppercase tracking-wider">Formato Oficial</span>
                </div>
                <h1 className="text-2xl md:text-3xl font-bold text-primary">MINISTERIO DE ADMINISTRACIÓN FINANCIERA</h1>
                <p className="text-lg md:text-xl text-muted-foreground">Información Financiera Mensual - Jurisdicción Nicaragua, C.A.</p>
            </header>
            
            {supabase && (
                <Accordion title="Informes en la Nube">
                    <UploadedMonthlyReportsList />
                </Accordion>
            )}

            <Accordion title="Informes Guardados (Local)">
                <div className="space-y-3 max-h-60 overflow-y-auto p-1">
                    {sortedReports.length > 0 ? (
                        sortedReports.map(report => (
                            <div key={report.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 bg-secondary rounded-lg border">
                                <div>
                                    <p className="font-semibold text-primary">{MONTH_NAMES[report.month - 1]} {report.year}</p>
                                    <p className="text-xs text-muted-foreground">ID: {report.id}</p>
                                </div>
                                <div className="flex items-center space-x-2 mt-2 sm:mt-0">
                                    <button onClick={() => handleLoadReport(report)} className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-green-600 rounded-md hover:bg-green-700 transition-colors">
                                        <Upload className="w-4 h-4" />
                                        Cargar
                                    </button>
                                    <button onClick={() => processPdf(report.formData)} disabled={isGenerating} className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-primary-foreground bg-primary rounded-md hover:bg-primary/90 transition-colors disabled:bg-opacity-50">
                                        <FileDown className="w-4 h-4" />
                                        Exportar
                                    </button>
                                    <button onClick={() => handleDeleteReport(report.id)} className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-destructive-foreground bg-destructive rounded-md hover:bg-destructive/90 transition-colors">
                                        <Trash2 className="w-4 h-4" />
                                        Eliminar
                                    </button>
                                </div>
                            </div>
                        ))
                    ) : (
                        <p className="text-center text-muted-foreground py-2">No hay informes guardados localmente.</p>
                    )}
                </div>
            </Accordion>

            <div className="p-6 bg-card rounded-xl shadow-lg space-y-4 border">
                <h3 className="text-xl font-bold text-primary">Cargar Datos del Sistema</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
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
                    <button onClick={handleLoadData} className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg transition-colors shadow-sm">
                        Cargar Datos del Mes
                    </button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">Nota: Esto llenará automáticamente los campos del informe con los datos de las semanas registradas para el mes seleccionado.</p>
            </div>

            <form id="financial-form" className="space-y-4">
                {/* 1. INFORMACIÓN GENERAL Y MINISTRO */}
                <Accordion title="1. Datos de Este Informe y Ministro Actual" initialOpen>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <Field id="fecha-del" label="Del (Día)" isCurrency={false} value={formState['fecha-del']} onChange={handleChange} />
                        <Field id="fecha-al" label="Al (Día)" isCurrency={false} value={formState['fecha-al']} onChange={handleChange} />
                        <Field id="mes-reporte" label="Del Mes De" isCurrency={false} value={formState['mes-reporte']} onChange={handleChange} />
                        <Field id="ano-reporte" label="Del Año" isCurrency={false} value={formState['ano-reporte']} onChange={handleChange} />
                        <Field id="clave-iglesia" label="Clave Iglesia" isCurrency={false} value={formState['clave-iglesia']} onChange={handleChange} />
                        <Field id="miembros-activos" label="Miembros Activos" isCurrency={false} value={formState['miembros-activos']} onChange={handleChange} />
                        <Field id="distrito" label="Distrito" isCurrency={false} value={formState['distrito']} onChange={handleChange} />
                        <Field id="nombre-iglesia" label="Nombre Iglesia Local" isCurrency={false} value={formState['nombre-iglesia']} onChange={handleChange} />
                        <Field id="departamento" label="Departamento" isCurrency={false} value={formState['departamento']} onChange={handleChange} />

                        <Subheading title="Datos del Ministro Actual" />
                        <Field id="nombre-ministro" label="Nombre del Ministro" isCurrency={false} value={formState['nombre-ministro']} onChange={handleChange} />
                        <Field id="grado-ministro" label="Grado" isCurrency={false} value={formState['grado-ministro']} onChange={handleChange} />
                        <Field id="tel-ministro" label="N° Telefónico" isCurrency={false} value={formState['tel-ministro']} onChange={handleChange} />
                        <Field id="cel-ministro" label="Celular" isCurrency={false} value={formState['cel-ministro']} onChange={handleChange} />
                        <Field id="fam-dependientes" label="Familiares Dependientes" isCurrency={false} value={formState['fam-dependientes']} onChange={handleChange} />
                        <Field id="obreros" label="Obreros" isCurrency={false} value={formState['obreros']} onChange={handleChange} />
                    </div>
                </Accordion>

                {/* 2. ENTRADAS (INGRESOS) */}
                <Accordion title="2. Entradas (Ingresos)">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                        <Subheading title="Saldo del Mes Anterior" color="text-blue-700 dark:text-blue-400" />
                        <Field id="saldo-pro-construccion" label="Pro-Construcción" value={formState['saldo-pro-construccion']} onChange={handleChange} />
                        <Field id="intereses-bancarios" label="Intereses Bancarios" value={formState['intereses-bancarios']} onChange={handleChange} />
                        <div className="md:col-span-2">
                            <Field id="saldo-anterior" label="Saldo Inicial del Mes (Total Anterior)" value={formState['saldo-anterior']} onChange={handleChange} />
                        </div>
                        
                        <Subheading title="1 - Ingresos por Ofrendas" color="text-blue-700 dark:text-blue-400" />
                        <Field id="ing-diezmos" label="Diezmos" value={formState['ing-diezmos']} onChange={handleChange} />
                        <Field id="ing-ofrendas-ordinarias" label="Ofrendas Ordinarias" value={formState['ing-ofrendas-ordinarias']} onChange={handleChange} />
                        <Field id="ing-primicias" label="Primicias" value={formState['ing-primicias']} onChange={handleChange} />
                        <Field id="ing-ayuda-encargado" label="Ayuda al Encargado" value={formState['ing-ayuda-encargado']} onChange={handleChange} />

                        <Subheading title="2 - Ingresos por Colectas Especiales" color="text-blue-700 dark:text-blue-400" />
                        <Field id="ing-ceremonial" label="Ceremonial" value={formState['ing-ceremonial']} onChange={handleChange} />
                        <Field id="ing-ofrenda-especial-sdd" label="Ofrenda Especial SdD NJG" value={formState['ing-ofrenda-especial-sdd']} onChange={handleChange} />
                        <Field id="ing-evangelizacion" label="Evangelización Mundial" value={formState['ing-evangelizacion']} onChange={handleChange} />
                        <Field id="ing-santa-cena" label="Colecta de Santa Cena" value={formState['ing-santa-cena']} onChange={handleChange} />
                        
                        <Subheading title="3 - Ingresos por Colectas Locales" color="text-blue-700 dark:text-blue-400" />
                        <Field id="ing-servicios-publicos" label="Pago de Servicios Públicos" value={formState['ing-servicios-publicos']} onChange={handleChange} />
                        <Field id="ing-arreglos-locales" label="Arreglos Locales" value={formState['ing-arreglos-locales']} onChange={handleChange} />
                        <Field id="ing-mantenimiento" label="Mantenimiento y Conservación" value={formState['ing-mantenimiento']} onChange={handleChange} />
                        <Field id="ing-construccion-local" label="Construcción Local" value={formState['ing-construccion-local']} onChange={handleChange} />
                        <Field id="ing-muebles" label="Muebles y Artículos de Inventario" value={formState['ing-muebles']} onChange={handleChange} />
                        <Field id="ing-viajes-ministro" label="Viajes y Viáticos para el Ministro" value={formState['ing-viajes-ministro']} onChange={handleChange} />
                        <Field id="ing-reuniones-ministeriales" label="Reuniones Ministeriales" value={formState['ing-reuniones-ministeriales']} onChange={handleChange} />
                        <Field id="ing-atencion-ministros" label="Atención a Ministros" value={formState['ing-atencion-ministros']} onChange={handleChange} />
                        <Field id="ing-viajes-extranjero" label="Viajes fuera del País" value={formState['ing-viajes-extranjero']} onChange={handleChange} />
                        <Field id="ing-actividades-locales" label="Actividades Locales" value={formState['ing-actividades-locales']} onChange={handleChange} />
                        <Field id="ing-ciudad-lldm" label="Ofrendas para Ciudad LLDM" value={formState['ing-ciudad-lldm']} onChange={handleChange} />
                        <Field id="ing-adquisicion-terreno" label="Adquisición Terreno/Edificio" value={formState['ing-adquisicion-terreno']} onChange={handleChange} />
                        <Field id="ing-otras-colectas" label="Otras Colectas (Especificar)" value={formState['ing-otras-colectas']} onChange={handleChange} />
                        <Field id="ing-reuniones-jovenes" label="Reuniones Jóvenes/Matrimonios" value={formState['ing-reuniones-jovenes']} onChange={handleChange} />
                    </div>
                </Accordion>

                {/* 3. SALIDAS (EGRESOS) */}
                <Accordion title="3. Salidas (Egresos)">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                        <Subheading title="2.1 - Gastos por Manutención" color="text-red-700 dark:text-red-400" />
                        <Field id="egr-asignacion" label="Asignación Autorizada" value={formState['egr-asignacion']} onChange={handleChange} />
                        <Field id="egr-gomer" label="Gomer del Mes" value={formState['egr-gomer']} onChange={handleChange} />
                        
                        <Subheading title="2 - Egresos por Colectas Especiales" color="text-red-700 dark:text-red-400" />
                        <Field id="egr-ceremonial" label="Ceremonial" value={formState['egr-ceremonial']} onChange={handleChange} />
                        <Field id="egr-ofrenda-especial-sdd" label="Ofrenda Especial SdD NJG" value={formState['egr-ofrenda-especial-sdd']} onChange={handleChange} />
                        <Field id="egr-evangelizacion" label="Evangelización Mundial" value={formState['egr-evangelizacion']} onChange={handleChange} />
                        <Field id="egr-santa-cena" label="Colecta de Santa Cena" value={formState['egr-santa-cena']} onChange={handleChange} />
                        
                        <Subheading title="3 - Egresos por Colectas Locales" color="text-red-700 dark:text-red-400" />
                        <Field id="egr-servicios-publicos" label="Pago de Servicios Públicos" value={formState['egr-servicios-publicos']} onChange={handleChange} />
                        <Field id="egr-arreglos-locales" label="Arreglos Locales" value={formState['egr-arreglos-locales']} onChange={handleChange} />
                        <Field id="egr-mantenimiento" label="Mantenimiento y Conservación" value={formState['egr-mantenimiento']} onChange={handleChange} />
                        <Field id="egr-traspaso-construccion" label="Traspaso para Construcción Local" value={formState['egr-traspaso-construccion']} onChange={handleChange} />
                        <Field id="egr-muebles" label="Muebles y Artículos de Inventario" value={formState['egr-muebles']} onChange={handleChange} />
                        <Field id="egr-viajes-ministro" label="Viajes y Viáticos para el Ministro" value={formState['egr-viajes-ministro']} onChange={handleChange} />
                        <Field id="egr-reuniones-ministeriales" label="Reuniones Ministeriales" value={formState['egr-reuniones-ministeriales']} onChange={handleChange} />
                        <Field id="egr-atencion-ministros" label="Atención a Ministros" value={formState['egr-atencion-ministros']} onChange={handleChange} />
                        <Field id="egr-viajes-extranjero" label="Viajes fuera del País" value={formState['egr-viajes-extranjero']} onChange={handleChange} />
                        <Field id="egr-actividades-locales" label="Actividades Locales" value={formState['egr-actividades-locales']} onChange={handleChange} />
                        <Field id="egr-ciudad-lldm" label="Ofrendas para Ciudad LLDM" value={formState['egr-ciudad-lldm']} onChange={handleChange} />
                        <Field id="egr-adquisicion-terreno" label="Adquisición Terreno/Edificio" value={formState['egr-adquisicion-terreno']} onChange={handleChange} />
                        <Field id="egr-otras-colectas" label="Otras Colectas (Especificar)" value={formState['egr-otras-colectas']} onChange={handleChange} />
                        <Field id="egr-reuniones-jovenes" label="Reuniones Jóvenes/Matrimonios" value={formState['egr-reuniones-jovenes']} onChange={handleChange} />
                    </div>
                </Accordion>

                {/* 4. RESUMEN, DISTRIBUCIÓN Y FIRMAS */}
                <Accordion title="4. Distribución del Remanente y Comisión">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Subheading title="Saldo del Remanente Distribuido a:" />
                        <Field id="dist-direccion" label="Dirección General (Diezmos de Diezmos)" value={formState['dist-direccion']} onChange={handleChange} />
                        <Field id="dist-tesoreria" label="Tesorería (Cuenta de Remanentes)" value={formState['dist-tesoreria']} onChange={handleChange} />
                        <Field id="dist-pro-construccion" label="Pro-Construcción" value={formState['dist-pro-construccion']} onChange={handleChange} />
                        <Field id="dist-otros" label="Otros" value={formState['dist-otros']} onChange={handleChange} />

                        <Subheading title="Comisión Local de Finanzas" />
                        <Field id="comision-nombre-1" label="Comisionado 1: Nombre" isCurrency={false} value={formState['comision-nombre-1']} onChange={handleChange} />
                        <Field id="comision-celular-1" label="Comisionado 1: Celular (ej. 8888-8888)" isCurrency={false} value={formState['comision-celular-1']} onChange={handleChange} />
                        
                        <Field id="comision-nombre-2" label="Comisionado 2: Nombre" isCurrency={false} value={formState['comision-nombre-2']} onChange={handleChange} />
                        <Field id="comision-celular-2" label="Comisionado 2: Celular (ej. 8888-8888)" isCurrency={false} value={formState['comision-celular-2']} onChange={handleChange} />
                        
                        <Field id="comision-nombre-3" label="Comisionado 3: Nombre" isCurrency={false} value={formState['comision-nombre-3']} onChange={handleChange} />
                        <Field id="comision-celular-3" label="Comisionado 3: Celular (ej. 8888-8888)" isCurrency={false} value={formState['comision-celular-3']} onChange={handleChange} />
                    </div>
                </Accordion>
            </form>

            <div className="p-6 bg-card rounded-xl shadow-lg flex flex-col sm:flex-row gap-4 items-center border">
                <button
                    onClick={handleOpenPreview}
                    type="button"
                    className="w-full sm:w-auto flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-purple-600 text-white font-bold rounded-lg hover:bg-purple-700 transition-colors shadow-sm"
                >
                    <Eye className="w-5 h-5" />
                    <span>Vista Previa Oficial</span>
                </button>
                <button
                    onClick={() => processPdf()}
                    disabled={isGenerating}
                    type="button"
                    className="w-full sm:w-auto flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-primary text-primary-foreground font-bold rounded-lg hover:bg-primary/90 transition-colors disabled:bg-opacity-50 shadow-sm"
                >
                    {isGenerating ? (
                        <>
                            <div className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin"></div>
                            <span>Generando PDF...</span>
                        </>
                    ) : (
                        <>
                            <FileDown className="w-5 h-5" />
                            <span>Generar y Subir PDF</span>
                        </>
                    )}
                </button>
                <button
                    onClick={handleSaveReport}
                    type="button"
                    className="w-full sm:w-auto flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 transition-colors shadow-sm"
                >
                    <Save className="w-5 h-5" />
                    <span>Guardar Formulario</span>
                </button>
                <button
                    onClick={handleClearForm}
                    type="button"
                    className="w-full sm:w-auto flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-destructive text-destructive-foreground font-bold rounded-lg hover:bg-destructive/90 transition-colors shadow-sm"
                >
                    <Trash2 className="w-5 h-5" />
                    <span>Limpiar Formulario</span>
                </button>
            </div>

            {/* MODAL DE VISTA PREVIA INTERACTIVA */}
            {previewModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
                    <div className="bg-background rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border overflow-hidden">
                        <div className="p-4 border-b flex justify-between items-center bg-card">
                            <div>
                                <h3 className="font-bold text-lg text-primary flex items-center gap-2">
                                    <CheckCircle className="w-5 h-5 text-green-600" />
                                    Vista Previa del Informe Mensual
                                </h3>
                                <p className="text-xs text-muted-foreground">Formato oficial tamaño Carta - Jurisdicción Nicaragua</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => processPdf()}
                                    disabled={isGenerating}
                                    className="flex items-center gap-1 px-4 py-2 text-xs font-bold text-white bg-primary rounded-lg hover:bg-primary/90 transition-colors shadow-sm"
                                >
                                    <FileDown className="w-4 h-4" />
                                    Descargar PDF
                                </button>
                                <button
                                    onClick={() => setPreviewModalOpen(false)}
                                    className="p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-colors"
                                >
                                    <X className="w-6 h-6" />
                                </button>
                            </div>
                        </div>
                        <div className="flex-1 overflow-auto p-4 bg-muted/40 flex justify-center items-start">
                            <div
                                className="bg-white shadow-xl rounded-md border border-neutral-300 w-full max-w-[850px] overflow-hidden"
                                dangerouslySetInnerHTML={{ __html: previewSvg }}
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default InformeMensualTab;
