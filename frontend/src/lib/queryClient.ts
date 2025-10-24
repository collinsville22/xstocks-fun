import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Cache data for 30 seconds by default
      staleTime: 30 * 1000,
      // Keep unused data in cache for 5 minutes
      gcTime: 5 * 60 * 1000,
      // Retry failed requests once
      retry: 1,
      // Don't refetch on window focus for better performance
      refetchOnWindowFocus: false,
      // Refetch on mount only if data is stale
      refetchOnMount: 'always' as const,
    },
  },
});