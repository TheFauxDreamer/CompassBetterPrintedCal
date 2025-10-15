// This script runs in the MAIN world and can intercept XHR
(function() {
  console.log('='.repeat(60));
  console.log('CALENDAR EXTENSION: Interceptor loaded in main world');
  console.log('Current URL:', window.location.href);
  console.log('='.repeat(60));
  
  // Storage for captured responses
  window.__calendarExtension__ = {
    calendarData: null,
    termData: null,
    calendarLayers: null,
    debug: {
      allRequests: []
    }
  };
  
  // Simple, robust function to extract calendar layer names from the DOM
  function extractCalendarLayers() {
    console.log('');
    console.log('╔═══════════════════════════════════════════════════════════╗');
    console.log('║         EXTRACTING CALENDAR LAYERS FROM HTML             ║');
    console.log('╚═══════════════════════════════════════════════════════════╝');
    
    const layers = [];
    
    // Try to find the calendar list - try multiple approaches
    console.log('→ Searching for calendar list container...');
    
    // Approach 1: Look for any li.ext-cal-evr elements first
    const allLayerElements = document.querySelectorAll('li.ext-cal-evr');
    console.log(`  Found ${allLayerElements.length} li.ext-cal-evr elements on page`);
    
    if (allLayerElements.length === 0) {
      console.error('✗ NO ELEMENTS FOUND! The calendar list might not be visible.');
      console.log('  Troubleshooting:');
      console.log('  1. Make sure you are on the calendar page');
      console.log('  2. Make sure the calendar layer list is visible (left sidebar)');
      console.log('  3. Try refreshing the page');
      console.log('╚═══════════════════════════════════════════════════════════╝');
      return layers;
    }
    
    // Now filter to only get the ones in the actual layer list (not events)
    console.log('→ Filtering layer list elements (excluding calendar events)...');
    
    let layerListElements = [];
    
    // Find the container with id containing "calendarlist" and ending with "-body"
    // BUT exclude the header (which has _header-body in the ID)
    const allContainers = document.querySelectorAll('[id*="calendarlist"][id$="-body"]');
    console.log(`  Found ${allContainers.length} total containers with "calendarlist" and "-body"`);
    
    // Show all containers found
    if (allContainers.length > 0) {
      console.log('  All containers found:');
      allContainers.forEach((c, i) => {
        const elementCount = c.querySelectorAll('li.ext-cal-evr').length;
        console.log(`    ${i + 1}. ${c.id} (${elementCount} elements)`);
      });
    }
    
    // Filter out headers
    const containers = Array.from(allContainers).filter(el => !el.id.includes('_header'));
    console.log(`  After filtering headers: ${containers.length} containers`);
    
    if (containers.length > 0) {
      // Use the first non-header container found
      const container = containers[0];
      console.log(`  ✓ Using container: ${container.id}`);
      layerListElements = container.querySelectorAll('li.ext-cal-evr');
      console.log(`  ✓ Found ${layerListElements.length} layer elements in container`);
    } else {
      // Fallback: just use all of them and filter by parent structure
      console.log('  ! No container found, using all elements');
      layerListElements = Array.from(allLayerElements).filter(el => {
        // Check if parent is a UL that's inside a panel
        const ul = el.parentElement;
        return ul && ul.tagName === 'UL' && ul.parentElement;
      });
      console.log(`  ✓ Filtered to ${layerListElements.length} elements`);
    }
    
    if (layerListElements.length === 0) {
      console.error('✗ NO LAYER ELEMENTS FOUND after filtering!');
      console.log('╚═══════════════════════════════════════════════════════════╝');
      return layers;
    }
    
    console.log('→ Extracting layer names and colors...');
    console.log('');
    
    // Extract data from each element
    layerListElements.forEach((el, index) => {
      const style = el.getAttribute('style');
      
      if (!style) {
        console.warn(`  ${index}: No style attribute`);
        return;
      }
      
      // Extract color
      const colorMatch = style.match(/background-color:\s*(#[0-9A-Fa-f]{6})/i);
      if (!colorMatch) {
        console.warn(`  ${index}: No color found`);
        return;
      }
      
      const color = colorMatch[1].toUpperCase();
      
      // Extract text (remove <em> tag content)
      const clone = el.cloneNode(true);
      const emElement = clone.querySelector('em');
      if (emElement) emElement.remove();
      
      let name = clone.textContent.trim();
      name = name.replace(/\u00A0/g, ' ').replace(/\s+/g, ' ').trim();
      
      if (!name) {
        console.warn(`  ${index}: No name extracted`);
        return;
      }
      
      // Check for duplicates
      const existing = layers.find(l => l.color === color);
      if (existing) {
        console.log(`  ${index}: ⊗ Duplicate color ${color}, skipping`);
        return;
      }
      
      layers.push({ color, name });
      console.log(`  ${index}: ✓ "${name}" → ${color}`);
    });
    
    console.log('');
    if (layers.length > 0) {
      console.log('╔═══════════════════════════════════════════════════════════╗');
      console.log(`║  SUCCESS! Extracted ${layers.length} calendar layers`);
      console.log('╚═══════════════════════════════════════════════════════════╝');
      layers.forEach((l, i) => {
        console.log(`  ${i + 1}. "${l.name}" (${l.color})`);
      });
      
      window.__calendarExtension__.calendarLayers = layers;
    } else {
      console.error('╔═══════════════════════════════════════════════════════════╗');
      console.error('║  FAILED! No layers extracted                              ║');
      console.error('╚═══════════════════════════════════════════════════════════╝');
    }
    
    console.log('');
    return layers;
  }
  
  // Expose for manual testing
  window.__calendarExtension__.extractLayers = extractCalendarLayers;
  
  // Listen for data requests from the extension
  window.addEventListener('calendarExtensionRequest', function() {
    console.log('');
    console.log('▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓');
    console.log('▓  CAPTURE BUTTON CLICKED - EXTRACTING DATA NOW!          ▓');
    console.log('▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓');
    
    // ALWAYS extract fresh when button is clicked
    const extractedLayers = extractCalendarLayers();
    
    const data = window.__calendarExtension__;
    
    // Use fresh data
    if (extractedLayers.length > 0) {
      data.calendarLayers = extractedLayers;
    }
    
    console.log('');
    console.log('→ Preparing data to send:');
    console.log('  • Calendar events:', data.calendarData ? data.calendarData.length : 0);
    console.log('  • Terms:', data.termData ? data.termData.length : 0);
    console.log('  • Layers:', data.calendarLayers ? data.calendarLayers.length : 0);
    
    // Send response
    console.log('→ Dispatching data to extension...');
    window.dispatchEvent(new CustomEvent('calendarExtensionDataReady', {
      detail: {
        calendarData: data.calendarData,
        termData: data.termData,
        calendarLayers: data.calendarLayers
      }
    }));
    
    console.log('✓ Data dispatched!');
    console.log('▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓');
    console.log('');
  });
  
  // Intercept XMLHttpRequest
  const originalOpen = XMLHttpRequest.prototype.open;
  const originalSend = XMLHttpRequest.prototype.send;
  
  XMLHttpRequest.prototype.open = function(method, url, ...rest) {
    this.__url = url;
    this.__method = method;
    return originalOpen.call(this, method, url, ...rest);
  };
  
  XMLHttpRequest.prototype.send = function(...args) {
    const xhr = this;
    
    xhr.addEventListener('load', function() {
      window.__calendarExtension__.debug.allRequests.push({
        method: xhr.__method,
        url: xhr.__url,
        status: xhr.status,
        timestamp: new Date().toISOString()
      });
      
      try {
        if (xhr.__url && xhr.__url.toLowerCase().includes('getcalendareventsby')) {
          const response = JSON.parse(xhr.responseText);
          if (response && response.d && Array.isArray(response.d)) {
            window.__calendarExtension__.calendarData = response.d;
            console.log(`✓ Intercepted ${response.d.length} calendar events`);
          }
        } else if (xhr.__url && xhr.__url.toLowerCase().includes('getallterms')) {
          const response = JSON.parse(xhr.responseText);
          if (response && response.d && Array.isArray(response.d)) {
            window.__calendarExtension__.termData = response.d;
            console.log(`✓ Intercepted ${response.d.length} terms`);
          }
        }
      } catch (e) {
        // Ignore parse errors
      }
    });
    
    return originalSend.apply(this, args);
  };
  
  // Intercept fetch
  const originalFetch = window.fetch;
  window.fetch = function(...args) {
    const url = typeof args[0] === 'string' ? args[0] : args[0].url;
    
    return originalFetch.apply(this, args).then(response => {
      const clonedResponse = response.clone();
      
      if (url && url.toLowerCase().includes('getcalendareventsby')) {
        clonedResponse.json().then(data => {
          if (data && data.d && Array.isArray(data.d)) {
            window.__calendarExtension__.calendarData = data.d;
            console.log(`✓ Intercepted ${data.d.length} calendar events (fetch)`);
          }
        }).catch(() => {});
      } else if (url && url.toLowerCase().includes('getallterms')) {
        clonedResponse.json().then(data => {
          if (data && data.d && Array.isArray(data.d)) {
            window.__calendarExtension__.termData = data.d;
            console.log(`✓ Intercepted ${data.d.length} terms (fetch)`);
          }
        }).catch(() => {});
      }
      
      return response;
    });
  };
  
  console.log('✓ Interceptor ready!');
  console.log('✓ To manually test layer extraction, run: window.__calendarExtension__.extractLayers()');
  console.log('='.repeat(60));
})();