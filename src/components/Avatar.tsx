import type { Member } from '../types';
import './Avatar.css';

// Initials (1–2 letters) from a name, e.g. "Anna Müller" → "AM".
export const initialsOf = (name: string): string => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

interface AvatarProps {
  member?: Member | null;
  size?: number;
  title?: string;
}

// Colored circle with the member's initials, or their uploaded image. Falls back
// to a neutral "?" chip when no member is given.
export default function Avatar({ member, size = 22, title }: AvatarProps) {
  const name = member?.name ?? '—';
  const bg = member?.color ?? 'var(--text-secondary)';
  if (member?.avatarUrl) {
    return (
      <img
        className="avatar avatar-img"
        src={member.avatarUrl}
        alt={name}
        title={title ?? name}
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      className="avatar"
      title={title ?? name}
      style={{ width: size, height: size, background: bg, fontSize: size * 0.42 }}
    >
      {member ? initialsOf(member.name) : '?'}
    </span>
  );
}
