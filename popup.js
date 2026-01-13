document.addEventListener('DOMContentLoaded', () => {
    const toggleSwitch = document.getElementById('toggleSwitch');
    const statusText = document.getElementById('statusText');
    const fontSlider = document.getElementById('fontSlider');
    const fontValue = document.getElementById('fontValue');

    // Load saved state
    chrome.storage.local.get(['cleanMode', 'fontSize'], (result) => {
        if (result.cleanMode) {
            toggleSwitch.checked = true;
            statusText.textContent = 'Mode is ON';
        } else {
            toggleSwitch.checked = false;
            statusText.textContent = 'Mode is OFF';
        }

        if (result.fontSize) {
            fontSlider.value = result.fontSize;
            fontValue.textContent = result.fontSize;
        }
    });

    // Helper to send message with error handling
    function sendMessageToActiveTab(message) {
        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
            if (tabs[0] && tabs[0].id) {
                // Avoid injecting into system pages
                if (tabs[0].url.startsWith('chrome://') || tabs[0].url.startsWith('edge://')) {
                    console.log("Cannot inject into system page");
                    return;
                }

                chrome.tabs.sendMessage(tabs[0].id, message, (response) => {
                    if (chrome.runtime.lastError) {
                        console.log("Could not send message:", chrome.runtime.lastError.message);
                        statusText.textContent = "Error: Refresh page!";
                    }
                });
            }
        });
    }

    // Save state on change
    toggleSwitch.addEventListener('change', () => {
        const isOn = toggleSwitch.checked;
        chrome.storage.local.set({ cleanMode: isOn }, () => {
            statusText.textContent = isOn ? 'Mode is ON' : 'Mode is OFF';
            sendMessageToActiveTab({ action: "toggleState", value: isOn });
        });
    });

    // Font slider logic
    fontSlider.addEventListener('input', () => {
        const size = fontSlider.value;
        fontValue.textContent = size;

        chrome.storage.local.set({ fontSize: size }, () => {
            sendMessageToActiveTab({ action: "updateFont", value: size });
        });
    });
});
