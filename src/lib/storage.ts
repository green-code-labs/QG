import { AppStore, Conversation, Folder, LifeTree, Message } from "@/types/tree";

const SESSION_KEY = "qg_session";

export interface SessionUser {
  id: string;
  name: string;
  email: string;
}

function storeKey(userId: string) {
  return `qg_store_${userId}`;
}

// ---- Session ----
export const session = {
  get(): SessionUser | null {
    if (typeof window === "undefined") return null;
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },
  set(user: SessionUser) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  },
  clear() {
    localStorage.removeItem(SESSION_KEY);
  },
};

// ---- Per-user data ----
function load(userId: string): AppStore {
  if (typeof window === "undefined") return { folders: [], conversations: [] };
  try {
    const raw = localStorage.getItem(storeKey(userId));
    return raw ? JSON.parse(raw) : { folders: [], conversations: [] };
  } catch {
    return { folders: [], conversations: [] };
  }
}

function save(userId: string, store: AppStore) {
  localStorage.setItem(storeKey(userId), JSON.stringify(store));
}

export const storage = {
  getAll(userId: string): AppStore {
    return load(userId);
  },

  getFolders(userId: string): Folder[] {
    return load(userId).folders;
  },

  getConversations(userId: string): Conversation[] {
    return load(userId).conversations.sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  },

  getConversation(userId: string, id: string): Conversation | null {
    return load(userId).conversations.find((c) => c.id === id) ?? null;
  },

  createFolder(userId: string, name: string, emoji: string): Folder {
    const store = load(userId);
    const folder: Folder = {
      id: `folder-${Date.now()}`,
      name,
      emoji,
      createdAt: new Date().toISOString(),
    };
    store.folders.push(folder);
    save(userId, store);
    return folder;
  },

  deleteFolder(userId: string, id: string) {
    const store = load(userId);
    store.folders = store.folders.filter((f) => f.id !== id);
    store.conversations = store.conversations.map((c) =>
      c.folderId === id ? { ...c, folderId: undefined } : c
    );
    save(userId, store);
  },

  createConversation(userId: string, title: string, folderId?: string): Conversation {
    const store = load(userId);
    const now = new Date().toISOString();
    const convo: Conversation = {
      id: `conv-${Date.now()}`,
      title,
      folderId,
      messages: [],
      createdAt: now,
      updatedAt: now,
    };
    store.conversations.unshift(convo);
    save(userId, store);
    return convo;
  },

  saveMessages(
    userId: string,
    id: string,
    messages: Message[],
    tree: LifeTree | null,
    title?: string
  ) {
    const store = load(userId);
    const idx = store.conversations.findIndex((c) => c.id === id);
    if (idx === -1) return;
    store.conversations[idx] = {
      ...store.conversations[idx],
      messages,
      tree: tree ?? undefined,
      ...(title ? { title } : {}),
      updatedAt: new Date().toISOString(),
    };
    save(userId, store);
  },

  deleteConversation(userId: string, id: string) {
    const store = load(userId);
    store.conversations = store.conversations.filter((c) => c.id !== id);
    save(userId, store);
  },

  moveConversation(userId: string, convId: string, folderId?: string) {
    const store = load(userId);
    const idx = store.conversations.findIndex((c) => c.id === convId);
    if (idx === -1) return;
    store.conversations[idx] = { ...store.conversations[idx], folderId, updatedAt: new Date().toISOString() };
    save(userId, store);
  },
};
