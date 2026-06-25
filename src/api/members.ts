import type { Member } from '../types';
import { apiFetch } from './client';

export const membersApi = {
  getAll: ()                                 => apiFetch<Member[]>('/api/members'),
  create: (m: Member)                        => apiFetch<Member>('/api/members', { method: 'POST', body: JSON.stringify(m) }),
  update: (id: string, p: Partial<Member>)  => apiFetch<Member>(`/api/members/${id}`, { method: 'PATCH', body: JSON.stringify(p) }),
  remove: (id: string)                       => apiFetch<void>(`/api/members/${id}`, { method: 'DELETE' }),
};
