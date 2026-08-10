// Fix: Added full type definitions for the application.
export type Tab = 'register' | 'summary' | 'history' | 'monthly' | 'informe' | 'admin';

export interface Offering {
  id: string;
  category: string;
  amount: number;
  memberId?: string; // Optional member associated with the donation
  memberName?: string; // Added to store name with donation for convenience
}

export interface Member {
  id:string;
  name: string;
  isActive: boolean;
}

export interface Comisionado {
  id: string;
  nombre: string;
  cargo: string;
  signature?: string;
}

export interface Formulas {
    diezmoPercentage: number;
    remanenteThreshold: number;
}

export interface WeeklyRecord {
  id: string;
  day: number;
  month: number;
  year: number;
  minister: string;
  offerings: Offering[];
  formulas: Formulas;
}

export interface ChurchInfo {
    defaultMinister: string;
    ministerGrade: string;
    district: string;
    department: string;
    ministerPhone: string;
    ministerSignature?: string;
}

export type MonthlyReportFormState = Record<string, string>;

export interface MonthlyReport {
    id: string;
    month: number;
    year: number;
    formData: MonthlyReportFormState;
}