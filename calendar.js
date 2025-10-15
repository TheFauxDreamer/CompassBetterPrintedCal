// View mode change
document.getElementById('viewMode').addEventListener('change', (e) => {
  currentView = e.target.value;
  renderCalendar();
});

// Term filter change
document.getElementById('termFilter').addEventListener('change', () => {
  renderCalendar();
});let allEvents = [];
let allTerms = [];
let currentView = 'term';
let enabledLayers = new Set();
let eventLayers = new Map(); // Map of color to layer info
let hideWeekends = false;
let paperSize = 'a4';

// Load calendar and term data
chrome.runtime.sendMessage({ type: 'GET_ALL_DATA' }, (data) => {
  if (data && data.calendar && data.calendar.events) {
    allEvents = data.calendar.events.map(event => ({
      ...event,
      startDate: new Date(event.start),
      endDate: new Date(event.finish)
    })).sort((a, b) => a.startDate - b.startDate);
    
    // Parse term data
    if (data.terms && data.terms.terms) {
      allTerms = data.terms.terms.map(term => ({
        ...term,
        startDate: parseAUDate(term.s),
        endDate: parseAUDate(term.f),
        name: term.n,
        year: term.cy,
        id: term.id
      })).sort((a, b) => a.startDate - b.startDate);
    }
    
    identifyLayers();
    populateTermFilter();
    setupEventListeners();
    updatePaperSize();
    renderCalendar();
  } else {
    document.getElementById('calendarContent').innerHTML = 
      '<p style="color: #999; text-align: center;">No calendar data available. Please visit your calendar page first.</p>';
  }
});

// Update paper size class on body
function updatePaperSize() {
  document.body.classList.remove('print-a4', 'print-a3');
  document.body.classList.add(`print-${paperSize}`);
}

// Setup event listeners
function setupEventListeners() {
  // Print button
  document.getElementById('printButton').addEventListener('click', () => {
    window.print();
  });

  // View mode change
  document.getElementById('viewMode').addEventListener('change', (e) => {
    currentView = e.target.value;
    renderCalendar();
  });

  // Term filter change
  document.getElementById('termFilter').addEventListener('change', () => {
    renderCalendar();
  });

  // Hide weekends toggle
  document.getElementById('hideWeekendsToggle').addEventListener('change', (e) => {
    hideWeekends = e.target.checked;
    renderCalendar();
  });

  // Paper size change
  document.getElementById('paperSize').addEventListener('change', (e) => {
    paperSize = e.target.value;
    updatePaperSize();
  });
}

// Identify unique calendar layers based on colors
function identifyLayers() {
  const colorGroups = new Map();
  
  allEvents.forEach(event => {
    const color = event.backgroundColor || '#e9ecef';
    if (!colorGroups.has(color)) {
      colorGroups.set(color, {
        color: color,
        events: [],
        sampleTitle: event.title
      });
    }
    colorGroups.get(color).events.push(event);
  });
  
  // Sort by number of events (most common first)
  const sortedLayers = Array.from(colorGroups.values()).sort((a, b) => b.events.length - a.events.length);
  
  // Create layer info
  sortedLayers.forEach((layer, index) => {
    const layerId = `layer-${index}`;
    eventLayers.set(layer.color, {
      id: layerId,
      color: layer.color,
      count: layer.events.length,
      sampleTitle: layer.sampleTitle
    });
    enabledLayers.add(layer.color); // All enabled by default
  });
  
  renderLayerFilters();
}

