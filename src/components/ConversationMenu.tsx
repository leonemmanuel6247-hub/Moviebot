import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Modal,
  FlatList,
  useWindowDimensions,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../lib/theme-context';
import { useAuth } from '../lib/auth';
import { api, type Conversation } from '../lib/api';
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

export function ConversationList({
  activeId,
  onNavigate,
  lang,
}: {
  activeId?: string;
  onNavigate?: () => void;
  lang: Lang;
}) {
  const { theme } = useTheme();
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [convos, setConvos] = useState<Conversation[]>([]);
  const [pendingDelete, setPendingDelete] = useState<Conversation | null>(null);

  const load = useCallback(async () => {
    try {
      const d = await api<{ conversations: Conversation[] }>('list_conversations');
      setConvos(d.conversations || []);
    } catch {
      // ignore
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const createConversation = async () => {
    try {
      const d = await api<{ conversation: Conversation }>('create_conversation');
      onNavigate?.();
      router.push(`/chat/${d.conversation.conv_id}`);
    } catch {
      // ignore
    }
  };

  const open = (id: string) => {
    onNavigate?.();
    router.push(`/chat/${id}`);
  };

  const doDelete = async () => {
    const target = pendingDelete;
    if (!target) return;
    setPendingDelete(null);
    setConvos((list) => list.filter((c) => c.conv_id !== target.conv_id));
    try {
      await api('delete_conversation', { conv_id: target.conv_id });
    } catch {
      // recharge en cas d'échec
      load();
    }
  };

  const renderItem = ({ item, index }: { item: Conversation; index: number }) => {
    const label = groupLabel(item.updated_at || item.created_at, lang);
    const prevLabel =
      index > 0 ? groupLabel(convos[index - 1].updated_at || convos[index - 1].created_at, lang) : '';
    const active = item.conv_id === activeId;
    return (
      <View>
        {label !== prevLabel && <Text style={[styles.group, { color: theme.textMuted }]}>{label}</Text>}
        <View style={styles.itemRow}>
          <Pressable
            onPress={() => open(item.conv_id)}
            style={({ pressed }) => [
              styles.item,
              styles.itemFlex,
              {
                backgroundColor: active ? theme.accentSoft : pressed ? theme.surfaceSecondary : 'transparent',
                borderLeftWidth: active ? 2 : 0,
                borderLeftColor: theme.accent,
              },
            ]}
          >
            <Text style={[styles.itemTitle, { color: theme.text }]} numberOfLines={1}>
              {item.title || 'Nouvelle conversation'}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setPendingDelete(item)}
            accessibilityLabel={t(lang, 'delete')}
            style={({ pressed }) => [styles.trash, { opacity: pressed ? 0.6 : 1 }]}
          >
            <Feather name="trash-2" size={16} color={theme.textMuted} />
          </Pressable>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.panel, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <Pressable
        onPress={createConversation}
        style={({ pressed }) => [styles.newBtn, { backgroundColor: theme.accent, opacity: pressed ? 0.92 : 1 }]}
      >
        <Feather name="plus" size={18} color="#FFFFFF" />
        <Text style={styles.newBtnText}>{t(lang, 'newConversation')}</Text>
      </Pressable>

      <FlatList
        data={convos}
        keyExtractor={(c) => c.conv_id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={[styles.empty, { color: theme.textMuted }]}>{t(lang, 'emptyList')}</Text>}
      />

      <View style={[styles.footer, { borderColor: theme.border }]}>
        <Pressable style={styles.footerLeft} onPress={() => router.push('/settings')}>
          <View style={[styles.avatar, { backgroundColor: theme.avatarUserGrad[0] }]}>
            <Text style={{ color: theme.avatarUserText, fontSize: 12, fontWeight: '700' }}>
              {(user?.display_name || 'M').slice(0, 2).toUpperCase()}
            </Text>
          </View>
          <Text style={[styles.footerName, { color: theme.text }]} numberOfLines={1}>
            {user?.display_name || ''}
          </Text>
        </Pressable>
        <Pressable onPress={signOut} accessibilityLabel={t(lang, 'signOut')}>
          <Feather name="log-out" size={20} color={theme.textSecondary} />
        </Pressable>
      </View>

      <Modal
        visible={!!pendingDelete}
        transparent
        animationType="fade"
        onRequestClose={() => setPendingDelete(null)}
      >
        <View style={styles.confirmRoot}>
          <View style={[styles.confirmBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.confirmTitle, { color: theme.text }]}>{t(lang, 'deleteConfirmTitle')}</Text>
            <Text style={[styles.confirmText, { color: theme.textSecondary }]} numberOfLines={2}>
              « {pendingDelete?.title || 'Nouvelle conversation'} »
            </Text>
            <View style={styles.confirmActions}>
              <Pressable
                onPress={() => setPendingDelete(null)}
                style={({ pressed }) => [styles.confirmBtn, { borderColor: theme.border, opacity: pressed ? 0.8 : 1 }]}
              >
                <Text style={{ color: theme.text, fontWeight: '600' }}>{t(lang, 'cancel')}</Text>
              </Pressable>
              <Pressable
                onPress={doDelete}
                style={({ pressed }) => [styles.confirmBtn, { backgroundColor: theme.error, borderColor: theme.error, opacity: pressed ? 0.85 : 1 }]}
              >
                <Text style={{ color: '#FFFFFF', fontWeight: '600' }}>{t(lang, 'delete')}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

export function SidePanel({
  visible,
  onClose,
  activeId,
  lang,
}: {
  visible: boolean;
  onClose: () => void;
  activeId?: string;
  lang: Lang;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalRoot}>
        <View style={styles.drawer}>
          <ConversationList activeId={activeId} onNavigate={onClose} lang={lang} />
        </View>
        <Pressable style={styles.backdrop} onPress={onClose} />
      </View>
    </Modal>
  );
}

export function useIsWide(): boolean {
  const { width } = useWindowDimensions();
  return width >= 900;
}

const styles = StyleSheet.create({
  panel: { flex: 1, borderRightWidth: 1, width: '100%' },
  newBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    margin: space.lg,
    height: 48,
    borderRadius: radius.pill,
  },
  newBtnText: { color: '#FFFFFF', fontWeight: '600', fontSize: 15 },
  list: { paddingHorizontal: space.md, paddingBottom: space.giant },
  group: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginTop: space.lg,
    marginBottom: space.sm,
    paddingHorizontal: space.sm,
  },
  item: { paddingVertical: space.md, paddingHorizontal: space.sm, borderRadius: radius.chip },
  itemRow: { flexDirection: 'row', alignItems: 'center' },
  itemFlex: { flex: 1 },
  trash: { padding: space.sm },
  confirmRoot: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.4)', padding: space.xl },
  confirmBox: { width: '100%', maxWidth: 360, borderRadius: radius.card, borderWidth: 1, padding: space.xl, gap: space.md },
  confirmTitle: { fontSize: 18, fontWeight: '600' },
  confirmText: { fontSize: 15 },
  confirmActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: space.md, marginTop: space.sm },
  confirmBtn: { paddingHorizontal: space.lg, height: 42, borderRadius: radius.pill, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  itemTitle: { fontSize: 15 },
  empty: { textAlign: 'center', marginTop: space.xxl },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    borderTopWidth: 1,
  },
  footerLeft: { flexDirection: 'row', alignItems: 'center', gap: space.sm, flexShrink: 1 },
  footerName: { fontSize: 15, fontWeight: '500', maxWidth: 160 },
  avatar: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  modalRoot: { flex: 1, flexDirection: 'row' },
  drawer: { width: 300, maxWidth: '82%', height: '100%' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' },
});
