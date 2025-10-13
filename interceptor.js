// This script runs in the Compass webpage and can intercept XHR
(function() {
  console.log('Calendar Extension: Interceptor loaded in Compass Webpage');
  
  // Storage for captured responses
  window.__calendarExtension__ = {
    calendarData: null,
    termData: null,
    debug: {
      allRequests: []
    }
  };
  
  // Listen for data requests via custom events (CSP-safe)
  window.addEventListener('calendarExtensionRequest', function() {
    console.log('[COMPASS WEBPAGE] Received request for data');
    const data = window.__calendarExtension__;
    console.log('[COMPASS WEBPAGE] Calendar data:', data.calendarData ? data.calendarData.length + ' events' : 'null');
    console.log('[COMPASS WEBPAGE] Term data:', data.termData ? data.termData.length + ' terms' : 'null');
    
    // Dispatch response with the data
    window.dispatchEvent(new CustomEvent('calendarExtensionDataReady', {
      detail: {
        calendarData: data.calendarData,
        termData: data.termData
      }
    }));
    console.log('[COMPASS WEBPAGE] Data dispatched via custom event');
  });
  
  // Intercept XMLHttpRequest
  const originalOpen = XMLHttpRequest.prototype.open;
  const originalSend = XMLHttpRequest.prototype.send;
  
  XMLHttpRequest.prototype.open = function(method, url, ...rest) {
    this.__url = url;
    this.__method = method;
    console.log('[XHR OPEN]', method, url);
    return originalOpen.call(this, method, url, ...rest);
  };
  
  XMLHttpRequest.prototype.send = function(...args) {
    const xhr = this;
    
    // Add our handler
    xhr.addEventListener('load', function() {
      console.log('[XHR LOAD]', xhr.__method, xhr.__url, 'Status:', xhr.status);
      console.log('[XHR RESPONSE TYPE]', typeof xhr.responseText, 'Length:', xhr.responseText?.length);
      
      // Store in debug log
      window.__calendarExtension__.debug.allRequests.push({
        method: xhr.__method,
        url: xhr.__url,
        status: xhr.status,
        responseLength: xhr.responseText?.length,
        timestamp: new Date().toISOString()
      });
      
      try {
        if (xhr.__url && xhr.__url.toLowerCase().includes('getcalendareventsby')) {
          console.log('[CALENDAR] Found calendar request!');
          console.log('[CALENDAR] Response text (first 500 chars):', xhr.responseText?.substring(0, 500));
          
          const response = JSON.parse(xhr.responseText);
          console.log('[CALENDAR] Parsed response:', response);
          console.log('[CALENDAR] Has .d property?', !!response.d);
          console.log('[CALENDAR] Is .d an array?', Array.isArray(response.d));
          
          if (response && response.d && Array.isArray(response.d)) {
            window.__calendarExtension__.calendarData = response.d;
            console.log('✓ ✓ ✓ Intercepted calendar data:', response.d.length, 'events');
          } else {
            console.warn('[CALENDAR] Response structure not as expected:', response);
          }
        } else if (xhr.__url && xhr.__url.toLowerCase().includes('getallterms')) {
          console.log('[TERMS] Found terms request!');
          const response = JSON.parse(xhr.responseText);
          console.log('[TERMS] Parsed response:', response);
          
          if (response && response.d && Array.isArray(response.d)) {
            window.__calendarExtension__.termData = response.d;
            console.log('✓ ✓ ✓ Intercepted term data:', response.d.length, 'terms');
          }
        }
      } catch (e) {
        console.error('[PARSE ERROR]', xhr.__url, e);
      }
    });
    
    return originalSend.apply(this, args);
  };
  
  // Intercept fetch as well
  const originalFetch = window.fetch;
  window.fetch = function(...args) {
    const url = typeof args[0] === 'string' ? args[0] : args[0].url;
    console.log('[FETCH]', url);
    
    return originalFetch.apply(this, args).then(response => {
      // Clone the response so we can read it without affecting the original
      const clonedResponse = response.clone();
      
      if (url && url.toLowerCase().includes('getcalendareventsby')) {
        console.log('[FETCH CALENDAR] Found calendar request!');
        clonedResponse.json().then(data => {
          console.log('[FETCH CALENDAR] Parsed data:', data);
          if (data && data.d && Array.isArray(data.d)) {
            window.__calendarExtension__.calendarData = data.d;
            console.log('✓ ✓ ✓ Intercepted calendar data (fetch):', data.d.length, 'events');
          }
        }).catch(e => {
          console.error('[FETCH CALENDAR ERROR]', e);
        });
      } else if (url && url.toLowerCase().includes('getallterms')) {
        console.log('[FETCH TERMS] Found terms request!');
        clonedResponse.json().then(data => {
          if (data && data.d && Array.isArray(data.d)) {
            window.__calendarExtension__.termData = data.d;
            console.log('✓ ✓ ✓ Intercepted term data (fetch):', data.d.length, 'terms');
          }
        }).catch(e => {
          console.error('[FETCH TERMS ERROR]', e);
        });
      }
      
      return response;
    });
  };
  
  console.log('✓ XHR and Fetch interception active');
  console.log('✓ Custom event listener registered');
  console.log('✓ To debug, check: window.__calendarExtension__.debug.allRequests');
})();