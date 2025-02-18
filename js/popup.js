document.addEventListener('DOMContentLoaded', function() {
    // Load previously selected color from storage
    chrome.storage.sync.get(['highlightColor'], function(result) {
      if (result.highlightColor) {
        document.querySelectorAll('.color-option').forEach(option => {
          if (option.dataset.color === result.highlightColor) {
            option.classList.add('selected');
          } else {
            option.classList.remove('selected');
          }
        });
      }
    });
  
    // Handle color selection
    document.querySelectorAll('.color-option').forEach(option => {
      option.addEventListener('click', function() {
        const selectedColor = this.dataset.color;
        
        // Update UI
        document.querySelectorAll('.color-option').forEach(el => {
          el.classList.remove('selected');
        });
        this.classList.add('selected');
        
        // Save to storage
        chrome.storage.sync.set({highlightColor: selectedColor}, function() {
          // Notify content script about color change
          chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            if (tabs[0]) {
              chrome.tabs.sendMessage(tabs[0].id, {
                action: 'updateHighlightColor',
                color: selectedColor
              });
            }
          });
        });
      });
    });
  
    // Handle clear all highlights button
    document.getElementById('clear-highlights-btn').addEventListener('click', function() {
      chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        if (tabs[0]) {
          chrome.tabs.sendMessage(tabs[0].id, {action: 'clearAllHighlights'});
        }
      });
    });
  });