// Routine Hebdo - Vanilla JS Mobile App
(function() {
  'use strict';

  // Storage key prefix
  const STORAGE_PREFIX = 'routine_tracker_';

  // Day definitions
  // 0: Lundi, 1: Mardi, 2: Mercredi, 3: Jeudi, 4: Vendredi, 5: Samedi, 6: Dimanche
  const DAY_NAMES = [
    'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'
  ];

  const MONTH_NAMES = [
    'janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin',
    'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'
  ];

  // Routine configuration per day index
  const ROUTINE_CONFIG = {
    0: [{ id: 'morning', label: 'Morning routine', tag: 'P1' }, { id: 'sport', label: 'Sport routine', tag: 'P2' }],
    1: [{ id: 'morning', label: 'Morning routine', tag: 'P1' }, { id: 'sport', label: 'Sport routine', tag: 'P2' }],
    2: [{ id: 'morning', label: 'Morning routine', tag: 'P1' }, { id: 'sport', label: 'Sport routine', tag: 'P2' }],
    3: [{ id: 'morning', label: 'Morning routine', tag: 'P1' }, { id: 'sport', label: 'Sport routine', tag: 'P2' }],
    4: [
      { id: 'morning', label: 'Morning routine', tag: 'P1' },
      { id: 'sport', label: 'Sport routine', tag: 'P2' },
      { id: 'friday_after', label: 'Friday after routine', tag: 'P3' }
    ],
    5: [], // Samedi - vide
    6: []  // Dimanche - vide
  };

  // State
  let currentMonday = getMonday(new Date());

  // DOM Elements
  const weekTitleEl = document.getElementById('week-title');
  const weekDatesEl = document.getElementById('week-dates');
  const daysContainerEl = document.getElementById('days-container');
  const progressBarFillEl = document.getElementById('progress-bar-fill');
  const progressRatioEl = document.getElementById('progress-ratio');
  const prevWeekBtn = document.getElementById('prev-week-btn');
  const nextWeekBtn = document.getElementById('next-week-btn');
  const todayBtn = document.getElementById('today-btn');
  const resetWeekBtn = document.getElementById('reset-week-btn');

  // Utilities
  function getMonday(d) {
    const date = new Date(d);
    const day = date.getDay();
    // In JS: 0 is Sunday, 1 is Monday...
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(date.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    return monday;
  }

  function formatDateISO(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function getWeekNumber(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  }

  function isSameDay(d1, d2) {
    return d1.getFullYear() === d2.getFullYear() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getDate() === d2.getDate();
  }

  // Storage Helpers
  // States: 'green' (1 clic), 'red' (2 clics), or null (neutre)
  function getSlotState(dateISO, slotId) {
    const val = localStorage.getItem(`${STORAGE_PREFIX}${dateISO}_${slotId}`);
    if (val === 'true' || val === 'green') return 'green';
    if (val === 'red') return 'red';
    return null;
  }

  function setSlotState(dateISO, slotId, state) {
    if (state === 'green' || state === 'red') {
      localStorage.setItem(`${STORAGE_PREFIX}${dateISO}_${slotId}`, state);
    } else {
      localStorage.removeItem(`${STORAGE_PREFIX}${dateISO}_${slotId}`);
    }
  }

  // Render Calendar View
  function renderWeek() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const weekNum = getWeekNumber(currentMonday);
    const year = currentMonday.getFullYear();

    // End of the week (Sunday)
    const sunday = new Date(currentMonday);
    sunday.setDate(currentMonday.getDate() + 6);

    // Update Header
    weekTitleEl.textContent = `Semaine ${weekNum} • ${year}`;
    weekDatesEl.textContent = `${currentMonday.getDate()} ${MONTH_NAMES[currentMonday.getMonth()]} - ${sunday.getDate()} ${MONTH_NAMES[sunday.getMonth()]}`;

    daysContainerEl.innerHTML = '';

    let totalSlots = 0;
    let completedSlots = 0;

    for (let i = 0; i < 7; i++) {
      const dayDate = new Date(currentMonday);
      dayDate.setDate(currentMonday.getDate() + i);
      const dateISO = formatDateISO(dayDate);
      const isToday = isSameDay(dayDate, today);
      const routines = ROUTINE_CONFIG[i];

      const dayCard = document.createElement('div');
      dayCard.className = `day-card ${isToday ? 'is-today' : ''} ${routines.length === 0 ? 'weekend' : ''}`;

      // Header of day card
      const dayHeader = document.createElement('div');
      dayHeader.className = 'day-header';

      const dayNameWrapper = document.createElement('div');
      dayNameWrapper.className = 'day-name-wrapper';

      const dayName = document.createElement('span');
      dayName.className = 'day-name';
      dayName.textContent = DAY_NAMES[i];

      const dayDateText = document.createElement('span');
      dayDateText.className = 'day-date';
      dayDateText.textContent = `${dayDate.getDate()} ${MONTH_NAMES[dayDate.getMonth()]}`;

      dayNameWrapper.appendChild(dayName);
      dayNameWrapper.appendChild(dayDateText);

      if (isToday) {
        const todayChip = document.createElement('span');
        todayChip.className = 'today-chip';
        todayChip.textContent = "Aujourd'hui";
        dayNameWrapper.appendChild(todayChip);
      }

      dayHeader.appendChild(dayNameWrapper);

      // Status pill / counter for day
      let dayCompleted = 0;
      if (routines.length > 0) {
        routines.forEach(r => {
          if (getSlotState(dateISO, r.id) === 'green') {
            dayCompleted++;
          }
        });
      }

      if (routines.length > 0) {
        const statusPill = document.createElement('span');
        statusPill.className = `day-status-pill ${dayCompleted === routines.length ? 'all-done' : ''}`;
        statusPill.textContent = `${dayCompleted} / ${routines.length}`;
        dayHeader.appendChild(statusPill);
      }

      dayCard.appendChild(dayHeader);

      // Body of day card
      if (routines.length === 0) {
        // Weekend empty
        const weekendEmpty = document.createElement('div');
        weekendEmpty.className = 'weekend-empty';
        weekendEmpty.innerHTML = `<span>Repos & Weekend</span>`;
        dayCard.appendChild(weekendEmpty);
      } else {
        const slotsContainer = document.createElement('div');
        slotsContainer.className = 'slots-container';

        routines.forEach(routine => {
          totalSlots++;
          const status = getSlotState(dateISO, routine.id);
          if (status === 'green') completedSlots++;

          const slotBtn = document.createElement('button');
          slotBtn.type = 'button';
          const statusClass = status === 'green' ? 'is-green' : (status === 'red' ? 'is-red' : '');
          slotBtn.className = `routine-slot ${statusClass}`;
          slotBtn.setAttribute('data-date', dateISO);
          slotBtn.setAttribute('data-id', routine.id);

          slotBtn.innerHTML = `
            <div class="slot-left">
              <span class="slot-tag">${routine.tag}</span>
              <span class="slot-title">${routine.label}</span>
            </div>
            <div class="slot-checkbox">
              <svg class="icon-check" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
              <svg class="icon-cross" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </div>
          `;

          // Tap / Click handler
          // Cycle: Neutre -> 1 clic (Vert) -> 2 clics (Rouge) -> 3 clics (Neutre)
          slotBtn.addEventListener('click', () => {
            const currentStatus = getSlotState(dateISO, routine.id);
            let newStatus = null;

            if (!currentStatus) {
              newStatus = 'green';
              if ('vibrate' in navigator) { try { navigator.vibrate(25); } catch(e) {} }
            } else if (currentStatus === 'green') {
              newStatus = 'red';
              if ('vibrate' in navigator) { try { navigator.vibrate([30, 40, 30]); } catch(e) {} }
            } else {
              newStatus = null;
              if ('vibrate' in navigator) { try { navigator.vibrate(15); } catch(e) {} }
            }

            setSlotState(dateISO, routine.id, newStatus);
            renderWeek();
          });

          slotsContainer.appendChild(slotBtn);
        });

        dayCard.appendChild(slotsContainer);
      }

      daysContainerEl.appendChild(dayCard);
    }

    // Update global progress bar
    progressRatioEl.textContent = `${completedSlots} / ${totalSlots}`;
    const percent = totalSlots > 0 ? Math.round((completedSlots / totalSlots) * 100) : 0;
    progressBarFillEl.style.width = `${percent}%`;
  }

  // Navigation handlers
  prevWeekBtn.addEventListener('click', () => {
    currentMonday.setDate(currentMonday.getDate() - 7);
    renderWeek();
  });

  nextWeekBtn.addEventListener('click', () => {
    currentMonday.setDate(currentMonday.getDate() + 7);
    renderWeek();
  });

  todayBtn.addEventListener('click', () => {
    currentMonday = getMonday(new Date());
    renderWeek();
  });

  resetWeekBtn.addEventListener('click', () => {
    if (confirm('Voulez-vous réinitialiser toutes les routines de cette semaine ?')) {
      for (let i = 0; i < 7; i++) {
        const dayDate = new Date(currentMonday);
        dayDate.setDate(currentMonday.getDate() + i);
        const dateISO = formatDateISO(dayDate);
        const routines = ROUTINE_CONFIG[i];
        routines.forEach(r => {
          setSlotState(dateISO, r.id, null);
        });
      }
      renderWeek();
    }
  });

  // Initial render
  renderWeek();

  // Register Service Worker for PWA
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js')
        .then(reg => {
          console.log('PWA Service Worker actif sur:', reg.scope);
        })
        .catch(err => {
          console.warn('PWA Service Worker non actif:', err);
        });
    });
  }

  // Handle PWA Installation prompt
  let deferredPrompt = null;
  const installBtn = document.getElementById('install-btn');

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    if (installBtn) {
      installBtn.style.display = 'block';
      installBtn.addEventListener('click', async () => {
        if (deferredPrompt) {
          deferredPrompt.prompt();
          const { outcome } = await deferredPrompt.userChoice;
          if (outcome === 'accepted') {
            installBtn.style.display = 'none';
          }
          deferredPrompt = null;
        }
      });
    }
  });

  window.addEventListener('appinstalled', () => {
    if (installBtn) installBtn.style.display = 'none';
    console.log('Application Routine Hebdo installée !');
  });
})();