// Render layer filter checkboxes
function renderLayerFilters() {
  const container = document.getElementById('layerFilters');
  
  // Keep the label
  const label = container.querySelector('.layer-filters-label');
  const hint = container.querySelector('span[style]');
  container.innerHTML = '';
  container.appendChild(label);
  container.appendChild(hint);
  
  eventLayers.forEach((layer, color) => {
    const filterDiv = document.createElement('div');
    filterDiv.className = enabledLayers.has(color) ? 'layer-filter' : 'layer-filter disabled';
    filterDiv.style.borderColor = color;
    filterDiv.style.backgroundColor = `${color}22`;
    
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = enabledLayers.has(color);
    checkbox.id = layer.id;
    
    const colorBox = document.createElement('div');
    colorBox.className = 'layer-color-box';
    colorBox.style.backgroundColor = color;
    
    const label = document.createElement('label');
    label.htmlFor = layer.id;
    label.textContent = `${layer.count} events`;
    label.style.cursor = 'pointer';
    label.title = `Sample: ${layer.sampleTitle}`;
    
    filterDiv.appendChild(checkbox);
    filterDiv.appendChild(colorBox);
    filterDiv.appendChild(label);
    
    filterDiv.addEventListener('click', (e) => {
      if (e.target !== checkbox) {
        checkbox.checked = !checkbox.checked;
      }
      
      if (checkbox.checked) {
        enabledLayers.add(color);
        filterDiv.classList.remove('disabled');
      } else {
        enabledLayers.delete(color);
        filterDiv.classList.add('disabled');
      }
      
      renderCalendar();
    });
    
    container.appendChild(filterDiv);
  });
}

// Filter events based on enabled layers
function getFilteredEvents() {
  return allEvents.filter(event => {
    const color = event.backgroundColor || '#e9ecef';
    return enabledLayers.has(color);
  });
}

// Parse Australian date format DD/MM/YYYY
function parseAUDate(dateStr) {
  const parts = dateStr.split('/');
  return new Date(parts[2], parts[1] - 1, parts[0]);
}

// Populate term filter
function populateTermFilter() {
  const termFilter = document.getElementById('termFilter');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  let currentTermId = null;
  
  if (allTerms.length > 0) {
    allTerms.forEach(term => {
      const option = document.createElement('option');
      option.value = `term-${term.id}`;
      option.textContent = `${term.name} ${term.year}`;
      termFilter.appendChild(option);
      
      // Check if today falls within this term
      if (today >= term.startDate && today <= term.endDate) {
        currentTermId = term.id;
      }
    });
    
    // Select the current term if found
    if (currentTermId) {
      termFilter.value = `term-${currentTermId}`;
    }
  }
  
  const years = [...new Set(allEvents.map(e => e.startDate.getFullYear()))].sort();
  years.forEach(year => {
    const option = document.createElement('option');
    option.value = `year-${year}`;
    option.textContent = `Year ${year}`;
    termFilter.appendChild(option);
  });
}

// View mode change
document.getElementById('viewMode').addEventListener('change', (e) => {
  currentView = e.target.value;
  renderCalendar();
});

// Term filter change
document.getElementById('termFilter').addEventListener('change', () => {
  renderCalendar();
});

// Render calendar based on view mode
function renderCalendar() {
  const termFilterValue = document.getElementById('termFilter').value;
  const filteredEvents = getFilteredEvents();
  let displayEvents = filteredEvents;
  
  if (termFilterValue !== 'all') {
    if (termFilterValue.startsWith('term-')) {
      const termId = parseInt(termFilterValue.replace('term-', ''));
      const term = allTerms.find(t => t.id === termId);
      if (term) {
        displayEvents = filteredEvents.filter(e => 
          e.startDate >= term.startDate && e.startDate <= term.endDate
        );
        document.getElementById('calendarTitle').textContent = `${term.name} ${term.year}`;
      }
    } else if (termFilterValue.startsWith('year-')) {
      const year = parseInt(termFilterValue.replace('year-', ''));
      displayEvents = filteredEvents.filter(e => e.startDate.getFullYear() === year);
      document.getElementById('calendarTitle').textContent = `${year} School Calendar`;
    }
  } else {
    document.getElementById('calendarTitle').textContent = 'School Term Calendar';
  }

  if (currentView === 'term') {
    renderTermCalendarView(displayEvents);
  } else if (currentView === 'monthly') {
    renderMonthlyCalendarView(displayEvents);
  } else if (currentView === 'weekly') {
    renderWeeklyView(displayEvents);
  } else if (currentView === 'daily') {
    renderDailyView(displayEvents);
  }
}

