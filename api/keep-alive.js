import { createClient } from '@supabase/supabase-js';

export default async function handler(request, response) {
  // --- PROYECTO 1: FINANZAS ---
  const supabaseFinanzas = createClient(
    process.env.VITE_SUPABASE_URL, 
    process.env.VITE_SUPABASE_ANON_KEY
  );
  
  // --- PROYECTO 2: ESTADISTICA ---
  // (Asegúrate de agregar estas variables nuevas en Vercel)
  const supabaseEstadistica = createClient(
    process.env.ESTADISTICA_URL, 
    process.env.ESTADISTICA_KEY
  );

  try {
    // Despertar Finanzas
    await supabaseFinanzas.from('categories').select('id').limit(1);
    
    // Despertar Estadistica (cambia 'tu_tabla_estadistica' por una real)
    await supabaseEstadistica.from('registro_censo').select('id').limit(1);

    return response.status(200).json({ message: 'Ambas bases de datos despertadas' });
  } catch (error) {
    return response.status(500).json({ error: error.message });
  }
}