// content.js
// Default highlight color
let currentHighlightColor = '#ffff00';

// Load highlight color from storage
chrome.storage.sync.get(['highlightColor'], function(result) {
  if (result.highlightColor) {
    currentHighlightColor = result.highlightColor;
  }
});

// Function to generate a unique ID for each highlight
function generateHighlightId() {
  return 'highlight-' + Date.now() + '-' + Math.floor(Math.random() * 1000000);
}

// Function to create highlight from a range
function highlightRange(range) {
  const highlightId = generateHighlightId();
  const highlightedContent = document.createElement('span');
  highlightedContent.className = 'web-highlighter-highlight';
  highlightedContent.style.backgroundColor = currentHighlightColor;
  highlightedContent.dataset.highlightId = highlightId;
  
  range.surroundContents(highlightedContent);
  
  // Save highlight data to storage
  saveHighlight(window.location.href, {
    id: highlightId,
    text: highlightedContent.textContent,
    color: currentHighlightColor,
    path: getPathTo(highlightedContent)
  });
}

// Function to get path to an element (for later restoration)
function getPathTo(element) {
  if (element.id !== '') {
    return 'id("' + element.id + '")';
  }
  
  if (element === document.body) {
    return element.tagName.toLowerCase();
  }
  
  let ix = 0;
  const siblings = element.parentNode.childNodes;
  
  for (let i = 0; i < siblings.length; i++) {
    const sibling = siblings[i];
    if (sibling === element) {
      return getPathTo(element.parentNode) + '/' + element.tagName.toLowerCase() + '[' + (ix + 1) + ']';
    }
    if (sibling.nodeType === 1 && sibling.tagName === element.tagName) {
      ix++;
    }
  }
}

// Function to save highlight to Chrome storage
function saveHighlight(url, highlightData) {
  chrome.storage.sync.get(['highlights'], function(result) {
    const highlights = result.highlights || {};
    if (!highlights[url]) {
      highlights[url] = [];
    }
    highlights[url].push(highlightData);
    chrome.storage.sync.set({highlights: highlights});
  });
}

// Function to restore highlights from Chrome storage
function restoreHighlights() {
  const url = window.location.href;
  chrome.storage.sync.get(['highlights'], function(result) {
    const highlights = result.highlights || {};
    if (highlights[url]) {
      // Sort by ID to restore in the order they were created
      highlights[url].sort((a, b) => {
        return parseInt(a.id.split('-')[1]) - parseInt(b.id.split('-')[1]);
      }).forEach(highlight => {
        try {
          const range = document.createRange();
          const textNodes = getTextNodesIn(document.body);
          
          // Find the text node containing the highlight text
          for (let i = 0; i < textNodes.length; i++) {
            const textNode = textNodes[i];
            if (textNode.textContent.includes(highlight.text)) {
              // Create the highlight span
              const highlightedSpan = document.createElement('span');
              highlightedSpan.className = 'web-highlighter-highlight';
              highlightedSpan.style.backgroundColor = highlight.color;
              highlightedSpan.dataset.highlightId = highlight.id;
              
              const start = textNode.textContent.indexOf(highlight.text);
              if (start >= 0) {
                range.setStart(textNode, start);
                range.setEnd(textNode, start + highlight.text.length);
                range.surroundContents(highlightedSpan);
                break;
              }
            }
          }
        } catch (e) {
          console.error('Error restoring highlight:', e);
        }
      });
    }
  });
}

// Helper function to get all text nodes
function getTextNodesIn(node) {
  let textNodes = [];
  if (node.nodeType === 3) {
    textNodes.push(node);
  } else {
    const children = node.childNodes;
    for (let i = 0; i < children.length; i++) {
      textNodes = textNodes.concat(getTextNodesIn(children[i]));
    }
  }
  return textNodes;
}

// Function to remove all highlights
function clearAllHighlights() {
  const url = window.location.href;
  chrome.storage.sync.get(['highlights'], function(result) {
    const highlights = result.highlights || {};
    if (highlights[url]) {
      delete highlights[url];
      chrome.storage.sync.set({highlights: highlights}, function() {
        // Remove highlight spans from DOM
        document.querySelectorAll('.web-highlighter-highlight').forEach(el => {
          const parent = el.parentNode;
          while (el.firstChild) {
            parent.insertBefore(el.firstChild, el);
          }
          parent.removeChild(el);
        });
      });
    }
  });
}

// Event listener for text selection
document.addEventListener('mouseup', function(e) {
  const selection = window.getSelection();
  
  if (selection.toString().length > 0) {
    try {
      const range = selection.getRangeAt(0);
      highlightRange(range);
    } catch (e) {
      console.error('Error highlighting selection:', e);
    }
  }
});

// Listen for messages from popup
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === 'updateHighlightColor') {
    currentHighlightColor = request.color;
  } else if (request.action === 'clearAllHighlights') {
    clearAllHighlights();
  }
});

// Restore highlights when page loads
window.addEventListener('load', restoreHighlights);