// Content script to extract already-loaded XHR data
console.log('Calendar Extension: Content script loaded');

// Listen for manual capture request from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Content script received message:', message);
  
  if (message.type === 'MANUAL_CAPTURE') {
    console.log('Processing manual capture - accessing performance entries...');
    
    // Get all network requests from Performance API
    const performanceEntries = performance.getEntries();
    console.log('Total performance entries:', performanceEntries.length);
    
    // Log all XHR/fetch requests for debugging
    const xhrEntries = performanceEntries.filter(entry => 
      entry.initiatorType === 'xmlhttprequest' || entry.initiatorType === 'fetch'
    );
    console.log('XHR/Fetch entries found:', xhrEntries.length);
    xhrEntries.forEach(entry => {
      console.log('  -', entry.name);
    });
    
    let calendarData = null;
    let termData = null;
    
    // Look for the calendar and term XHR requests (case-insensitive partial match)
    const calendarEntry = performanceEntries.find(entry => 
      entry.name && entry.name.toLowerCase().includes('getcalendareventsby')
    );
    
    const termEntry = performanceEntries.find(entry => 
      entry.name && entry.name.toLowerCase().includes('getallterms')
    );
    
    console.log('Found calendar entry:', !!calendarEntry, calendarEntry?.name);
    console.log('Found term entry:', !!termEntry, termEntry?.name);
    
    // Fetch the responses from the browser cache
    const promises = [];
    
    if (calendarEntry) {
      console.log('Attempting to fetch calendar data from:', calendarEntry.name);
      promises.push(
        fetch(calendarEntry.name, {
          credentials: 'include',
          headers: {
            'Accept': 'application/json'
          }
        })
          .then(response => {
            console.log('Calendar fetch response status:', response.status);
            return response.json();
          })
          .then(data => {
            console.log('Calendar data parsed:', data);
            if (data && data.d && Array.isArray(data.d)) {
              calendarData = data.d;
              console.log('✓ Calendar data fetched:', calendarData.length, 'events');
            } else {
              console.warn('Calendar data structure unexpected:', data);
            }
          })
          .catch(err => {
            console.error('Failed to fetch calendar data:', err);
            console.error('Error details:', err.message, err.stack);
          })
      );
    } else {
      console.warn('No calendar entry found. Searching for similar URLs...');
      const allUrls = performanceEntries.map(e => e.name).filter(n => n);
      const possibleCalendarUrls = allUrls.filter(url => 
        url.toLowerCase().includes('calendar') || 
        url.toLowerCase().includes('event')
      );
      console.log('Possible calendar URLs:', possibleCalendarUrls);
    }
    
    if (termEntry) {
      console.log('Attempting to fetch term data from:', termEntry.name);
      promises.push(
        fetch(termEntry.name, {
          credentials: 'include',
          headers: {
            'Accept': 'application/json'
          }
        })
          .then(response => {
            console.log('Term fetch response status:', response.status);
            return response.json();
          })
          .then(data => {
            console.log('Term data parsed:', data);
            if (data && data.d && Array.isArray(data.d)) {
              termData = data.d;
              console.log('✓ Term data fetched:', termData.length, 'terms');
            }
          })
          .catch(err => console.error('Failed to fetch term data:', err))
      );
    }
    
    // Wait for all fetches to complete
    Promise.all(promises).finally(() => {
      const timestamp = new Date().toISOString();
      
      // Send captured data to background script
      if (calendarData) {
        console.log('Sending calendar data to background...');
        chrome.runtime.sendMessage({
          type: 'CALENDAR_DATA',
          data: calendarData,
          timestamp: timestamp
        });
      } else {
        console.warn('No calendar data to send to background');
      }
      
      if (termData) {
        console.log('Sending term data to background...');
        chrome.runtime.sendMessage({
          type: 'TERM_DATA',
          data: termData,
          timestamp: timestamp
        });
      }
      
      // Send response back to popup
      const responseData = {
        success: true,
        hasCalendar: !!calendarData,
        hasTerms: !!termData,
        calendarCount: calendarData ? calendarData.length : 0,
        termCount: termData ? termData.length : 0
      };
      
      console.log('Sending response to popup:', responseData);
      sendResponse(responseData);
    });
    
    return true; // Keep message channel open for async response
  }
  
  return true;
});