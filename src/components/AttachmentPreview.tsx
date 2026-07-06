import { useEffect, useState } from 'react';
import type { Attachment } from '../types';

// In-lightbox preview per attachment type (#27). Heavy parsers (xlsx, mammoth)
// load lazily via dynamic import, so they live in their own async chunks and
// cost nothing until a matching preview is opened.

export type PreviewKind = 'image' | 'pdf' | 'text' | 'html' | 'xlsx' | 'docx' | 'none';

export function previewKind(a: Attachment): PreviewKind {
  if (!a.dataUrl && !a.url) return 'none';
  const ext = a.name.toLowerCase().match(/\.(\w+)$/)?.[1] ?? '';
  if (a.type.startsWith('image/') || ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext)) return 'image';
  if (a.type === 'application/pdf' || ext === 'pdf') return 'pdf';
  if (a.type === 'text/html' || ext === 'html' || ext === 'htm') return 'html';
  if (
    /^(text\/plain|text\/csv|text\/markdown|application\/json)$/.test(a.type) ||
    ['txt', 'csv', 'json', 'md', 'log'].includes(ext)
  )
    return 'text';
  if (
    a.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
    ext === 'xlsx'
  )
    return 'xlsx';
  if (
    a.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    ext === 'docx'
  )
    return 'docx';
  return 'none';
}

export default function AttachmentPreview({ attachment }: { attachment: Attachment }) {
  const kind = previewKind(attachment);
  const src = attachment.dataUrl || attachment.url || '';
  const [content, setContent] = useState<string | null>(null); // text / srcDoc-HTML
  const [blobUrl, setBlobUrl] = useState<string | null>(null); // pdf
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let on = true;
    let createdUrl: string | null = null;
    setContent(null);
    setBlobUrl(null);
    setNote('');
    setError('');
    (async () => {
      try {
        if (kind === 'pdf') {
          // Chromium renders data:-PDFs in iframes unreliably — go via Blob-URL.
          const blob = await (await fetch(src)).blob();
          createdUrl = URL.createObjectURL(
            blob.type === 'application/pdf' ? blob : new Blob([blob], { type: 'application/pdf' })
          );
          if (on) setBlobUrl(createdUrl);
        } else if (kind === 'text' || kind === 'html') {
          // fetch decodes UTF-8 correctly (atob would give Latin-1).
          const text = await (await fetch(src)).text();
          if (on) setContent(text);
        } else if (kind === 'xlsx') {
          const XLSX = await import('xlsx');
          const buf = await (await fetch(src)).arrayBuffer();
          const wb = XLSX.read(buf);
          const first = wb.SheetNames[0];
          const html = XLSX.utils.sheet_to_html(wb.Sheets[first]);
          if (on) {
            setContent(html);
            setNote(
              wb.SheetNames.length > 1
                ? `Blatt „${first}" (1 von ${wb.SheetNames.length} — Vorschau zeigt nur das erste)`
                : `Blatt „${first}"`
            );
          }
        } else if (kind === 'docx') {
          const mammoth = (await import('mammoth/mammoth.browser')).default;
          const arrayBuffer = await (await fetch(src)).arrayBuffer();
          const { value } = await mammoth.convertToHtml({ arrayBuffer });
          if (on) setContent(value);
        }
      } catch (e) {
        if (on) setError(e instanceof Error ? e.message : 'Vorschau fehlgeschlagen');
      }
    })();
    return () => {
      on = false;
      if (createdUrl) URL.revokeObjectURL(createdUrl);
    };
  }, [kind, src]);

  if (kind === 'image') return <img src={src} alt={attachment.name} />;
  if (error) {
    return (
      <div className="attach-preview-fallback">
        <p>⚠ Vorschau fehlgeschlagen: {error}</p>
        <a className="btn" href={src} download={attachment.name}>⬇ Herunterladen</a>
      </div>
    );
  }
  if (kind === 'none') {
    return (
      <div className="attach-preview-fallback">
        <p>📎 Für diesen Dateityp gibt es keine Vorschau.</p>
        <a className="btn" href={src} download={attachment.name}>⬇ Herunterladen</a>
      </div>
    );
  }
  if (kind === 'pdf') {
    return blobUrl ? (
      <iframe className="attach-preview-frame" src={blobUrl} title={attachment.name} />
    ) : (
      <div className="attach-preview-fallback"><p>… Vorschau wird geladen</p></div>
    );
  }
  if (content === null) {
    return <div className="attach-preview-fallback"><p>… Vorschau wird geladen</p></div>;
  }
  if (kind === 'text') {
    return <pre className="attach-preview-text">{content}</pre>;
  }
  // html / xlsx / docx: rendered HTML in a scriptless sandboxed iframe.
  return (
    <div className="attach-preview-doc">
      {note && <div className="attach-preview-note">{note}</div>}
      <iframe className="attach-preview-frame" sandbox="" srcDoc={content} title={attachment.name} />
    </div>
  );
}
