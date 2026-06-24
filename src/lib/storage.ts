import { AppStore, Conversation, Folder, LifeTree, Message } from "@/types/tree";

const KEY = "qg_store";

function load(): AppStore {
  if (typeof window === "undefined") return { folders: [], conversations: [] };
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : { folders: [], conversations: [] };
  } catch {
    return { folders: [], conversations: [] };
  }
}

function save(store: AppStore) {
  localStorage.setItem(KEY, JSON.stringify(store));
}

export const storage = {
  getAll(): AppStore {
    return load();
  },

  getFolders(): Folder[] {
    return load().folders;
  },

  getConversations(): Conversation[] {
    return load().conversations.sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  },

  getConversation(id: string): Conversation | null {
    return load().conversations.find((c) => c.id === id) ?? null;
  },

  createFolder(name: string, emoji: string): Folder {
    const store = load();
    const folder: Folder = {
      id: `folder-${Date.now()}`,
      name,
      emoji,
      createdAt: new Date().toISOString(),
    };
    store.folders.push(folder);
    save(store);
    return folder;
  },

  updateFolder(id: string, data: Partial<Folder>): Folder | null {
    const store = load();
    const idx = store.folders.findIndex((f) => f.id === id);
    if (idx === -1) return null;
    store.folders[idx] = { ...store.folders[idx], ...data };
    save(store);
    return store.folders[idx];
  },

  deleteFolder(id: string) {
    const store = load();
    store.folders = store.folders.filter((f) => f.id !== id);
    store.conversations = store.conversations.map((c) =>
      c.folderId === id ? { ...c, folderId: undefined } : c
    );
    save(store);
  },

  createConversation(title: string, folderId?: string): Conversation {
    const store = load();
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
    save(store);
    return convo;
  },

  updateConversation(
    id: string,
    data: Partial<Pick<Conversation, "title" | "folderId" | "messages" | "tree">>
  ): Conversation | null {
    const store = load();
    const idx = store.conversations.findIndex((c) => c.id === id);
    if (idx === -1) return null;
    store.conversations[idx] = {
      ...store.conversations[idx],
      ...data,
      updatedAt: new Date().toISOString(),
    };
    save(store);
    return store.conversations[idx];
  },

  saveMessages(id: string, messages: Message[], tree: LifeTree | null, title?: string) {
    this.updateConversation(id, { messages, tree: tree ?? undefined, title });
  },

  deleteConversation(id: string) {
    const store = load();
    store.conversations = store.conversations.filter((c) => c.id !== id);
    save(store);
  },

  moveConversation(id: string, folderId?: string) {
    this.updateConversation(id, { folderId });
  },
};
