import { useState } from 'react';
import type { Project } from '../types';
import { useStore } from '../store';
import './TaskDetailPanel.css';
import './ProjectDetailPanel.css';

interface ProjectDetailPanelProps {
  project: Project;
  onClose: () => void;
}

// Split text on URLs and render the URLs as clickable links.
const URL_RE = /(https?:\/\/[^\s]+)/g;
const renderWithLinks = (text: string) =>
  text.split(URL_RE).map((part, i) =>
    /^https?:\/\//.test(part) ? (
      <a
        key={i}
        href={part}
        target="_blank"
        rel="noopener noreferrer"
        className="comment-url"
        onClick={(e) => e.stopPropagation()}
      >
        {part}
      </a>
    ) : (
      part
    )
  );

export default function ProjectDetailPanel({ project, onClose }: ProjectDetailPanelProps) {
  const updateProject = useStore((s) => s.updateProject);
  const [editingDesc, setEditingDesc] = useState(false);
  const [descDraft, setDescDraft] = useState('');

  const startEditDesc = () => {
    setDescDraft(project.description ?? '');
    setEditingDesc(true);
  };

  const commitDesc = () => {
    updateProject(project.id, { description: descDraft || undefined });
    setEditingDesc(false);
  };

  const cancelDesc = () => {
    setEditingDesc(false);
  };

  return (
    <div className="task-detail-panel project-detail-panel">
      <div className="detail-resize" style={{ pointerEvents: 'none' }} />
      <div className="panel-header">
        <h3>
          <span
            className="project-detail-dot"
            style={{ background: project.color }}
          />
          {project.icon} Projekt
        </h3>
        <div className="panel-header-actions">
          <button className="panel-close" onClick={onClose}>✕</button>
        </div>
      </div>

      <div className="panel-content">
        <div className="detail-field">
          <label className="detail-label">Name</label>
          <input
            className="detail-input"
            value={project.name}
            onChange={(e) => updateProject(project.id, { name: e.target.value })}
          />
        </div>

        <div className="detail-field">
          <label className="detail-label">BESCHREIBUNG</label>
          {editingDesc ? (
            <textarea
              className="detail-input detail-textarea"
              autoFocus
              value={descDraft}
              onChange={(e) => setDescDraft(e.target.value)}
              onBlur={commitDesc}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.ctrlKey) commitDesc();
                else if (e.key === 'Escape') cancelDesc();
              }}
              placeholder="Beschreibung hinzufügen…"
            />
          ) : project.description ? (
            <div
              className="detail-input detail-textarea detail-desc-view project-detail-desc"
              onClick={startEditDesc}
              title="Zum Bearbeiten klicken"
            >
              {renderWithLinks(project.description)}
            </div>
          ) : (
            <div
              className="detail-input detail-textarea detail-desc-view project-detail-desc project-detail-desc-empty"
              onClick={startEditDesc}
              title="Beschreibung hinzufügen"
            >
              Beschreibung hinzufügen…
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
