"use client";

import { SessionUser } from "./storage";

const USERS_KEY = "qg_users";

interface StoredUser {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  salt: string;
}

async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(text)
  );
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function hashPassword(password: string, salt: string): Promise<string> {
  return sha256(salt + password + salt);
}

function randomSalt(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function loadUsers(): Record<string, StoredUser> {
  try {
    const raw = localStorage.getItem(USERS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveUsers(users: Record<string, StoredUser>) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

export const clientAuth = {
  async register(
    name: string,
    email: string,
    password: string
  ): Promise<SessionUser> {
    const users = loadUsers();
    const key = email.toLowerCase();
    if (users[key]) throw new Error("Este email já está cadastrado.");
    const salt = randomSalt();
    const passwordHash = await hashPassword(password, salt);
    const user: StoredUser = {
      id: `user-${Date.now()}`,
      name,
      email: key,
      passwordHash,
      salt,
    };
    users[key] = user;
    saveUsers(users);
    return { id: user.id, name: user.name, email: user.email };
  },

  async login(email: string, password: string): Promise<SessionUser> {
    const users = loadUsers();
    const key = email.toLowerCase();
    const user = users[key];
    if (!user) throw new Error("Email ou senha incorretos.");
    const hash = await hashPassword(password, user.salt);
    if (hash !== user.passwordHash) throw new Error("Email ou senha incorretos.");
    return { id: user.id, name: user.name, email: user.email };
  },
};
