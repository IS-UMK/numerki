/* Wspólne widoki wykładu. Nie zmieniają źródła ani działania ilustracji. */
(function () {
  'use strict';
  const root = document.documentElement;
  const storageKey = 'numerical-mode';
  let active = 'reading';
  try {
    if (window.localStorage.getItem(storageKey) === 'research') active = 'research';
  } catch (_) { /* Przeglądarka może blokować zapis dla plików lokalnych. */ }
  // Ustawienie przed wczytaniem treści zapobiega krótkiej zmianie jej wyglądu.
  root.dataset.mode = active;

  function mount() {
    const content = document.getElementById('content');
    if (!content || document.getElementById('lecture-views')) {
      if (!content) delete root.dataset.mode;
      return;
    }
    const toolbar = document.createElement('div');
    toolbar.id = 'lecture-views';
    toolbar.className = 'view-toolbar';
    toolbar.innerHTML = '<div class="view-toolbar-inner">' +
      '<a class="view-brand" href="#content"></a>' +
      '<div class="view-options" role="group" aria-label="Widok materiału">' +
      '<button type="button" data-view="reading" aria-pressed="false">Czytanie</button>' +
      '<button type="button" data-view="research" aria-pressed="false">Badanie</button>' +
      '</div></div>' +
      '<p class="view-status" role="status" aria-live="polite" aria-atomic="true"></p>';
    const chapter = document.querySelector('meta[name="numerical-chapter"]');
    toolbar.querySelector('.view-brand').textContent =
      'Metody numeryczne' + (chapter ? ' / ' + chapter.content : '');
    document.body.prepend(toolbar);
    const skip = document.createElement('a');
    skip.className = 'view-skip';
    skip.href = '#content';
    skip.textContent = 'Przejdź do treści';
    document.body.prepend(skip);

    const buttons = toolbar.querySelectorAll('[data-view]');
    const status = toolbar.querySelector('.view-status');
    function setView(view, remember, announce) {
      active = view === 'research' ? 'research' : 'reading';
      root.dataset.mode = active;
      buttons.forEach(button => {
        button.setAttribute('aria-pressed', String(button.dataset.view === active));
      });
      if (remember) {
        try { window.localStorage.setItem(storageKey, active); } catch (_) { /* Zapis opcjonalny. */ }
      }
      if (announce) status.textContent = active === 'research'
        ? 'Widok badania: pokazano role fragmentów i dodatkowe uwagi.'
        : 'Widok czytania: ukryto etykiety ról i pomocnicze uwagi.';
    }
    buttons.forEach(button => button.addEventListener('click', () => {
      setView(button.dataset.view, true, true);
    }));
    setView(active, false, false);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount, { once: true });
  else mount();
})();
