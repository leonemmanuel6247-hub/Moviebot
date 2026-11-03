import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import { useAuth } from '../../lib/auth';
import { useTheme } from '../../lib/theme-context';
import { api, ApiError, type Conversation, type Message } from '../../lib/api';
import { MessageBubble } from '../../components/MessageBubble';
import { ThinkingBrain } from '../../components/ThinkingBrain';
import { ConversationList, SidePanel, useIsWide } from '../../components/ConversationMenu';
import { radius, space } from '../../theme';
import { t, type Lang } from '../../lib/i18n';

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { theme } = useTheme();
  const lang: Lang = 'fr';

  const [conv, setConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [toast, setToast] = useState('');
  const isWide = useIsWide();
  const stopRef = useRef(false);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 1800);
  }, []);

  const load = useCallback(async () => {
    try {
      const d = await api<{ conversation: Conversation; messages: Message[] }>('list_messages', { conv_id: id });
      setConv(d.conversation);
      setMessages(d.messages || []);
    } catch {
      // ignore
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const send = useCallback(
    async (content?: string) => {
      const msg = (content ?? text).trim();
      if (!msg || busy) return;
      setText('');
      setBusy(true);
      stopRef.current = false;
      const optimistic: Message = {
        msg_id: 'tmp',
        conv_id: id,
        role: 'user',
        content: msg,
        tokens_est: 0,
        provider: '',
        model: '',
        created_at: new Date().toISOString(),
      };
      setMessages((m) => [...m, optimistic]);
      try {
        const d = await api<{ conversation: Conversation; user_message: Message; assistant_message: Message }>(
          'send_message',
          { conv_id: id, content: msg },
        );
        if (stopRef.current) return;
        setConv(d.conversation);
        setMessages((m) => m.filter((x) => x.msg_id !== 'tmp').concat([d.user_message, d.assistant_message]));
      } catch (e) {
        setMessages((m) =>
          m
            .filter((x) => x.msg_id !== 'tmp')
            .concat([
              {
                msg_id: 'err',
                conv_id: id,
                role: 'assistant',
                content: `**${t(lang, 'sendFailed')}** : ${e instanceof ApiError ? e.message : ''}`,
                tokens_est: 0,
                provider: '',
                model: '',
                created_at: new Date().toISOString(),
              },
            ]),
        );
      } finally {
        setBusy(false);
      }
    },
    [text, busy, id, lang],
  );

  const suggestions = [
    { key: 'improve', label: t(lang, 'improve') },
    { key: 'example', label: t(lang, 'example') },
    { key: 'elaborate', label: t(lang, 'elaborate') },
    { key: 'summarize', label: t(lang, 'summarize') },
  ];

  const lastAssistant = [...messages].reverse().find((m) => m.role === 'assistant');

  return (
    <View style={[styles.root, { backgroundColor: theme.bg }]}>
      {isWide && (
        <View style={styles.sidePanelWide}>
          <ConversationList activeId={id} lang={lang} />
        </View>
      )}
      <KeyboardAvoidingView
        style={[styles.flex, { backgroundColor: theme.threadBg }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Barre supérieure */}
        <View style={[styles.topbar, { borderColor: theme.border, backgroundColor: theme.topbar }]}>
          {isWide ? (
            <View style={{ width: 4 }} />
          ) : (
            <Pressable onPress={() => setMenuOpen(true)} accessibilityLabel="Menu">
              <Feather name="menu" size={22} color={theme.text} />
            </Pressable>
          )}
          <Text style={[styles.topTitle, { color: theme.text }]} numberOfLines={1}>
            {conv?.title || ''}
          </Text>
          <View style={{ width: 22 }} />
        </View>

      {/* Fil de messages */}
      {messages.length === 0 ? (
        <View style={styles.empty}>
          <Text style={[styles.greeting, { color: theme.text }]}>
            {t(lang, 'greeting')} {user?.display_name?.split(' ')[0] || ''}
          </Text>
          <Text style={[styles.greetingSub, { color: theme.textSecondary }]}>{t(lang, 'greetingSub')}</Text>
        </View>
      ) : (
        <FlatList
          data={messages}
          keyExtractor={(m, i) => m.msg_id + i}
          renderItem={({ item, index }) => (
            <MessageBubble
              message={item}
              lang={lang}
              userName={user?.display_name || 'Vous'}
              isLast={index === messages.length - 1}
              onRegenerate={() => {
                const lastUser = [...messages].reverse().find((m) => m.role === 'user');
                if (lastUser) send(lastUser.content);
              }}
              onSpeak={(txt) => Speech.speak(txt, { language: lang === 'fr' ? 'fr-FR' : 'en-US' })}
              onCopied={showToast}
            />
          )}
          contentContainerStyle={styles.listContent}
          onContentSizeChange={() => {}}
        />
      )}

      {busy && <ThinkingBrain label={t(lang, 'thinking')} />}

      {/* Zone de saisie */}
      <View style={[styles.composer, { borderColor: theme.border, backgroundColor: theme.surface }]}>
        {lastAssistant && !busy && (
          <View style={styles.suggestions}>
            {suggestions.map((s) => (
              <Pressable
                key={s.key}
                onPress={() => send(s.label)}
                style={({ pressed }) => [
                  styles.suggestion,
                  {
                    borderColor: theme.border,
                    backgroundColor: pressed ? theme.accentSoft : 'transparent',
                  },
                ]}
              >
                <Text style={{ color: theme.textSecondary, fontSize: 13 }}>{s.label}</Text>
              </Pressable>
            ))}
          </View>
        )}
        <View style={styles.composerRow}>
          <TextInput
            style={[styles.input, { color: theme.text, backgroundColor: theme.inputBg, borderColor: theme.inputBorder, borderWidth: 1 }]}
            placeholder={t(lang, 'placeholder')}
            placeholderTextColor={theme.inputPlaceholder}
            value={text}
            onChangeText={setText}
            multiline
          />
          {busy ? (
            <Pressable
              onPress={() => {
                stopRef.current = true;
                setBusy(false);
              }}
              style={[styles.sendBtn, { backgroundColor: theme.text }]}
              accessibilityLabel={t(lang, 'stop')}
            >
              <Feather name="square" size={18} color={theme.bg} />
            </Pressable>
          ) : (
            <Pressable
              onPress={() => send()}
              disabled={!text.trim()}
              style={[styles.sendBtn, { backgroundColor: !text.trim() ? theme.border : theme.accent }]}
              accessibilityLabel={t(lang, 'send')}
            >
              <Feather name="arrow-up" size={18} color={!text.trim() ? theme.textMuted : theme.sendIcon} />
            </Pressable>
          )}
        </View>
      </View>

      {toast ? (
        <View style={[styles.toast, { backgroundColor: theme.text }]} pointerEvents="none">
          <Feather name="check" size={16} color={theme.bg} />
          <Text style={{ color: theme.bg, fontSize: 13, fontWeight: '600' }}>{toast}</Text>
        </View>
      ) : null}
      </KeyboardAvoidingView>
      <SidePanel visible={menuOpen} onClose={() => setMenuOpen(false)} activeId={id} lang={lang} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, flexDirection: 'row' },
  sidePanelWide: { width: 300, height: '100%' },
  flex: { flex: 1 },
  topbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: space.md,
    paddingTop: space.xxl,
    paddingBottom: space.md,
    borderBottomWidth: 1,
  },
  topTitle: { flex: 1, fontSize: 15, fontWeight: '600' },
  listContent: { paddingVertical: space.xl },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.xl },
  greeting: { fontSize: 32, fontWeight: '600', textAlign: 'center', marginBottom: space.sm },
  greetingSub: { fontSize: 16, textAlign: 'center' },
  toast: {
    position: 'absolute',
    bottom: 100,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    borderRadius: radius.pill,
    opacity: 0.95,
  },
  composer: {
    borderTopWidth: 1,
    paddingHorizontal: space.md,
    paddingTop: space.sm,
    paddingBottom: space.lg,
  },
  suggestions: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginBottom: space.sm },
  suggestion: { borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: space.md, height: 32, justifyContent: 'center' },
  composerRow: { flexDirection: 'row', alignItems: 'flex-end', gap: space.sm },
  input: {
    flex: 1,
    minHeight: 48,
    maxHeight: 168,
    borderRadius: radius.sheet,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    fontSize: 16,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
