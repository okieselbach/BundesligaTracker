import type { BackupData } from "./backup";

const API_BASE = "/api";

const TOKEN_KEY = "sync_token";
const USERNAME_KEY = "sync_username";
const LAST_SYNC_KEY = "sync_last_saved_at";

// --- Token management ---

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function getUsername(): string | null {
  return localStorage.getItem(USERNAME_KEY);
}

export function getLastSyncedAt(): string | null {
  return localStorage.getItem(LAST_SYNC_KEY);
}

export function isLoggedIn(): boolean {
  return !!getToken();
}

function saveSession(token: string, username: string) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USERNAME_KEY, username);
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USERNAME_KEY);
  localStorage.removeItem(LAST_SYNC_KEY);
}

function updateLastSyncedAt(timestamp: string) {
  localStorage.setItem(LAST_SYNC_KEY, timestamp);
}

// --- API calls ---

async function apiCall<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || `API Fehler (${res.status})`);
  }
  return data as T;
}

export async function register(username: string, pin: string): Promise<void> {
  const { token } = await apiCall<{ token: string }>("/register", {
    method: "POST",
    body: JSON.stringify({ username: username.toLowerCase(), pin }),
  });
  saveSession(token, username.toLowerCase());
}

export async function login(username: string, pin: string): Promise<{ lastBackupAt: string | null }> {
  const { token, lastBackupAt } = await apiCall<{ token: string; lastBackupAt: string | null }>("/login", {
    method: "POST",
    body: JSON.stringify({ username: username.toLowerCase(), pin }),
  });
  saveSession(token, username.toLowerCase());
  return { lastBackupAt };
}

export async function saveToCloud(data: BackupData): Promise<string> {
  const { savedAt } = await apiCall<{ savedAt: string }>("/backup", {
    method: "POST",
    body: JSON.stringify(data),
  });
  updateLastSyncedAt(savedAt);
  return savedAt;
}

export async function loadFromCloud(): Promise<BackupData> {
  const data = await apiCall<BackupData>("/backup");
  return data;
}
