// Background Service Worker - Handles core extension functionality

class AISnipBackground {
    constructor() {
        this.init();
    }

    init() {
        this.setupMessageListeners();
        this.setupContextMenus();
    }

    setupMessageListeners() {
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            this.handleMessage(request, sender, sendResponse);
            return true; // Keep message channel open for async responses
        });
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

    async handleMessage(request, sender, sendResponse) {
        try {
            switch (request.action) {
                case 'startScreenshot':
                    await this.startScreenshot(sender.tab);
                    sendResponse({ success: true });
                    break;

                case 'takeFullTabScreenshot':
                    const result = await this.takeFullTabScreenshot(sender.tab);
                    sendResponse(result);
                    break;

                case 'analyzeScreenshot':
                    const analysis = await this.analyzeScreenshot(request.dataUrl);
                    sendResponse(analysis);
                    break;

                case 'captureSelection':
                    const capture = await this.captureSelection(request.selection, sender.tab);
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
            // Inject content script to enable selection mode
            await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                files: ['content.js']
            });

            // Send message to content script to start selection mode
            await chrome.tabs.sendMessage(tab.id, {
                action: 'startSelectionMode'
            });
        } catch (error) {
            console.error('Error starting screenshot:', error);
        }
    }

    async takeFullTabScreenshot(tab) {
        try {
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
new AISnipBackground();

// Handle extension installation
chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === 'install') {
        // Open welcome page or show instructions
        chrome.tabs.create({
            url: chrome.runtime.getURL('welcome.html')
        });
    }
});

// Handle extension icon click
chrome.action.onClicked.addListener((tab) => {
    // This will open the popup automatically due to manifest configuration
    // But we can add additional logic here if needed
});
