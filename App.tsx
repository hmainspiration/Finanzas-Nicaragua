// Fix: Implemented the main App component with routing and state management.
import React, { useState, useEffect } from 'react';
import LoginScreen from './components/LoginScreen';
import VersionSelectionScreen from './screens/VersionSelectionScreen';
import { useSupabase } from './context/SupabaseContext';
import { Member, WeeklyRecord, Formulas, MonthlyReport, ChurchInfo, Comisionado } from './types';
import { INITIAL_MEMBERS, INITIAL_CATEGORIES, DEFAULT_FORMULAS, DEFAULT_CHURCH_INFO } from './constants';
import MainApp from './screens/MainApp';
import MainAppSencillo from './screens/MainAppSencillo';
import WhatsAppApp from './components/whatsapp/WhatsAppApp';

// A custom hook to manage state in localStorage
function useLocalStorage<T>(key: string, initialValue: T): [T, React.Dispatch<React.SetStateAction<T>>] {
    const [storedValue, setStoredValue] = useState<T>(() => {
        try {
            const item = window.localStorage.getItem(key);
            return item ? JSON.parse(item) : initialValue;
        } catch (error) {
            console.error(error);
            return initialValue;
        }
    });

    const setValue = (value: T | ((val: T) => T)) => {
        try {
            const valueToStore = value instanceof Function ? value(storedValue) : value;
            setStoredValue(valueToStore);
            window.localStorage.setItem(key, JSON.stringify(valueToStore));
        } catch (error) {
            console.error(error);
        }
    };

    return [storedValue, setValue];
}

