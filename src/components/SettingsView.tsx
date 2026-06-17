import { useState } from 'react';
import { useStore } from '../store';
import type { MemberRole } from '../types';
import './SettingsView.css';

const ROLE_LABELS: Record<MemberRole, string> = {
  admin: 'Admin (alle Rechte)',
  editor: 'Editor (bearbeiten)',
  viewer: 'Betrachter (nur lesen)',
};

export default function SettingsView() {
  const settings = useStore((s) => s.settings);
  const setUserName = useStore((s) => s.setUserName);
  const setTheme = useStore((s) => s.setTheme);
  const members = useStore((s) => s.members);
  const addMember = useStore((s) => s.addMember);
  const updateMember = useStore((s) => s.updateMember);
  const deleteMember = useStore((s) => s.deleteMember);
  const addTask = useStore((s) => s.addTask);
  const setView = useStore((s) => s.setView);

  const [memberName, setMemberName] = useState('');
  const [emailText, setEmailText] = useState('');
  const [importInfo, setImportInfo] = useState('');

  const inboxAddress = 'inbox@nozbe-clone.local';

  const importEmail = () => {
    const raw = emailText.trim();
    if (!raw) return;
    const lines = raw.split('\n');
    const subjectLine = lines.find((l) => /^subject:/i.test(l.trim()));
    const title = subjectLine
      ? subjectLine.replace(/^subject:/i, '').trim()
      : lines[0].trim();
    const body = subjectLine
      ? raw
      : lines.slice(1).join('\n').trim();
    addTask({ title: title || 'E-Mail-Aufgabe', description: body, projectId: null });
    setEmailText('');
    setImportInfo(`Aufgabe „${title || 'E-Mail-Aufgabe'}" in der Inbox angelegt.`);
  };

  const submitMember = () => {
    const name = memberName.trim();
    if (name) addMember(name);
    setMemberName('');
  };

  return (
    <div className="settings-view">
      <section className="settings-section">
        <h3 className="settings-heading">Profil</h3>
        <label className="settings-label">Dein Name</label>
        <input
          className="settings-input"
          value={settings.userName}
          onChange={(e) => setUserName(e.target.value || 'Du')}
        />
        <p className="settings-hint">
          Wird als Autor von Kommentaren und in der Aktivität verwendet.
        </p>
      </section>

      <section className="settings-section">
        <h3 className="settings-heading">Darstellung</h3>
        <div className="theme-toggle">
          <button
            className={`theme-btn ${settings.theme === 'light' ? 'active' : ''}`}
            onClick={() => setTheme('light')}
          >
            ☀️ Hell
          </button>
          <button
            className={`theme-btn ${settings.theme === 'dark' ? 'active' : ''}`}
            onClick={() => setTheme('dark')}
          >
            🌙 Dunkel
          </button>
        </div>
      </section>

      <section className="settings-section">
        <h3 className="settings-heading">Team (lokal)</h3>
        <p className="settings-hint">
          Lokale Mitglieder & Rollen. Hinweis: In diesem MVP ohne Backend gibt es
          keine echte Synchronisation oder Rechte-Durchsetzung — die Rollen sind
          organisatorisch.
        </p>
        <div className="member-list">
          {members.length === 0 && (
            <p className="settings-hint">Noch keine Mitglieder hinzugefügt.</p>
          )}
          {members.map((m) => (
            <div className="member-row" key={m.id}>
              <span className="member-avatar" style={{ background: m.color }}>
                {m.name.charAt(0).toUpperCase()}
              </span>
              <span className="member-name">{m.name}</span>
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
              <button
                className="member-del"
                title="Entfernen"
                onClick={() => deleteMember(m.id)}
              >
                ×
              </button>
            </div>
          ))}
        </div>
        <div className="member-add">
          <input
            className="settings-input"
            placeholder="Name des Mitglieds…"
            value={memberName}
            onChange={(e) => setMemberName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submitMember();
            }}
          />
          <button className="btn btn-primary" onClick={submitMember}>
            Einladen
          </button>
        </div>
      </section>

      <section className="settings-section">
        <h3 className="settings-heading">E-Mail zu Aufgabe</h3>
        <p className="settings-hint">
          Demo ohne echten Mailserver: Deine (fiktive) Inbox-Adresse lautet{' '}
          <code className="settings-code">{inboxAddress}</code>. Füge unten eine
          E-Mail ein (optional mit „Subject:"-Zeile) — daraus wird eine Aufgabe in
          deiner Inbox.
        </p>
        <textarea
          className="settings-input settings-textarea"
          placeholder={'Subject: Angebot prüfen\n\nBitte das Angebot von Firma X bis Freitag prüfen.'}
          value={emailText}
          onChange={(e) => setEmailText(e.target.value)}
        />
        <div className="email-import-actions">
          <button className="btn btn-primary" onClick={importEmail}>
            Als Aufgabe anlegen
          </button>
          {importInfo && (
            <button
              className="btn btn-secondary"
              onClick={() => setView('inbox')}
            >
              Zur Inbox
            </button>
          )}
        </div>
        {importInfo && <p className="settings-hint">✅ {importInfo}</p>}
      </section>
    </div>
  );
}
