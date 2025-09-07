export interface User {
  id: string;
  name: string;
  email?: string;
  avatarUrl: string;
}

export interface AuthSession {
  isAuthenticated: boolean;
  user: User | null;
}
