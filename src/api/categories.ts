import type { Category } from '../types';
import { apiFetch } from './client';

export const categoriesApi = {
  getAll: ()                                   => apiFetch<Category[]>('/api/categories'),
  create: (c: Category)                        => apiFetch<Category>('/api/categories', { method: 'POST', body: JSON.stringify(c) }),
  update: (id: string, p: Partial<Category>)  => apiFetch<Category>(`/api/categories/${id}`, { method: 'PATCH', body: JSON.stringify(p) }),
  remove: (id: string)                         => apiFetch<void>(`/api/categories/${id}`, { method: 'DELETE' }),
};
