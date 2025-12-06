import { db } from '~/utils/supabase';
import { Alert } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';
import * as QueryParams from 'expo-auth-session/build/QueryParams';

export const signUp = async (email: string, password: string, username: string) => {
  const { data, error } = await db.public.auth.signUp({ email, password });
  console.log('Signup Response:', data, error);

  if (error) {
    console.log(error);
    Alert.alert('Fehler', 'Registrierung fehlgeschlagen: ' + error.message);
    return null;
  }

  const user = data.user;

  // 🔐 Ensure user exists before proceeding
  if (!user) {
    Alert.alert('Fehler', 'Benutzer wurde nicht korrekt erstellt.');
    return null;
  }

  // ✅ Update the username if it's not set yet
  const { error: updateError } = await db.user.from('Users').upsert([{ id: user.id, username }]);

  if (updateError) {
    console.log(updateError);
    Alert.alert('Fehler', 'Benutzername konnte nicht aktualisiert werden: ' + updateError.message);
    return null;
  }

  return user;
};

export const signIn = async (email: string, password: string) => {
  const { data, error } = await db.public.auth.signInWithPassword({ email, password });

  if (error) {
    console.log(error);
    Alert.alert('Fehler', 'Einloggen fehlgeschlagen: ' + error.message);
    return null;
  }

  return data.user;
};

export const signOut = async () => {
  const { error } = await db.public.auth.signOut();
  if (error) {
    console.error('Abmeldung fehlgeschlagen:', error.message);
  }
};

export const LoginViaGoogle = async () => {
  const redirectTo = makeRedirectUri({
    scheme: 'plantup',
    path: 'auth/reset-password',
    isTripleSlashed: false,
  });
  const { data, error } = await db.public.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      skipBrowserRedirect: true,
    },
  });

  if (error) {
    console.error('OAuth error:', error.message);
    return;
  }

  const res = await WebBrowser.openAuthSessionAsync(data?.url ?? '', redirectTo);

  if (res.type === 'success' && res.url) {
    const { params } = QueryParams.getQueryParams(res.url);
    const { access_token, refresh_token } = params;

    if (access_token && refresh_token) {
      const { error: sessionError } = await db.public.auth.setSession({
        access_token,
        refresh_token,
      });

      if (sessionError) {
        console.error('Session error:', sessionError.message);
      } else {
        console.log('Logged in successfully with Google');
      }
    }
  } else {
    console.warn('Login canceled or failed');
  }

  const {
    data: { user },
  } = await db.public.auth.getUser();

  return user;
};
export const ForgotPassword = async (email: string) => {
  const redirectTo = makeRedirectUri({
    scheme: 'plantup', // match your app scheme (lowercase!)
    path: 'auth/login',
    isTripleSlashed: false,
  });
  console.log(redirectTo);
  const { data, error } = await db.public.auth.resetPasswordForEmail(email, {
    redirectTo: redirectTo,
  });

  if (error) {
    console.error('Forgot password error:', error.message);
    return { success: false, message: error.message };
  }

  return { success: true, message: 'Password reset email sent.' };
};

export const checkSession = async () => {
  const {
    data: { session },
  } = await db.public.auth.getSession();

  return session?.user;
};
