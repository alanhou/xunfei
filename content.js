console.log("Xunfei Helper Loaded");

let cleanModeObserver = null;
let autoScrollObserver = null;

function applyCleanMode() {
    console.log("Applying Clean Mode...");

    const selectorsToRemove = ['.header', '.meeting-title', '.footer'];

    // Function to remove elements
    function removeElements() {
        selectorsToRemove.forEach(selector => {
            const els = document.querySelectorAll(selector);
            if (els.length > 0) {
                console.log(`Removing ${els.length} elements for selector: ${selector}`);
                els.forEach(el => el.remove());
            }
        });
    }

    // Remove current elements
    removeElements();

    // Set up MutationObserver to catch re-added elements (SPA behavior)
    if (!cleanModeObserver) {
        cleanModeObserver = new MutationObserver((mutations) => {
            removeElements();
            removeInlineStyles(); // Also remove inline styles from new elements
        });
        cleanModeObserver.observe(document.body, {
            childList: true,
            subtree: true
        });
        console.log("MutationObserver started for element removal");
    }

    // Overwrite styles for .page-container.web .page-content
    let styleTag = document.getElementById('clean-mode-style');
    if (!styleTag) {
        styleTag = document.createElement('style');
        styleTag.id = 'clean-mode-style';
        document.head.appendChild(styleTag);
    }

    // Styles: hide elements, enable scrolling in subtitle container
    styleTag.textContent = `
        .page-container.web .page-content {
            padding: 0 !important;
            height: 100% !important;
            max-width: none !important;
        }
        /* Fallback: hide elements via CSS too */
        .header, .meeting-title, .footer {
            display: none !important;
            visibility: hidden !important;
            height: 0 !important;
            overflow: hidden !important;
        }
        /* Enable scrolling for subtitle container */
        .page-container.web .subtitle-content,
        .subtitle-content,
        .subtitle-wrapper,
        .content-wrapper {
            overflow-y: auto !important;
            max-height: 100vh !important;
            scroll-behavior: smooth !important;
        }
        /* Override inline styles for translate elements */
        .translate-box {
            padding-bottom: 0 !important;
        }
        .translate {
            height: auto !important;
        }
    `;
    console.log("Clean Mode Styles Applied");

    // Remove inline styles from elements
    removeInlineStyles();

    // Setup auto-scroll for subtitles
    setupAutoScroll();
}

// Remove inline styles from translate elements
function removeInlineStyles() {
    // Remove padding-bottom from .translate-box elements
    document.querySelectorAll('.translate-box').forEach(el => {
        el.style.removeProperty('padding-bottom');
    });

    // Remove height from .translate elements
    document.querySelectorAll('.translate').forEach(el => {
        el.style.removeProperty('height');
    });

    console.log("Inline styles removed from translate elements");
}

// Auto-scroll functionality
function setupAutoScroll() {
    // Possible selectors for the subtitle container
    const containerSelectors = [
        '.subtitle-content',
        '.subtitle-wrapper',
        '.content-wrapper',
        '.page-content'
    ];

    let subtitleContainer = null;
    for (const selector of containerSelectors) {
        subtitleContainer = document.querySelector(selector);
        if (subtitleContainer) {
            console.log(`Found subtitle container: ${selector}`);
            break;
        }
    }

    if (!subtitleContainer) {
        console.log("Subtitle container not found, will retry...");
        // Retry after a short delay
        setTimeout(setupAutoScroll, 1000);
        return;
    }

    // Function to scroll to bottom
    function scrollToBottom() {
        subtitleContainer.scrollTop = subtitleContainer.scrollHeight;
    }

    // Initial scroll
    scrollToBottom();

    // Set up observer to auto-scroll when new content is added
    if (autoScrollObserver) {
        autoScrollObserver.disconnect();
    }

    autoScrollObserver = new MutationObserver((mutations) => {
        // Check if new nodes were added (new subtitles)
        for (const mutation of mutations) {
            if (mutation.addedNodes.length > 0 || mutation.type === 'characterData') {
                scrollToBottom();
                break;
            }
        }
    });

    autoScrollObserver.observe(subtitleContainer, {
        childList: true,
        subtree: true,
        characterData: true
    });

    console.log("Auto-scroll observer started");
}

function applyFontSettings(size) {
    if (!size) size = 32; // Default
    console.log("Applying Font Size:", size);

    let styleTag = document.getElementById('clean-mode-font-style');
    if (!styleTag) {
        styleTag = document.createElement('style');
        styleTag.id = 'clean-mode-font-style';
        document.head.appendChild(styleTag);
    }

    styleTag.textContent = `
        .page-container.web .subtitle-content {
            font-size: ${size}px !important;
        }
        .origin, .translate {
            line-height: normal !important;
        }
    `;
}

function removeCleanMode() {
    console.log("Removing Clean Mode - Reloading...");
    if (cleanModeObserver) {
        cleanModeObserver.disconnect();
        cleanModeObserver = null;
    }
    if (autoScrollObserver) {
        autoScrollObserver.disconnect();
        autoScrollObserver = null;
    }
    location.reload();
}

function checkAndApply() {
    chrome.storage.local.get(['cleanMode', 'fontSize'], (result) => {
        console.log("Storage state:", result);
        if (result.cleanMode) {
            applyCleanMode();
        }
        // Apply font if we have a value, or if cleanMode is on (default to 32)
        // If cleanMode is off, maybe user just wants font adjustment? 
        // Let's allow font adjustment regardless of clean mode if the user sets it,
        // but the prompt implied "if it's on...". 
        // For robustness, I'll apply font if 'fontSize' exists or if cleanMode is on.
        if (result.cleanMode) {
            applyFontSettings(result.fontSize || 32);
        } else if (result.fontSize) {
            // If manual font set, apply it too? 
            // "with a switch option... if it's on... 1. remove... 2. set padding... AND control font size".
            // It implies font control is part of the ON state.
            // But if user drags slider while OFF, expectation is probably to see it.
            // I'll stick to: Only apply if ON.
            // Wait, if I drag slider while OFF, nothing happens? That's bad UX.
            // But if I apply it, maybe I break original layout?
            // Given the user said "most importantly, it doesn't work anymore", I should make sure ON works.
        }

    });
}

// Run on load
checkAndApply();

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log("Message received:", request);
    if (request.action === "toggleState") {
        if (request.value) {
            applyCleanMode();
            chrome.storage.local.get(['fontSize'], (res) => {
                applyFontSettings(res.fontSize || 32);
            });
        } else {
            removeCleanMode();
        }
    }
    if (request.action === "updateFont") {
        chrome.storage.local.get(['cleanMode'], (res) => {
            // Allow live update if cleanMode is on
            if (res.cleanMode) {
                applyFontSettings(request.value);
            }
        });
    }
});
