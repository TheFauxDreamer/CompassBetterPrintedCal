// Inject the interceptor script into the Compass webpage
(function() {
  const script = document.createElement('script');
  script.src = chrome.runtime.getURL('interceptor.js');
  script.onload = function() {
    this.remove();
    console.log('✓ Interceptor script injected and loaded');
  };
  (document.head || document.documentElement).appendChild(script);
  
  console.log('Calendar Extension: Injector script running');
})();

// Listen for capture requests from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Injector received message:', message);
  
  if (message.type === 'MANUAL_CAPTURE') {
    console.log('Processing manual capture - retrieving from Compass webpage...');
    
    // Use a custom event to communicate with Compass webpage without violating CSP
    let responseReceived = false;
    
    // Listen for the response first
    const eventHandler = (event) => {
      console.log('[INJECTOR] Received custom event:', event.type);
      if (event.type === 'calendarExtensionDataReady') {
        responseReceived = true;
        window.removeEventListener('calendarExtensionDataReady', eventHandler);
        
        const { calendarData, termData } = event.detail;
        console.log('[INJECTOR] Retrieved from Compass webpage:', {
          calendar: calendarData?.length || 0,
          terms: termData?.length || 0
        });
        
        const timestamp = new Date().toISOString();
        
        // Send to background
        if (calendarData) {
          console.log('[INJECTOR] Sending calendar data to background...');
          chrome.runtime.sendMessage({
            type: 'CALENDAR_DATA',
            data: calendarData,
            timestamp: timestamp
          });
        } else {
          console.warn('[INJECTOR] No calendar data to send');
        }
        
        if (termData) {
          console.log('[INJECTOR] Sending term data to background...');
          chrome.runtime.sendMessage({
            type: 'TERM_DATA',
            data: termData,
            timestamp: timestamp
          });
        } else {
          console.warn('[INJECTOR] No term data to send');
        }
        
        const response = {
          success: true,
          hasCalendar: !!calendarData,
          hasTerms: !!termData,
          calendarCount: calendarData?.length || 0,
          termCount: termData?.length || 0
        };
        
        console.log('[INJECTOR] Sending response to popup:', response);
        sendResponse(response);
      }
    };
    
    window.addEventListener('calendarExtensionDataReady', eventHandler);
    
    // Dispatch event to request data from Compass webpage
    console.log('[INJECTOR] Dispatching request event...');
    window.dispatchEvent(new CustomEvent('calendarExtensionRequest'));
    
    // Timeout fallback
    setTimeout(() => {
      if (!responseReceived) {
        console.error('[INJECTOR] Timeout - no response from Compass webpage');
        window.removeEventListener('calendarExtensionDataReady', eventHandler);
        sendResponse({
          success: false,
          hasCalendar: false,
          hasTerms: false,
          calendarCount: 0,
          termCount: 0,
          error: 'Timeout waiting for Compass webpage response'
        });
      }
    }, 2000);
    
    return true; // Keep channel open
  }
  
  return true;
});