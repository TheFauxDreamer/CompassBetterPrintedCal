document.addEventListener('DOMContentLoaded', function() {
  const statusDiv = document.getElementById('status');
  const captureButton = document.getElementById('captureData');
  const openButton = document.getElementById('openCalendar');
  const infoDiv = document.getElementById('info');

  console.log('Popup loaded');

  // Check for existing data on load
  checkStoredData();

  // Capture button click handler
  captureButton.addEventListener('click', function() {
    console.log('Capture button clicked');
    captureButton.disabled = true;
    captureButton.textContent = '⏳ Capturing data...';
    statusDiv.textContent = 'Requesting data from page...';
    statusDiv.className = 'status waiting';
    
    // Send message to content script to manually capture data
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      console.log('Active tabs:', tabs);
      
      if (tabs[0]) {
        console.log('Sending message to tab:', tabs[0].id);
        
        chrome.tabs.sendMessage(tabs[0].id, {type: 'MANUAL_CAPTURE'}, function(response) {
          console.log('Response from content script:', response);
          console.log('Last error:', chrome.runtime.lastError);
          
          if (chrome.runtime.lastError) {
            console.error('Error sending message:', chrome.runtime.lastError);
            statusDiv.textContent = '❌ Error: Make sure you are on the calendar page';
            statusDiv.className = 'status error';
            captureButton.disabled = false;
            captureButton.textContent = '📥 Capture Calendar Data';
            return;
          }
          
          if (response && response.success) {
            if (response.hasCalendar || response.hasTerms) {
              statusDiv.textContent = `✓ Data captured! (${response.calendarCount} events, ${response.termCount} terms)`;
              statusDiv.className = 'status success';
            } else {
              statusDiv.textContent = '⚠️ No data found. Make sure the page has loaded completely.';
              statusDiv.className = 'status waiting';
            }
          } else {
            statusDiv.textContent = '⚠️ Capture completed but no data received';
            statusDiv.className = 'status waiting';
          }
          
          // Wait a moment for data to be stored in background
          setTimeout(() => {
            checkStoredData();
            captureButton.disabled = false;
            captureButton.textContent = '📥 Capture Calendar Data';
          }, 500);
        });
      } else {
        console.error('No active tab found');
        statusDiv.textContent = '❌ No active tab found';
        statusDiv.className = 'status error';
        captureButton.disabled = false;
        captureButton.textContent = '📥 Capture Calendar Data';
      }
    });
  });

  // Open calendar button
  openButton.addEventListener('click', function() {
    console.log('Opening calendar view');
    chrome.tabs.create({
      url: chrome.runtime.getURL('calendar.html')
    });
  });

  // Check for stored data
  function checkStoredData() {
    console.log('Checking stored data...');
    chrome.runtime.sendMessage({ type: 'GET_ALL_DATA' }, (data) => {
      console.log('Stored data:', data);
      
      const hasCalendar = data?.calendar && data.calendar.events && data.calendar.events.length > 0;
      const hasTerms = data?.terms && data.terms.terms && data.terms.terms.length > 0;
      
      if (hasCalendar) {
        const eventCount = data.calendar.events.length;
        const termInfo = hasTerms ? ` & ${data.terms.terms.length} terms` : '';
        statusDiv.textContent = `✓ Captured ${eventCount} events${termInfo}`;
        statusDiv.className = 'status success';
        openButton.disabled = false;
        
        const date = new Date(data.calendar.timestamp);
        infoDiv.textContent = `Last captured: ${date.toLocaleString()}`;
      } else {
        statusDiv.textContent = 'Ready to capture data';
        statusDiv.className = 'status waiting';
        openButton.disabled = true;
        infoDiv.textContent = '';
      }
    });
  }
});