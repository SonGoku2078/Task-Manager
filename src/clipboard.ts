// Kopieren, das auch ueber plain http funktioniert (#80).
//
// navigator.clipboard gibt es nur im "secure context" (HTTPS oder localhost).
// Die App laeuft aber ueber http://<lan-ip>:3001 — dort ist die API schlicht
// nicht vorhanden. Deshalb: moderne API versuchen, sonst der alte Weg ueber
// ein unsichtbares Textfeld + document.execCommand('copy').
//
// Gibt zurueck, ob wirklich kopiert wurde — der Aufrufer darf Erfolg nur dann
// melden. (Vorher wurde jeder Fehler verschluckt und die Oberflaeche behauptete
// trotzdem "✓ kopiert".)
export async function copyToClipboard(text: string): Promise<boolean> {
  // 1) Moderne API — nur im secure context vorhanden.
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Kein secure context oder Berechtigung verweigert → Fallback unten.
  }

  // 2) Fallback: Auswahl in einem unsichtbaren Textfeld + execCommand.
  //    Veraltet, aber in genau diesem Fall (plain http) die einzige Option.
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    // Ausserhalb des Sichtbereichs, aber fokussierbar; readOnly verhindert die
    // Bildschirmtastatur auf Touch-Geraeten.
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.top = '-1000px';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    const selection = document.getSelection();
    const previous = selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
    ta.select();
    ta.setSelectionRange(0, text.length);
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    // Eine vorher bestehende Textauswahl des Nutzers wiederherstellen.
    if (previous && selection) {
      selection.removeAllRanges();
      selection.addRange(previous);
    }
    return ok;
  } catch {
    return false;
  }
}
