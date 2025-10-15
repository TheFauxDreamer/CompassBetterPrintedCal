// Inject the interceptor script into the main world
(function() {
  const script = document.createElement('script');
  script.src = chrome.runtime.getURL('interceptor.js');
  script.onload = function() {
    this.remove();
    console.log('[INJECTOR] ✓ Interceptor script injected');
  };
  (document.head || document.documentElement).appendChild(script);
  
  console.log('[INJECTOR] Script running');
})();

// Listen for capture requests from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'CHECK_VIEW') {
    // Check if Term view is active by looking for the pressed Term button
    const termButton = document.getElementById('calendar-manager-tb-multiweek');
    const isTermView = termButton && termButton.classList.contains('x-pressed');
    
    console.log('[INJECTOR] View check:', {
      termButtonFound: !!termButton,
      isPressed: isTermView,
      classes: termButton ? termButton.className : 'not found'
    });
    
    sendResponse({ isTermView: isTermView });
    return true;
  }
  
  if (message.type === 'MANUAL_CAPTURE') {
    console.log('');
    console.log('════════════════════════════════════════════════════════');
    console.log('[INJECTOR] Manual capture requested from popup');
    console.log('════════════════════════════════════════════════════════');
    
    let responseReceived = false;
    let layerDataToSend = null;
    
    // Listen for the response from main world
    const eventHandler = (event) => {
      if (event.type === 'calendarExtensionDataReady') {
        responseReceived = true;
        window.removeEventListener('calendarExtensionDataReady', eventHandler);
        
        const detail = event.detail || {};
        const calendarData = detail.calendarData || null;
        const termData = detail.termData || null;
        const layerData = detail.calendarLayers || null;
        
        layerDataToSend = layerData; // Store for sending
        
        console.log('[INJECTOR] ← Received data from main world:');
        console.log(`  • Calendar: ${calendarData ? calendarData.length + ' events ✓' : '❌ none'}`);
        console.log(`  • Terms: ${termData ? termData.length + ' terms ✓' : '❌ none'}`);
        console.log(`  • Layers: ${layerData ? layerData.length + ' layers ✓' : '❌ none'}`);
        
        if (layerData && layerData.length > 0) {
          console.log('[INJECTOR] Layer details:');
          layerData.forEach((layer, i) => {
            console.log(`    ${i + 1}. "${layer.name}" (${layer.color})`);
          });
        } else {
          console.error('[INJECTOR] ❌ NO LAYER DATA RECEIVED FROM MAIN WORLD!');
          console.error('[INJECTOR] This means the extraction failed.');
          console.error('[INJECTOR] Check the logs above for extraction errors.');
        }
        
        const timestamp = new Date().toISOString();
        const promises = [];
        
        // Send calendar data
        if (calendarData) {
          console.log('[INJECTOR] → Sending calendar data to background...');
          promises.push(
            new Promise((resolve) => {
              chrome.runtime.sendMessage({
                type: 'CALENDAR_DATA',
                data: calendarData,
                timestamp: timestamp
              }, (response) => {
                console.log('[INJECTOR]   ✓ Calendar data sent:', response);
                resolve();
              });
            })
          );
        }
        
        // Send term data
        if (termData) {
          console.log('[INJECTOR] → Sending term data to background...');
          promises.push(
            new Promise((resolve) => {
              chrome.runtime.sendMessage({
                type: 'TERM_DATA',
                data: termData,
                timestamp: timestamp
              }, (response) => {
                console.log('[INJECTOR]   ✓ Term data sent:', response);
                resolve();
              });
            })
          );
        }
        
        // Send layer data - THIS IS CRITICAL!
        if (layerData && layerData.length > 0) {
          console.log('[INJECTOR] → Sending LAYER data to background...');
          console.log('[INJECTOR]   Sending', layerData.length, 'layers:');
          layerData.forEach((layer, i) => {
            console.log(`[INJECTOR]     ${i + 1}. "${layer.name}" (${layer.color})`);
          });
          
          promises.push(
            new Promise((resolve) => {
              chrome.runtime.sendMessage({
                type: 'LAYER_DATA',
                data: layerData,
                timestamp: timestamp
              }, (response) => {
                console.log('[INJECTOR]   ✓✓✓ LAYER DATA SENT SUCCESSFULLY! ✓✓✓');
                console.log('[INJECTOR]   Background response:', response);
                resolve();
              });
            })
          );
        } else {
          console.error('[INJECTOR] ✗✗✗ NOT SENDING LAYER DATA (none available) ✗✗✗');
        }
        
        // Wait for all sends to complete, then respond to popup
        Promise.all(promises).then(() => {
          const response = {
            success: true,
            hasCalendar: !!calendarData,
            hasTerms: !!termData,
            hasLayers: !!layerData,
            calendarCount: calendarData ? calendarData.length : 0,
            termCount: termData ? termData.length : 0,
            layerCount: layerData ? layerData.length : 0
          };
          
          console.log('[INJECTOR] → Responding to popup:', response);
          console.log('════════════════════════════════════════════════════════');
          console.log('');
          sendResponse(response);
        });
      }
    };
    
    window.addEventListener('calendarExtensionDataReady', eventHandler);
    
    // Request data from main world
    console.log('[INJECTOR] → Requesting data from main world...');
    window.dispatchEvent(new CustomEvent('calendarExtensionRequest'));
    
    // Timeout fallback
    setTimeout(() => {
      if (!responseReceived) {
        console.error('');
        console.error('✗✗✗✗✗✗✗✗✗✗✗✗✗✗✗✗✗✗✗✗✗✗✗✗✗✗✗✗✗✗✗✗✗✗✗✗✗✗✗✗✗✗✗✗✗✗✗✗✗✗✗✗');
        console.error('✗  TIMEOUT - No response from main world!              ✗');
        console.error('✗  The interceptor script may not have loaded.         ✗');
        console.error('✗  Try refreshing the page and trying again.           ✗');
        console.error('✗✗✗✗✗✗✗✗✗✗✗✗✗✗✗✗✗✗✗✗✗✗✗✗✗✗✗✗✗✗✗✗✗✗✗✗✗✗✗✗✗✗✗✗✗✗✗✗✗✗✗✗');
        console.error('');
        
        window.removeEventListener('calendarExtensionDataReady', eventHandler);
        sendResponse({
          success: false,
          hasCalendar: false,
          hasTerms: false,
          hasLayers: false,
          calendarCount: 0,
          termCount: 0,
          layerCount: 0,
          error: 'Timeout'
        });
      }
    }, 3000);
    
    return true; // Keep channel open for async response
  }
  
  return true;
});