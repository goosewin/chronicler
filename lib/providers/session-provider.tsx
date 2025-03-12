"use client";

import { authClient } from "@/lib/auth/client";
import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";

interface User {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
  image?: string | null;
}

interface SessionContextType {
  user: User | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  logout: () => Promise<void>;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchSession = async () => {
    setIsLoading(true);
    try {
      // Use the built-in session hook from authClient with cookie cache
      const { data, error } = await authClient.getSession();

      if (error) {
        throw new Error(error.message);
      }

      setUser(data?.user || null);
    } catch (err) {
      setError(
        err instanceof Error ? err : new Error("Failed to fetch session"),
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSession();

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === "better-auth-session-state") {
        fetchSession();
      }
    };

    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  const logout = async () => {
    try {
      await authClient.signOut({
        fetchOptions: {
          onSuccess: () => {
            setUser(null);
            window.location.href = "/";
          },
        },
      });
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to log out"));
    }
  };

  return (
    <SessionContext.Provider
      value={{
        user,
        isLoading,
        error,
        refetch: fetchSession,
        logout,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error("useSession must be used within a SessionProvider");
  }
  return context;
}
