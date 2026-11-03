import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Pressable, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../lib/auth';
import { useTheme } from '../lib/theme-context';
import { api, type User, ApiError } from '../lib/api';
import { Button } from '../components/Button';
import { radius, space } from '../theme';
import { t, type Lang } from '../lib/i18n';

type Screen = 'login' | 'register' | 'verify' | 'forgot' | 'reset';

export default function AuthScreen() {
  const { user, ready, signIn } = useAuth();
  const { theme } = useTheme();
  const router = useRouter();
  const lang: Lang = 'fr';

  const [screen, setScreen] = useState<Screen>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  React.useEffect(() => {
    if (ready && user) router.replace('/chat-list');
  }, [ready, user, router]);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await fn();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t(lang, 'errorGeneric'));
    } finally {
      setBusy(false);
    }
  };

  const doLogin = () =>
    run(async () => {
      const d = await api<{ token: string; user: User }>('login', { email, password });
      await signIn(d.token, d.user);
      router.replace('/chat-list');
    });

  const doRegister = () =>
    run(async () => {
      await api('register', { email, password, display_name: displayName });

      setNotice(t(lang, 'sent'));
      setScreen('verify');
    });

  const doVerify = () =>
    run(async () => {
      await api('verify_email', { email, code });
      const d = await api<{ token: string; user: User }>('login', { email, password });
      await signIn(d.token, d.user);
      router.replace('/chat-list');
    });

  const doForgot = () =>
    run(async () => {
      await api('forgot_password', { email });
      setNotice(t(lang, 'sent'));
      setScreen('reset');
    });

  const doReset = () =>
    run(async () => {
      await api('reset_password', { email, code, new_password: newPassword });
      setNotice(t(lang, 'sent'));
      setScreen('login');
    });

  const inputStyle = [
    styles.input,
    { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.text },
  ];

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: theme.bg }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <Text style={[styles.brand, { color: theme.text }]}>Movibot</Text>
          <Text style={[styles.tagline, { color: theme.textSecondary }]}>
            {screen === 'verify' ? t(lang, 'verifyTitle') : t(lang, 'appName')}
          </Text>

          {screen === 'login' && (
            <>
              <TextInput
                style={inputStyle}
                placeholder={t(lang, 'email')}
                placeholderTextColor={theme.inputPlaceholder}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />
              <TextInput
                style={inputStyle}
                placeholder={t(lang, 'password')}
                placeholderTextColor={theme.inputPlaceholder}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
              <Button title={t(lang, 'login')} onPress={doLogin} loading={busy} fullWidth />
              <Pressable onPress={() => setScreen('forgot')}>
                <Text style={[styles.link, { color: theme.accent }]}>{t(lang, 'forgot')}</Text>
              </Pressable>
              <Pressable onPress={() => setScreen('register')}>
                <Text style={[styles.link, { color: theme.textSecondary }]}>{t(lang, 'noAccount')}</Text>
              </Pressable>
            </>
          )}

          {screen === 'register' && (
            <>
              <TextInput
                style={inputStyle}
                placeholder={t(lang, 'displayName')}
                placeholderTextColor={theme.inputPlaceholder}
                value={displayName}
                onChangeText={setDisplayName}
              />
              <TextInput
                style={inputStyle}
                placeholder={t(lang, 'email')}
                placeholderTextColor={theme.inputPlaceholder}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />
              <TextInput
                style={inputStyle}
                placeholder={t(lang, 'password')}
                placeholderTextColor={theme.inputPlaceholder}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
              <Button title={t(lang, 'register')} onPress={doRegister} loading={busy} fullWidth />
              <Pressable onPress={() => setScreen('login')}>
                <Text style={[styles.link, { color: theme.textSecondary }]}>{t(lang, 'haveAccount')}</Text>
              </Pressable>
            </>
          )}

          {screen === 'verify' && (
            <>
              <Text style={[styles.hint, { color: theme.textSecondary }]}>{t(lang, 'verifyHint')}</Text>
              <TextInput
                style={[inputStyle, styles.codeInput]}
                placeholder="000000"
                placeholderTextColor={theme.inputPlaceholder}
                value={code}
                onChangeText={setCode}
                keyboardType="number-pad"
                maxLength={6}
              />
              <Button title={t(lang, 'verify')} onPress={doVerify} loading={busy} fullWidth />
            </>
          )}

          {screen === 'forgot' && (
            <>
              <TextInput
                style={inputStyle}
                placeholder={t(lang, 'email')}
                placeholderTextColor={theme.inputPlaceholder}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />
              <Button title={t(lang, 'reset')} onPress={doForgot} loading={busy} fullWidth />
              <Pressable onPress={() => setScreen('login')}>
                <Text style={[styles.link, { color: theme.textSecondary }]}>{t(lang, 'cancel')}</Text>
              </Pressable>
            </>
          )}

          {screen === 'reset' && (
            <>
              <Text style={[styles.hint, { color: theme.textSecondary }]}>{t(lang, 'resetHint')}</Text>
              <TextInput
                style={inputStyle}
                placeholder={t(lang, 'code')}
                placeholderTextColor={theme.inputPlaceholder}
                value={code}
                onChangeText={setCode}
                keyboardType="number-pad"
                maxLength={6}
              />
              <TextInput
                style={inputStyle}
                placeholder={t(lang, 'newPassword')}
                placeholderTextColor={theme.inputPlaceholder}
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry
              />
              <Button title={t(lang, 'reset')} onPress={doReset} loading={busy} fullWidth />
            </>
          )}

          {notice ? <Text style={[styles.notice, { color: theme.success }]}>{notice}</Text> : null}
          {error ? <Text style={[styles.error, { color: theme.error }]}>{error}</Text> : null}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: space.xl },
  card: { width: '100%', maxWidth: 440, alignSelf: 'center', gap: space.md },
  brand: { fontSize: 34, fontWeight: '600', textAlign: 'center', letterSpacing: 1 },
  tagline: { fontSize: 14, textAlign: 'center', marginBottom: space.lg, letterSpacing: 2, textTransform: 'uppercase' },
  input: {
    height: 52,
    borderRadius: radius.field,
    borderWidth: 1,
    paddingHorizontal: space.lg,
    fontSize: 16,
  },
  codeInput: { textAlign: 'center', letterSpacing: 8, fontSize: 22 },
  link: { textAlign: 'center', fontSize: 14, paddingVertical: space.sm },
  hint: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  notice: { textAlign: 'center', fontSize: 14 },
  error: { textAlign: 'center', fontSize: 14 },
});
