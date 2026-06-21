"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import {
  getStoredToken,
  roleHomePath,
  setStoredToken,
  type AuthUser,
  type UserRole,
} from "@/lib/auth";

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  hasRole: (...roles: UserRole[]) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  const loadUser = useCallback(async () => {
    const token = getStoredToken();
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const me = await api.me();
      setUser(me);
    } catch {
      setStoredToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const login = useCallback(
    async (username: string, password: string) => {
      const result = await api.login(username, password);
      setStoredToken(result.access_token);
      setUser(result.user);
      router.replace(roleHomePath(result.user.role));
    },
    [router]
  );

  const logout = useCallback(() => {
    setStoredToken(null);
    setUser(null);
    router.replace("/login");
  }, [router]);

  const hasRole = useCallback(
    (...roles: UserRole[]) => (user ? roles.includes(user.role) : false),
    [user]
  );

  useEffect(() => {
    if (loading) return;

    if (user && pathname === "/login") {
      router.replace(roleHomePath(user.role));
      return;
    }

    if (pathname === "/login") return;

    if (!user) {
      router.replace("/login");
      return;
    }

    if (user.role === "analytics" && pathname !== "/analytics" && pathname !== "/database") {
      router.replace("/analytics");
      return;
    }

    if (user.role === "doctor" && pathname.startsWith("/compare")) {
      router.replace("/");
      return;
    }

    if (user.role === "doctor" && (pathname.startsWith("/analytics") || pathname.startsWith("/ai-models"))) {
      router.replace("/");
      return;
    }
  }, [loading, user, pathname, router]);

  const value = useMemo(
    () => ({ user, loading, login, logout, hasRole }),
    [user, loading, login, logout, hasRole]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
