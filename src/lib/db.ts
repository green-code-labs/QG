import fs from "fs";
import path from "path";
import { Conversation, Folder } from "@/types/tree";

const DB_PATH = path.join(process.cwd(), "data", "db.json");

interface UserData {
  folders: Folder[];
  conversations: Conversation[];
}

interface DB {
  users: Record<string, UserData>;
}

function read(): DB {
  try {
    const raw = fs.readFileSync(DB_PATH, "utf-8");
    return JSON.parse(raw);
  } catch {
    return { users: {} };
  }
}

function write(db: DB) {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

function getUser(userId: string): UserData {
  const db = read();
  if (!db.users[userId]) {
    db.users[userId] = { folders: [], conversations: [] };
    write(db);
  }
  return db.users[userId];
}

export const db = {
  getFolders(userId: string): Folder[] {
    return getUser(userId).folders;
  },

  createFolder(userId: string, name: string, emoji: string): Folder {
    const store = read();
    if (!store.users[userId]) store.users[userId] = { folders: [], conversations: [] };
    const folder: Folder = {
      id: `folder-${Date.now()}`,
      name,
      emoji,
      createdAt: new Date().toISOString(),
    };
    store.users[userId].folders.push(folder);
    write(store);
    return folder;
  },

  updateFolder(userId: string, folderId: string, data: Partial<Folder>): Folder | null {
    const store = read();
    const user = store.users[userId];
    if (!user) return null;
    const idx = user.folders.findIndex((f) => f.id === folderId);
    if (idx === -1) return null;
    user.folders[idx] = { ...user.folders[idx], ...data };
    write(store);
    return user.folders[idx];
  },

  deleteFolder(userId: string, folderId: string) {
    const store = read();
    const user = store.users[userId];
    if (!user) return;
    user.folders = user.folders.filter((f) => f.id !== folderId);
    user.conversations = user.conversations.map((c) =>
      c.folderId === folderId ? { ...c, folderId: undefined } : c
    );
    write(store);
  },

  getConversations(userId: string): Conversation[] {
    return getUser(userId).conversations.sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  },

  getConversation(userId: string, conversationId: string): Conversation | null {
    const user = getUser(userId);
    return user.conversations.find((c) => c.id === conversationId) ?? null;
  },

  createConversation(userId: string, title: string, folderId?: string): Conversation {
    const store = read();
    if (!store.users[userId]) store.users[userId] = { folders: [], conversations: [] };
    const convo: Conversation = {
      id: `conv-${Date.now()}`,
      title,
      folderId,
      messages: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    store.users[userId].conversations.push(convo);
    write(store);
    return convo;
  },

  updateConversation(userId: string, conversationId: string, data: Partial<Conversation>): Conversation | null {
    const store = read();
    const user = store.users[userId];
    if (!user) return null;
    const idx = user.conversations.findIndex((c) => c.id === conversationId);
    if (idx === -1) return null;
    user.conversations[idx] = {
      ...user.conversations[idx],
      ...data,
      updatedAt: new Date().toISOString(),
    };
    write(store);
    return user.conversations[idx];
  },

  deleteConversation(userId: string, conversationId: string) {
    const store = read();
    const user = store.users[userId];
    if (!user) return;
    user.conversations = user.conversations.filter((c) => c.id !== conversationId);
    write(store);
  },
};
