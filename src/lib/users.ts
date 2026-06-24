import fs from "fs";
import path from "path";
import crypto from "crypto";

const USERS_PATH = path.join(process.cwd(), "data", "users.json");

interface StoredUser {
  id: string;
  name: string;
  email: string;
  salt: string;
  passwordHash: string;
  createdAt: string;
}

interface UsersDB {
  users: Record<string, StoredUser>; // keyed by email
}

function read(): UsersDB {
  try {
    return JSON.parse(fs.readFileSync(USERS_PATH, "utf-8"));
  } catch {
    return { users: {} };
  }
}

function write(db: UsersDB) {
  fs.mkdirSync(path.dirname(USERS_PATH), { recursive: true });
  fs.writeFileSync(USERS_PATH, JSON.stringify(db, null, 2));
}

function hashPassword(password: string, salt: string): string {
  return crypto.pbkdf2Sync(password, salt, 100_000, 64, "sha512").toString("hex");
}

export interface PublicUser {
  id: string;
  name: string;
  email: string;
}

export const userDB = {
  findByEmail(email: string): StoredUser | null {
    return read().users[email.toLowerCase()] ?? null;
  },

  create(name: string, email: string, password: string): PublicUser {
    const db = read();
    const key = email.toLowerCase();
    if (db.users[key]) throw new Error("Email já cadastrado.");

    const salt = crypto.randomBytes(16).toString("hex");
    const user: StoredUser = {
      id: `user-${Date.now()}`,
      name: name.trim(),
      email: key,
      salt,
      passwordHash: hashPassword(password, salt),
      createdAt: new Date().toISOString(),
    };
    db.users[key] = user;
    write(db);
    return { id: user.id, name: user.name, email: user.email };
  },

  verify(email: string, password: string): PublicUser | null {
    const user = read().users[email.toLowerCase()];
    if (!user) return null;
    const hash = hashPassword(password, user.salt);
    if (hash !== user.passwordHash) return null;
    return { id: user.id, name: user.name, email: user.email };
  },
};
