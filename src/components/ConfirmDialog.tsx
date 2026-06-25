import './ConfirmDialog.css';

interface ConfirmDialogProps {
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  message,
  confirmLabel = 'Löschen',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <div className="confirm-overlay" onMouseDown={onCancel}>
      <div className="confirm-box" onMouseDown={(e) => e.stopPropagation()}>
        <p className="confirm-msg">{message}</p>
        <div className="confirm-actions">
          <button className="btn" onClick={onCancel}>
            Abbrechen
          </button>
          <button className="btn btn-danger" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
