import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useAuth, type DetailLevel } from '../lib/auth';
import { useTheme } from '../lib/theme-context';
import { api } from '../lib/api';
import { radius, space } from '../theme';
import type { ThemeMode } from '../theme';
import { t, type Lang } from '../lib/i18n';

export default function SettingsScreen() {
  const { user, signOut, setDetailLevel } = useAuth();
  const { theme, mode, setMode } = useTheme();
  const router = useRouter();
  const lang: Lang = 'fr';
  const [todayTokens, setTodayTokens] = useState(0);
  const [dailyLimit, setDailyLimit] = useState(2000);

  useEffect(() => {
    api<{ todayTokens: number; dailyLimit: number }>('usage_mine')
      .then((d) => {
        setTodayTokens(d.todayTokens || 0);
        setDailyLimit(d.dailyLimit || 2000);
      })
      .catch(() => {});
  }, []);

  const remaining = Math.max(0, dailyLimit - todayTokens);

  const themeOptions: { key: ThemeMode; label: string }[] = [
    { key: 'light', label: t(lang, 'themeLight') },
    { key: 'dark', label: t(lang, 'themeDark') },
    { key: 'auto', label: t(lang, 'themeAuto') },
  ];

  const detailOptions: { key: DetailLevel; label: string }[] = [
    { key: 'concise', label: t(lang, 'concise') },
    { key: 'balanced', label: t(lang, 'balanced') },
    { key: 'detailed', label: t(lang, 'detailed') },
  ];

  const changeDetail = async (level: DetailLevel) => {
    setDetailLevel(level);
    try {
      await api('update_profile', { detail_level: level });
    } catch {
      // ignore
    }
  };

  const cardStyle = [styles.card, { backgroundColor: theme.surface, borderColor: theme.border }];
  const sectionStyle = [styles.sectionTitle, { color: theme.text }];

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.bg }} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} accessibilityLabel="Retour">
          <Feather name="chevron-left" size={24} color={theme.text} />
        </Pressable>
        <Text style={[styles.title, { color: theme.text }]}>{t(lang, 'settings')}</Text>
        <View style={{ width: 24 }} />
      </View>

      <Text style={sectionStyle}>{t(lang, 'tokensRemaining')}</Text>
      <View style={cardStyle}>
        <View style={styles.row}>
          <Text style={{ color: theme.text, fontSize: 15 }}>{t(lang, 'tokensRemaining')}</Text>
          <Text style={{ color: theme.accent, fontSize: 15, fontWeight: '700' }}>
            {remaining} / {dailyLimit}
          </Text>
        </View>
      </View>

      <Text style={sectionStyle}>{t(lang, 'theme')}</Text>
      <View style={styles.themeRow}>
        {themeOptions.map((o) => (
          <Pressable
            key={o.key}
            onPress={() => setMode(o.key)}
            style={[
              styles.themeCard,
              {
                borderColor: mode === o.key ? theme.accent : theme.border,
                borderWidth: mode === o.key ? 2 : 1,
                backgroundColor: theme.surface,
              },
            ]}
          >
            <View
              style={[
                styles.themePreview,
                { backgroundColor: o.key === 'dark' ? '#0E0F12' : o.key === 'light' ? '#FAF7F2' : theme.surfaceSecondary },
              ]}
            >
              <View style={[styles.themePreviewBar, { backgroundColor: o.key === 'dark' ? '#D4B483' : '#8A6A3B' }]} />
            </View>
            <Text style={{ color: theme.text, fontSize: 13 }}>{o.label}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={sectionStyle}>{t(lang, 'detailLevel')}</Text>
      <View style={cardStyle}>
        {detailOptions.map((o, i) => (
          <Pressable
            key={o.key}
            onPress={() => changeDetail(o.key)}
            style={[styles.row, i > 0 && { borderTopWidth: 1, borderTopColor: theme.border }]}
          >
            <Text style={{ color: theme.text, fontSize: 15 }}>{o.label}</Text>
            {user?.detail_level === o.key && <Feather name="check" size={18} color={theme.accent} />}
          </Pressable>
        ))}
      </View>

      <Text style={sectionStyle}>Compte</Text>
      <View style={cardStyle}>
        <View style={styles.row}>
          <Text style={{ color: theme.textSecondary }}>{user?.email}</Text>
        </View>
      </View>

      <Pressable
        onPress={signOut}
        style={({ pressed }) => [
          styles.signOut,
          { borderColor: theme.error, opacity: pressed ? 0.9 : 1 },
        ]}
      >
        <Feather name="log-out" size={18} color={theme.error} />
        <Text style={{ color: theme.error, fontWeight: '600' }}>{t(lang, 'signOut')}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.lg, maxWidth: 640, width: '100%', alignSelf: 'center', paddingBottom: space.giant },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: space.xxl,
    paddingBottom: space.md,
  },
  title: { fontSize: 24, fontWeight: '600' },
  sectionTitle: { fontSize: 20, fontWeight: '600', marginTop: space.xl, marginBottom: space.md },
  themeRow: { flexDirection: 'row', gap: space.md },
  themeCard: {
    flex: 1,
    borderRadius: radius.card,
    padding: space.md,
    alignItems: 'center',
    gap: space.sm,
  },
  themePreview: { width: '100%', height: 60, borderRadius: radius.field, justifyContent: 'flex-end', overflow: 'hidden' },
  themePreviewBar: { height: 8, width: '60%', margin: space.sm, borderRadius: 4 },
  card: { borderRadius: radius.card, borderWidth: 1, paddingHorizontal: space.lg },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: space.md,
  },
  signOut: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    marginTop: space.xxl,
    height: 50,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
});
