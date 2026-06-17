import { useStore } from '../store';
import { PROJECT_TEMPLATES } from '../templates';
import './TemplatesGallery.css';

export default function TemplatesGallery() {
  const createProjectFromTemplate = useStore((s) => s.createProjectFromTemplate);
  const selectProject = useStore((s) => s.selectProject);
  const setView = useStore((s) => s.setView);

  return (
    <div className="templates-gallery">
      <p className="templates-intro">
        Starte ein neues Projekt mit einer fertigen Aufgabenstruktur.
      </p>
      <div className="templates-grid">
        {PROJECT_TEMPLATES.map((tpl) => (
          <div className="template-card" key={tpl.id}>
            <div className="template-head">
              <span className="template-icon" style={{ background: tpl.color }}>
                {tpl.icon}
              </span>
              <h3 className="template-name">{tpl.name}</h3>
            </div>
            <p className="template-desc">{tpl.description}</p>
            <ul className="template-tasks">
              {tpl.tasks.slice(0, 4).map((t, i) => (
                <li key={i}>{t.title}</li>
              ))}
              {tpl.tasks.length > 4 && (
                <li className="template-more">
                  +{tpl.tasks.length - 4} weitere…
                </li>
              )}
            </ul>
            <button
              className="btn btn-primary template-use"
              onClick={() => {
                const project = createProjectFromTemplate(tpl);
                selectProject(project.id);
                setView('projects');
              }}
            >
              Projekt erstellen ({tpl.tasks.length} Aufgaben)
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
