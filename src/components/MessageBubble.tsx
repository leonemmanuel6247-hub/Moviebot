import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../lib/theme-context';
import { radius, space } from '../theme';
import { MarkdownView } from './MarkdownView';
import type { Message } from '../lib/api';
import { t, type Lang } from '../lib/i18n';

interface Props {
  message: Message;
  lang: Lang;
  userName: string;
  isLast: boolean;
  onRegenerate?: () => void;
  onOpenLink?: (url: string) => void;
  onSpeak?: (text: string) => void;
  onCopied?: (message: string) => void;
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .map((p) => p[0] || '')
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function timeOf(iso: string) {
  try {
    const d = new Date(iso);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  } catch {
    return '';
  }
}

export function MessageBubble({
  message,
  lang,
  userName,
  isLast,
  onRegenerate,
  onOpenLink,
  onSpeak,
  onCopied,
}: Props) {
  const { theme } = useTheme();
  const isUser = message.role === 'user';
  const [copied, setCopied] = useState(false);
  const [liked, setLiked] = useState<null | 'up' | 'down'>(null);

  const copy = async () => {
    await Clipboard.setStringAsync(message.content);
    setCopied(true);
    onCopied?.(t(lang, 'textCopied'));
    setTimeout(() => setCopied(false), 1800);
  };

  // Utilisateur (prompt) à l'extrême gauche, Movibot (IA) à l'extrême droite.
  return (
    <View style={[styles.row, isUser ? styles.rowUser : styles.rowAI]}>
      {isUser && (
        <View
          style={[styles.avatar, { backgroundColor: theme.avatarUserGrad[0], marginRight: space.md }]}
        >
          <Text style={[styles.avatarText, { color: theme.avatarUserText }]}>{initials(userName)}</Text>
        </View>
      )}
      {!isUser && (
        <View
          style={[
            styles.avatar,
            styles.avatarAI,
            { backgroundColor: theme.avatarAIBg, borderColor: theme.accent, marginRight: space.md },
          ]}
        >
          <Text style={{ color: theme.avatarAIMono, fontWeight: '600' }}>M</Text>
        </View>
      )}
      <View style={[styles.column, isUser ? styles.columnUser : styles.columnAI]}>
        <Text style={[styles.author, { color: theme.authorLabel }, isUser ? styles.alignLeft : styles.alignRight]}>
          {isUser ? 'Vous' : 'Assistant'}
          {message.created_at ? ` · ${timeOf(message.created_at)}` : ''}
        </Text>
        {isUser ? (
          <View
            style={[
              styles.bubble,
              {
                backgroundColor: theme.bubbleUserBg,
                borderColor: theme.bubbleUserBorder,
                borderWidth: 1,
                alignSelf: 'flex-start',
              },
            ]}
          >
            <Text style={[styles.userText, { color: theme.bubbleUserText }]}>{message.content}</Text>
          </View>
        ) : (
          <View style={[styles.aiBody, { alignSelf: 'flex-end' }]}>
            <MarkdownView text={message.content} onOpenLink={onOpenLink} />
          </View>
        )}

        <View style={[styles.actions, isUser ? styles.alignLeft : styles.alignRight]}>
          <Pressable onPress={copy} accessibilityRole="button" accessibilityLabel={t(lang, 'copy')} style={styles.action}>
            <Feather name={copied ? 'check' : 'copy'} size={18} color={copied ? theme.success : theme.actionIcon} />
          </Pressable>
          {!isUser && isLast && onRegenerate && (
            <Pressable onPress={onRegenerate} accessibilityRole="button" accessibilityLabel={t(lang, 'regenerate')} style={styles.action}>
              <Feather name="refresh-cw" size={18} color={theme.actionIcon} />
            </Pressable>
          )}
          {!isUser && onSpeak && (
            <Pressable onPress={() => onSpeak(message.content)} accessibilityRole="button" accessibilityLabel={t(lang, 'listen')} style={styles.action}>
              <Feather name="volume-2" size={18} color={theme.actionIcon} />
            </Pressable>
          )}
          {!isUser && (
            <>
              <Pressable
                onPress={() => setLiked((v) => (v === 'up' ? null : 'up'))}
                accessibilityRole="button"
                accessibilityLabel={t(lang, 'like')}
                style={styles.action}
              >
                <Feather name="thumbs-up" size={18} color={liked === 'up' ? theme.accent : theme.actionIcon} />
              </Pressable>
              <Pressable
                onPress={() => setLiked((v) => (v === 'down' ? null : 'down'))}
                accessibilityRole="button"
                accessibilityLabel={t(lang, 'dislike')}
                style={styles.action}
              >
                <Feather name="thumbs-down" size={18} color={liked === 'down' ? theme.error : theme.actionIcon} />
              </Pressable>
            </>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    marginBottom: space.xl,
    paddingHorizontal: space.lg,
    maxWidth: 720,
    width: '100%',
    alignSelf: 'center',
  },
  rowUser: { justifyContent: 'flex-start' },
  rowAI: { justifyContent: 'flex-end' },
  column: { flexShrink: 1 },
  columnUser: { alignItems: 'flex-start', maxWidth: '82%' },
  columnAI: { alignItems: 'flex-end', maxWidth: '94%' },
  author: { fontSize: 12, fontWeight: '600', marginBottom: 4, letterSpacing: 0.3 },
  alignLeft: { alignItems: 'flex-start' },
  alignRight: { alignItems: 'flex-end' },
  bubble: {
    borderRadius: radius.card,
    paddingVertical: 14,
    paddingHorizontal: 18,
  },
  // La réponse de l'IA se fond dans le fond du chat (pas de bulle).
  aiBody: { paddingVertical: 2 },
  userText: { fontSize: 16, lineHeight: 26 },
  actions: { flexDirection: 'row', gap: 4, marginTop: 6 },
  action: { padding: 6, borderRadius: radius.chip },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarAI: { borderWidth: 1 },
  avatarText: { fontSize: 12, fontWeight: '700' },
});
