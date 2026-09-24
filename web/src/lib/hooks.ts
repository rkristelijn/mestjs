'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createItem, fetchItems, type Item } from './api';

// TanStack Query wrappers over the API client. Components read
// { data, isLoading, error } and call mutate() — no manual state.

export function useItems() {
  return useQuery<Item[]>({
    queryKey: ['items'],
    queryFn: fetchItems,
  });
}

export function useCreateItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createItem,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['items'] });
    },
  });
}