const App: React.FC = () => {
    const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
    const [appVersion, setAppVersion] = useState<'completo' | 'sencillo' | null>(null);
    const { supabase, error: supabaseError, fetchItems, addItem } = useSupabase();

    // --- State Management ---
    const [members, setMembers] = useState<Member[]>([]);
    const [categories, setCategories] = useState<string[]>([]);
    const [comisionados, setComisionados] = useState<Comisionado[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [loadingMessage, setLoadingMessage] = useState("Cargando datos desde la nube...");


    // Other states remain in localStorage as they are session/device specific
    const [weeklyRecords, setWeeklyRecords] = useLocalStorage<WeeklyRecord[]>('app_weekly_records', []);
    const [currentRecord, setCurrentRecord] = useState<WeeklyRecord | null>(null);
    const [formulas, setFormulas] = useLocalStorage<Formulas>('app_formulas', DEFAULT_FORMULAS);
    const [monthlyReports, setMonthlyReports] = useLocalStorage<MonthlyReport[]>('app_monthly_reports', []);
    const [churchInfo, setChurchInfo] = useLocalStorage<ChurchInfo>('app_church_info', DEFAULT_CHURCH_INFO);
    const [theme, setTheme] = useLocalStorage<'light' | 'dark'>('app_theme', 'light');

    // --- Effects ---
    useEffect(() => {
        const loggedIn = sessionStorage.getItem('isLoggedIn') === 'true';
        const version = sessionStorage.getItem('appVersion') as 'completo' | 'sencillo' | null;
        if (loggedIn) {
            setIsLoggedIn(true);
            if (version) {
                setAppVersion(version);
            }
        } else {
            setIsLoading(false);
        }
    }, []);

    // Data Sanitization Effect: Runs once on mount to clean up old data formats.
    useEffect(() => {
        const storedRecordsRaw = window.localStorage.getItem('app_weekly_records');
        if (storedRecordsRaw) {
            try {
                const parsedRecords: WeeklyRecord[] = JSON.parse(storedRecordsRaw);
                let wasMutated = false;
                
                const sanitizedRecords = parsedRecords.map(record => {
                    let newRecord = { ...record };
                    // Ensure 'offerings' exists and is an array
                    if (!Array.isArray(newRecord.offerings)) {
                        newRecord.offerings = [];
                        wasMutated = true;
                    }
                    // Ensure 'formulas' exists and is an object
                    if (typeof newRecord.formulas !== 'object' || newRecord.formulas === null) {
                        newRecord.formulas = DEFAULT_FORMULAS;
                        wasMutated = true;
                    }
                    return newRecord;
                });

                if (wasMutated) {
                    console.warn("Sanitizing old weekly records format from localStorage...");
                    setWeeklyRecords(sanitizedRecords);
                }
            } catch (e) {
                console.error("Failed to parse or sanitize weekly records from localStorage", e);
            }
        }
    }, []); // Empty dependency array ensures this runs only once on mount

    useEffect(() => {
        if (isLoggedIn && supabase) {
            const loadInitialData = async () => {
                setIsLoading(true);
                try {
                    const [fetchedMembersRaw, fetchedCategories, fetchedComisionados] = await Promise.all([
                        fetchItems('members'),
                        fetchItems('categories'),
                        fetchItems('comisionados', 'nombre'),
                    ]);

                    // --- Members ---
                    let mappedMembers: Member[];
                    if (fetchedMembersRaw.length === 0) {
                        setLoadingMessage("Configurando su base de datos por primera vez (Miembros)...");
                        const seededMembersRaw = await Promise.all(
                            INITIAL_MEMBERS.map(member => addItem('members', { name: member.name, is_active: true }))
                        );
                        mappedMembers = seededMembersRaw.map((m: any) => ({
                            id: m.id,
                            name: m.name,
                            isActive: m.is_active,
                        }));
                    } else {
                        mappedMembers = fetchedMembersRaw.map((m: any) => ({
                            id: m.id,
                            name: m.name,
                            isActive: m.is_active === false ? false : true,
                        }));
                    }
                    setMembers(mappedMembers);
                    
                    // --- Categories ---
                    if (fetchedCategories.length === 0) {
                        setLoadingMessage("Configurando su base de datos por primera vez (Categorías)...");
                        await Promise.all(
                            INITIAL_CATEGORIES.map(categoryName => addItem('categories', { name: categoryName }))
                        );
                        const refetchedCategories = await fetchItems('categories');
                        setCategories(refetchedCategories.map((c: any) => c.name));
                    } else {
                        setCategories(fetchedCategories.map((c: any) => c.name));
                    }

                    // --- Comisionados ---
                    setComisionados(fetchedComisionados.map((c: any) => ({
                        id: c.id,
                        nombre: c.nombre,
                        cargo: c.cargo
                    })));
                    
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : String(error);
                    console.error("Failed to fetch initial data from Supabase:", errorMessage);
                    
                    console.warn("Falling back to initial constant data due to Supabase fetch error.");
                    setMembers(INITIAL_MEMBERS.map(m => ({ ...m, isActive: true })));
                    setCategories(INITIAL_CATEGORIES);
                    setComisionados([]);

                } finally {
                    setIsLoading(false);
                    setLoadingMessage("Cargando datos desde la nube...");
                }
            };
            loadInitialData();
        }
    }, [isLoggedIn, supabase, fetchItems, addItem]);


    useEffect(() => {
        if (theme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, [theme]);
    
    // --- Handlers ---
    const handleLoginSuccess = () => {
        sessionStorage.setItem('isLoggedIn', 'true');
        setIsLoggedIn(true);
    };

    const handleSelectVersion = (version: 'completo' | 'sencillo') => {
        sessionStorage.setItem('appVersion', version);
        setAppVersion(version);
    };

    const handleLogout = () => {
        sessionStorage.removeItem('isLoggedIn');
        sessionStorage.removeItem('appVersion');
        setIsLoggedIn(false);
        setAppVersion(null);
    };

    const handleSwitchVersion = () => {
        sessionStorage.removeItem('appVersion');
        setAppVersion(null);
    };

    const toggleTheme = () => {
        setTheme(prev => prev === 'light' ? 'dark' : 'light');
    };

    // --- Render Logic ---
    if (supabaseError) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-background p-4 text-destructive-foreground">
                <div className="max-w-md text-center p-6 bg-destructive/10 rounded-lg">
                    <h1 className="text-2xl font-bold mb-4">Error de Configuración</h1>
                    <p>{supabaseError}</p>
                </div>
            </div>
        );
    }
    
    if (!isLoggedIn) {
        return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
    }

    if (isLoading) {
        return (
             <div className="flex flex-col items-center justify-center min-h-screen bg-background">
                <div className="w-16 h-16 border-8 border-primary border-t-transparent rounded-full animate-spin"></div>
                <p className="mt-4 text-lg font-semibold text-foreground">{loadingMessage}</p>
            </div>
        )
    }

    if (!appVersion) {
        return <VersionSelectionScreen onSelect={handleSelectVersion} />;
    }
    
    const appData = { members, categories, weeklyRecords, currentRecord, formulas, monthlyReports, churchInfo, comisionados };
    const appHandlers = { setMembers, setCategories, setWeeklyRecords, setCurrentRecord, setFormulas, setMonthlyReports, setChurchInfo, setComisionados, setTheme };

    return (
        <WhatsAppApp 
            onLogout={handleLogout} 
            data={appData}
            handlers={appHandlers}
            theme={theme}
            toggleTheme={toggleTheme}
        />
    );
};

export default App;