// Term Calendar View - Shows all weeks in each term
function renderTermCalendarView(events) {
  const content = document.getElementById('calendarContent');
  
  if (allTerms.length === 0) {
    content.innerHTML = '<p class="no-events">No term data available.</p>';
    return;
  }
  
  let html = '';
  
  const selectedFilter = document.getElementById('termFilter').value;
  const termsToShow = selectedFilter.startsWith('term-') 
    ? allTerms.filter(t => `term-${t.id}` === selectedFilter)
    : allTerms;
  
  termsToShow.forEach(term => {
    const termEvents = events.filter(e => 
      e.startDate >= term.startDate && e.startDate <= term.endDate
    );
    
    html += `<div class="term-section">`;
    html += `<div class="term-header">${term.name} ${term.year} (${formatDate(term.startDate)} - ${formatDate(term.endDate)})</div>`;
    html += renderCalendarGrid(term.startDate, term.endDate, termEvents, true);
    html += `</div>`;
  });
  
  content.innerHTML = html || '<p class="no-events">No events to display</p>';
}

// Monthly Calendar View
function renderMonthlyCalendarView(events) {
  const content = document.getElementById('calendarContent');
  const monthGroups = groupByMonth(events);
  
  let html = '';
  monthGroups.forEach((monthEvents, monthKey) => {
    const [year, month] = monthKey.split('-');
    const date = new Date(year, month - 1, 1);
    const monthName = date.toLocaleString('default', { month: 'long', year: 'numeric' });
    
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);
    
    html += `<div class="term-section">`;
    html += `<div class="term-header">${monthName}</div>`;
    html += renderCalendarGrid(firstDay, lastDay, monthEvents, false);
    html += `</div>`;
  });
  
  content.innerHTML = html || '<p class="no-events">No events to display</p>';
}

// Render calendar grid
function renderCalendarGrid(startDate, endDate, events, showTermWeeks = false) {
  let html = '<div class="calendar-grid">';
  
  // Determine which days to show
  const daysToShow = hideWeekends 
    ? ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
    : ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  
  const numDays = daysToShow.length;
  const headerClass = hideWeekends ? 'calendar-header hide-weekends' : 'calendar-header';
  const weekClass = hideWeekends ? 'calendar-week hide-weekends' : 'calendar-week';
  
  // Header row
  html += `<div class="${headerClass}">`;
  if (showTermWeeks) {
    html += '<div class="week-header-spacer"></div>';
  }
  daysToShow.forEach(day => {
    html += `<div class="day-name">${day}</div>`;
  });
  html += '</div>';
  
  // Find the first Monday on or before startDate
  const firstDay = new Date(startDate);
  const dayOfWeek = firstDay.getDay();
  const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  firstDay.setDate(firstDay.getDate() - daysToMonday);
  
  // Find the last day to display
  const lastDay = new Date(endDate);
  if (hideWeekends) {
    // Find the last Friday on or after endDate
    const dayOfWeekEnd = lastDay.getDay();
    if (dayOfWeekEnd === 0) { // Sunday
      lastDay.setDate(lastDay.getDate() - 2); // Go back to Friday
    } else if (dayOfWeekEnd === 6) { // Saturday
      lastDay.setDate(lastDay.getDate() - 1); // Go back to Friday
    } else if (dayOfWeekEnd < 5) { // Monday-Thursday
      lastDay.setDate(lastDay.getDate() + (5 - dayOfWeekEnd)); // Go forward to Friday
    }
  } else {
    // Find the last Sunday on or after endDate
    const daysToSunday = lastDay.getDay() === 0 ? 0 : 7 - lastDay.getDay();
    lastDay.setDate(lastDay.getDate() + daysToSunday);
  }
  
  const currentDate = new Date(firstDay);
  let termWeekNumber = 1;
  
  while (currentDate <= lastDay) {
    html += `<div class="${weekClass}">`;
    
    // Add week number for term view
    if (showTermWeeks) {
      html += `<div class="week-number">Week ${termWeekNumber}</div>`;
    }
    
    // Build array of days for this week
    const weekDays = [];
    for (let i = 0; i < 7; i++) {
      const dayDate = new Date(currentDate);
      dayDate.setDate(dayDate.getDate() + i);
      weekDays.push(dayDate);
    }
    
    // Get all events for this week and categorize them
    const weekEvents = getWeekEvents(events, weekDays);
    
    // Render each day (skip weekends if hidden)
    for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
      const dayDate = weekDays[dayIndex];
      const dayOfWeekNum = dayDate.getDay();
      const isWeekend = dayOfWeekNum === 0 || dayOfWeekNum === 6;
      
      // Skip weekends if hideWeekends is enabled
      if (hideWeekends && isWeekend) continue;
      
      const dayEventsData = weekEvents[dayIndex];
      const isOtherMonth = dayDate < startDate || dayDate > endDate;
      
      let dayClass = 'calendar-day';
      if (isOtherMonth) dayClass += ' other-month';
      if (isWeekend) dayClass += ' weekend';
      
      html += `<div class="${dayClass}">`;
      html += `<div class="day-number">${dayDate.getDate()}<span class="month-abbr"> ${getMonthAbbr(dayDate)}</span></div>`;
      html += '<div class="day-events">';
      
      // Multi-day events (show on all days they span)
      dayEventsData.multiDay.forEach(eventInfo => {
        const event = eventInfo.event;
        const bgColor = event.backgroundColor || '#e9ecef';
        const time = event.allDay ? '' : formatTime(event.startDate);
        
        html += `<div class="calendar-event" style="border-left-color: ${bgColor}; background-color: ${bgColor}; color: white; font-weight: 500;">`;
        if (time && eventInfo.isStartDay) {
          html += `<span class="event-time">${time}</span>`;
        }
        html += escapeHtml(event.title);
        if (!eventInfo.isStartDay) html += ' →';
        html += '</div>';
      });
      
      // Single day events
      dayEventsData.singleDay.forEach(event => {
        const bgColor = event.backgroundColor || '#e9ecef';
        const time = event.allDay ? '' : formatTime(event.startDate);
        html += `<div class="calendar-event" style="border-left-color: ${bgColor}; background-color: ${bgColor}22;">`;
        if (time) html += `<span class="event-time">${time}</span>`;
        html += escapeHtml(event.title);
        html += '</div>';
      });
      
      html += '</div></div>';
    }
    
    html += '</div>';
    currentDate.setDate(currentDate.getDate() + 7);
    termWeekNumber++;
  }
  
  html += '</div>';
  return html;
}

