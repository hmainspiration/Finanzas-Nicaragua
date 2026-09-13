import { MonthlyReportFormState, ChurchInfo, Comisionado, Member } from '../types';

export interface ReportTotals {
    ingOfrendas: number;
    ingEspeciales: number;
    ingLocales: number;
    totalIngresos: number;
    saldoAnterior: number;
    totalDisponible: number;
    egrEspeciales: number;
    egrLocales: number;
    totalSalidas: number;
    remanente: number;
}

export const formatCurrencyVal = (num: number): string => {
    if (isNaN(num)) return 'C$ 0.00';
    return `C$ ${num.toLocaleString('es-NI', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export const getNum = (val: any): number => {
    if (!val) return 0;
    const clean = String(val).replace(/[^0-9.-]/g, '');
    const parsed = parseFloat(clean);
    return isNaN(parsed) ? 0 : parsed;
};

// Generates the complete, high-fidelity SVG string based on the official LLDM Nicaragua template
export const generateMonthlyReportSvg = (
    formData: MonthlyReportFormState,
    totals: ReportTotals,
    churchInfo: ChurchInfo,
    comisionados: Comisionado[] = []
): string => {
    const getText = (key: string, defaultVal = ''): string => {
        return (formData[key] !== undefined && formData[key] !== '') ? String(formData[key]) : defaultVal;
    };

    const getMoney = (key: string): string => {
        const val = getNum(formData[key]);
        return formatCurrencyVal(val);
    };

    // Fechas y Encabezados
    const del = getText('fecha-del', '01');
    const al = getText('fecha-al', '31');
    const mes = getText('mes-reporte', 'Mes').toUpperCase();
    const anio = getText('ano-reporte', new Date().getFullYear().toString());
    const claveIglesia = getText('clave-iglesia', 'NIMT01');
    const miembrosActivos = getText('miembros-activos', '0');
    const distrito = getText('distrito', churchInfo.district || '');
    const nombreIglesia = getText('nombre-iglesia', 'La Empresa');
    const departamento = getText('departamento', churchInfo.department || 'Matagalpa');

    // Datos Ministro
    const nombreMinistro = getText('nombre-ministro', churchInfo.defaultMinister || '');
    const grado = getText('grado-ministro', churchInfo.ministerGrade || 'O.B');
    const telefono = getText('tel-ministro', churchInfo.ministerPhone || '');
    const celular = getText('cel-ministro', churchInfo.ministerPhone || telefono);
    const familiares = getText('fam-dependientes', churchInfo.dependentFamilyMembers || '0');
    const obreros = getText('obreros', '0');

    // Entradas - Saldo Anterior
    const proConstruccion = getMoney('saldo-pro-construccion');
    const interesesBancarios = getMoney('intereses-bancarios');
    const saldoInicialMes = formatCurrencyVal(totals.saldoAnterior);

    // Entradas - 1 Ofrendas
    const diezmos = getMoney('ing-diezmos');
    const ofrendasOrdinarias = getMoney('ing-ofrendas-ordinarias');
    const primicias = getMoney('ing-primicias');
    const ayudaEncargado = getMoney('ing-ayuda-encargado');
    const totalOfrendas = formatCurrencyVal(totals.ingOfrendas);

    // Resumen Flujo
    const resSaldoInicial = formatCurrencyVal(totals.saldoAnterior);
    const resOfrendas = formatCurrencyVal(totals.ingOfrendas);
    const resEsp = formatCurrencyVal(totals.ingEspeciales);
    const resLoc = formatCurrencyVal(totals.ingLocales);
    const resTotal = formatCurrencyVal(totals.totalDisponible);

    // Entradas - 2 Colectas Especiales
    const ceremonialIng = getMoney('ing-ceremonial');
    const sddNjgIng = getMoney('ing-ofrenda-especial-sdd');
    const evangIng = getMoney('ing-evangelizacion');
    const santaCenaIng = getMoney('ing-santa-cena');
    const totalEspIng = formatCurrencyVal(totals.ingEspeciales);

    // Entradas - 3 Colectas Locales
    const ingServicios = getMoney('ing-servicios-publicos');
    const ingArreglos = getMoney('ing-arreglos-locales');
    const ingMantenimiento = getMoney('ing-mantenimiento');
    const ingConstruccion = getMoney('ing-construccion-local');
    const ingMuebles = getMoney('ing-muebles');
    const ingViajesMin = getMoney('ing-viajes-ministro');
    const ingReunionesMin = getMoney('ing-reuniones-ministeriales');
    const ingAtencionMin = getMoney('ing-atencion-ministros');
    const ingViajesExt = getMoney('ing-viajes-extranjero');
    const ingActividades = getMoney('ing-actividades-locales');
    const ingCiudadLldm = getMoney('ing-ciudad-lldm');
    const ingTerreno = getMoney('ing-adquisicion-terreno');
    const ingOtras = getMoney('ing-otras-colectas');
    const ingReunionesJov = getMoney('ing-reuniones-jovenes');
    const totalColectasLocales = formatCurrencyVal(totals.ingLocales);

    // Salidas - 2.1 Manutención
    const egrAsignacion = getMoney('egr-asignacion');
    const egrGomer = getMoney('egr-gomer');

    // Salidas - 2 Egresos Especiales
    const egrCeremonial = getMoney('egr-ceremonial');
    const egrSddNjg = getMoney('egr-ofrenda-especial-sdd');
    const egrEvang = getMoney('egr-evangelizacion');
    const egrSantaCena = getMoney('egr-santa-cena');
    const totalEgrEsp = formatCurrencyVal(totals.egrEspeciales);

    // Salidas - 3 Egresos Locales
    const egrServicios = getMoney('egr-servicios-publicos');
    const egrArreglos = getMoney('egr-arreglos-locales');
    const egrMantenimiento = getMoney('egr-mantenimiento');
    const egrTraspasoConst = getMoney('egr-traspaso-construccion');
    const egrMuebles = getMoney('egr-muebles');
    const egrViajesMin = getMoney('egr-viajes-ministro');
    const egrReunionesMin = getMoney('egr-reuniones-ministeriales') !== 'C$ 0.00' ? getMoney('egr-reuniones-ministeriales') : getMoney('ing-reuniones-ministeriales');
    const egrAtencionMin = getMoney('egr-atencion-ministros');
    const egrViajesExt = getMoney('egr-viajes-extranjero') !== 'C$ 0.00' ? getMoney('egr-viajes-extranjero') : getMoney('ing-viajes-extranjero');
    const egrActividades = getMoney('egr-actividades-locales');
    const egrCiudadLldm = getMoney('egr-ciudad-lldm');
    const egrTerreno = getMoney('egr-adquisicion-terreno');
    const egrOtras = getMoney('egr-otras-colectas');
    const egrReunionesJov = getMoney('egr-reuniones-jovenes');
    const totalEgresosColectasLocales = formatCurrencyVal(totals.egrLocales);

    // Salidas Totales
    const totGomer = egrGomer;
    const totGastosEsp = formatCurrencyVal(totals.egrEspeciales);
    const totGastosLoc = formatCurrencyVal(totals.egrLocales);
    const totalSalidas = formatCurrencyVal(totals.totalSalidas);
    const utilidadRemanente = formatCurrencyVal(totals.remanente);

    // Remanente Distribuido
    const remDireccionGral = getMoney('dist-direccion');
    const remTesoreria = getMoney('dist-tesoreria');
    const remConstruccion = getMoney('dist-pro-construccion');
    const remOtros = getMoney('dist-otros');

    // Comisionados
    const com1 = comisionados[0] || { id: '1', nombre: '', cargo: '', celular: '', signature: '' };
    const com2 = comisionados[1] || { id: '2', nombre: '', cargo: '', celular: '', signature: '' };
    const com3 = comisionados[2] || { id: '3', nombre: '', cargo: '', celular: '', signature: '' };

    const com1Nombre = getText('comision-nombre-1', com1.nombre || '');
    const com2Nombre = getText('comision-nombre-2', com2.nombre || '');
    const com3Nombre = getText('comision-nombre-3', com3.nombre || '');

    const com1Tel = getText('comision-celular-1', com1.celular || '');
    const com2Tel = getText('comision-celular-2', com2.celular || '');
    const com3Tel = getText('comision-celular-3', com3.celular || '');

    // Signatures images if present
    const minSigImage = churchInfo.ministerSignature ? `<image href="${churchInfo.ministerSignature}" x="330" y="865" width="190" height="42" preserveAspectRatio="xMidYMid meet"/>` : '';
    const com1Sig = com1.signature ? `<image href="${com1.signature}" x="90" y="756" width="180" height="28" preserveAspectRatio="xMidYMid meet"/>` : '';
    const com2Sig = com2.signature ? `<image href="${com2.signature}" x="360" y="756" width="180" height="28" preserveAspectRatio="xMidYMid meet"/>` : '';
    const com3Sig = com3.signature ? `<image href="${com3.signature}" x="630" y="756" width="180" height="28" preserveAspectRatio="xMidYMid meet"/>` : '';

    return `
<svg viewBox="0 0 850 1100" width="850" height="1100" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <style>
      text { font-family: Arial, Helvetica, sans-serif; }
      .t-center { text-anchor: middle; }
      .t-right  { text-anchor: end; }
      .lbl      { font-size: 7.2px; fill: #000; }
      .lbl-b    { font-size: 7.2px; font-weight: bold; fill: #000; }
      .lbl-sm   { font-size: 6.2px; fill: #000; }
      .val      { font-size: 7.5px; fill: #084298; font-weight: bold; }
      .hdr-main { font-size: 9px; font-weight: bold; fill: #000; }
      .hdr-sub  { font-size: 8px; font-weight: bold; fill: #c00000; }
      .hdr-title{ font-size: 13px; font-weight: bold; fill: #1d3557; }
      .sec-bar  { font-size: 9.5px; font-weight: bold; fill: #ffffff; letter-spacing: 1px; }
      
      .border-box  { fill: #ffffff; stroke: #000; stroke-width: 1; }
      .thin-border { fill: #ffffff; stroke: #000; stroke-width: 0.6; }
      .line-field  { stroke: #000; stroke-width: 0.7; }
      .line-thin   { stroke: #333; stroke-width: 0.5; }
      .bg-blue     { fill: #1f3864; }
      .bg-red      { fill: #c00000; }
    </style>
  </defs>

  <!-- Fondo Blanco -->
  <rect x="0" y="0" width="850" height="1100" fill="#ffffff"/>

  <!-- ================= ENCABEZADO ================= -->
  <rect x="25" y="20" width="800" height="92" class="border-box"/>
  
  <!-- Logo Izquierdo LLDM -->
  <circle cx="80" cy="66" r="38" fill="none" stroke="#1f3864" stroke-width="1.8"/>
  <text x="80" y="58" class="t-center lbl-b" font-size="6.5">LA LUZ DEL</text>
  <text x="80" y="68" class="t-center lbl-b" font-size="6.5">MUNDO</text>
  <text x="80" y="80" class="t-center" font-size="5.5" font-style="italic">Finanzas Nicaragua</text>

  <!-- Textos Centrales -->
  <text x="425" y="38" class="t-center hdr-main">IGLESIA DEL DIOS VIVO COLUMNA Y APOYO DE LA VERDAD</text>
  <text x="425" y="52" class="t-center hdr-title">La Luz del Mundo</text>
  <text x="425" y="64" class="t-center lbl-b" font-size="7">DIRECTOR INTERNACIONAL A.J. NAASÓN JOAQUÍN GARCÍA</text>
  <text x="425" y="74" class="t-center lbl-b" font-size="7">MINISTERIO DE ADMINISTRACIÓN FINANCIERA</text>
  <text x="425" y="86" class="t-center hdr-sub">Jurisdicción Nicaragua, C.A.</text>
  <text x="425" y="102" class="t-center lbl-b" font-size="8.5" letter-spacing="0.5">INFORMACIÓN FINANCIERA MENSUAL</text>

  <!-- Sello Derecho -->
  <circle cx="770" cy="66" r="38" fill="none" stroke="#1f3864" stroke-width="1.8"/>
  <text x="770" y="69" class="t-center lbl" font-size="6.5">Eclesiastés 2:20</text>

  <!-- ================= DATOS DE ESTE INFORME ================= -->
  <rect x="25" y="116" width="800" height="74" class="border-box"/>
  <text x="425" y="130" class="t-center hdr-sub">DATOS DE ESTE INFORME</text>

  <text x="35" y="147" class="lbl-b">DEL</text>
  <line x1="56" y1="147" x2="160" y2="147" class="line-field"/>
  <text x="108" y="145" class="t-center val">${del}</text>

  <text x="175" y="147" class="lbl-b">AL</text>
  <line x1="192" y1="147" x2="295" y2="147" class="line-field"/>
  <text x="243" y="145" class="t-center val">${al}</text>

  <text x="310" y="147" class="lbl-b">DEL MES DE:</text>
  <line x1="375" y1="147" x2="555" y2="147" class="line-field"/>
  <text x="465" y="145" class="t-center val">${mes}</text>

  <text x="575" y="147" class="lbl-b">DEL AÑO:</text>
  <line x1="625" y1="147" x2="815" y2="147" class="line-field"/>
  <text x="720" y="145" class="t-center val">${anio}</text>

  <text x="35" y="165" class="lbl-b">CLAVE IGLESIA:</text>
  <line x1="105" y1="165" x2="250" y2="165" class="line-field"/>
  <text x="177" y="163" class="t-center val">${claveIglesia}</text>

  <text x="265" y="165" class="lbl-b">MIEMBROS ECONÓMICAMENTE ACTIVOS:</text>
  <line x1="455" y1="165" x2="570" y2="165" class="line-field"/>
  <text x="512" y="163" class="t-center val">${miembrosActivos}</text>

  <text x="585" y="165" class="lbl-b">DISTRITO:</text>
  <line x1="635" y1="165" x2="815" y2="165" class="line-field"/>
  <text x="725" y="163" class="t-center val">${distrito}</text>

  <text x="35" y="183" class="lbl-b">NOMBRE IGLESIA LOCAL:</text>
  <line x1="145" y1="183" x2="495" y2="183" class="line-field"/>
  <text x="320" y="181" class="t-center val">${nombreIglesia}</text>

  <text x="505" y="183" class="lbl-b">DEPARTAMENTO:</text>
  <line x1="585" y1="183" x2="815" y2="183" class="line-field"/>
  <text x="700" y="181" class="t-center val">${departamento}</text>

  <!-- ================= DATOS DEL MINISTRO ================= -->
  <rect x="25" y="194" width="800" height="66" class="border-box"/>
  <text x="425" y="207" class="t-center hdr-sub">DATOS DEL MINISTRO ACTUAL</text>

  <text x="35" y="222" class="lbl-b">NOMBRE DEL MINISTRO:</text>
  <line x1="145" y1="222" x2="630" y2="222" class="line-field"/>
  <text x="387" y="220" class="t-center val">${nombreMinistro}</text>

  <text x="645" y="222" class="lbl-b">GRADO:</text>
  <line x1="685" y1="222" x2="815" y2="222" class="line-field"/>
  <text x="750" y="220" class="t-center val">${grado}</text>

  <text x="35" y="239" class="lbl-b">N° TELÉFONICO:</text>
  <line x1="105" y1="239" x2="330" y2="239" class="line-field"/>
  <text x="217" y="237" class="t-center val">${telefono}</text>

  <text x="350" y="239" class="lbl-b">CELULAR:</text>
  <line x1="400" y1="239" x2="815" y2="239" class="line-field"/>
  <text x="607" y="237" class="t-center val">${celular}</text>

  <text x="35" y="254" class="lbl-b">PERSONAS QUE DEPENDE ECONÓMICAMENTE DEL MINISTRO - FAMILIARES:</text>
  <line x1="365" y1="254" x2="495" y2="254" class="line-field"/>
  <text x="430" y="252" class="t-center val">${familiares}</text>

  <text x="515" y="254" class="lbl-b">OBREROS:</text>
  <line x1="565" y1="254" x2="815" y2="254" class="line-field"/>
  <text x="690" y="252" class="t-center val">${obreros}</text>

  <!-- ================= BARRAS TITULARES (ENTRADAS / SALIDAS) ================= -->
  <rect x="25" y="264" width="398" height="16" class="bg-blue"/>
  <text x="224" y="276" class="t-center sec-bar">ENTRADAS</text>

  <rect x="427" y="264" width="398" height="16" class="bg-red"/>
  <text x="626" y="276" class="t-center sec-bar">SALIDAS</text>

  <!-- ============================================================== -->
  <!-- ==================== COLUMNA ENTRADAS ======================== -->
  <!-- ============================================================== -->

  <!-- FILA SUPERIOR ENTRADAS: SALDO ANTERIOR (izq) | 1-INGRESOS OFRENDAS (der) -->
  <rect x="25" y="280" width="199" height="74" class="thin-border"/>
  <text x="124" y="291" class="t-center lbl-b">SALDO DEL MES ANTERIOR</text>
  <text x="30" y="306" class="lbl">PRO-CONSTRUCCIÓN:</text>
  <text x="218" y="306" class="t-right val">${proConstruccion}</text>
  <text x="30" y="322" class="lbl">INTERESES BANCARIOS:</text>
  <text x="218" y="322" class="t-right val">${interesesBancarios}</text>
  <text x="30" y="342" class="lbl-b">SALDO INICIAL DEL MES:</text>
  <text x="218" y="342" class="t-right val">${saldoInicialMes}</text>

  <rect x="224" y="280" width="199" height="74" class="thin-border"/>
  <text x="323" y="291" class="t-center lbl-b">1 - INGRESOS POR OFRENDAS</text>
  <text x="230" y="303" class="lbl">Diezmos:</text>
  <text x="418" y="303" class="t-right val">${diezmos}</text>
  <text x="230" y="315" class="lbl">Ofrendas Ordinarias:</text>
  <text x="418" y="315" class="t-right val">${ofrendasOrdinarias}</text>
  <text x="230" y="327" class="lbl">Primicias:</text>
  <text x="418" y="327" class="t-right val">${primicias}</text>
  <text x="230" y="339" class="lbl">Ayuda al Encargado:</text>
  <text x="418" y="339" class="t-right val">${ayudaEncargado}</text>
  <text x="230" y="350" class="lbl-b">TOTAL OFRENDAS:</text>
  <text x="418" y="350" class="t-right val">${totalOfrendas}</text>

  <!-- FILA MEDIA ENTRADAS: RESUMEN FLUJO (izq) | 2-COLECTAS ESPECIALES (der) -->
  <rect x="25" y="354" width="199" height="84" class="thin-border"/>
  <text x="124" y="365" class="t-center lbl-b" font-size="6.5">RESUMEN FLUJO DE EFECTIVO DISPONIBLE</text>
  <text x="30" y="378" class="lbl">SALDO INICIAL DEL MES:</text>
  <text x="218" y="378" class="t-right val">${resSaldoInicial}</text>
  <text x="30" y="390" class="lbl">INGRESOS POR OFRENDAS:</text>
  <text x="218" y="390" class="t-right val">${resOfrendas}</text>
  <text x="30" y="402" class="lbl">POR COLECTAS ESPECIALES:</text>
  <text x="218" y="402" class="t-right val">${resEsp}</text>
  <text x="30" y="414" class="lbl">POR COLECTAS LOCALES:</text>
  <text x="218" y="414" class="t-right val">${resLoc}</text>
  <text x="30" y="430" class="lbl-b">TOTAL DISPONIBLE DEL MES:</text>
  <text x="218" y="430" class="t-right val">${resTotal}</text>

  <rect x="224" y="354" width="199" height="84" class="thin-border"/>
  <text x="323" y="365" class="t-center lbl-b">2 - INGRESOS POR COLECTAS ESPECIALES</text>
  <text x="230" y="378" class="lbl">Ceremonial:</text>
  <text x="418" y="378" class="t-right val">${ceremonialIng}</text>
  <text x="230" y="390" class="lbl">Ofrenda Especial SdD NJG:</text>
  <text x="418" y="390" class="t-right val">${sddNjgIng}</text>
  <text x="230" y="402" class="lbl">Evangelización Mundial:</text>
  <text x="418" y="402" class="t-right val">${evangIng}</text>
  <text x="230" y="414" class="lbl">Colecta de Santa Cena:</text>
  <text x="418" y="414" class="t-right val">${santaCenaIng}</text>
  <text x="230" y="430" class="lbl-b">TOTAL COLECTAS ESPECIALES:</text>
  <text x="418" y="430" class="t-right val">${totalEspIng}</text>

  <!-- FILA INFERIOR ENTRADAS: 3 - INGRESOS POR COLECTAS LOCALES -->
  <rect x="25" y="438" width="398" height="236" class="thin-border"/>
  <text x="224" y="451" class="t-center lbl-b">3 - INGRESOS POR COLECTAS LOCALES</text>

  <!-- Subcolumna Izquierda Entradas Locales -->
  <g transform="translate(0, 0)">
    <text x="30" y="468" class="lbl-sm">Pago de Servicios Públicos (Agua, Luz,</text>
    <text x="30" y="476" class="lbl-sm">Internet, Cable, Tel, Gas, Imp.):</text>
    <text x="218" y="476" class="t-right val">${ingServicios}</text>

    <text x="30" y="492" class="lbl-sm">Arreglos Locales (Flores, Cortinas, etc):</text>
    <text x="218" y="492" class="t-right val">${ingArreglos}</text>

    <text x="30" y="508" class="lbl-sm">Mantenimiento y Conservación:</text>
    <text x="218" y="508" class="t-right val">${ingMantenimiento}</text>

    <text x="30" y="524" class="lbl-sm">Construcción Local:</text>
    <text x="218" y="524" class="t-right val">${ingConstruccion}</text>

    <text x="30" y="540" class="lbl-sm">Muebles y Artículos de Inventario:</text>
    <text x="218" y="540" class="t-right val">${ingMuebles}</text>

    <text x="30" y="556" class="lbl-sm">Viajes y Viáticos para el Ministro:</text>
    <text x="218" y="556" class="t-right val">${ingViajesMin}</text>

    <text x="30" y="572" class="lbl-sm">Reuniones Ministeriales:</text>
    <text x="218" y="572" class="t-right val">${ingReunionesMin}</text>
  </g>

  <!-- Subcolumna Derecha Entradas Locales -->
  <g transform="translate(199, 0)">
    <text x="30" y="468" class="lbl-sm">Atención a Ministros:</text>
    <text x="218" y="468" class="t-right val">${ingAtencionMin}</text>

    <text x="30" y="484" class="lbl-sm">Viajes fuera del País:</text>
    <text x="218" y="484" class="t-right val">${ingViajesExt}</text>

    <text x="30" y="500" class="lbl-sm">Actividades Locales:</text>
    <text x="218" y="500" class="t-right val">${ingActividades}</text>

    <text x="30" y="516" class="lbl-sm">Ofrendas para Ciudad LLDM:</text>
    <text x="218" y="516" class="t-right val">${ingCiudadLldm}</text>

    <text x="30" y="532" class="lbl-sm">Adquisición Terreno/Edificio:</text>
    <text x="218" y="532" class="t-right val">${ingTerreno}</text>

    <text x="30" y="548" class="lbl-sm">Otras Colectas (Especificar):</text>
    <text x="218" y="548" class="t-right val">${ingOtras}</text>

    <text x="30" y="564" class="lbl-sm">Reuniones Jóvenes/Matrimonios:</text>
    <text x="218" y="564" class="t-right val">${ingReunionesJov}</text>
  </g>

  <!-- Total Colectas Locales -->
  <line x1="25" y1="645" x2="423" y2="645" class="line-thin"/>
  <text x="30" y="662" class="lbl-b">TOTAL COLECTAS LOCALES:</text>
  <text x="418" y="662" class="t-right val">${totalColectasLocales}</text>

  <!-- ============================================================== -->
  <!-- ===================== COLUMNA SALIDAS ======================== -->
  <!-- ============================================================== -->

  <!-- FILA SUPERIOR SALIDAS: 2.1 MANUTENCIÓN (izq) | 2 EGRESOS ESPECIALES (der) -->
  <rect x="427" y="280" width="199" height="74" class="thin-border"/>
  <text x="526" y="291" class="t-center lbl-b" font-size="6.5">2.1 - GASTOS POR MANUTENCIÓN</text>
  <text x="432" y="312" class="lbl">Asignación Autorizada:</text>
  <text x="620" y="312" class="t-right val">${egrAsignacion}</text>
  <text x="432" y="332" class="lbl">Gomer del Mes:</text>
  <text x="620" y="332" class="t-right val">${egrGomer}</text>

  <rect x="626" y="280" width="199" height="74" class="thin-border"/>
  <text x="725" y="291" class="t-center lbl-b" font-size="6.5">2 - EGRESOS POR COLECTAS ESPECIALES</text>
  <text x="632" y="303" class="lbl">Ceremonial:</text>
  <text x="820" y="303" class="t-right val">${egrCeremonial}</text>
  <text x="632" y="315" class="lbl">Ofrenda Especial SdD NJG:</text>
  <text x="820" y="315" class="t-right val">${egrSddNjg}</text>
  <text x="632" y="327" class="lbl">Evangelización Mundial:</text>
  <text x="820" y="327" class="t-right val">${egrEvang}</text>
  <text x="632" y="339" class="lbl">Colecta de Santa Cena:</text>
  <text x="820" y="339" class="t-right val">${egrSantaCena}</text>
  <text x="632" y="350" class="lbl-b">TOTAL EGRESOS COL. ESP.:</text>
  <text x="820" y="350" class="t-right val">${totalEgrEsp}</text>

  <!-- FILA MEDIA SALIDAS: 3 - EGRESOS POR COLECTAS LOCALES -->
  <rect x="427" y="354" width="398" height="210" class="thin-border"/>
  <text x="626" y="367" class="t-center lbl-b">3 - EGRESOS POR COLECTAS LOCALES</text>

  <!-- Subcolumna Izquierda Egresos Locales -->
  <g transform="translate(402, 0)">
    <text x="30" y="385" class="lbl-sm">Pago de Servicios Públicos (Agua, Luz,</text>
    <text x="30" y="393" class="lbl-sm">Internet, Cable, Tel, Gas, Imp.):</text>
    <text x="218" y="393" class="t-right val">${egrServicios}</text>

    <text x="30" y="409" class="lbl-sm">Arreglos Locales (Flores, Cortinas, etc):</text>
    <text x="218" y="409" class="t-right val">${egrArreglos}</text>

    <text x="30" y="425" class="lbl-sm">Mantenimiento y Conservación:</text>
    <text x="218" y="425" class="t-right val">${egrMantenimiento}</text>

    <text x="30" y="441" class="lbl-sm">Traspaso para Construcción Local:</text>
    <text x="218" y="441" class="t-right val">${egrTraspasoConst}</text>

    <text x="30" y="457" class="lbl-sm">Muebles y Artículos de Inventario:</text>
    <text x="218" y="457" class="t-right val">${egrMuebles}</text>

    <text x="30" y="473" class="lbl-sm">Viajes y Viáticos para el Ministro:</text>
    <text x="218" y="473" class="t-right val">${egrViajesMin}</text>

    <text x="30" y="489" class="lbl-sm">Reuniones Ministeriales:</text>
    <text x="218" y="489" class="t-right val">${egrReunionesMin}</text>
  </g>

  <!-- Subcolumna Derecha Egresos Locales -->
  <g transform="translate(601, 0)">
    <text x="30" y="385" class="lbl-sm">Atención a Ministros:</text>
    <text x="218" y="385" class="t-right val">${egrAtencionMin}</text>

    <text x="30" y="401" class="lbl-sm">Viajes fuera del País:</text>
    <text x="218" y="401" class="t-right val">${egrViajesExt}</text>

    <text x="30" y="417" class="lbl-sm">Actividades Locales:</text>
    <text x="218" y="417" class="t-right val">${egrActividades}</text>

    <text x="30" y="433" class="lbl-sm">Ofrendas para Ciudad LLDM:</text>
    <text x="218" y="433" class="t-right val">${egrCiudadLldm}</text>

    <text x="30" y="449" class="lbl-sm">Adquisición Terreno/Edificio:</text>
    <text x="218" y="449" class="t-right val">${egrTerreno}</text>

    <text x="30" y="465" class="lbl-sm">Otras Colectas (Especificar):</text>
    <text x="218" y="465" class="t-right val">${egrOtras}</text>

    <text x="30" y="481" class="lbl-sm">Reuniones Jóvenes/Matrimonios:</text>
    <text x="218" y="481" class="t-right val">${egrReunionesJov}</text>
  </g>

  <!-- Total Egresos Colectas Locales -->
  <line x1="427" y1="535" x2="825" y2="535" class="line-thin"/>
  <text x="432" y="552" class="lbl-b">TOTAL EGRESOS COLECTAS LOCALES:</text>
  <text x="820" y="552" class="t-right val">${totalEgresosColectasLocales}</text>

  <!-- FILA INFERIOR SALIDAS: TOTAL SALIDAS (izq) | DISTRIBUCIÓN REMANENTE (der) -->
  <rect x="427" y="564" width="199" height="110" class="thin-border"/>
  <text x="526" y="577" class="t-center lbl-b">TOTAL SALIDAS DEL MES</text>
  <text x="432" y="591" class="lbl-sm">Gomer del Ministro:</text>
  <text x="620" y="591" class="t-right val">${totGomer}</text>
  <text x="432" y="603" class="lbl-sm">Gastos por Colectas Especiales:</text>
  <text x="620" y="603" class="t-right val">${totGastosEsp}</text>
  <text x="432" y="615" class="lbl-sm">Gastos de la Iglesia Local:</text>
  <text x="620" y="615" class="t-right val">${totGastosLoc}</text>
  <text x="432" y="632" class="lbl-b">TOTAL SALIDAS:</text>
  <text x="620" y="632" class="t-right val">${totalSalidas}</text>
  <line x1="427" y1="645" x2="626" y2="645" class="line-thin"/>
  <text x="432" y="662" class="lbl-b" fill="#c00000">UTILIDAD O REMANENTE:</text>
  <text x="620" y="662" class="t-right val">${utilidadRemanente}</text>

  <rect x="626" y="564" width="199" height="110" class="thin-border"/>
  <text x="725" y="577" class="t-center lbl-b" font-size="6.3">SALDO DEL REMANENTE DISTRIBUIDO A:</text>
  <text x="632" y="593" class="lbl-sm">Dirección General (Diezmos de D.):</text>
  <text x="820" y="593" class="t-right val">${remDireccionGral}</text>
  <text x="632" y="609" class="lbl-sm">Tesorería (Cuenta de Remanentes):</text>
  <text x="820" y="609" class="t-right val">${remTesoreria}</text>
  <text x="632" y="625" class="lbl-sm">Pro-Construcción:</text>
  <text x="820" y="625" class="t-right val">${remConstruccion}</text>
  <text x="632" y="641" class="lbl-sm">Otros (Especificar):</text>
  <text x="820" y="641" class="t-right val">${remOtros}</text>

  <!-- ============================================================== -->
  <!-- ================= PIE DE PÁGINA Y FIRMAS ===================== -->
  <!-- ============================================================== -->

  <text x="425" y="700" class="t-center lbl" font-style="italic">"HACEMOS CONSTAR QUE LAS DECLARACIONES HECHAS POR NOSOTROS SON VERADERAS"</text>
  <text x="425" y="718" class="t-center hdr-sub" font-size="10">Datos de la Comisión Local de Finanzas</text>

  <!-- Miembro 1 -->
  <text x="35" y="750" class="lbl-b">1: Nombre:</text>
  <line x1="85" y1="750" x2="275" y2="750" class="line-field"/>
  <text x="180" y="747" class="t-center val">${com1Nombre}</text>

  <text x="35" y="785" class="lbl-b">1: Firma:</text>
  <line x1="85" y1="785" x2="275" y2="785" class="line-field"/>
  ${com1Sig}

  <text x="35" y="820" class="lbl-b">1: Celular:</text>
  <line x1="85" y1="820" x2="275" y2="820" class="line-field"/>
  <text x="180" y="817" class="t-center val">${com1Tel}</text>

  <!-- Miembro 2 -->
  <text x="305" y="750" class="lbl-b">2: Nombre:</text>
  <line x1="355" y1="750" x2="545" y2="750" class="line-field"/>
  <text x="450" y="747" class="t-center val">${com2Nombre}</text>

  <text x="305" y="785" class="lbl-b">2: Firma:</text>
  <line x1="355" y1="785" x2="545" y2="785" class="line-field"/>
  ${com2Sig}

  <text x="305" y="820" class="lbl-b">2: Celular:</text>
  <line x1="355" y1="820" x2="545" y2="820" class="line-field"/>
  <text x="450" y="817" class="t-center val">${com2Tel}</text>

  <!-- Miembro 3 -->
  <text x="575" y="750" class="lbl-b">3: Nombre:</text>
  <line x1="625" y1="750" x2="815" y2="750" class="line-field"/>
  <text x="720" y="747" class="t-center val">${com3Nombre}</text>

  <text x="575" y="785" class="lbl-b">3: Firma:</text>
  <line x1="625" y1="785" x2="815" y2="785" class="line-field"/>
  ${com3Sig}

  <text x="575" y="820" class="lbl-b">3: Celular:</text>
  <line x1="625" y1="820" x2="815" y2="820" class="line-field"/>
  <text x="720" y="817" class="t-center val">${com3Tel}</text>

  <!-- Firma Ministro -->
  ${minSigImage}
  <line x1="280" y1="910" x2="570" y2="910" class="line-field"/>
  <text x="425" y="926" class="t-center lbl-b" font-size="9">Firma del Ministro:</text>
  <text x="425" y="938" class="t-center val">${nombreMinistro}</text>

  <!-- Citas Bíblicas Finales -->
  <text x="425" y="990" class="t-center lbl" font-size="8">
    <tspan font-weight="bold">Eclesiástico 42:7</tspan> "Cuenta y pesa bien lo que depositas, y lo que das y recibes, que esté todo por escrito."
  </text>
  <text x="425" y="1015" class="t-center lbl-b" font-size="8.5" letter-spacing="0.5">
    PORQUE NUESTRA GLORIA ES ESTA: EL TESTIMONIO DE NUESTRA CONCIENCIA
  </text>

</svg>
    `.trim();
};

// Generates high-res PDF Blob directly from SVG vector
export const generatePdfFromSvg = async (svgString: string, fileName: string): Promise<{ blob: Blob; fileName: string }> => {
    return new Promise((resolve, reject) => {
        // Embed SVG as a data URI or ObjectURL
        const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(svgBlob);
        const img = new Image();

        img.onload = () => {
            try {
                // High-resolution canvas for crystal clear print (Letter: 2550 x 3300 px)
                const canvas = document.createElement('canvas');
                canvas.width = 2550;
                canvas.height = 3300;
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    URL.revokeObjectURL(url);
                    throw new Error('No se pudo inicializar el renderizador gráfico.');
                }

                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                URL.revokeObjectURL(url);

                const imgData = canvas.toDataURL('image/jpeg', 0.98);
                const { jsPDF } = (window as any).jspdf;
                const doc = new jsPDF({
                    orientation: 'portrait',
                    unit: 'mm',
                    format: 'letter',
                });

                // Letter size: 215.9 mm x 279.4 mm
                doc.addImage(imgData, 'JPEG', 0, 0, 215.9, 279.4, undefined, 'FAST');
                const pdfBlob = doc.output('blob');
                resolve({ blob: pdfBlob, fileName });
            } catch (err) {
                URL.revokeObjectURL(url);
                reject(err);
            }
        };

        img.onerror = (e) => {
            URL.revokeObjectURL(url);
            reject(new Error('Error al procesar el gráfico vectorial del informe mensual.'));
        };

        img.src = url;
    });
};
