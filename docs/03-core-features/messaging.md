# Messaging

Real-time messaging system implementation guide.

---

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Implementation](#implementation)
- [Real-time Updates](#real-time-updates)
- [API Reference](#api-reference)

---

## Overview

Collabryx messaging system features:

- Real-time message delivery (Supabase Realtime)
- Conversation management
- Message history
- Read receipts
- Typing indicators

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Messaging Architecture                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Client → useMessages Hook → Supabase Realtime → Database   │
│                                                             │
│  Components:                                                │
│  - Conversation List                                        │
│  - Message Thread                                           │
│  - Message Input                                            │
│  - Typing Indicator                                         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Implementation

### Database Schema

```sql
-- Conversations table
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Messages table
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID REFERENCES conversations(id),
  sender_id UUID REFERENCES profiles(id),
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### React Hook

```typescript
// hooks/use-messages.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"

export function useMessages(conversationId: string) {
  const queryClient = useQueryClient()
  const supabase = createClient()
  
  // Fetch messages
  const { data: messages, isLoading } = useQuery({
    queryKey: ["messages", conversationId],
    queryFn: async () => {
      const { data } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true })
      return data ?? []
    },
  })
  
  // Send message mutation
  const sendMessage = useMutation({
    mutationFn: async (content: string) => {
      const { data, error } = await supabase.from("messages").insert({
        conversation_id: conversationId,
        content,
        sender_id: currentUser.id,
      })
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messages", conversationId] })
    },
  })
  
  // Subscribe to new messages via Realtime
  useEffect(() => {
    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`
      }, (payload) => {
        queryClient.setQueryData(["messages", conversationId], 
          (old: Message[]) => [...(old || []), payload.new as Message])
      })
      .subscribe()
    
    return () => { supabase.removeChannel(channel) }
  }, [conversationId])
  
  return { messages, isLoading, sendMessage }
}
```

---

## Real-time Updates

### Supabase Realtime Setup

```typescript
// Subscribe to conversation updates
const channel = supabase
  .channel(`room:${conversationId}`)
  .on('broadcast', { event: 'message' }, (payload) => {
    handleNewMessage(payload.payload)
  })
  .subscribe()
```

### Typing Indicators

```typescript
// Send typing event
const sendTypingIndicator = () => {
  channel.send({
    type: 'broadcast',
    event: 'typing',
    payload: { userId: currentUser.id }
  })
}
```

---

## Server Actions Reference

The messaging system uses Server Actions from `lib/actions/conversations.server.ts`:

### getOrCreateConversation(otherUserId: string)

Get or create a direct message conversation.

### sendMessage(conversationId: string, content: string)

Send a message in a conversation.

### getMessages(conversationId: string)

Get all messages for a conversation.

### markConversationAsRead(conversationId: string)

Mark all messages in a conversation as read.

---

**Last Updated**: 2026-03-14

[← Back to Docs](../README.md)
