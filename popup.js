const toggleSwitch = document.getElementById('toggleSwitch');
const blurToggle = document.getElementById('blurToggle');

// Function to update blur toggle state based on randomizer toggle
function updateBlurToggleState() {
    const blurToggleGroup = blurToggle.closest('.toggle-group');

    if (toggleSwitch.checked) {
        // Enable blur toggle
        blurToggle.disabled = false;
        blurToggleGroup?.classList.remove('disabled');
    } else {
        // Disable blur toggle
        blurToggle.disabled = true;
        blurToggleGroup?.classList.add('disabled');
    }
}

// Load saved blur state from sync storage (persists across sessions)
chrome.storage.sync.get('blurEnabled', (data) => {
    blurToggle.checked = !!data.blurEnabled;
});

// Listen for changes on the blur toggle
blurToggle.addEventListener('change', () => {
    const isEnabled = blurToggle.checked;
    // Save to sync storage
    chrome.storage.sync.set({ blurEnabled: isEnabled });
});

// Get the current active tab to manage its state
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const currentTab = tabs[0];
    if (!currentTab || !currentTab.id) return;
    const tabId = currentTab.id;

    // Disable the toggle on non-web pages (e.g., chrome://extensions)
    if (!currentTab.url?.startsWith('http')) {
        // Add the disabled class to the toggle groups
        const toggleGroups = document.querySelectorAll('.toggle-group');
        toggleGroups.forEach(group => {
            group.classList.add('disabled');
        });

        return;
    }

    // Load the saved state for this tab and set the toggle accordingly
    chrome.storage.session.get([tabId.toString()], (result) => {
        toggleSwitch.checked = !!result[tabId];
        updateBlurToggleState();
    });

    // Listen for changes on the toggle switch
    toggleSwitch.addEventListener('change', () => {
        const isEnabled = toggleSwitch.checked;

        // Update blur toggle state whenever randomizer toggle changes
        updateBlurToggleState();

        // Save the new state to session storage for this tab
        chrome.storage.session.set({ [tabId]: isEnabled });

        // Ensure the content script is injected before sending a message
        chrome.scripting.executeScript({
            target: { tabId: tabId },
            files: ['content.js']
        }).then(() => {
            // Send a message to the content script to activate or deactivate
            const message = { action: isEnabled ? "activate" : "deactivate" };
            chrome.tabs.sendMessage(tabId, message);
        }).catch(err => console.error("Script injection failed:", err));
    });
});