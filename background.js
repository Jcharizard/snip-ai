// Simple test to see if background script loads
console.log('=== BACKGROUND SCRIPT LOADING ===');
console.log('Background script file loaded successfully');

// Background Service Worker - Handles core extension functionality

class AISnipBackground {
    constructor() {
        console.log('AISnipBackground constructor called');
        this.init();
    }

    init() {
        console.log('AISnipBackground init called');
        this.setupMessageListeners();
        this.setupContextMenus();
        this.setupKeyboardShortcuts();
        console.log('AISnipBackground initialization complete');
    }

    setupMessageListeners() {
        console.log('Setting up message listeners...');
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            console.log('Message received in background:', request, 'from:', sender);
            this.handleMessage(request, sender, sendResponse);
            return true; // Keep message channel open for async responses
        });
        console.log('Message listeners set up successfully');
    }

    setupContextMenus() {
        chrome.runtime.onInstalled.addListener(() => {
            chrome.contextMenus.create({
                id: 'ai-snip-screenshot',
                title: 'AI Snip: Take Screenshot',
                contexts: ['page', 'selection']
            });
        });

        chrome.contextMenus.onClicked.addListener((info, tab) => {
            if (info.menuItemId === 'ai-snip-screenshot') {
                this.startScreenshot(tab);
            }
        });
    }

    setupKeyboardShortcuts() {
        console.log('Setting up keyboard shortcuts...');
        
        // Listen for keyboard shortcuts
        chrome.commands.onCommand.addListener(async (command) => {
            console.log('Keyboard command received:', command);
            
            if (command === 'copy-locked-container') {
                console.log('Copy locked container shortcut triggered');
                await this.handleCopyShortcut();
            } else if (command === 'copy-full-tab') {
                console.log('Copy full tab shortcut triggered');
                await this.handleFullTabShortcut();
            } else {
                console.log('Unknown command:', command);
            }
        });
        
        console.log('Keyboard shortcuts set up successfully');
    }

    async handleCopyShortcut() {
        try {
            console.log('Keyboard shortcut triggered: copy-locked-container');
            
            // Get the current tab
            const currentTab = await this.getCurrentTab();
            console.log('Current tab for shortcut:', currentTab);
            
            // Check if content script is injected
            try {
                await chrome.tabs.sendMessage(currentTab.id, { action: 'ping' });
                console.log('Content script is available');
            } catch (error) {
                console.log('Content script not available, injecting...');
                // Inject content script
                await chrome.scripting.executeScript({
                    target: { tabId: currentTab.id },
                    files: ['content.js']
                });
                console.log('Content script injected for shortcut');
                
                // Wait a moment for the script to initialize
                await new Promise(resolve => setTimeout(resolve, 200));
            }
            
            // Send message to content script to handle the copy operation
            const response = await chrome.tabs.sendMessage(currentTab.id, {
                action: 'handleCopyShortcut'
            });
            
            if (response && response.success) {
                console.log('Locked container copied to clipboard via shortcut!');
            } else {
                console.log('No locked container found for shortcut copy:', response ? response.error : 'Unknown error');
            }
        } catch (error) {
            console.error('Error handling copy shortcut:', error);
        }
    }

    async handleFullTabShortcut() {
        try {
            console.log('Keyboard shortcut triggered: copy-full-tab');
            
            // Get the current tab
            const currentTab = await this.getCurrentTab();
            console.log('Current tab for full tab shortcut:', currentTab);
            
            // Take full tab screenshot and copy to clipboard (no popup)
            const result = await this.takeFullTabScreenshot(currentTab, true); // true = silent mode
            
            if (result && result.success) {
                console.log('Full tab screenshot copied to clipboard via shortcut!');
                return { success: true };
            } else {
                console.log('Failed to take full tab screenshot via shortcut:', result ? result.error : 'Unknown error');
                return { success: false, error: result ? result.error : 'Unknown error' };
            }
        } catch (error) {
            console.error('Error handling full tab shortcut:', error);
            return { success: false, error: error.message };
        }
    }

    async copyScreenshotToClipboard(dataUrl) {
        try {
            // Convert data URL to blob
            const response = await fetch(dataUrl);
            const blob = await response.blob();
            
            // Copy blob to clipboard
            await navigator.clipboard.write([
                new ClipboardItem({
                    [blob.type]: blob
                })
            ]);
            
            return true;
        } catch (error) {
            console.error('Error copying screenshot to clipboard:', error);
            throw error;
        }
    }

    async getCurrentTab() {
        try {
            console.log('Getting current tab...');
            
            // Method 1: Try to get the current active tab
            let tabs = await chrome.tabs.query({ active: true, currentWindow: true });
            console.log('Found tabs (method 1):', tabs);
            
            if (!tabs || tabs.length === 0) {
                // Method 2: Try to get any visible tab
                tabs = await chrome.tabs.query({ active: true });
                console.log('Found tabs (method 2):', tabs);
            }
            
            if (!tabs || tabs.length === 0) {
                // Method 3: Get the first tab in the current window
                const windows = await chrome.windows.getCurrent();
                tabs = await chrome.tabs.query({ windowId: windows.id, active: true });
                console.log('Found tabs (method 3):', tabs);
            }
            
            if (!tabs || tabs.length === 0) {
                // Method 4: Get any tab in the current window
                const windows = await chrome.windows.getCurrent();
                tabs = await chrome.tabs.query({ windowId: windows.id });
                console.log('Found tabs (method 4):', tabs);
            }
            
            if (!tabs || tabs.length === 0) {
                throw new Error('No tabs found in any method');
            }
            
            // Validate that all tabs have proper structure
            tabs = tabs.filter(tab => {
                if (!tab || typeof tab !== 'object') {
                    console.log('Invalid tab object:', tab);
                    return false;
                }
                if (!tab.id || !tab.windowId) {
                    console.log('Tab missing required properties:', tab);
                    return false;
                }
                return true;
            });
            
            if (tabs.length === 0) {
                throw new Error('No valid tabs found after validation');
            }
            
            // Find the first tab that's not a chrome:// or extension:// URL
            let tab = tabs.find(t => {
                try {
                    return t && t.url && typeof t.url === 'string' && !t.url.startsWith('chrome://') && !t.url.startsWith('chrome-extension://');
                } catch (error) {
                    console.log('Error checking tab URL:', error, 'tab:', t);
                    return false;
                }
            });
            
            if (!tab) {
                // If we're on a restricted page, provide a helpful error
                const currentTab = tabs[0];
                if (currentTab && currentTab.url && typeof currentTab.url === 'string' && (currentTab.url.startsWith('chrome://') || currentTab.url.startsWith('chrome-extension://'))) {
                    throw new Error('Cannot take screenshots on Chrome system pages. Please navigate to a regular website (like google.com) and try again.');
                }
                tab = tabs[0]; // Use the first tab if no suitable tab found
            }
            
            console.log('Selected tab:', tab);
            
            if (!tab || !tab.id) {
                throw new Error('Invalid tab object - missing id');
            }
            
            if (!tab.windowId) {
                throw new Error('Invalid tab object - missing windowId');
            }
            
            return tab;
        } catch (error) {
            console.error('Error getting current tab:', error);
            throw new Error(`Could not get current tab: ${error.message}`);
        }
    }

    async testTabAccess() {
        try {
            console.log('Testing tab access...');
            
            // Test 1: Get all tabs
            const allTabs = await chrome.tabs.query({});
            console.log('All tabs:', allTabs);
            
            // Test 2: Get current window
            const currentWindow = await chrome.windows.getCurrent();
            console.log('Current window:', currentWindow);
            
            // Test 3: Get tabs in current window
            const windowTabs = await chrome.tabs.query({ windowId: currentWindow.id });
            console.log('Window tabs:', windowTabs);
            
            return {
                success: true,
                allTabsCount: allTabs.length,
                windowTabsCount: windowTabs.length,
                currentWindow: currentWindow
            };
        } catch (error) {
            console.error('Tab access test failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    async handleMessage(request, sender, sendResponse) {
        try {
            console.log('Received message:', request.action, 'from sender:', sender);
            
            switch (request.action) {
                case 'testTabAccess':
                    const testResult = await this.testTabAccess();
                    sendResponse(testResult);
                    break;
                    
                case 'startScreenshot':
                    console.log('Starting screenshot process...');
                    const currentTab = await this.getCurrentTab();
                    console.log('Got current tab for screenshot:', currentTab);
                    await this.startScreenshot(currentTab, request.lockContainer);
                    sendResponse({ success: true });
                    break;

                case 'takeFullTabScreenshot':
                    console.log('Starting full tab screenshot process...');
                    const tab = await this.getCurrentTab();
                    console.log('Got current tab for full screenshot:', tab);
                    const result = await this.takeFullTabScreenshot(tab);
                    sendResponse(result);
                    break;
                    
                case 'handleFullTabShortcut':
                    console.log('Handling full tab shortcut from content script...');
                    const shortcutResult = await this.handleFullTabShortcut();
                    sendResponse(shortcutResult);
                    break;

                case 'analyzeScreenshot':
                    const analysis = await this.analyzeScreenshot(request.dataUrl);
                    sendResponse(analysis);
                    break;

                case 'captureSelection':
                    const activeTab = await this.getCurrentTab();
                    const capture = await this.captureSelection(request.selection, activeTab);
                    sendResponse(capture);
                    break;

                case 'getCurrentTabId':
                    const tabForId = await this.getCurrentTab();
                    sendResponse({ success: true, tabId: tabForId.id });
                    break;

                case 'copyLockedContainerShortcut':
                    console.log('Background received copy shortcut request from content script');
                    await this.handleCopyShortcut();
                    sendResponse({ success: true });
                    break;

                default:
                    sendResponse({ success: false, error: 'Unknown action' });
            }
        } catch (error) {
            console.error('Background error:', error);
            sendResponse({ success: false, error: error.message });
        }
    }

    async startScreenshot(tab, lockContainer = false) {
        try {
            if (!tab || !tab.id) {
                throw new Error('Invalid tab information');
            }

            console.log('Starting screenshot for tab:', tab.id, 'lockContainer:', lockContainer);

            // Check if content script is already injected
            let contentScriptReady = false;
            try {
                await chrome.tabs.sendMessage(tab.id, { action: 'ping' });
                console.log('Content script already injected');
                contentScriptReady = true;
            } catch (error) {
                console.log('Content script not found, injecting...');
                try {
                    // Inject content script to enable selection mode
                    await chrome.scripting.executeScript({
                        target: { tabId: tab.id },
                        files: ['content.js']
                    });
                    console.log('Content script injected successfully');
                    
                    // Wait a moment for the script to initialize
                    await new Promise(resolve => setTimeout(resolve, 200));
                    
                    // Verify the script is ready
                    try {
                        await chrome.tabs.sendMessage(tab.id, { action: 'ping' });
                        console.log('Content script verified and ready');
                        contentScriptReady = true;
                    } catch (verifyError) {
                        console.error('Content script injection failed verification:', verifyError);
                        throw new Error('Failed to inject content script properly');
                    }
                } catch (injectError) {
                    console.error('Failed to inject content script:', injectError);
                    throw new Error('Cannot inject content script into this page');
                }
            }
            
            if (!contentScriptReady) {
                throw new Error('Content script is not ready');
            }

            // Send message to content script to start selection mode
            await chrome.tabs.sendMessage(tab.id, {
                action: 'startSelectionMode',
                lockContainer: lockContainer
            });
            
            console.log('Selection mode started successfully');
        } catch (error) {
            console.error('Error starting screenshot:', error);
            throw error;
        }
    }

    async takeFullTabScreenshot(tab, silent = false) {
        try {
            if (!tab || !tab.windowId) {
                throw new Error('Invalid tab information');
            }

            const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, {
                format: 'png',
                quality: 100
            });

            // If silent mode, copy to clipboard automatically
            if (silent) {
                try {
                    // Convert data URL to blob and copy to clipboard
                    const response = await fetch(dataUrl);
                    const blob = await response.blob();
                    
                    // We can't use clipboard API in background script, so send to content script
                    await chrome.tabs.sendMessage(tab.id, {
                        action: 'copyImageToClipboard',
                        dataUrl: dataUrl
                    });
                    
                    console.log('Full tab screenshot copied to clipboard silently');
                } catch (clipboardError) {
                    console.error('Error copying to clipboard in silent mode:', clipboardError);
                }
            }

            return {
                success: true,
                dataUrl: dataUrl
            };
        } catch (error) {
            console.error('Error taking full tab screenshot:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    async captureSelection(selection, tab) {
        try {
            console.log('captureSelection called with selection:', selection);
            console.log('tab:', tab);
            
            if (!tab || !tab.windowId) {
                throw new Error('Invalid tab information');
            }

            // Take full tab screenshot first
            console.log('Taking full tab screenshot...');
            const fullScreenshot = await chrome.tabs.captureVisibleTab(tab.windowId, {
                format: 'png',
                quality: 100
            });
            console.log('Full screenshot taken, length:', fullScreenshot.length);

            // Crop the screenshot based on selection coordinates
            console.log('Cropping screenshot...');
            const croppedDataUrl = await this.cropImage(fullScreenshot, selection);
            console.log('Cropping completed, result length:', croppedDataUrl ? croppedDataUrl.length : 'null');

            return {
                success: true,
                dataUrl: croppedDataUrl
            };
        } catch (error) {
            console.error('Error capturing selection:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    async cropImage(dataUrl, selection) {
        console.log('cropImage called with dataUrl length:', dataUrl.length);
        console.log('selection:', selection);
        
        try {
            // Send the cropping task directly to the content script
            const croppedDataUrl = await this.cropImageInContentScript(dataUrl, selection);
            console.log('cropImage completed, result length:', croppedDataUrl ? croppedDataUrl.length : 'null');
            return croppedDataUrl;
        } catch (error) {
            console.error('Error in cropImage:', error);
            throw error;
        }
    }

    async cropImageInContentScript(dataUrl, selection) {
        try {
            console.log('cropImageInContentScript called');
            
            // Get the current tab
            const currentTab = await this.getCurrentTab();
            console.log('Current tab:', currentTab.id);
            
            // Send the cropping task to the content script
            console.log('Sending cropImage message to content script...');
            const response = await chrome.tabs.sendMessage(currentTab.id, {
                action: 'cropImage',
                dataUrl: dataUrl,
                selection: selection
            });
            
            console.log('Received response from content script:', response);
            
            if (response && response.success) {
                console.log('Cropping successful, returning croppedDataUrl');
                return response.croppedDataUrl;
            } else {
                const errorMsg = response ? response.error : 'Failed to crop image';
                console.error('Cropping failed:', errorMsg);
                throw new Error(errorMsg);
            }
        } catch (error) {
            console.error('Error cropping image in content script:', error);
            throw error;
        }
    }

    async analyzeScreenshot(dataUrl) {
        try {
            // Get API key from storage
            const result = await chrome.storage.sync.get(['openaiApiKey']);
            const apiKey = result.openaiApiKey;

            if (!apiKey) {
                return {
                    success: false,
                    error: 'OpenAI API key not found. Please set it in the extension settings.'
                };
            }

            // Convert data URL to base64
            const base64Image = dataUrl.split(',')[1];

            // Prepare the API request
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: 'gpt-4-vision-preview',
                    messages: [
                        {
                            role: 'user',
                            content: [
                                {
                                    type: 'text',
                                    text: 'This is a screenshot of a question or problem. Please analyze the image and provide the correct answer. If this appears to be a multiple choice question, provide the letter of the correct answer (A, B, C, D, etc.). If it\'s a math problem, show your work and provide the final answer. If it\'s a text-based question, provide a clear and concise answer. Be helpful and accurate.'
                                },
                                {
                                    type: 'image_url',
                                    image_url: {
                                        url: `data:image/png;base64,${base64Image}`
                                    }
                                }
                            ]
                        }
                    ],
                    max_tokens: 500,
                    temperature: 0.1
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`OpenAI API error: ${errorData.error?.message || response.statusText}`);
            }

            const data = await response.json();
            const answer = data.choices[0]?.message?.content || 'No answer generated';

            return {
                success: true,
                answer: answer
            };

        } catch (error) {
            console.error('Error analyzing screenshot:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
}

// Initialize background service worker
console.log('Initializing AISnipBackground...');
try {
    new AISnipBackground();
    console.log('AISnipBackground initialized successfully');
} catch (error) {
    console.error('Failed to initialize AISnipBackground:', error);
}

// Handle extension installation
try {
    chrome.runtime.onInstalled.addListener((details) => {
        if (details.reason === 'install') {
            // Open welcome page or show instructions
            chrome.tabs.create({
                url: chrome.runtime.getURL('welcome.html')
            });
        }
    });
    console.log('Extension installation listener set up');
} catch (error) {
    console.error('Failed to set up installation listener:', error);
}

// Handle extension icon click
try {
    chrome.action.onClicked.addListener((tab) => {
        // This will open the popup automatically due to manifest configuration
        // But we can add additional logic here if needed
    });
    console.log('Extension icon click listener set up');
} catch (error) {
    console.error('Failed to set up icon click listener:', error);
}
