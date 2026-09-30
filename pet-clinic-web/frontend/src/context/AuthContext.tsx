import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { ReactNode } from "react";
import { authApi } from "../api/client";
import type { AuthUser, UserRole } from "../api/types";

interface AuthContextValue {
  user: AuthUser | null;
  authenticated: boolean;
  isAdmin: boolean;
  isOwner: boolean;
  isVet: boolean;
  roles: UserRole[];
  assignedVetId: number | null;
  loading: boolean;
  message: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const response = await authApi.me();
      if (response.authenticated && response.user) {
        setUser(response.user);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const login = useCallback(async (username: string, password: string) => {
    setLoading(true);
    setMessage(null);
    try {
      const response = await authApi.login(username, password);
      if (response.authenticated && response.user) {
        setUser(response.user);
        setMessage(null);
      } else {
        setUser(null);
        setMessage(response.message ?? "Unable to sign in");
      }
    } catch (error) {
      setUser(null);
      setMessage(null);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      setUser(null);
      setMessage(null);
    }
  }, []);

  const value = useMemo(() => {
    const roles = user?.roles ?? [];
    const isOwner = roles.includes("CLINIC_OWNER");
    const isSuperAdmin = roles.includes("SUPERADMIN");
    const isVet = roles.includes("VET");
    const isAdmin = Boolean(user?.admin || isOwner || isSuperAdmin);
    return {
      user,
      authenticated: Boolean(user?.active),
      isAdmin,
      isOwner,
      isVet,
      roles,
      assignedVetId: user?.vetId ?? null,
      loading,
      message,
      login,
      logout,
      refresh,
    } satisfies AuthContextValue;
  }, [user, loading, message, login, logout, refresh]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuthContext() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuthContext must be used within AuthProvider");
  }
  return context;
}
