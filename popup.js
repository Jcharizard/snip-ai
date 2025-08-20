// Popup JavaScript - Handles UI interactions and communication

class AISnipPopup {
    constructor() {
        this.init();
    }

    init() {
        this.loadSettings();
        this.bindEvents();
        this.loadRecentScreenshots();
    }

    bindEvents() {
        // Screenshot buttons
        document.getElementById('screenshotBtn').addEventListener('click', () => {
            this.startScreenshot();
        });

        document.getElementById('fullTabBtn').addEventListener('click', () => {
            this.takeFullTabScreenshot();
        });

        // Settings
        document.getElementById('saveApiKey').addEventListener('click', () => {
            this.saveApiKey();
        });

        // Enter key in API key input
        document.getElementById('apiKey').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.saveApiKey();
            }
        });

        // Test button (for debugging) - Fix the selector
        const testBtn = document.createElement('button');
        testBtn.textContent = 'Test Tab Access';
        testBtn.style.cssText = 'background: #ffc107; color: #000; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; margin-top: 10px; width: 100%;';
        testBtn.addEventListener('click', () => {
            this.testTabAccess();
        });
        
        // Fix: Use the correct selector
        const settingsSection = document.querySelector('.settings');
        if (settingsSection) {
            settingsSection.appendChild(testBtn);
        } else {
            console.error('Settings section not found');
        }
    }

    async loadSettings() {
        try {
            const result = await chrome.storage.sync.get(['openaiApiKey']);
            if (result.openaiApiKey) {
                document.getElementById('apiKey').value = result.openaiApiKey;
            }
        } catch (error) {
            console.error('Error loading settings:', error);
        }
    }

    async saveApiKey() {
        const apiKey = document.getElementById('apiKey').value.trim();
        
        if (!apiKey) {
            this.showNotification('Please enter your OpenAI API key', 'error');
            return;
        }

        if (!apiKey.startsWith('sk-')) {
            this.showNotification('Invalid API key format. Should start with "sk-"', 'error');
            return;
        }

        try {
            await chrome.storage.sync.set({ openaiApiKey: apiKey });
            this.showNotification('API key saved successfully!', 'success');
        } catch (error) {
            console.error('Error saving API key:', error);
            this.showNotification('Failed to save API key', 'error');
        }
    }

    async startScreenshot() {
        try {
            // Check if we're on a valid page first
            const tabCheck = await this.checkCurrentTab();
            if (!tabCheck.valid) {
                this.showNotification(tabCheck.error, 'error');
                return;
            }
            
            // Send message to background script to start screenshot
            await chrome.runtime.sendMessage({
                action: 'startScreenshot',
                mode: 'selection'
            });
            
            // Close popup after successful message send
            window.close();
        } catch (error) {
            console.error('Error starting screenshot:', error);
            this.showNotification('Failed to start screenshot: ' + error.message, 'error');
        }
    }

    async takeFullTabScreenshot() {
        try {
            // Check if we're on a valid page first
            const tabCheck = await this.checkCurrentTab();
            if (!tabCheck.valid) {
                this.showNotification(tabCheck.error, 'error');
                return;
            }
            
            this.showStatus('Taking full tab screenshot...');
            
            console.log('Sending takeFullTabScreenshot message...');
            
            // Send message to background script
            const response = await chrome.runtime.sendMessage({
                action: 'takeFullTabScreenshot'
            });

            console.log('Received response:', response);

            if (response && response.success) {
                this.hideStatus();
                this.showNotification('Screenshot captured!', 'success');
                
                // Copy to clipboard
                await this.copyScreenshotToClipboard(response.dataUrl);
                
                // Save to recent screenshots
                await this.saveRecentScreenshot(response.dataUrl, 'Full tab screenshot');
                
                // Show the screenshot
                this.showScreenshot(response.dataUrl);
            } else {
                this.hideStatus();
                const errorMsg = response ? response.error : 'Unknown error occurred';
                this.showNotification('Failed to capture screenshot: ' + errorMsg, 'error');
            }
        } catch (error) {
            console.error('Error taking full tab screenshot:', error);
            this.hideStatus();
            this.showNotification('Failed to capture screenshot: ' + error.message, 'error');
        }
    }

    async processScreenshotWithAI(dataUrl) {
        try {
            this.showStatus('Analyzing screenshot with AI...');
            
            const response = await chrome.runtime.sendMessage({
                action: 'analyzeScreenshot',
                dataUrl: dataUrl
            });

            this.hideStatus();

            if (response.success) {
                this.showNotification('Analysis complete!', 'success');
                
                // Copy answer to clipboard
                await this.copyToClipboard(response.answer);
                
                // Save to recent screenshots
                await this.saveRecentScreenshot(dataUrl, response.answer);
                
                // Show answer in a new window or notification
                this.showAnswer(response.answer);
            } else {
                this.showNotification('AI analysis failed: ' + response.error, 'error');
            }
        } catch (error) {
            console.error('Error processing screenshot:', error);
            this.hideStatus();
            this.showNotification('Failed to analyze screenshot', 'error');
        }
    }

    async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            this.showNotification('Answer copied to clipboard!', 'success');
        } catch (error) {
            console.error('Error copying to clipboard:', error);
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            this.showNotification('Answer copied to clipboard!', 'success');
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
            
            this.showNotification('Screenshot copied to clipboard!', 'success');
        } catch (error) {
            console.error('Error copying screenshot to clipboard:', error);
            this.showNotification('Screenshot saved to history', 'info');
        }
    }

    showScreenshot(dataUrl) {
        // Create a new window to show the screenshot
        const screenshotWindow = window.open('', '_blank', 'width=800,height=600');
        
        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>AI Snip - Screenshot</title>
                <style>
                    body { 
                        font-family: Arial, sans-serif; 
                        padding: 20px; 
                        margin: 0; 
                        background: #f8f9fa;
                    }
                    .screenshot-container {
                        background: white;
                        padding: 20px;
                        border-radius: 12px;
                        box-shadow: 0 4px 12px rgba(0,0,0,0.1);
                        max-width: 100%;
                    }
                    .screenshot { 
                        max-width: 100%; 
                        border-radius: 8px; 
                        margin-bottom: 20px;
                        border: 1px solid #e9ecef;
                    }
                    .btn { 
                        background: #667eea; 
                        color: white; 
                        border: none; 
                        padding: 10px 20px; 
                        border-radius: 6px; 
                        cursor: pointer;
                        margin-right: 10px;
                    }
                    .btn:hover {
                        background: #5a6fd8;
                    }
                </style>
            </head>
            <body>
                <div class="screenshot-container">
                    <h2>Screenshot Captured</h2>
                    <img src="${dataUrl}" alt="Screenshot" class="screenshot">
                    <div>
                        <button class="btn" onclick="navigator.clipboard.writeText('${dataUrl}')">Copy Image URL</button>
                        <button class="btn" onclick="window.close()">Close</button>
                    </div>
                </div>
            </body>
            </html>
        `;
        
        screenshotWindow.document.write(html);
        screenshotWindow.document.close();
    }

    async saveRecentScreenshot(dataUrl, title = null) {
        try {
            const recentScreenshots = await this.getRecentScreenshots();
            
            const newScreenshot = {
                id: Date.now(),
                dataUrl: dataUrl,
                answer: title || 'Screenshot captured',
                timestamp: new Date().toISOString(),
                title: title || 'Screenshot ' + (recentScreenshots.length + 1)
            };

            recentScreenshots.unshift(newScreenshot);
            
            // Keep only last 10 screenshots
            if (recentScreenshots.length > 10) {
                recentScreenshots.splice(10);
            }

            await chrome.storage.local.set({ recentScreenshots: recentScreenshots });
            this.loadRecentScreenshots();
        } catch (error) {
            console.error('Error saving recent screenshot:', error);
        }
    }

    async getRecentScreenshots() {
        try {
            const result = await chrome.storage.local.get(['recentScreenshots']);
            return result.recentScreenshots || [];
        } catch (error) {
            console.error('Error getting recent screenshots:', error);
            return [];
        }
    }

    async loadRecentScreenshots() {
        try {
            const screenshots = await this.getRecentScreenshots();
            const recentList = document.getElementById('recentList');
            
            if (screenshots.length === 0) {
                recentList.innerHTML = '<p style="color: #6c757d; font-size: 12px; text-align: center; padding: 20px;">No recent screenshots</p>';
                return;
            }

            recentList.innerHTML = screenshots.map(screenshot => `
                <div class="recent-item" data-id="${screenshot.id}">
                    <img src="${screenshot.dataUrl}" alt="Screenshot" class="recent-thumbnail">
                    <div class="recent-info">
                        <div class="recent-title">${screenshot.title}</div>
                        <div class="recent-time">${new Date(screenshot.timestamp).toLocaleString()}</div>
                    </div>
                </div>
            `).join('');

            // Add click handlers for recent items
            recentList.querySelectorAll('.recent-item').forEach(item => {
                item.addEventListener('click', () => {
                    const id = parseInt(item.dataset.id);
                    this.showRecentScreenshot(id);
                });
            });
        } catch (error) {
            console.error('Error loading recent screenshots:', error);
        }
    }

    async showRecentScreenshot(id) {
        try {
            const screenshots = await this.getRecentScreenshots();
            const screenshot = screenshots.find(s => s.id === id);
            
            if (screenshot) {
                this.showAnswer(screenshot.answer, screenshot.dataUrl);
            }
        } catch (error) {
            console.error('Error showing recent screenshot:', error);
        }
    }

    showAnswer(answer, dataUrl = null) {
        // Create a new window to show the answer
        const answerWindow = window.open('', '_blank', 'width=600,height=400');
        
        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>AI Snip - Answer</title>
                <style>
                    body { font-family: Arial, sans-serif; padding: 20px; margin: 0; }
                    .answer { background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
                    .screenshot { max-width: 100%; border-radius: 8px; margin-bottom: 20px; }
                    .copy-btn { background: #667eea; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; }
                </style>
            </head>
            <body>
                <h2>AI Analysis Result</h2>
                ${dataUrl ? `<img src="${dataUrl}" alt="Screenshot" class="screenshot">` : ''}
                <div class="answer">${answer}</div>
                <button class="copy-btn" onclick="navigator.clipboard.writeText('${answer.replace(/'/g, "\\'")}')">Copy Answer</button>
            </body>
            </html>
        `;
        
        answerWindow.document.write(html);
        answerWindow.document.close();
    }

    showStatus(message) {
        document.getElementById('statusText').textContent = message;
        document.getElementById('status').classList.remove('hidden');
    }

    hideStatus() {
        document.getElementById('status').classList.add('hidden');
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        
        // Add styles
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : '#17a2b8'};
            color: white;
            padding: 12px 20px;
            border-radius: 6px;
            font-size: 14px;
            z-index: 10000;
            animation: slideIn 0.3s ease;
        `;
        
        document.body.appendChild(notification);
        
        // Remove after 3 seconds
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }

    async testTabAccess() {
        try {
            console.log('Testing tab access from popup...');
            const response = await chrome.runtime.sendMessage({
                action: 'testTabAccess'
            });
            console.log('Tab access test result:', response);
            
            if (response.success) {
                this.showNotification(`Tab access test successful! Found ${response.allTabsCount} total tabs, ${response.windowTabsCount} in current window.`, 'success');
            } else {
                this.showNotification('Tab access test failed: ' + response.error, 'error');
            }
        } catch (error) {
            console.error('Error testing tab access:', error);
            this.showNotification('Tab access test error: ' + error.message, 'error');
        }
    }

    async checkCurrentTab() {
        try {
            const response = await chrome.runtime.sendMessage({
                action: 'testTabAccess'
            });
            
            if (response.success) {
                // Check if we're on a restricted page
                const currentTab = await chrome.tabs.query({ active: true, currentWindow: true });
                if (currentTab && currentTab[0]) {
                    const url = currentTab[0].url;
                    if (url.startsWith('chrome://') || url.startsWith('chrome-extension://')) {
                        return {
                            valid: false,
                            error: 'Cannot take screenshots on Chrome system pages. Please navigate to a regular website (like google.com) and try again.'
                        };
                    }
                }
                return { valid: true };
            } else {
                return {
                    valid: false,
                    error: 'Cannot access browser tabs. Please make sure the extension has proper permissions.'
                };
            }
        } catch (error) {
            return {
                valid: false,
                error: 'Failed to check current tab: ' + error.message
            };
        }
    }
}

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new AISnipPopup();
});

// Add CSS animations for notifications
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(style);
