let allEvents = [];
let allTerms = [];
let currentView = 'weekly';

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
        // Parse DD/MM/YYYY format
        startDate: parseAUDate(term.s),
        endDate: parseAUDate(term.f),
        name: term.n,
        year: term.cy,
        id: term.id
      })).sort((a, b) => a.startDate - b.startDate);
    }
    
    populateTermFilter();
    renderCalendar();
  } else {
    document.getElementById('calendarContent').innerHTML = 
      '<p style="color: #999; text-align: center;">No calendar data available. Please visit your calendar page first.</p>';
  }
});

// Parse Australian date format DD/MM/YYYY
function parseAUDate(dateStr) {
  const parts = dateStr.split('/');
  return new Date(parts[2], parts[1] - 1, parts[0]);
}

// Populate term filter
function populateTermFilter() {
  const termFilter = document.getElementById('termFilter');
  
  // Add terms if available
  if (allTerms.length > 0) {
    allTerms.forEach(term => {
      const option = document.createElement('option');
      option.value = `term-${term.id}`;
      option.textContent = `${term.name} ${term.year}`;
      termFilter.appendChild(option);
    });
  }
  
  // Add years as fallback
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
  let filteredEvents = allEvents;
  
  // Filter by term or year
  if (termFilterValue !== 'all') {
    if (termFilterValue.startsWith('term-')) {
      const termId = parseInt(termFilterValue.replace('term-', ''));
      const term = allTerms.find(t => t.id === termId);
      if (term) {
        filteredEvents = allEvents.filter(e => 
          e.startDate >= term.startDate && e.startDate <= term.endDate
        );
        document.getElementById('calendarTitle').textContent = `${term.name} ${term.year} Calendar`;
      }
    } else if (termFilterValue.startsWith('year-')) {
      const year = parseInt(termFilterValue.replace('year-', ''));
      filteredEvents = allEvents.filter(e => e.startDate.getFullYear() === year);
      document.getElementById('calendarTitle').textContent = `${year} School Calendar`;
    }
  } else {
    document.getElementById('calendarTitle').textContent = 'School Term Calendar';
  }

  if (currentView === 'weekly') {
    renderWeeklyView(filteredEvents);
  } else if (currentView === 'daily') {
    renderDailyView(filteredEvents);
  } else if (currentView === 'monthly') {
    renderMonthlyView(filteredEvents);
  } else if (currentView === 'term') {
    renderTermView(filteredEvents);
  }
}

// Weekly view
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

// Daily view
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

// Monthly view
function renderMonthlyView(events) {
  const content = document.getElementById('calendarContent');
  const monthGroups = groupByMonth(events);
  
  let html = '';
  monthGroups.forEach((monthEvents, monthKey) => {
    const [year, month] = monthKey.split('-');
    const monthName = new Date(year, month - 1).toLocaleString('default', { month: 'long', year: 'numeric' });
    
    html += `<div class="week">`;
    html += `<div class="week-header">${monthName}</div>`;
    
    const dayGroups = groupByDay(monthEvents);
    dayGroups.forEach((dayEvents, dayKey) => {
      const date = new Date(dayKey);
      html += `<div class="day">`;
      html += `<div class="day-header">${formatDayHeader(date)}</div>`;
      
      dayEvents.forEach(event => {
        html += formatEvent(event);
      });
      html += `</div>`;
    });
    html += `</div>`;
  });
  
  content.innerHTML = html || '<p class="no-events">No events to display</p>';
}

// Term view - organised by terms
function renderTermView(events) {
  const content = document.getElementById('calendarContent');
  
  if (allTerms.length === 0) {
    content.innerHTML = '<p class="no-events">No term data available. Showing all events.</p>';
    renderWeeklyView(events);
    return;
  }
  
  let html = '';
  
  allTerms.forEach(term => {
    const termEvents = events.filter(e => 
      e.startDate >= term.startDate && e.startDate <= term.endDate
    );
    
    if (termEvents.length > 0) {
      html += `<div class="week">`;
      html += `<div class="week-header">${term.name} ${term.year} (${formatDate(term.startDate)} - ${formatDate(term.endDate)})</div>`;
      
      const weekGroups = groupByWeek(termEvents);
      weekGroups.forEach((weekEvents, weekKey) => {
        const [year, week] = weekKey.split('-W');
        const weekStart = getDateOfWeek(parseInt(week), parseInt(year));
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);
        
        html += `<div style="margin-left: 20px; margin-top: 15px;">`;
        html += `<div style="font-weight: 600; color: #666; margin-bottom: 8px;">Week ${week} (${formatDate(weekStart)} - ${formatDate(weekEnd)})</div>`;
        
        const dayGroups = groupByDay(weekEvents);
        dayGroups.forEach((dayEvents, dayKey) => {
          const date = new Date(dayKey);
          html += `<div class="day">`;
          html += `<div class="day-header">${formatDayHeader(date)}</div>`;
          
          dayEvents.forEach(event => {
            html += formatEvent(event);
          });
          html += `</div>`;
        });
        html += `</div>`;
      });
      html += `</div>`;
    }
  });
  
  content.innerHTML = html || '<p class="no-events">No events to display</p>';
}

// Format event
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

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}