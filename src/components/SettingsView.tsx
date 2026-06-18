import { useState } from 'react';
import { useStore } from '../store';
import type { MemberRole } from '../types';
import { importFromNozbeApi, mapNozbe, type NozbeExport } from '../nozbe';
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
  const replaceWithNozbe = useStore((s) => s.replaceWithNozbe);
  const connectNozbe = useStore((s) => s.connectNozbe);
  const disconnectNozbe = useStore((s) => s.disconnectNozbe);
  const setNozbeSync = useStore((s) => s.setNozbeSync);

  const [memberName, setMemberName] = useState('');
  const [emailText, setEmailText] = useState('');
  const [importInfo, setImportInfo] = useState('');

  const [nzToken, setNzToken] = useState(settings.nozbe?.token ?? '');
  const [nzClientId, setNzClientId] = useState(settings.nozbe?.clientId ?? '');
  const [nzBusy, setNzBusy] = useState(false);
  const [nzStatus, setNzStatus] = useState('');

  const connected = !!settings.nozbe;

  const inboxAddress = 'inbox@nozbe-clone.local';

  const applyImport = (data: ReturnType<typeof mapNozbe>) => {
    if (
      !window.confirm(
        `${data.tasks.length} Aufgaben, ${data.projects.length} Projekte, ${data.categories.length} Kategorien importieren?\n\nACHTUNG: Bestehende lokale Aufgaben/Projekte/Kategorien werden ERSETZT.`
      )
    ) {
      setNzStatus('Abgebrochen.');
      return;
    }
    const r = replaceWithNozbe(data);
    setNzStatus(
      `✅ Importiert: ${r.tasks} Aufgaben, ${r.projects} Projekte, ${r.categories} Kategorien.`
    );
  };

  const importDirect = async () => {
    if (!nzToken.trim() || !nzClientId.trim()) {
      setNzStatus('Bitte Access Token und Client-ID eingeben.');
      return;
    }
    setNzBusy(true);
    setNzStatus('Lade aus Nozbe…');
    try {
      const data = await importFromNozbeApi(nzToken.trim(), nzClientId.trim());
      applyImport(data);
    } catch (err) {
      setNzStatus(
        `❌ Fehler: ${err instanceof Error ? err.message : String(err)} (Direkt-Import funktioniert nur unter "npm run dev").`
      );
    } finally {
      setNzBusy(false);
    }
  };

  const importJsonFile = (file: File | undefined) => {
    if (!file) return;
    setNzStatus('Lese Datei…');
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        // Accept {tasks,projects,contexts} or a bare task array.
        const raw: NozbeExport = Array.isArray(parsed) ? { tasks: parsed } : parsed;
        applyImport(mapNozbe(raw));
      } catch (err) {
        setNzStatus(
          `❌ Ungültige JSON-Datei: ${err instanceof Error ? err.message : String(err)}`
        );
      }
    };
    reader.readAsText(file);
  };

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
        <h3 className="settings-heading">
          Nozbe-Verbindung {connected && <span className="nz-badge">verbunden</span>}
        </h3>
        <p className="settings-hint">
          Verbinde dein Nozbe-Classic-Konto, um Aufgaben zu importieren und den Erledigt-Status
          live zurück zu Nozbe zu synchronisieren. <strong>Hinweis:</strong> Der Token wird beim
          Verbinden lokal (im Browser) gespeichert; mit „Trennen" wird er gelöscht. Sync läuft
          über einen Dev-Proxy und funktioniert nur unter
          <code className="settings-code"> npm run dev</code>.
        </p>

        <label className="settings-label">Access Token</label>
        <input
          className="settings-input"
          type="password"
          value={nzToken}
          onChange={(e) => setNzToken(e.target.value)}
          placeholder="OAuth access_token"
          autoComplete="off"
        />
        <label className="settings-label" style={{ marginTop: 10 }}>
          Client-ID
        </label>
        <input
          className="settings-input"
          value={nzClientId}
          onChange={(e) => setNzClientId(e.target.value)}
          placeholder="client_id"
          autoComplete="off"
        />

        <div className="email-import-actions" style={{ marginTop: 12 }}>
          <button
            className="btn btn-primary"
            onClick={() => {
              if (nzToken.trim() && nzClientId.trim()) {
                connectNozbe(nzToken.trim(), nzClientId.trim());
                setNzStatus('✅ Verbunden. Token lokal gespeichert.');
              } else {
                setNzStatus('Bitte Access Token und Client-ID eingeben.');
              }
            }}
          >
            {connected ? 'Verbindung aktualisieren' : 'Verbinden & speichern'}
          </button>
          {connected && (
            <button
              className="btn btn-danger"
              onClick={() => {
                disconnectNozbe();
                setNzStatus('Verbindung getrennt, Token gelöscht.');
              }}
            >
              Trennen
            </button>
          )}
        </div>

        {connected && (
          <label className="nz-sync-toggle">
            <input
              type="checkbox"
              checked={settings.nozbe?.syncCompleted ?? false}
              onChange={(e) => setNozbeSync(e.target.checked)}
            />
            Erledigt-Status live zu Nozbe synchronisieren (Abhaken hier → erledigt in Nozbe)
          </label>
        )}

        <h3 className="settings-heading" style={{ marginTop: 20 }}>
          Import
        </h3>
        <p className="settings-hint">
          Importiert Projekte, Kontexte (→ Kategorien) und Aufgaben.{' '}
          <strong>Achtung:</strong> ersetzt die bestehenden lokalen Daten.
        </p>
        <div className="email-import-actions">
          <button className="btn btn-primary" onClick={importDirect} disabled={nzBusy}>
            {nzBusy ? 'Importiere…' : 'Aus Nozbe importieren'}
          </button>
          <label className="btn btn-secondary nz-file-btn">
            JSON-Datei importieren
            <input
              type="file"
              accept="application/json,.json"
              hidden
              onChange={(e) => {
                importJsonFile(e.target.files?.[0]);
                e.target.value = '';
              }}
            />
          </label>
        </div>
        <p className="settings-hint">
          Direkt-Import nur unter <code className="settings-code">npm run dev</code> (Dev-Proxy).
          Alternativ per <code className="settings-code">scripts/nozbe-export.ps1</code> exportieren
          und die JSON-Datei hochladen.
        </p>
        {nzStatus && <p className="settings-hint">{nzStatus}</p>}
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
