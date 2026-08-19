import { WeeklyRecord, Offering, Formulas, ChurchInfo } from '../types';
import { MONTH_NAMES } from '../constants';

const monthNameToNumber: Record<string, number> = Object.fromEntries(
    MONTH_NAMES.map((name, i) => [name.toLowerCase(), i + 1])
);

/**
 * Generates the standardized Excel file name for a weekly record.
 * e.g., "16-Agosto-26_La_Empresa.xlsx"
 */
export function getWeeklyRecordFileName(record: { day: number; month: number; year: number }): string {
    const churchName = (window as any).CHURCH_NAME || 'La_Empresa';
    const monthName = MONTH_NAMES[record.month - 1] || 'Mes';
    const yearShort = record.year.toString().slice(-2);
    const dayPadded = record.day.toString().padStart(2, '0');
    return `${dayPadded}-${monthName}-${yearShort}_${churchName.replace(/ /g, '_')}.xlsx`;
}

/**
 * Generates an Excel Blob for a WeeklyRecord using SheetJS (XLSX).
 */
export function generateWeeklyExcelBlob(record: WeeklyRecord, categories: string[]): Blob {
    const subtotals: Record<string, number> = {};
    categories.forEach(cat => { subtotals[cat] = 0; });
    record.offerings.forEach(d => {
        if (subtotals[d.category] !== undefined) {
            subtotals[d.category] += d.amount;
        }
    });

    const total = (subtotals['Diezmo'] || 0) + (subtotals['Ordinaria'] || 0);
    const diezmoPercent = record.formulas?.diezmoPercentage ?? 10;
    const remanenteThreshold = record.formulas?.remanenteThreshold ?? 4500;
    const diezmoDeDiezmo = Math.round(total * (diezmoPercent / 100));
    const remanente = total > remanenteThreshold ? Math.round(total - remanenteThreshold) : 0;
    const gomerMinistro = Math.round(total - diezmoDeDiezmo);

    const summaryData = [
        ["Resumen Semanal"],
        [],
        ["Fecha:", `${record.day}/${record.month}/${record.year}`],
        ["Ministro:", record.minister || 'Manuel Salvador Alvarez Romero'],
        [],
        ["Concepto", "Monto (C$)"],
        ...categories.map(cat => [cat, subtotals[cat] || 0]),
        [],
        ["Cálculos Finales", ""],
        ["TOTAL (Diezmo + Ordinaria)", total],
        [`Diezmo de Diezmo (${diezmoPercent}%)`, diezmoDeDiezmo],
        [`Remanente (Umbral C$ ${remanenteThreshold})`, remanente],
        ["Gomer del Ministro", gomerMinistro]
    ];

    const offeringsData = record.offerings.map(d => ({
        Miembro: d.memberName || 'General',
        Categoría: d.category,
        Monto: d.amount
    }));

    const wb = (window as any).XLSX.utils.book_new();
    const wsSummary = (window as any).XLSX.utils.aoa_to_sheet(summaryData);
    (window as any).XLSX.utils.book_append_sheet(wb, wsSummary, "Resumen");

    const wsOfferings = (window as any).XLSX.utils.json_to_sheet(offeringsData);
    (window as any).XLSX.utils.book_append_sheet(wb, wsOfferings, "Detalle de Ofrendas");

    const excelBuffer = (window as any).XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    return new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

/**
 * Uploads a single weekly record to Supabase Storage bucket 'reportes-semanales'.
 */
export async function uploadWeeklyRecordToCloud(
    uploadFile: (bucket: string, fileName: string, file: Blob, upsert?: boolean) => Promise<any>,
    record: WeeklyRecord,
    categories: string[]
): Promise<string> {
    const fileName = getWeeklyRecordFileName(record);
    const blob = generateWeeklyExcelBlob(record, categories);
    await uploadFile('reportes-semanales', fileName, blob, true);
    return fileName;
}

/**
 * Parses an Excel arrayBuffer into a WeeklyRecord structure.
 */
export function parseWeeklyRecordFromExcel(
    arrayBuffer: ArrayBuffer,
    fileName: string,
    formulas: Formulas,
    churchInfo: ChurchInfo
): WeeklyRecord | null {
    try {
        const nameParts = fileName.split('_')[0].split('-');
        if (nameParts.length < 3) return null;

        const day = parseInt(nameParts[0], 10);
        const monthName = nameParts[1].toLowerCase();
        const year = 2000 + parseInt(nameParts[2], 10);
        const month = monthNameToNumber[monthName];

        if (!day || !month || !year) return null;

        const wb = (window as any).XLSX.read(arrayBuffer, { type: 'buffer' });
        const ws = wb.Sheets['Detalle de Ofrendas'];
        if (!ws) return null;

        const offeringsJson = (window as any).XLSX.utils.sheet_to_json(ws);
        const offerings: Offering[] = offeringsJson.map((d: any, index: number) => ({
            id: `offering-cloud-${day}-${month}-${year}-${index}`,
            memberId: undefined, // Cloud offers member names
            memberName: String(d['Miembro'] || 'General').trim(),
            category: String(d['Categoría'] || 'Ordinaria').trim(),
            amount: parseFloat(d['Monto']) || 0
        }));

        return {
            id: `wr-${day}-${month}-${year}`,
            day,
            month,
            year,
            minister: churchInfo?.defaultMinister || 'Manuel Salvador Alvarez Romero',
            offerings,
            formulas: formulas
        };
    } catch (e) {
        console.error("Error parsing weekly record from Excel:", e);
        return null;
    }
}

/**
 * Generates a unique signature for an offering to avoid duplicates.
 */
function getOfferingSignature(offering: Offering): string {
    const name = (offering.memberName || '').trim().toLowerCase();
    const cat = (offering.category || '').trim().toLowerCase();
    const amt = Math.round((offering.amount || 0) * 100) / 100;
    return `${name}__${cat}__${amt}`;
}

/**
 * Merges two lists of offerings, avoiding duplicates while preserving memberId when present.
 */
export function mergeOfferings(localOfferings: Offering[], cloudOfferings: Offering[]): Offering[] {
    const map = new Map<string, Offering>();

    // Add local offerings first
    localOfferings.forEach(offering => {
        const sig = getOfferingSignature(offering);
        map.set(sig, offering);
    });

    // Add cloud offerings, preserving local ID/memberId if already present
    cloudOfferings.forEach(offering => {
        const sig = getOfferingSignature(offering);
        if (map.has(sig)) {
            const existing = map.get(sig)!;
            // Prefer existing if it has memberId
            if (!existing.memberId && offering.memberId) {
                map.set(sig, { ...existing, memberId: offering.memberId });
            }
        } else {
            map.set(sig, offering);
        }
    });

    return Array.from(map.values());
}

/**
 * Intelligently merges local weekly records with cloud weekly records without duplicating dates or offerings.
 */
export function mergeWeeklyRecords(localRecords: WeeklyRecord[], cloudRecords: WeeklyRecord[]): WeeklyRecord[] {
    const recordMap = new Map<string, WeeklyRecord>();

    // Process local records
    localRecords.forEach(rec => {
        const key = `${rec.day}-${rec.month}-${rec.year}`;
        recordMap.set(key, { ...rec });
    });

    // Merge cloud records
    cloudRecords.forEach(cloudRec => {
        const key = `${cloudRec.day}-${cloudRec.month}-${cloudRec.year}`;
        if (recordMap.has(key)) {
            const localRec = recordMap.get(key)!;
            const mergedOfferings = mergeOfferings(localRec.offerings || [], cloudRec.offerings || []);
            recordMap.set(key, {
                ...localRec,
                offerings: mergedOfferings,
                formulas: localRec.formulas || cloudRec.formulas,
                minister: localRec.minister || cloudRec.minister
            });
        } else {
            recordMap.set(key, { ...cloudRec });
        }
    });

    // Return sorted descending by date
    return Array.from(recordMap.values()).sort((a, b) => {
        return new Date(b.year, b.month - 1, b.day).getTime() - new Date(a.year, a.month - 1, a.day).getTime();
    });
}

/**
 * Performs a full bi-directional sync with Supabase Storage:
 * 1. Downloads and parses all cloud reports.
 * 2. Merges with local records without duplicating data.
 * 3. Uploads any local records that aren't yet in the cloud (or that received new merged offerings).
 */
export async function syncAllWeeklyRecords(
    supabase: any,
    listFiles: (bucket: string) => Promise<any[] | null>,
    getPublicUrl: (bucket: string, path: string) => string,
    uploadFile: (bucket: string, fileName: string, file: Blob, upsert?: boolean) => Promise<any>,
    localRecords: WeeklyRecord[],
    categories: string[],
    formulas: Formulas,
    churchInfo: ChurchInfo
): Promise<{
    success: boolean;
    mergedRecords: WeeklyRecord[];
    cloudCount: number;
    uploadedCount: number;
    error?: string;
}> {
    if (!supabase) {
        return {
            success: false,
            mergedRecords: localRecords,
            cloudCount: 0,
            uploadedCount: 0,
            error: "Supabase no está configurado."
        };
    }

    try {
        const fileList = await listFiles('reportes-semanales');
        const excelFiles = (fileList || []).filter(f => f.name.endsWith('.xlsx'));
        
        const cloudRecords: WeeklyRecord[] = [];
        const cloudFileNames = new Set(excelFiles.map(f => f.name));

        // Fetch each cloud file and parse
        await Promise.all(
            excelFiles.map(async file => {
                try {
                    const url = getPublicUrl('reportes-semanales', file.name);
                    const response = await fetch(url);
                    if (response.ok) {
                        const arrayBuffer = await response.arrayBuffer();
                        const parsed = parseWeeklyRecordFromExcel(arrayBuffer, file.name, formulas, churchInfo);
                        if (parsed) {
                            cloudRecords.push(parsed);
                        }
                    }
                } catch (e) {
                    console.error(`Error loading cloud report ${file.name}:`, e);
                }
            })
        );

        // Merge records
        const mergedRecords = mergeWeeklyRecords(localRecords, cloudRecords);

        // Upload any records that have new data or are not in the cloud
        let uploadedCount = 0;
        await Promise.all(
            mergedRecords.map(async record => {
                const expectedFileName = getWeeklyRecordFileName(record);
                // If it wasn't in cloud, or if local merged offerings changed, upload it
                if (!cloudFileNames.has(expectedFileName)) {
                    try {
                        await uploadWeeklyRecordToCloud(uploadFile, record, categories);
                        uploadedCount++;
                    } catch (e) {
                        console.error(`Error uploading record ${expectedFileName} to cloud:`, e);
                    }
                }
            })
        );

        return {
            success: true,
            mergedRecords,
            cloudCount: cloudRecords.length,
            uploadedCount
        };
    } catch (e) {
        console.error("Error in syncAllWeeklyRecords:", e);
        return {
            success: false,
            mergedRecords: localRecords,
            cloudCount: 0,
            uploadedCount: 0,
            error: e instanceof Error ? e.message : String(e)
        };
    }
}
