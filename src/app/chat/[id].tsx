import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import { ChatWorkspace } from '../../components/ChatWorkspace';
export default function Chat() { const { id } = useLocalSearchParams<{id: string}>(); return <ChatWorkspace initialId={id} />; }
