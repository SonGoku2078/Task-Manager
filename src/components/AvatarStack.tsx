import type { Member } from '../types';
import Avatar from './Avatar';
import './AvatarStack.css';

interface AvatarStackProps {
  members: Member[];
  size?: number;
}

// Several avatars rendered slightly overlapping (left to right).
export default function AvatarStack({ members, size = 28 }: AvatarStackProps) {
  if (members.length === 0) return null;
  const overlap = Math.round(size * 0.35);
  return (
    <span className="avatar-stack">
      {members.map((m, i) => (
        <span
          key={m.id}
          className="avatar-stack-item"
          style={{ marginLeft: i === 0 ? 0 : -overlap, zIndex: members.length - i }}
        >
          <Avatar member={m} size={size} />
        </span>
      ))}
    </span>
  );
}
