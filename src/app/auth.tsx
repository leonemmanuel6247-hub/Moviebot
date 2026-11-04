import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Pressable, ScrollView, KeyboardAvoidingView, Platform, Image, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../lib/auth';
import { useTheme } from '../lib/theme-context';
import { api, type User, ApiError } from '../lib/api';
import { Button } from '../components/Button';
import { Feather } from '@expo/vector-icons';
import { radius, space } from '../theme';
import { t, type Lang } from '../lib/i18n';

type Screen = 'login' | 'register' | 'verify' | 'forgot' | 'reset';

export default function AuthScreen() {
  const { user, ready, signIn } = useAuth();
  const { theme } = useTheme();
  const router = useRouter();
  const wide = useWindowDimensions().width >= 850;
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
        <View style={[styles.frame, !wide && {flexDirection:'column',maxWidth:500}, {backgroundColor:theme.surface,borderColor:theme.border}]}>
          {wide && <View style={styles.story}><View style={styles.storyBadge}><Feather name="film" size={15} color="#fff"/><Text style={styles.badgeText}>VOTRE ASSISTANT CINÉMA</Text></View><Text style={styles.storyTitle}>Les belles histoires commencent ici.</Text><Text style={styles.storyText}>Découvrez votre prochain film, retrouvez vos conversations et laissez Movibot vous guider.</Text><View style={styles.storyFoot}><Feather name="star" size={16} color="#CBDEFF"/><Text style={styles.storyFootText}>Une expérience à votre image.</Text></View></View>}
        <View style={styles.card}>
          <View style={styles.brandRow}><Image source={require('../../assets/movibot-mark.png')} style={styles.logo}/><View><Text style={[styles.brand, { color: theme.text }]}>Movibot</Text><Text style={[styles.tagline, { color: theme.textSecondary }]}>VOTRE ASSISTANT CINÉMA</Text></View></View>
          <Text style={[styles.title,{color:theme.text}]}>{screen==='login'?'Heureux de vous revoir':screen==='register'?'Créez votre compte':screen==='verify'?'Vérifiez votre adresse':screen==='forgot'?'Mot de passe oublié ?':'Nouveau mot de passe'}</Text>
          <Text style={[styles.subtitle,{color:theme.textSecondary}]}>{screen==='login'?'Connectez-vous pour retrouver votre univers cinéma.':screen==='register'?'Quelques instants suffisent pour commencer.':screen==='verify'?'Saisissez le code reçu par e-mail.':screen==='forgot'?'Nous vous enverrons un code de réinitialisation.':'Choisissez un nouveau mot de passe sécurisé.'}</Text>

          {screen === 'login' && (
            <>
              <TextInput
                style={inputStyle}
                accessibilityLabel="Adresse e-mail" autoComplete="email"
                placeholder={t(lang, 'email')}
                placeholderTextColor={theme.inputPlaceholder}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />
              <TextInput
                style={inputStyle}
                accessibilityLabel="Mot de passe" autoComplete="current-password"
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
                accessibilityLabel="Adresse e-mail" autoComplete="email"
                placeholder={t(lang, 'email')}
                placeholderTextColor={theme.inputPlaceholder}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />
              <TextInput
                style={inputStyle}
                accessibilityLabel="Mot de passe" autoComplete="new-password"
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
                accessibilityLabel="Adresse e-mail" autoComplete="email"
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
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: space.xl },
  frame:{width:'100%',maxWidth:980,alignSelf:'center',flexDirection:'row',borderWidth:1,borderRadius:24,overflow:'hidden',shadowColor:'#234578',shadowOpacity:.10,shadowRadius:28,shadowOffset:{width:0,height:12},elevation:3},
  story:{width:'44%',minHeight:580,backgroundColor:'#245BCC',padding:44,justifyContent:'center'},
  storyBadge:{flexDirection:'row',gap:8,alignItems:'center',marginBottom:28},badgeText:{color:'#D8E7FF',fontSize:10,letterSpacing:1,fontFamily:'Manrope_700Bold'},storyTitle:{color:'#fff',fontFamily:'Manrope_700Bold',fontSize:36,lineHeight:46,letterSpacing:-1},storyText:{color:'#D7E5FF',fontSize:15,lineHeight:25,marginTop:18},storyFoot:{flexDirection:'row',gap:9,alignItems:'center',marginTop:65},storyFootText:{color:'#D7E5FF',fontSize:12},
  card: { flex:1, width:'100%',padding:32,justifyContent:'center', gap: space.md },
  brandRow:{flexDirection:'row',alignItems:'center',gap:12,marginBottom:20},logo:{width:48,height:48,borderRadius:14},title:{fontFamily:'Manrope_700Bold',fontSize:25,letterSpacing:-.5},subtitle:{fontFamily:'Manrope_500Medium',fontSize:13,lineHeight:21,marginBottom:15},
  brand: { fontSize: 24, fontFamily:'Manrope_700Bold', letterSpacing:-.7 },
  tagline: { fontSize: 9, fontFamily:'Manrope_700Bold', letterSpacing: 1, marginTop:2 },
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
