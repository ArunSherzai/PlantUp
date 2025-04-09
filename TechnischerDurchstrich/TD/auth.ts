import { supabase } from './supabase';
import { Alert } from 'react-native';

export const signUp = async (email: string, password: string, username: string) => {
  const { data, error } = await supabase.auth.signUp({ email, password });
  console.log("Signup Response:", data, error);
  

  if (error) {
    console.log(error)
    Alert.alert("Fehler", "Registrierung fehlgeschlagen: " + error.message)
    return null;
  }

  const user = data.user;

  return user;
};


export const signIn = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    console.log(error)
    Alert.alert("Fehler", "Einloggen fehlgeschlagen: " + error.message)
    return null;
  }

  return data.user;
};


export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error('Abmeldung fehlgeschlagen:', error.message);
  }
};


export const getAllUsers = async () => {
  const { data, error } = await supabase.schema("user_schema")
    .from("Users") // Schema.name der Tabelle angeben
    .select("*");

  if (error) {
    console.error("Fehler beim Abrufen aller Benutzer:", error.message);
    return null;
  }

  return data;
};

