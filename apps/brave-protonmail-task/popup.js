// Popup logic: read the open Protonmail e-mail, let the user tweak the task,
// then open the SelfManaged app via a "#/add" deep link.

const DEFAULT_APP_URL = 'http://localhost:5173';

const $ = (id) => document.getElementById(id);
const titleEl = $('title');
const noteEl = $('note');
const addBtn = $('add');
const statusEl = $('status');

function setStatus(msg, kind) {
  statusEl.textContent = msg;
  statusEl.className = 'status' + (kind ? ' ' + kind : '');
}

async function getAppUrl() {
  const { appUrl } = await chrome.storage.sync.get('appUrl');
  return (appUrl || DEFAULT_APP_URL).replace(/\/+$/, '');
}

async function loadEmail() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !/^https:\/\/mail\.proton\.me\//.test(tab.url || '')) {
    setStatus('Bitte eine Protonmail-E-Mail öffnen.', 'err');
    return;
  }
  try {
    const [res] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['extract.js'],
    });
    const data = res && res.result;
    if (!data) {
      setStatus('E-Mail konnte nicht gelesen werden.', 'err');
      return;
    }
    titleEl.value = data.subject;
    const noteParts = [];
    if (data.sender) noteParts.push('Von: ' + data.sender);
    if (data.url) noteParts.push(data.url);
    if (data.snippet) noteParts.push('\n' + data.snippet);
    noteEl.value = noteParts.join('\n');
    addBtn.disabled = false;
  } catch (e) {
    setStatus('Zugriff auf die Seite fehlgeschlagen: ' + e.message, 'err');
  }
}

addBtn.addEventListener('click', async () => {
  const title = titleEl.value.trim();
  if (!title) {
    setStatus('Titel darf nicht leer sein.', 'err');
    return;
  }
  const appUrl = await getAppUrl();
  const q = new URLSearchParams({ title });
  if (noteEl.value.trim()) q.set('note', noteEl.value.trim());
  const url = `${appUrl}/#/add?${q.toString()}`;
  await chrome.tabs.create({ url });
  setStatus('Aufgabe an SelfManaged übergeben ✓', 'ok');
  addBtn.disabled = true;
});

$('opts').addEventListener('click', (e) => {
  e.preventDefault();
  chrome.runtime.openOptionsPage();
});

loadEmail();
