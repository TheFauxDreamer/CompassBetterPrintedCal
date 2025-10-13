// Store the latest calendar and term data
let latestCalendarData = null;
let latestTermData = null;

console.log('Calendar Extension: Background script loaded');

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Background received message:', message.type);
  
  if (message.type === 'CALENDAR_DATA') {
    latestCalendarData = {
      events: message.data,
      timestamp: message.timestamp
    };
    console.log('✓ Calendar data stored in background:', latestCalendarData.events.length, 'events');
    sendResponse({ success: true });
  } else if (message.type === 'TERM_DATA') {
    latestTermData = {
      terms: message.data,
      timestamp: message.timestamp
    };
    console.log('✓ Term data stored in background:', latestTermData.terms.length, 'terms');
    sendResponse({ success: true });
  } else if (message.type === 'GET_CALENDAR_DATA') {
    console.log('Sending calendar data:', latestCalendarData ? latestCalendarData.events.length : 0, 'events');
    sendResponse(latestCalendarData);
  } else if (message.type === 'GET_TERM_DATA') {
    console.log('Sending term data:', latestTermData ? latestTermData.terms.length : 0, 'terms');
    sendResponse(latestTermData);
  } else if (message.type === 'GET_ALL_DATA') {
    const allData = {
      calendar: latestCalendarData,
      terms: latestTermData
    };
    console.log('Sending all data:', {
      calendar: allData.calendar ? allData.calendar.events.length : 0,
      terms: allData.terms ? allData.terms.terms.length : 0
    });
    sendResponse(allData);
  }
  return true;
});