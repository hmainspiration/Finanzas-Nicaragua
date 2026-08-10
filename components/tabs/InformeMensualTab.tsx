import { WeeklyRecord, Formulas, MonthlyReport, MonthlyReportFormState, ChurchInfo, Comisionado, Member } from '../../types';
import { MONTH_NAMES, initialMonthlyReportFormState } from '../../constants';
import { Upload, Trash2, Save, FileDown, Eye, X } from 'lucide-react';
import { useSupabase } from '../../context/SupabaseContext';
import React, { useState, useMemo, FC, useEffect, useCallback, ReactNode, memo, ChangeEvent } from 'react';
import { LOGO_SVG_STRING } from '../Logo';


interface InformeMensualTabProps {
    records: WeeklyRecord[];
    formulas: Formulas;
    savedReports: MonthlyReport[];
    setSavedReports: React.Dispatch<React.SetStateAction<MonthlyReport[]>>;
    churchInfo: ChurchInfo;
    comisionados: Comisionado[];
    members: Member[];
}

const Accordion: FC<{ title: string, children: ReactNode, initialOpen?: boolean }> = ({ title, children, initialOpen = false }) => {
    const [isOpen, setIsOpen] = useState(initialOpen);

    return (
        <div className="bg-card rounded-xl shadow-md border">
            <button
                type="button"
                className="w-full p-5 text-left font-semibold text-lg flex justify-between items-center text-card-foreground"
                onClick={() => setIsOpen(!isOpen)}
                aria-expanded={isOpen}
            >
                <span>{title}</span>
                <svg className={`w-5 h-5 transform transition-transform text-muted-foreground ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
            </button>
            <div
                className="overflow-hidden transition-all duration-300 ease-out"
                style={{ maxHeight: isOpen ? '2000px' : '0' }}
            >
                <div className="px-5 pb-5 pt-4 border-t">
                    {children}
                </div>
            </div>
        </div>
    );
};

const CurrencyInput: FC<{ id: string, placeholder: string, value: string, onChange: (e: ChangeEvent<HTMLInputElement>) => void }> = memo(({ id, placeholder, value, onChange }) => (
    <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">C$</span>
        <input type="number" step="0.01" id={id} name={id} placeholder={placeholder} value={value} onChange={onChange} className="w-full p-2 border rounded-lg pl-10 bg-input text-foreground" />
    </div>
));

// Helper components for building the form moved outside the main component to prevent re-creation on render
const Subheading: FC<{ title: string }> = ({ title }) => <h4 className="md:col-span-2 font-semibold text-foreground mb-2 mt-4 border-b pb-1">{title}</h4>;

const Field: FC<{
    id: keyof MonthlyReportFormState;
    label: string;
    isCurrency?: boolean;
    value: string;
    onChange: (e: ChangeEvent<HTMLInputElement>) => void;
}> = memo(({ id, label, isCurrency = true, value, onChange }) => (
    <div>
        <label htmlFor={id} className="block text-sm font-medium text-muted-foreground mb-1">{label}</label>
        {isCurrency ? (
            <CurrencyInput id={id} placeholder="0.00" value={value} onChange={onChange} />
        ) : (
            <input type="text" id={id} name={id} value={value} onChange={onChange} placeholder={label} className="w-full p-2 border rounded-lg bg-input text-foreground" />
        )}
    </div>
));


const calculateReportTotals = (formData: MonthlyReportFormState) => {
    const getNumericValue = (key: keyof MonthlyReportFormState) => parseFloat(formData[key]) || 0;

    const ingOfrendas = ['ing-diezmos', 'ing-ofrendas-ordinarias', 'ing-primicias', 'ing-ayuda-encargado'].reduce((sum, key) => sum + getNumericValue(key as keyof MonthlyReportFormState), 0);
    const ingEspeciales = ['ing-ceremonial', 'ing-ofrenda-especial-sdd', 'ing-evangelizacion', 'ing-santa-cena'].reduce((sum, key) => sum + getNumericValue(key as keyof MonthlyReportFormState), 0);
    const ingLocales = [
        'ing-servicios-publicos', 'ing-arreglos-locales', 'ing-mantenimiento', 'ing-construccion-local',
        'ing-muebles', 'ing-viajes-ministro', 'ing-reuniones-ministeriales', 'ing-atencion-ministros',
        'ing-viajes-extranjero', 'ing-actividades-locales', 'ing-ciudad-lldm', 'ing-adquisicion-terreno'
    ].reduce((sum, key) => sum + getNumericValue(key as keyof MonthlyReportFormState), 0);
    
    const totalIngresos = ingOfrendas + ingEspeciales + ingLocales;
    const saldoAnterior = getNumericValue('saldo-anterior');
    const totalDisponible = saldoAnterior + totalIngresos;

    const egrEspeciales = ['egr-ceremonial', 'egr-ofrenda-especial-sdd', 'egr-evangelizacion', 'egr-santa-cena'].reduce((sum, key) => sum + getNumericValue(key as keyof MonthlyReportFormState), 0);
    const egrLocales = [
        'egr-servicios-publicos', 'egr-arreglos-locales', 'egr-mantenimiento', 'egr-traspaso-construccion',
        'egr-muebles', 'egr-viajes-ministro', 'egr-reuniones-ministeriales', 'egr-atencion-ministros',
        'ing-viajes-extranjero', 'egr-actividades-locales', 'egr-ciudad-lldm', 'egr-adquisicion-terreno'
    ].reduce((sum, key) => sum + getNumericValue(key as keyof MonthlyReportFormState), 0);

    const totalSalidas = getNumericValue('egr-gomer') + egrEspeciales + egrLocales;
    const remanente = totalDisponible - totalSalidas;

    return {
        ingOfrendas, ingEspeciales, ingLocales, totalIngresos, saldoAnterior, totalDisponible,
        egrEspeciales, egrLocales, totalSalidas, remanente
    };
};

const UploadedMonthlyReportsList: React.FC = () => {
    const [files, setFiles] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { supabase, listFiles, getPublicUrl } = useSupabase();

    useEffect(() => {
        if (!supabase) {
            setLoading(false);
            setError("Supabase client not initialized.");
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
        return <p className="text-center text-muted-foreground py-2">Cargando reportes de la nube...</p>;
    }

    if (error) {
        return <div className="p-3 text-center text-destructive bg-destructive/10 rounded-lg">{error}</div>;
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
                <p className="text-center text-muted-foreground py-2">No hay informes mensuales en la nube.</p>
            )}
        </div>
    );
};


const InformeMensualTab: React.FC<InformeMensualTabProps> = ({ records, formulas, savedReports, setSavedReports, churchInfo, comisionados, members }) => {
    const [formState, setFormState] = useState<MonthlyReportFormState>(initialMonthlyReportFormState);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const { uploadFile, supabase } = useSupabase();

    const handleChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormState(prevState => ({ ...prevState, [name]: value }));
    }, []);

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

        setFormState(prev => ({
            ...prev,
            'clave-iglesia': (window as any).CHURCH_NAME || 'La Empresa',
            'nombre-iglesia': (window as any).CHURCH_NAME || 'La Empresa',
            'nombre-ministro': churchInfo.defaultMinister || filteredRecords[0]?.minister || '',
            'grado-ministro': churchInfo.ministerGrade,
            'distrito': churchInfo.district,
            'departamento': churchInfo.department,
            'tel-ministro': churchInfo.ministerPhone,
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
        }));
         alert(`Datos cargados para ${MONTH_NAMES[selectedMonth - 1]} ${selectedYear}.`);
    };

    const formatCurrency = (value: number) => `C$ ${value.toLocaleString('es-NI', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    // Función para convertir el SVG string a una imagen PNG en base64 usando un canvas
    const svgToPng = (svgString: string, width: number, height: number): Promise<string> => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            // Asegurarse de que el SVG tenga el namespace correcto si no lo tiene
            if (!svgString.includes('xmlns')) {
                svgString = svgString.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
            }
            const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
            const url = URL.createObjectURL(svgBlob);

            img.onload = () => {
                const canvas = document.createElement('canvas');
                // Doble resolución para mejor calidad en PDF
                canvas.width = width * 2; 
                canvas.height = height * 2;
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    reject(new Error('No se pudo obtener el contexto del canvas'));
                    return;
                }
                // Escalar el contexto para dibujar la imagen más grande
                ctx.scale(2, 2);
                ctx.drawImage(img, 0, 0, width, height);
                URL.revokeObjectURL(url);
                resolve(canvas.toDataURL('image/png'));
            };
            img.onerror = (err) => {
                URL.revokeObjectURL(url);
                reject(err);
            };
            img.src = url;
        });
    };

    const createPdfBlob = async (formData: MonthlyReportFormState): Promise<{ blob: Blob, fileName: string }> => {
        const { jsPDF } = (window as any).jspdf;
        const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
        
        const calculations = calculateReportTotals(formData);
        const getNumericValue = (key: keyof MonthlyReportFormState) => parseFloat(formData[key]) || 0;

        const pageW = doc.internal.pageSize.getWidth();
        const margin = 10;
        let startY = 12;
        const getText = (key: keyof MonthlyReportFormState) => formData[key] || '';
        const getValue = (key: keyof MonthlyReportFormState) => formatCurrency(getNumericValue(key));
        
        // --- INSERTAR LOGO ---
        try {
            // El logo es cuadrado (7379x7380), definimos un tamaño en mm para el PDF
            const logoSize = 25; 
            // Convertimos el SVG a PNG en alta resolución (300x300 px aprox para ese tamaño en mm)
            const logoDataUrl = await svgToPng(LOGO_SVG_STRING, 300, 300);
            
            // Centrar el logo: (AnchoPagina - AnchoLogo) / 2
            const logoX = (pageW - logoSize) / 2;
            const logoY = 5; // Margen superior pequeño
            
            doc.addImage(logoDataUrl, 'PNG', logoX, logoY, logoSize, logoSize);
            
            // Ajustar startY para que el texto comience debajo del logo
            startY = logoY + logoSize + 5; 
        } catch (error) {
            console.error("Error al generar el logo para el PDF:", error);
            // Si falla el logo, continuamos con el texto en la posición original o un poco más abajo
            startY = 15;
        }

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.text("IGLESIA DEL DIOS VIVO COLUMNA Y APOYO DE LA VERDAD", pageW / 2, startY, { align: 'center' });
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.text("La Luz del Mundo", pageW / 2, startY + 5, { align: 'center' });
        doc.setFontSize(8);
        doc.text("MINISTERIO DE ADMINISTRACIÓN FINANCIERA", pageW / 2, startY + 11, { align: 'center' });
        doc.setFont('helvetica', 'bold');
        doc.text("INFORMACIÓN FINANCIERA MENSUAL", pageW / 2, startY + 16, { align: 'center' });
        doc.setFont('helvetica', 'normal');
        doc.text(`Jurisdicción Nicaragua, C.A.`, pageW / 2, startY + 21, { align: 'center' });
        startY += 28;

        const bodyStyle = { fontSize: 7, cellPadding: 0.8, lineColor: '#000', lineWidth: 0.1 };
        // Updated colors to match theme
        const headStyle = { fontSize: 7.5, fontStyle: 'bold', fillColor: '#2563eb', textColor: '#FFFFFF', halign: 'center', lineColor: '#000', lineWidth: 0.1 };
        const rightAlign = { halign: 'right' };
        const subheadStyle = { fontStyle: 'bold', fillColor: '#f1f5f9' };
        
        doc.autoTable({
            startY: startY,
            body: [
                [{ content: 'Datos de este Informe', colSpan: 4, styles: { ...headStyle, fontSize: 8 } }],
                [{ content: 'Del Mes de:', styles: { fontStyle: 'bold' } }, getText('mes-reporte'), { content: 'Del Año:', styles: { fontStyle: 'bold' } }, getText('ano-reporte')],
                [{ content: 'Clave Iglesia:', styles: { fontStyle: 'bold' } }, getText('clave-iglesia'), { content: 'Nombre Iglesia:', styles: { fontStyle: 'bold' } }, getText('nombre-iglesia')],
                [{ content: 'Distrito:', styles: { fontStyle: 'bold' } }, getText('distrito'), { content: 'Departamento:', styles: { fontStyle: 'bold' } }, getText('departamento')],
                [{ content: 'Nombre Ministro:', styles: { fontStyle: 'bold' } }, getText('nombre-ministro'), { content: 'Grado:', styles: { fontStyle: 'bold' } }, getText('grado-ministro')],
                [{ content: 'Teléfono:', styles: { fontStyle: 'bold' } }, getText('tel-ministro'), { content: 'Miembros Activos:', styles: { fontStyle: 'bold' } }, getText('miembros-activos')],
            ],
            theme: 'grid', styles: { ...bodyStyle, fontSize: 7, cellPadding: 1 }
        });
        startY = (doc as any).lastAutoTable.finalY + 2;

        const ingresosData = [
            [{ content: 'Ingresos por Ofrendas', styles: subheadStyle, colSpan: 2 }],
            ['Diezmos', { content: getValue('ing-diezmos'), styles: rightAlign }],
            ['Ofrendas Ordinarias', { content: getValue('ing-ofrendas-ordinarias'), styles: rightAlign }],
            ['Primicias', { content: getValue('ing-primicias'), styles: rightAlign }],
            ['Ayuda al Encargado', { content: getValue('ing-ayuda-encargado'), styles: rightAlign }],
            [{ content: 'Ingresos por Colectas Especiales', styles: subheadStyle, colSpan: 2 }],
            ['Ceremonial', { content: getValue('ing-ceremonial'), styles: rightAlign }],
            ['Ofrenda Especial SdD NJG', { content: getValue('ing-ofrenda-especial-sdd'), styles: rightAlign }],
            ['Evangelización Mundial', { content: getValue('ing-evangelizacion'), styles: rightAlign }],
            ['Colecta de Santa Cena', { content: getValue('ing-santa-cena'), styles: rightAlign }],
            [{ content: 'Ingresos por Colectas Locales', styles: subheadStyle, colSpan: 2 }],
            ['Pago de Servicios Públicos', { content: getValue('ing-servicios-publicos'), styles: rightAlign }],
            ['Arreglos Locales', { content: getValue('ing-arreglos-locales'), styles: rightAlign }],
            ['Mantenimiento y Conservación', { content: getValue('ing-mantenimiento'), styles: rightAlign }],
            ['Construcción Local', { content: getValue('ing-construccion-local'), styles: rightAlign }],
            ['Muebles y Artículos', { content: getValue('ing-muebles'), styles: rightAlign }],
            ['Viajes y viáticos para Ministro', { content: getValue('ing-viajes-ministro'), styles: rightAlign }],
            ['Reuniones Ministeriales', { content: getValue('ing-reuniones-ministeriales'), styles: rightAlign }],
            ['Atención a Ministros', { content: getValue('ing-atencion-ministros'), styles: rightAlign }],
            ['Viajes fuera del País', { content: getValue('ing-viajes-extranjero'), styles: rightAlign }],
            ['Actividades Locales', { content: getValue('ing-actividades-locales'), styles: rightAlign }],
            ['Ofrendas para Ciudad LLDM', { content: getValue('ing-ciudad-lldm'), styles: rightAlign }],
            ['Adquisición Terreno/Edificio', { content: getValue('ing-adquisicion-terreno'), styles: rightAlign }],
        ];

        const egresosData = [
            [{ content: 'Manutención del Ministro', styles: subheadStyle, colSpan: 2 }],
            ['Asignación Autorizada', { content: getValue('egr-asignacion'), styles: rightAlign }],
            ['Gomer del Mes', { content: getValue('egr-gomer'), styles: rightAlign }],
            [{ content: 'Egresos por Colectas Especiales', styles: subheadStyle, colSpan: 2 }],
            ['Ceremonial', { content: getValue('egr-ceremonial'), styles: rightAlign }],
            ['Ofrenda Especial SdD NJG', { content: getValue('egr-ofrenda-especial-sdd'), styles: rightAlign }],
            ['Evangelización Mundial', { content: getValue('egr-evangelizacion'), styles: rightAlign }],
            ['Colecta de Santa Cena', { content: getValue('egr-santa-cena'), styles: rightAlign }],
            [{ content: 'Egresos por Colectas Locales', styles: subheadStyle, colSpan: 2 }],
            ['Pago de Servicios Públicos', { content: getValue('egr-servicios-publicos'), styles: rightAlign }],
            ['Arreglos Locales', { content: getValue('egr-arreglos-locales'), styles: rightAlign }],
            ['Mantenimiento y Conservación', { content: getValue('egr-mantenimiento'), styles: rightAlign }],
            ['Traspaso para Construcción Local', { content: getValue('egr-traspaso-construccion'), styles: rightAlign }],
            ['Muebles y Artículos', { content: getValue('egr-muebles'), styles: rightAlign }],
            ['Viajes y viáticos para Ministro', { content: getValue('egr-viajes-ministro'), styles: rightAlign }],
            ['Reuniones Ministeriales', { content: getValue('ing-reuniones-ministeriales'), styles: rightAlign }],
            ['Atención a Ministros', { content: getValue('egr-atencion-ministros'), styles: rightAlign }],
            ['Viajes fuera del País', { content: getValue('ing-viajes-extranjero'), styles: rightAlign }],
            ['Actividades Locales', { content: getValue('egr-actividades-locales'), styles: rightAlign }],
            ['Ofrendas para Ciudad LLDM', { content: getValue('egr-ciudad-lldm'), styles: rightAlign }],
            ['Adquisición Terreno/Edificio', { content: getValue('egr-adquisicion-terreno'), styles: rightAlign }],
        ];

        const tableConfig = { theme: 'grid', styles: bodyStyle, headStyles: headStyle, columnStyles: { 0: { cellWidth: 64 }, 1: { cellWidth: 30 } } };
        const tableStartY = startY;
        let finalYIngresos, finalYEgresos;

        doc.autoTable({ head: [['Entradas (Ingresos)', '']], body: ingresosData, startY: tableStartY, ...tableConfig, tableWidth: (pageW / 2) - margin - 1, margin: { left: margin }, });
        finalYIngresos = (doc as any).lastAutoTable.finalY;

        doc.autoTable({ head: [['Salidas (Egresos)', '']], body: egresosData, startY: tableStartY, ...tableConfig, tableWidth: (pageW / 2) - margin - 1, margin: { left: pageW / 2 + 1 }, });
        finalYEgresos = (doc as any).lastAutoTable.finalY;
        
        startY = Math.max(finalYIngresos, finalYEgresos) + 2;
        
        const resumenData = [
            ['Saldo Inicial del Mes', { content: formatCurrency(calculations.saldoAnterior), styles: rightAlign }],
            ['Total Ingresos del Mes', { content: formatCurrency(calculations.totalIngresos), styles: rightAlign }],
            [{ content: 'Total Disponible del Mes', styles: { fontStyle: 'bold' } }, { content: formatCurrency(calculations.totalDisponible), styles: { ...rightAlign, fontStyle: 'bold' } }],
            ['Total Salidas del Mes', { content: formatCurrency(calculations.totalSalidas), styles: rightAlign }],
            [{ content: 'Utilidad o Remanente', styles: { fontStyle: 'bold'} }, { content: formatCurrency(calculations.remanente), styles: { ...rightAlign, fontStyle: 'bold', fillColor: '#C2F1C8' } }],
        ];
        const distribucionData = [
            ['Dirección General (Diezmos de Diezmos)', { content: getValue('dist-direccion'), styles: rightAlign }],
            ['Tesorería (Cuenta de Remanentes)', { content: getValue('dist-tesoreria'), styles: rightAlign }],
            ['Pro-Construcción', { content: getValue('dist-pro-construccion'), styles: rightAlign }],
            ['Otros', { content: getValue('dist-otros'), styles: rightAlign }],
        ];

        doc.autoTable({ head: [['Saldo del Remanente Distribuido a:', '']], body: distribucionData, startY: startY, ...tableConfig, tableWidth: (pageW / 2) - margin - 1, margin: { left: margin }, });
        finalYIngresos = (doc as any).lastAutoTable.finalY;

        doc.autoTable({ head: [['Resumen y Cierre', '']], body: resumenData, startY: startY, ...tableConfig, tableWidth: (pageW / 2) - margin - 1, margin: { left: pageW / 2 + 1 }, });
        finalYEgresos = (doc as any).lastAutoTable.finalY;
        
        startY = Math.max(finalYIngresos, finalYEgresos) + 5;
        
        const ministerSignature = churchInfo.ministerSignature;
        let signatureBlockY = startY;

        if (ministerSignature) {
            try {
                const img = new Image();
                img.src = ministerSignature;
                const imgWidth = 45; // mm
                const imgHeight = (img.height * imgWidth) / img.width;
                const signatureX = (pageW / 2) - (imgWidth / 2);
                const signatureY = startY - (imgHeight / 2);
                doc.addImage(ministerSignature, 'PNG', signatureX, signatureY, imgWidth, imgHeight);
                signatureBlockY = signatureY + imgHeight;
            } catch (e) {
                console.error("No se pudo agregar la imagen de la firma al PDF:", e);
            }
        }

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.text(`_________________________`, pageW / 2, signatureBlockY, { align: 'center' });
        signatureBlockY += 4;
        const ministerNameToDisplay = getText('nombre-ministro').trim() || churchInfo.defaultMinister;
        doc.text(ministerNameToDisplay, pageW / 2, signatureBlockY, { align: 'center' });
        doc.setFontSize(7);
        signatureBlockY += 3;
        doc.text(`Ministro Encargado`, pageW / 2, signatureBlockY, { align: 'center' });
        
        startY = signatureBlockY + 10;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.text('Comisión Local de Finanzas:', pageW / 2, startY, { align: 'center' });
        startY += 10;

        const comisionadosToSign = comisionados.slice(0, 3);
        const signatureAreaWidth = (pageW - margin * 2) / 3;
        const signatureWidth = 40;
        const signatureMaxHeight = 20;

        let maxSignatureHeight = 0;
        comisionadosToSign.forEach((comisionado) => {
            if (comisionado.signature) {
                try {
                    const img = new Image();
                    img.src = comisionado.signature;
                    let imgHeight = (img.height * signatureWidth) / img.width;
                    if (imgHeight > signatureMaxHeight) {
                        imgHeight = signatureMaxHeight;
                    }
                    if (imgHeight > maxSignatureHeight) {
                        maxSignatureHeight = imgHeight;
                    }
                } catch (e) { /* ignore */ }
            }
        });

        const lineY = startY + (maxSignatureHeight > 0 ? maxSignatureHeight : 10) + 2;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);

        comisionadosToSign.forEach((comisionado, index) => {
            const centerX = margin + (signatureAreaWidth * index) + (signatureAreaWidth / 2);
            
            if (comisionado.signature) {
                try {
                    const img = new Image();
                    img.src = comisionado.signature;
                    let imgWidth = signatureWidth;
                    let imgHeight = (img.height * imgWidth) / img.width;

                    if (imgHeight > signatureMaxHeight) {
                        imgHeight = signatureMaxHeight;
                        imgWidth = (img.width * imgHeight) / img.height;
                    }
                    
                    const imgX = centerX - (imgWidth / 2);
                    const imgY = lineY - imgHeight - 2;

                    doc.addImage(comisionado.signature, 'PNG', imgX, imgY, imgWidth, imgHeight);

                } catch (e) {
                    console.error(`No se pudo agregar la firma para ${comisionado.nombre}:`, e);
                }
            }

            doc.text(`_________________________`, centerX, lineY, { align: 'center' });
            doc.text(comisionado.nombre || `Firma ${index + 1}`, centerX, lineY + 4, { align: 'center' });
            doc.setFontSize(7);
            doc.text(comisionado.cargo || '', centerX, lineY + 7, { align: 'center' });
            doc.setFontSize(8);
        });

        const mes = getText('mes-reporte') || 'Mes';
        const anio = getText('ano-reporte') || 'Año';
        const iglesia = getText('nombre-iglesia') || 'Iglesia';
        const pdfFileName = `Informe-Mensual_${mes}-${anio}_${iglesia.replace(/ /g, '_')}.pdf`;

        return { blob: doc.output('blob'), fileName: pdfFileName };
    };

    const processPdf = async (pdfGenerator: () => Promise<{ blob: Blob, fileName: string }>) => {
        setIsGenerating(true);
        try {
            const { blob, fileName } = await pdfGenerator();
            
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(link.href);

            if (!supabase) {
                alert(`Informe "${fileName}" generado y descargado. La conexión a la nube no está activa para guardarlo automáticamente.`);
            } else {
                 await uploadFile('reportes-mensuales', fileName, blob, true);
                 alert(`Informe "${fileName}" generado, descargado y guardado en la nube exitosamente.`);
            }
        } catch (error) {
            console.error("PDF upload failed:", error);
            let errorMessage = 'Ocurrió un error desconocido.';
            if (error instanceof Error) {
                errorMessage = error.message;
            } else if (error && typeof error === 'object' && 'message' in error) {
                errorMessage = String((error as { message: string }).message);
            } else {
                errorMessage = String(error);
            }
            
            if (errorMessage.toLowerCase().includes('failed to fetch')) {
                 alert(`Error al subir a la nube: Falló la conexión con el servidor. Esto puede ser un problema de CORS o de red. Verifique la configuración de CORS en su panel de Supabase y su conexión a internet.\n\nEl PDF se guardó localmente.`);
            } else if (errorMessage.toLowerCase().includes('bucket not found')) {
                alert(`Error al subir a la nube: El "bucket" (contenedor) 'reportes-mensuales' no fue encontrado.\n\nPor favor, vaya a su panel de Supabase -> Storage y cree un nuevo bucket PÚBLICO con ese nombre exacto.\n\nEl PDF se guardó localmente.`);
            } else {
                alert(`Hubo un error al generar o subir el PDF: ${errorMessage}`);
            }
        } finally {
            setIsGenerating(false);
        }
    };

    const handleGenerateCurrentReport = () => {
        processPdf(() => createPdfBlob(formState));
    };

    const handleExportSavedReport = (report: MonthlyReport) => {
        processPdf(() => createPdfBlob(report.formData));
    };

    const handlePreview = async () => {
        setIsGeneratingPreview(true);
        try {
            const { blob } = await createPdfBlob(formState);
            const url = URL.createObjectURL(blob);
            const newWindow = window.open(url, '_blank');
            if (!newWindow) {
                alert("El navegador bloqueó la ventana emergente. Por favor, permita las ventanas emergentes para este sitio.");
            }
        } catch (error) {
            console.error("Error generating PDF preview:", error);
            alert(`No se pudo generar la vista previa del PDF. Error: ${error instanceof Error ? error.message : String(error)}`);
        } finally {
            setIsGeneratingPreview(false);
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
                                     <button onClick={() => handleExportSavedReport(report)} disabled={isGenerating} className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-primary-foreground bg-primary rounded-md hover:bg-primary/90 transition-colors disabled:bg-opacity-50">
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
                    <button onClick={handleLoadData} className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg transition-colors">
                        Cargar Datos del Mes
                    </button>
                </div>
                 <p className="text-xs text-muted-foreground mt-2">Nota: Esto llenará automáticamente los campos del informe con los datos de las semanas registradas para el mes seleccionado. Los campos como "Primicias" o "Colectas Especiales" deben llenarse manualmente.</p>
            </div>

            <form id="financial-form" className="space-y-4">
                <Accordion title="1. Información General del Reporte" initialOpen>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Field id="clave-iglesia" label="Clave Iglesia" isCurrency={false} value={formState['clave-iglesia']} onChange={handleChange} />
                        <Field id="mes-reporte" label="Mes del Reporte" isCurrency={false} value={formState['mes-reporte']} onChange={handleChange} />
                        <Field id="nombre-iglesia" label="Nombre Iglesia Local" isCurrency={false} value={formState['nombre-iglesia']} onChange={handleChange} />
                        <Field id="ano-reporte" label="Año del Reporte" isCurrency={false} value={formState['ano-reporte']} onChange={handleChange} />
                        <Field id="distrito" label="Distrito" isCurrency={false} value={formState['distrito']} onChange={handleChange} />
                        <Field id="nombre-ministro" label="Nombre del Ministro" isCurrency={false} value={formState['nombre-ministro']} onChange={handleChange} />
                        <Field id="departamento" label="Departamento" isCurrency={false} value={formState['departamento']} onChange={handleChange} />
                        <Field id="grado-ministro" label="Grado del Ministro" isCurrency={false} value={formState['grado-ministro']} onChange={handleChange} />
                        <Field id="miembros-activos" label="Miembros Activos" isCurrency={false} value={formState['miembros-activos']} onChange={handleChange} />
                        <Field id="tel-ministro" label="Teléfono / Celular" isCurrency={false} value={formState['tel-ministro']} onChange={handleChange} />
                    </div>
                </Accordion>

                <Accordion title="2. Entradas (Ingresos)">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                        <div className="md:col-span-2"><Field id="saldo-anterior" label="Saldo del Mes Anterior" value={formState['saldo-anterior']} onChange={handleChange} /></div>
                        
                        <Subheading title="Ingresos por Ofrendas" />
                        <Field id="ing-diezmos" label="Diezmos" value={formState['ing-diezmos']} onChange={handleChange} />
                        <Field id="ing-ofrendas-ordinarias" label="Ofrendas Ordinarias" value={formState['ing-ofrendas-ordinarias']} onChange={handleChange} />
                        <Field id="ing-primicias" label="Primicias" value={formState['ing-primicias']} onChange={handleChange} />
                        <Field id="ing-ayuda-encargado" label="Ayuda al Encargado" value={formState['ing-ayuda-encargado']} onChange={handleChange} />

                        <Subheading title="Ingresos por Colectas Especiales" />
                        <Field id="ing-ceremonial" label="Ceremonial" value={formState['ing-ceremonial']} onChange={handleChange} />
                        <Field id="ing-ofrenda-especial-sdd" label="Ofrenda Especial SdD NJG" value={formState['ing-ofrenda-especial-sdd']} onChange={handleChange} />
                        <Field id="ing-evangelizacion" label="Evangelización Mundial" value={formState['ing-evangelizacion']} onChange={handleChange} />
                        <Field id="ing-santa-cena" label="Colecta de Santa Cena" value={formState['ing-santa-cena']} onChange={handleChange} />
                        
                        <Subheading title="Ingresos por Colectas Locales" />
                        <Field id="ing-servicios-publicos" label="Pago de Servicios Públicos" value={formState['ing-servicios-publicos']} onChange={handleChange} />
                        <Field id="ing-arreglos-locales" label="Arreglos Locales" value={formState['ing-arreglos-locales']} onChange={handleChange} />
                        <Field id="ing-mantenimiento" label="Mantenimiento y Conservación" value={formState['ing-mantenimiento']} onChange={handleChange} />
                        <Field id="ing-construccion-local" label="Construcción Local" value={formState['ing-construccion-local']} onChange={handleChange} />
                        <Field id="ing-muebles" label="Muebles y Artículos" value={formState['ing-muebles']} onChange={handleChange} />
                        <Field id="ing-viajes-ministro" label="Viajes y viáticos para Ministro" value={formState['ing-viajes-ministro']} onChange={handleChange} />
                        <Field id="ing-reuniones-ministeriales" label="Reuniones Ministeriales" value={formState['ing-reuniones-ministeriales']} onChange={handleChange} />
                        <Field id="ing-atencion-ministros" label="Atención a Ministros" value={formState['ing-atencion-ministros']} onChange={handleChange} />
                        <Field id="ing-viajes-extranjero" label="Viajes fuera del País" value={formState['ing-viajes-extranjero']} onChange={handleChange} />
                        <Field id="ing-actividades-locales" label="Actividades Locales" value={formState['ing-actividades-locales']} onChange={handleChange} />
                        <Field id="ing-ciudad-lldm" label="Ofrendas para Ciudad LLDM" value={formState['ing-ciudad-lldm']} onChange={handleChange} />
                        <Field id="ing-adquisicion-terreno" label="Adquisición Terreno/Edificio" value={formState['ing-adquisicion-terreno']} onChange={handleChange} />
                    </div>
                </Accordion>
                <Accordion title="3. Salidas (Egresos)">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                        <Subheading title="Manutención del Ministro" />
                        <Field id="egr-asignacion" label="Asignación Autorizada" value={formState['egr-asignacion']} onChange={handleChange} />
                        <Field id="egr-gomer" label="Gomer del Mes" value={formState['egr-gomer']} onChange={handleChange} />
                        
                        <Subheading title="Egresos por Colectas Especiales" />
                        <Field id="egr-ceremonial" label="Ceremonial" value={formState['egr-ceremonial']} onChange={handleChange} />
                        <Field id="egr-ofrenda-especial-sdd" label="Ofrenda Especial SdD NJG" value={formState['egr-ofrenda-especial-sdd']} onChange={handleChange} />
                        <Field id="egr-evangelizacion" label="Evangelización Mundial" value={formState['egr-evangelizacion']} onChange={handleChange} />
                        <Field id="egr-santa-cena" label="Colecta de Santa Cena" value={formState['egr-santa-cena']} onChange={handleChange} />
                        
                        <Subheading title="Egresos por Colectas Locales" />
                        <Field id="egr-servicios-publicos" label="Pago de Servicios Públicos" value={formState['egr-servicios-publicos']} onChange={handleChange} />
                        <Field id="egr-arreglos-locales" label="Arreglos Locales" value={formState['egr-arreglos-locales']} onChange={handleChange} />
                        <Field id="egr-mantenimiento" label="Mantenimiento y Conservación" value={formState['egr-mantenimiento']} onChange={handleChange} />
                        <Field id="egr-traspaso-construccion" label="Traspaso para Construcción Local" value={formState['egr-traspaso-construccion']} onChange={handleChange} />
                        <Field id="egr-muebles" label="Muebles y Artículos" value={formState['egr-muebles']} onChange={handleChange} />
                        <Field id="egr-viajes-ministro" label="Viajes y viáticos para Ministro" value={formState['egr-viajes-ministro']} onChange={handleChange} />
                        <Field id="egr-reuniones-ministeriales" label="Reuniones Ministeriales" value={formState['egr-reuniones-ministeriales']} onChange={handleChange} />
                        <Field id="egr-atencion-ministros" label="Atención a Ministros" value={formState['egr-atencion-ministros']} onChange={handleChange} />
                        <Field id="egr-viajes-extranjero" label="Viajes fuera del País" value={formState['egr-viajes-extranjero']} onChange={handleChange} />
                        <Field id="egr-actividades-locales" label="Actividades Locales" value={formState['egr-actividades-locales']} onChange={handleChange} />
                        <Field id="egr-ciudad-lldm" label="Ofrendas para Ciudad LLDM" value={formState['egr-ciudad-lldm']} onChange={handleChange} />
                        <Field id="egr-adquisicion-terreno" label="Adquisición Terreno/Edificio" value={formState['egr-adquisicion-terreno']} onChange={handleChange} />
                    </div>
                </Accordion>

                <Accordion title="4. Resumen y Cierre">
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Subheading title="Saldo del Remanente Distribuido a:" />
                        <Field id="dist-direccion" label="Dirección General (Diezmos de Diezmos)" value={formState['dist-direccion']} onChange={handleChange} />
                        <Field id="dist-tesoreria" label="Tesorería (Cuenta de Remanentes)" value={formState['dist-tesoreria']} onChange={handleChange} />
                        <Field id="dist-pro-construccion" label="Pro-Construcción" value={formState['dist-pro-construccion']} onChange={handleChange} />
                        <Field id="dist-otros" label="Otros" value={formState['dist-otros']} onChange={handleChange} />
                    </div>
                </Accordion>
            </form>
            <div className="p-6 bg-card rounded-xl shadow-lg flex flex-col sm:flex-row gap-4 items-center border">
                <button
                    onClick={handlePreview}
                    disabled={isGeneratingPreview}
                    className="w-full sm:w-auto flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-purple-600 text-white font-bold rounded-lg hover:bg-purple-700 transition-colors disabled:bg-opacity-50"
                >
                    {isGeneratingPreview ? (
                        <>
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            <span>Generando...</span>
                        </>
                    ) : (
                        <>
                            <Eye className="w-5 h-5" />
                            <span>Vista Previa</span>
                        </>
                    )}
                </button>
                <button
                    onClick={handleGenerateCurrentReport}
                    disabled={isGenerating}
                    className="w-full sm:w-auto flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-primary text-primary-foreground font-bold rounded-lg hover:bg-primary/90 transition-colors disabled:bg-opacity-50"
                >
                    {isGenerating ? (
                        <>
                            <div className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin"></div>
                            <span>Generando...</span>
                        </>
                    ) : (
                        <>
                            <FileDown className="w-5 h-5" />
                            <span>Generar y Subir PDF</span>
                        </>
                    )}
                </button>
                 <button onClick={handleSaveReport} className="w-full sm:w-auto flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 transition-colors">
                    <Save className="w-5 h-5" />
                    Guardar Formulario
                </button>
                <button onClick={handleClearForm} className="w-full sm:w-auto flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-destructive text-destructive-foreground font-bold rounded-lg hover:bg-destructive/90 transition-colors">
                    <Trash2 className="w-5 h-5" />
                    Limpiar Formulario
                </button>
            </div>
        </div>
    );
};
export default InformeMensualTab;