// Get all events for a week, categorized by day
function getWeekEvents(events, weekDays) {
  const weekEvents = weekDays.map(() => ({ multiDay: [], singleDay: [] }));
  
  events.forEach(event => {
    const eventStart = new Date(event.startDate);
    eventStart.setHours(0, 0, 0, 0);
    const eventEnd = new Date(event.endDate);
    eventEnd.setHours(23, 59, 59, 999);
    
    const isMultiDay = !isSameDay(event.startDate, event.endDate);
    
    weekDays.forEach((dayDate, dayIndex) => {
      const checkDate = new Date(dayDate);
      checkDate.setHours(12, 0, 0, 0);
      
      // Check if event occurs on this day
      if (checkDate >= eventStart && checkDate <= eventEnd) {
        if (isMultiDay) {
          weekEvents[dayIndex].multiDay.push({
            event: event,
            isStartDay: isSameDay(event.startDate, dayDate),
            isEndDay: isSameDay(event.endDate, dayDate)
          });
        } else if (isSameDay(event.startDate, dayDate)) {
          weekEvents[dayIndex].singleDay.push(event);
        }
      }
    });
  });
  
  return weekEvents;
}

// Weekly list view
function renderWeeklyView(events) {
  const content = document.getElementById('calendarContent');
  const weeks = groupByWeek(events);
  
  let html = '';
  weeks.forEach((weekEvents, weekKey) => {
    const [year, week] = weekKey.split('-W');
    const weekStart = getDateOfWeek(parseInt(week), parseInt(year));
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    
    html += `<div class="week">`;
    html += `<div class="week-header">Week ${week}, ${year} (${formatDate(weekStart)} - ${formatDate(weekEnd)})</div>`;
    
    const dayGroups = groupByDay(weekEvents);
    dayGroups.forEach((dayEvents, dayKey) => {
      const date = new Date(dayKey);
      html += `<div class="day">`;
      html += `<div class="day-header">${formatDayHeader(date)}</div>`;
      
      if (dayEvents.length === 0) {
        html += `<div class="no-events">No events</div>`;
      } else {
        dayEvents.forEach(event => {
          html += formatEvent(event);
        });
      }
      html += `</div>`;
    });
    html += `</div>`;
  });
  
  content.innerHTML = html || '<p class="no-events">No events to display</p>';
}

