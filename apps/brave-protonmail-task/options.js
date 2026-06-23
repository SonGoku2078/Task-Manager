const input = document.getElementById('appUrl');
const saved = document.getElementById('saved');

chrome.storage.sync.get('appUrl').then(({ appUrl }) => {
  input.value = appUrl || 'http://localhost:5173';
});

document.getElementById('save').addEventListener('click', async () => {
  const appUrl = input.value.trim().replace(/\/+$/, '');
  await chrome.storage.sync.set({ appUrl });
  saved.hidden = false;
  setTimeout(() => (saved.hidden = true), 1500);
});
