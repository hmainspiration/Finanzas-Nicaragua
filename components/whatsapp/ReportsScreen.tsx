import React, { useState } from 'react';
import ResumenFinancieroTab from '../tabs/ResumenFinancieroTab';
import SemanasRegistradasTab from '../tabs/SemanasRegistradasTab';
import ResumenMensualTab from '../tabs/ResumenMensualTab';
import InformeMensualTab from '../tabs/InformeMensualTab';
import { Member, WeeklyRecord, Formulas, MonthlyReport, ChurchInfo, Comisionado } from '../../types';

interface ReportsScreenProps {
    data: {
        members: Member[];
        categories: string[];
        weeklyRecords: WeeklyRecord[];
        formulas: Formulas;
        monthlyReports: MonthlyReport[];
        churchInfo: ChurchInfo;
        comisionados: Comisionado[];
    };
    handlers: any;
}

const ReportsScreen: React.FC<ReportsScreenProps> = ({ data, handlers }) => {
    const [subTab, setSubTab] = useState<'resumen' | 'historial' | 'mensual' | 'informe'>('resumen');

    return (
        <div className="flex flex-col h-full bg-background dark:bg-[#111b21]">
            <div className="bg-[#00a884] dark:bg-[#202c33] text-white pt-4 shadow-sm z-10">
                <h1 className="text-xl font-medium px-4 mb-3">Reportes y Resúmenes</h1>
                
                {/* Horizontal scrollable tabs */}
                <div className="flex overflow-x-auto scrollbar-hide text-sm font-medium">
                    {[
                        { id: 'resumen', label: 'Resumen' },
                        { id: 'historial', label: 'Historial' },
                        { id: 'mensual', label: 'Cierre Mensual' },
                        { id: 'informe', label: 'Informe' },
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setSubTab(tab.id as any)}
                            className={`px-4 py-3 whitespace-nowrap border-b-2 transition-colors ${
                                subTab === tab.id 
                                ? 'border-white text-white' 
                                : 'border-transparent text-white/70 hover:text-white'
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2 bg-[#f0f2f5] dark:bg-[#111b21]">
                {subTab === 'resumen' && (
                    <ResumenFinancieroTab 
                        currentRecord={null} 
                        weeklyRecords={data.weeklyRecords} 
                        categories={data.categories} 
                    />
                )}
                {subTab === 'historial' && (
                    <SemanasRegistradasTab 
                        records={data.weeklyRecords} 
                        setRecords={handlers.setWeeklyRecords}
                        members={data.members}
                        categories={data.categories}
                        formulas={data.formulas}
                        churchInfo={data.churchInfo}
                    />
                )}
                {subTab === 'mensual' && (
                    <ResumenMensualTab 
                        records={data.weeklyRecords} 
                        categories={data.categories} 
                        formulas={data.formulas} 
                    />
                )}
                {subTab === 'informe' && (
                    <InformeMensualTab 
                        savedReports={data.monthlyReports}
                        setSavedReports={handlers.setMonthlyReports}
                        records={data.weeklyRecords}
                        formulas={data.formulas}
                        churchInfo={data.churchInfo}
                        comisionados={data.comisionados}
                        members={data.members}
                    />
                )}
            </div>
        </div>
    );
};

export default ReportsScreen;
