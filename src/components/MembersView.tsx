import { useState } from 'react';
import { useStore, SELF_MEMBER_ID } from '../store';
import type { MemberRole } from '../types';
import Avatar from './Avatar';
import './MembersView.css';

const ROLE_LABELS: Record<MemberRole, string> = {
  admin: 'Admin (alle Rechte)',
  editor: 'Editor (bearbeiten)',
  viewer: 'Betrachter (nur lesen)',
};

const MAX_AVATAR_BYTES = 1.5 * 1024 * 1024;

export default function MembersView() {
  const members = useStore((s) => s.members);
  const addMember = useStore((s) => s.addMember);
  const updateMember = useStore((s) => s.updateMember);
  const deleteMember = useStore((s) => s.deleteMember);

  const [name, setName] = useState('');
  const [error, setError] = useState('');

  const submit = () => {
    const n = name.trim();
    if (n) addMember(n);
    setName('');
  };

  const uploadAvatar = (id: string, file: File | undefined) => {
    setError('');
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Bitte eine Bilddatei wählen.');
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      setError(`Bild zu groß (max. 1.5 MB). „${file.name}".`);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => updateMember(id, { avatarUrl: String(reader.result) });
    reader.readAsDataURL(file);
  };

  return (
    <div className="settings-view">
      <section className="settings-section">
        <h3 className="settings-heading">Benutzer</h3>
        <p className="settings-hint">
          Lege Personen an (auch dich selbst). Sie stehen im Aufgaben-Detail unter
          „Verantwortlich" zur Auswahl. Ein Profilbild ersetzt die Initialen.
        </p>

        <div className="member-list">
          {members.map((m) => (
            <div className="member-row" key={m.id}>
              <Avatar member={m} size={36} />
              <input
                className="settings-input member-name-input"
                value={m.name}
                onChange={(e) => updateMember(m.id, { name: e.target.value })}
              />
              <select
                className="member-role"
                value={m.role}
                onChange={(e) =>
                  updateMember(m.id, { role: e.target.value as MemberRole })
                }
              >
                {(Object.keys(ROLE_LABELS) as MemberRole[]).map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABELS[r]}
                  </option>
                ))}
              </select>
              <label className="member-upload" title="Profilbild hochladen">
                📷 {m.avatarUrl ? 'Bild ändern' : 'Bild hochladen'}
                <input
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={(e) => {
                    uploadAvatar(m.id, e.target.files?.[0]);
                    e.target.value = '';
                  }}
                />
              </label>
              {m.avatarUrl && (
                <button
                  className="member-remove-img"
                  title="Bild entfernen"
                  onClick={() => updateMember(m.id, { avatarUrl: undefined })}
                >
                  Bild entfernen
                </button>
              )}
              {m.id !== SELF_MEMBER_ID && (
                <button
                  className="member-del"
                  title="Benutzer löschen"
                  onClick={() => deleteMember(m.id)}
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>

        {error && <p className="member-error">{error}</p>}

        <div className="member-add">
          <input
            className="settings-input"
            placeholder="Name des Benutzers…"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submit();
            }}
          />
          <button className="btn btn-primary" onClick={submit}>
            Hinzufügen
          </button>
        </div>
      </section>
    </div>
  );
}
