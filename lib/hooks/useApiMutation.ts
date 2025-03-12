import { useState } from "react";
import { toast } from "sonner";

interface UseApiMutationOptions<TResponse> {
  url: string;
  method?: "POST" | "PUT" | "DELETE" | "PATCH";
  onSuccess?: (data: TResponse) => void;
  onError?: (error: Error) => void;
  successMessage?: string;
}

export function useApiMutation<TData, TResponse = Record<string, unknown>>({
  url,
  method = "POST",
  onSuccess,
  onError,
  successMessage,
}: UseApiMutationOptions<TResponse>) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [data, setData] = useState<TResponse | null>(null);

  const mutate = async (formData: TData) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || `Request failed with status ${response.status}`,
        );
      }

      const responseData = await response.json();
      setData(responseData);

      if (successMessage) {
        toast.success(successMessage);
      }

      if (onSuccess) {
        onSuccess(responseData);
      }

      return responseData;
    } catch (err) {
      const error =
        err instanceof Error ? err : new Error("An unexpected error occurred");
      setError(error);

      toast.error("Error", {
        description: error.message,
      });

      if (onError) {
        onError(error);
      }

      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    mutate,
    isLoading,
    error,
    data,
  };
}
