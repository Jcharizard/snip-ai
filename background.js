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
            
            // Find the first tab that's not a chrome:// or extension:// URL
            let tab = tabs.find(t => !t.url.startsWith('chrome://') && !t.url.startsWith('chrome-extension://'));
            if (!tab) {
                // If we're on a restricted page, provide a helpful error
                const currentTab = tabs[0];
                if (currentTab && (currentTab.url.startsWith('chrome://') || currentTab.url.startsWith('chrome-extension://'))) {
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
                    await this.startScreenshot(currentTab);
                    sendResponse({ success: true });
                    break;

                case 'takeFullTabScreenshot':
                    console.log('Starting full tab screenshot process...');
                    const tab = await this.getCurrentTab();
                    console.log('Got current tab for full screenshot:', tab);
                    const result = await this.takeFullTabScreenshot(tab);
                    sendResponse(result);
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

                default:
                    sendResponse({ success: false, error: 'Unknown action' });
            }
        } catch (error) {
            console.error('Background error:', error);
            sendResponse({ success: false, error: error.message });
        }
    }

    async startScreenshot(tab) {
        try {
            if (!tab || !tab.id) {
                throw new Error('Invalid tab information');
            }

            console.log('Starting screenshot for tab:', tab.id);

            // Check if content script is already injected
            try {
                await chrome.tabs.sendMessage(tab.id, { action: 'ping' });
                console.log('Content script already injected');
            } catch (error) {
                console.log('Content script not found, injecting...');
                // Inject content script to enable selection mode
                await chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    files: ['content.js']
                });
                console.log('Content script injected successfully');
            }

            // Wait a moment for the script to initialize
            await new Promise(resolve => setTimeout(resolve, 100));

            // Send message to content script to start selection mode
            await chrome.tabs.sendMessage(tab.id, {
                action: 'startSelectionMode'
            });
            
            console.log('Selection mode started successfully');
        } catch (error) {
            console.error('Error starting screenshot:', error);
            throw error;
        }
    }

    async takeFullTabScreenshot(tab) {
        try {
            if (!tab || !tab.windowId) {
                throw new Error('Invalid tab information');
            }

            const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, {
                format: 'png',
                quality: 100
            });

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
            if (!tab || !tab.windowId) {
                throw new Error('Invalid tab information');
            }

            // Take full tab screenshot first
            const fullScreenshot = await chrome.tabs.captureVisibleTab(tab.windowId, {
                format: 'png',
                quality: 100
            });

            // Crop the screenshot based on selection coordinates
            const croppedDataUrl = await this.cropImage(fullScreenshot, selection);

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
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');

                // Set canvas size to selection size
                canvas.width = selection.width;
                canvas.height = selection.height;

                // Draw cropped portion
                ctx.drawImage(
                    img,
                    selection.x, selection.y, selection.width, selection.height,
                    0, 0, selection.width, selection.height
                );

                resolve(canvas.toDataURL('image/png'));
            };
            img.onerror = reject;
            img.src = dataUrl;
        });
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
