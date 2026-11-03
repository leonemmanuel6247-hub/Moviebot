import React from 'react';
import Markdown from 'react-native-markdown-display';
import { Linking } from 'react-native';
import { useTheme } from '../lib/theme-context';

export function MarkdownView({ text, onOpenLink }: { text: string; onOpenLink?: (url: string) => void }) {
  const { theme } = useTheme();
  return (
    <Markdown
      style={{
        body: { color: theme.bubbleAIText, fontSize: 17, lineHeight: 28 },
        heading1: { color: theme.mdHeading, fontSize: 22, lineHeight: 28, fontWeight: '600', marginTop: 12, marginBottom: 6 },
        heading2: { color: theme.mdHeading, fontSize: 20, lineHeight: 26, fontWeight: '600', marginTop: 12, marginBottom: 6 },
        heading3: { color: theme.mdHeading, fontSize: 18, lineHeight: 24, fontWeight: '600', marginTop: 10, marginBottom: 4 },
        link: { color: theme.mdLink, textDecorationLine: 'underline' },
        bullet_list_icon: { color: theme.mdLink },
        ordered_list_icon: { color: theme.mdLink },
        code_inline: {
          backgroundColor: theme.mdCodeBg,
          color: theme.mdCodeText,
          borderRadius: 6,
          paddingHorizontal: 5,
          paddingVertical: 1,
          fontFamily: 'monospace',
        },
        fence: {
          backgroundColor: theme.mdCodeBlockBg,
          color: theme.mdCodeBlockText,
          borderColor: theme.mdCodeBlockBorder,
          borderWidth: 1,
          borderRadius: 12,
          padding: 12,
          fontFamily: 'monospace',
        },
        code_block: {
          backgroundColor: theme.mdCodeBlockBg,
          color: theme.mdCodeBlockText,
          borderColor: theme.mdCodeBlockBorder,
          borderWidth: 1,
          borderRadius: 12,
          padding: 12,
          fontFamily: 'monospace',
        },
        blockquote: {
          borderLeftColor: theme.mdQuoteBar,
          borderLeftWidth: 2,
          paddingLeft: 10,
        },
        blockquote_text: { color: theme.mdQuoteText },
        table: { borderColor: theme.mdTableBorder, borderWidth: 1, borderRadius: 8 },
        thead: { backgroundColor: theme.mdTableHeaderBg },
        th: { padding: 6, color: theme.mdHeading, fontWeight: '600' },
        td: { padding: 6, color: theme.bubbleAIText },
        tr: { borderColor: theme.mdTableBorder, borderBottomWidth: 1 },
      }}
      onLinkPress={(url) => {
        if (onOpenLink) {
          onOpenLink(url);
          return false;
        }
        Linking.openURL(url).catch(() => {});
        return false;
      }}
    >
      {text}
    </Markdown>
  );
}
