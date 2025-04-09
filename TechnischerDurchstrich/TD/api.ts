import { supabase } from './supabase';


export const fetchUsers = async () => {
  const { data, error } = await supabase.from('users').select('*');
  if (error) {
    console.error('Fehler beim Abrufen der Benutzer:', error.message);
  }
  return data;
};


export const updateUsername = async (user_id: string, newUsername: string) => {
  const { error } = await supabase
    .from('users')
    .update({ username: newUsername })
    .eq('user_id', user_id);

  if (error) {
    console.error('Fehler beim Aktualisieren des Benutzernamens:', error.message);
  }
};
