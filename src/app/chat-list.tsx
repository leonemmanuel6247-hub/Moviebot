import React, { useCallback, useState } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet, TextInput, RefreshControl } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '../lib/auth';
import { useTheme } from '../lib/theme-context';
import { api, ApiError, type Conversation } from '../lib/api';
import { radius, space } from '../theme';
import { t, type Lang } from '../lib/i18n';

function groupLabel(iso: string, lang: Lang): string {
  const d = new Date(iso).getTime();
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  if (now - d < day) return t(lang, 'today');
  if (now - d < 2 * day) return t(lang, 'yesterday');
  if (now - d < 7 * day) return t(lang, 'thisWeek');
  return t(lang, 'older');
}

export default function ChatListScreen() {
  const { user, signOut } = useAuth();
  const { theme } = useTheme();
  const router = useRouter();
  const lang: Lang = 'fr';
  const [convos, setConvos] = useState<Conversation[]>([]);
  const [query, setQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const d = await api<{ conversations: Conversation[] }>('list_conversations');
      setConvos(d.conversations || []);
      setError('');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : String(e));
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const createConversation = async () => {
    try {
      setError('');
      const d = await api<{ conversation: Conversation }>('create_conversation');
      router.push(`/chat/${d.conversation.conv_id}`);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : String(e));
    }
  };

  const filtered = convos.filter((c) => (c.title || '').toLowerCase().includes(query.toLowerCase()));

  const renderItem = ({ item, index }: { item: Conversation; index: number }) => {
    const label = groupLabel(item.updated_at || item.created_at, lang);
    const prevLabel = index > 0 ? groupLabel(filtered[index - 1].updated_at || filtered[index - 1].created_at, lang) : '';
    return (
      <View>
        {label !== prevLabel && (
          <Text style={[styles.groupLabel, { color: theme.textMuted }]}>{label}</Text>
        )}
        <Pressable
          onPress={() => router.push(`/chat/${item.conv_id}`)}
          style={({ pressed }) => [
            styles.item,
            { borderColor: theme.border, backgroundColor: pressed ? theme.surfaceSecondary : 'transparent' },
          ]}
        >
          <Text style={[styles.itemTitle, { color: theme.text }]} numberOfLines={1}>
            {item.title || 'Nouvelle conversation'}
          </Text>
        </Pressable>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>{t(lang, 'appName')}</Text>
        <Pressable onPress={() => router.push('/settings')} accessibilityLabel={t(lang, 'settings')}>
          <Feather name="settings" size={22} color={theme.textSecondary} />
        </Pressable>
      </View>

      <Pressable
        onPress={createConversation}
        style={({ pressed }) => [styles.newBtn, { backgroundColor: theme.accent, opacity: pressed ? 0.92 : 1 }]}
      >
        <Feather name="plus" size={18} color="#FFFFFF" />
        <Text style={styles.newBtnText}>{t(lang, 'newConversation')}</Text>
      </Pressable>

      {error ? (
        <View style={[styles.errorBox, { borderColor: theme.error, backgroundColor: theme.surface }]}>
          <Text style={{ color: theme.error, fontSize: 13 }}>{error}</Text>
        </View>
      ) : null}

      <View style={[styles.searchBox, { borderColor: theme.border, backgroundColor: theme.surface }]}>
        <Feather name="search" size={16} color={theme.textMuted} />
        <TextInput
          style={[styles.searchInput, { color: theme.text }]}
          placeholder={t(lang, 'search')}
          placeholderTextColor={theme.inputPlaceholder}
          value={query}
          onChangeText={setQuery}
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(c) => c.conv_id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              await load();
              setRefreshing(false);
            }}
          />
        }
        ListEmptyComponent={
          <Text style={[styles.empty, { color: theme.textMuted }]}>{t(lang, 'emptyList')}</Text>
        }
      />

      <View style={[styles.footer, { borderColor: theme.border }]}>
        <Text style={[styles.footerName, { color: theme.text }]}>{user?.display_name || ''}</Text>
        <Pressable onPress={signOut} accessibilityLabel={t(lang, 'signOut')}>
          <Feather name="log-out" size={20} color={theme.textSecondary} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, maxWidth: 720, width: '100%', alignSelf: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.lg,
    paddingTop: space.xxl,
    paddingBottom: space.md,
  },
  title: { fontSize: 28, fontWeight: '600', letterSpacing: 0.5 },
  newBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    marginHorizontal: space.lg,
    height: 48,
    borderRadius: radius.pill,
  },
  newBtnText: { color: '#FFFFFF', fontWeight: '600', fontSize: 15 },
  errorBox: {
    marginHorizontal: space.lg,
    marginTop: space.md,
    padding: space.md,
    borderRadius: radius.field,
    borderWidth: 1,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    marginHorizontal: space.lg,
    marginTop: space.md,
    height: 44,
    borderRadius: radius.field,
    borderWidth: 1,
    paddingHorizontal: space.md,
  },
  searchInput: { flex: 1, fontSize: 15 },
  list: { padding: space.lg, paddingBottom: space.giant },
  groupLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginTop: space.lg,
    marginBottom: space.sm,
  },
  item: { paddingVertical: space.md, borderBottomWidth: 1 },
  itemTitle: { fontSize: 16 },
  empty: { textAlign: 'center', marginTop: space.xxl },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    borderTopWidth: 1,
  },
  footerName: { fontSize: 15, fontWeight: '500' },
});