// Daily list view
function renderDailyView(events) {
  const content = document.getElementById('calendarContent');
  const dayGroups = groupByDay(events);
  
  let html = '';
  dayGroups.forEach((dayEvents, dayKey) => {
    const date = new Date(dayKey);
    html += `<div class="week">`;
    html += `<div class="week-header">${formatDayHeader(date)}</div>`;
    
    if (dayEvents.length === 0) {
      html += `<div class="no-events">No events</div>`;
    } else {
      dayEvents.forEach(event => {
        html += formatEvent(event);
      });
    }
    html += `</div>`;
  });
  
  content.innerHTML = html || '<p class="no-events">No events to display</p>';
}

// Format event for list views
function formatEvent(event) {
  const bgColor = event.backgroundColor || '#e9ecef';
  const textColor = event.textColor || '#000';
  const time = event.allDay 
    ? 'All Day' 
    : `${formatTime(event.startDate)} - ${formatTime(event.endDate)}`;
  
  return `
    <div class="event" style="border-left-color: ${bgColor}; background-color: ${bgColor}22;">
      <div class="event-title" style="color: ${textColor};">${escapeHtml(event.title)}</div>
      <div class="event-time">${time}</div>
      ${event.location ? `<div class="event-description">📍 ${escapeHtml(event.location)}</div>` : ''}
      ${event.description ? `<div class="event-description">${escapeHtml(event.description)}</div>` : ''}
    </div>
  `;
}

// Grouping functions
function groupByWeek(events) {
  const groups = new Map();
  events.forEach(event => {
    const weekKey = getWeekKey(event.startDate);
    if (!groups.has(weekKey)) {
      groups.set(weekKey, []);
    }
    groups.get(weekKey).push(event);
  });
  return groups;
}

function groupByDay(events) {
  const groups = new Map();
  events.forEach(event => {
    const dayKey = event.startDate.toISOString().split('T')[0];
    if (!groups.has(dayKey)) {
      groups.set(dayKey, []);
    }
    groups.get(dayKey).push(event);
  });
  return new Map([...groups.entries()].sort());
}

function groupByMonth(events) {
  const groups = new Map();
  events.forEach(event => {
    const monthKey = `${event.startDate.getFullYear()}-${String(event.startDate.getMonth() + 1).padStart(2, '0')}`;
    if (!groups.has(monthKey)) {
      groups.set(monthKey, []);
    }
    groups.get(monthKey).push(event);
  });
  return new Map([...groups.entries()].sort());
}

// Utility functions
function isSameDay(date1, date2) {
  return date1.getFullYear() === date2.getFullYear() &&
         date1.getMonth() === date2.getMonth() &&
         date1.getDate() === date2.getDate();
}

function getWeekKey(date) {
  const weekNum = getWeekNumber(date);
  return `${date.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

function getWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

function getDateOfWeek(week, year) {
  const simple = new Date(year, 0, 1 + (week - 1) * 7);
  const dow = simple.getDay();
  const ISOweekStart = simple;
  if (dow <= 4) {
    ISOweekStart.setDate(simple.getDate() - simple.getDay() + 1);
  } else {
    ISOweekStart.setDate(simple.getDate() + 8 - simple.getDay());
  }
  return ISOweekStart;
}

function formatDate(date) {
  return date.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });
}

function formatDayHeader(date) {
  return date.toLocaleDateString('en-AU', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
}

function formatTime(date) {
  return date.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function getMonthAbbr(date) {
  return date.toLocaleDateString('en-AU', { month: 'short' });
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}