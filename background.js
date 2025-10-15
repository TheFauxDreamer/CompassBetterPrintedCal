// Store the latest calendar and term data
let latestCalendarData = null;
let latestTermData = null;
let latestLayerData = null;

console.log('═══════════════════════════════════════════════════════════');
console.log('Calendar Extension: Background script loaded');
console.log('═══════════════════════════════════════════════════════════');

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[BACKGROUND] Message received:', message.type);
  
  if (message.type === 'CALENDAR_DATA') {
    latestCalendarData = {
      events: message.data,
      timestamp: message.timestamp
    };
    console.log('[BACKGROUND] ✓ Stored', latestCalendarData.events.length, 'calendar events');
    sendResponse({ success: true });
    
  } else if (message.type === 'TERM_DATA') {
    latestTermData = {
      terms: message.data,
      timestamp: message.timestamp
    };
    console.log('[BACKGROUND] ✓ Stored', latestTermData.terms.length, 'terms');
    sendResponse({ success: true });
    
  } else if (message.type === 'LAYER_DATA') {
    console.log('');
    console.log('▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓');
    console.log('▓  LAYER DATA RECEIVED IN BACKGROUND!                    ▓');
    console.log('▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓');
    
    latestLayerData = {
      layers: message.data,
      timestamp: message.timestamp
    };
    
    console.log('[BACKGROUND] ✓✓✓ Stored', latestLayerData.layers.length, 'layers:');
    latestLayerData.layers.forEach((layer, i) => {
      console.log(`  ${i + 1}. "${layer.name}" (${layer.color})`);
    });
    
    console.log('▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓');
    console.log('');
    
    sendResponse({ success: true });
    
  } else if (message.type === 'GET_CALENDAR_DATA') {
    const count = latestCalendarData ? latestCalendarData.events.length : 0;
    console.log('[BACKGROUND] → Sending', count, 'calendar events');
    sendResponse(latestCalendarData);
    
  } else if (message.type === 'GET_TERM_DATA') {
    const count = latestTermData ? latestTermData.terms.length : 0;
    console.log('[BACKGROUND] → Sending', count, 'terms');
    sendResponse(latestTermData);
    
  } else if (message.type === 'GET_ALL_DATA') {
    console.log('');
    console.log('╔═══════════════════════════════════════════════════════════╗');
    console.log('║  GET_ALL_DATA Request                                     ║');
    console.log('╚═══════════════════════════════════════════════════════════╝');
    
    const allData = {
      calendar: latestCalendarData,
      terms: latestTermData,
      layers: latestLayerData
    };
    
    console.log('[BACKGROUND] Sending:');
    console.log(`  • Calendar: ${allData.calendar ? allData.calendar.events.length + ' events ✓' : '❌ none'}`);
    console.log(`  • Terms: ${allData.terms ? allData.terms.terms.length + ' terms ✓' : '❌ none'}`);
    console.log(`  • Layers: ${allData.layers ? allData.layers.layers.length + ' layers ✓' : '❌ none'}`);
    
    if (allData.layers && allData.layers.layers) {
      console.log('[BACKGROUND] Layer names being sent:');
      allData.layers.layers.forEach((layer, i) => {
        console.log(`    ${i + 1}. "${layer.name}" (${layer.color})`);
      });
    } else {
      console.error('[BACKGROUND] ❌ NO LAYER DATA AVAILABLE TO SEND!');
      console.error('[BACKGROUND] This means LAYER_DATA was never received.');
      console.error('[BACKGROUND] Did you click "Capture Calendar Data" first?');
    }
    
    console.log('');
    sendResponse(allData);
  }
  
  return true;
});