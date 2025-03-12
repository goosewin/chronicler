import { authClient } from "@/lib/auth/client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface User {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
  image?: string | null;
}

interface UseUserReturn {
  user: User | null;
  isLoading: boolean;
  error: Error | null;
  logout: () => Promise<void>;
  refetch: () => Promise<void>;
}

export function useUser(): UseUserReturn {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const router = useRouter();

  const fetchUser = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await authClient.getSession();

      if (error) {
        throw new Error(error.message);
      }

      setUser(data?.user || null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to fetch user"));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
  }, []);

  const logout = async () => {
    try {
      await authClient.signOut({
        fetchOptions: {
          onSuccess: () => {
            setUser(null);
            router.push("/");
          },
        },
      });
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to log out"));
    }
  };

  return {
    user,
    isLoading,
    error,
    logout,
    refetch: fetchUser,
  };
}
