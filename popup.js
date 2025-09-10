// Popup JavaScript - Handles UI interactions and communication

class AISnipPopup {
    constructor() {
        this.init();
    }

    async init() {
        this.loadSettings();
        this.bindEvents();
        this.loadRecentScreenshots();
        
        // Check for existing lock state on this tab
        await this.checkTabLockState();
        
        // Initialize shortcut setting state
        this.updateShortcutSetting(document.getElementById('lockContainerToggle').checked);
    }

    bindEvents() {
        // Screenshot buttons
        document.getElementById('screenshotBtn').addEventListener('click', () => {
            this.startScreenshot();
        });

        document.getElementById('fullTabBtn').addEventListener('click', () => {
            this.takeFullTabScreenshot();
        });

        // Copy button
        document.getElementById('copyBtn').addEventListener('click', () => {
            this.copyLastScreenshot();
        });

        // Lock container toggle
        document.getElementById('lockContainerToggle').addEventListener('change', (e) => {
            this.handleLockContainerToggle(e.target.checked);
            this.updateCopyButtonText(e.target.checked);
            this.updateShortcutSetting(e.target.checked);
        });

        // Dark mode toggle
        document.getElementById('darkModeToggle').addEventListener('change', (e) => {
            this.handleDarkModeToggle(e.target.checked);
        });

        // Shortcut input
        document.getElementById('shortcutInput').addEventListener('click', () => {
            this.startShortcutRecording('copyShortcut', 'shortcutInput');
        });
    }

    async loadSettings() {
        try {
            const result = await chrome.storage.sync.get(['darkMode', 'copyShortcut']);
            
            // Load dark mode setting
            if (result.darkMode) {
                document.body.classList.add('dark-mode');
                document.getElementById('darkModeToggle').checked = true;
            }
            
            // Load shortcut setting
            if (result.copyShortcut) {
                document.getElementById('shortcutInput').value = result.copyShortcut;
            }
        } catch (error) {
            console.error('Error loading settings:', error);
        }
    }

    async handleDarkModeToggle(enabled) {
        try {
            if (enabled) {
                document.body.classList.add('dark-mode');
            } else {
                document.body.classList.remove('dark-mode');
            }
            
            await chrome.storage.sync.set({ darkMode: enabled });
        } catch (error) {
            console.error('Error saving dark mode setting:', error);
        }
    }

    updateShortcutSetting(isLocked) {
        const shortcutSetting = document.getElementById('shortcutSetting');
        if (isLocked) {
            shortcutSetting.classList.remove('disabled');
        } else {
            shortcutSetting.classList.add('disabled');
        }
    }

    startShortcutRecording(settingKey, inputId) {
        const input = document.getElementById(inputId);
        input.value = 'Press keys...';
        input.focus();
        
        const handleKeyDown = async (e) => {
            e.preventDefault();
            
            const keys = [];
            if (e.ctrlKey) keys.push('Ctrl');
            if (e.shiftKey) keys.push('Shift');
            if (e.altKey) keys.push('Alt');
            if (e.metaKey) keys.push('Cmd');
            
            // Add the main key (avoid modifier keys)
            if (!['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)) {
                keys.push(e.key.toUpperCase());
            }
            
            if (keys.length > 0) {
                const shortcut = keys.join('+');
                input.value = shortcut;
                
                try {
                    const saveData = {};
                    saveData[settingKey] = shortcut;
                    await chrome.storage.sync.set(saveData);
                    this.showNotification('Shortcut saved!', 'success');
                    
                    // Reload shortcuts in all content scripts
                    try {
                        const tabs = await chrome.tabs.query({});
                        for (const tab of tabs) {
                            if (tab.url && (tab.url.startsWith('http://') || tab.url.startsWith('https://'))) {
                                try {
                                    await chrome.tabs.sendMessage(tab.id, { action: 'reloadShortcuts' });
                                } catch (e) {
                                    // Ignore errors for tabs without content script
                                }
                            }
                        }
                    } catch (error) {
                        console.error('Error reloading shortcuts in content scripts:', error);
                    }
                } catch (error) {
                    console.error('Error saving shortcut:', error);
                    this.showNotification('Failed to save shortcut', 'error');
                }
                
                document.removeEventListener('keydown', handleKeyDown);
                input.blur();
            }
        };
        
        document.addEventListener('keydown', handleKeyDown);
    }

    async startScreenshot() {
        try {
            // Check if we're on a valid page first
            const tabCheck = await this.checkCurrentTab();
            if (!tabCheck.valid) {
                this.showNotification(tabCheck.error, 'error');
                return;
            }
            
            // Get lock container state
            const lockContainer = document.getElementById('lockContainerToggle').checked;
            
            // Send message to background script to start screenshot
            await chrome.runtime.sendMessage({
                action: 'startScreenshot',
                mode: 'selection',
                lockContainer: lockContainer
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
                
                // Copy to clipboard
                await this.copyScreenshotToClipboard(response.dataUrl);
                
                // Save to recent screenshots
                await this.saveRecentScreenshot(response.dataUrl, 'Full tab screenshot');
                
                // Show success notification (NO NEW WINDOW)
                this.showNotification('Full tab screenshot captured and copied to clipboard!', 'success');
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

    async copyScreenshotToClipboard(dataUrl, showNotification = true) {
        try {
            // Check clipboard permissions
            if (!navigator.clipboard) {
                throw new Error('Clipboard API not available');
            }
            
            // Convert data URL to blob
            const response = await fetch(dataUrl);
            const blob = await response.blob();
            
            console.log('Blob type:', blob.type);
            console.log('Blob size:', blob.size);
            
            // Copy blob to clipboard
            await navigator.clipboard.write([
                new ClipboardItem({
                    [blob.type]: blob
                })
            ]);
            
            console.log('Successfully copied to clipboard');
            
            if (showNotification) {
                this.showNotification('Screenshot copied to clipboard!', 'success');
            }
        } catch (error) {
            console.error('Error copying screenshot to clipboard:', error);
            
            // Try fallback method for text-based copying
            try {
                console.log('Trying fallback clipboard method...');
                await navigator.clipboard.writeText(dataUrl);
                console.log('Fallback successful - copied data URL as text');
                if (showNotification) {
                    this.showNotification('Screenshot URL copied to clipboard!', 'info');
                }
            } catch (fallbackError) {
                console.error('Fallback clipboard method also failed:', fallbackError);
                if (showNotification) {
                    this.showNotification('Failed to copy to clipboard. Screenshot saved to history.', 'error');
                }
            }
            
            throw error; // Re-throw so calling function can handle
        }
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
                        <button class="btn btn-small btn-copy" data-screenshot-id="${screenshot.id}" title="Copy screenshot">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                            </svg>
                        </button>
                </div>
            `).join('');

            // Add click handlers for recent items
            recentList.querySelectorAll('.recent-item').forEach(item => {
                item.addEventListener('click', (e) => {
                    // Don't trigger if clicking on copy button
                    if (e.target.closest('.btn-copy')) {
                        return;
                    }
                    const id = parseInt(item.dataset.id);
                    this.showRecentScreenshot(id);
                });
            });

            // Add copy button handlers
            recentList.querySelectorAll('.btn-copy').forEach(button => {
                button.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const screenshotId = parseInt(button.dataset.screenshotId);
                    this.copyRecentScreenshot(screenshotId);
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
        
        // Create notification content
        notification.innerHTML = `
            <div class="notification-content">
                <span class="notification-message">${message}</span>
                <button class="notification-close" onclick="this.parentElement.parentElement.remove()">×</button>
            </div>
        `;
        
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
            min-width: 300px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        `;
        
        // Add styles for the content and close button
        const style = document.createElement('style');
        style.textContent = `
            .notification-content {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 10px;
            }
            .notification-message {
                flex: 1;
            }
            .notification-close {
                background: none;
                border: none;
                color: white;
                font-size: 18px;
                cursor: pointer;
                padding: 0;
                width: 20px;
                height: 20px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 50%;
                transition: background-color 0.2s;
            }
            .notification-close:hover {
                background-color: rgba(255,255,255,0.2);
            }
        `;
        document.head.appendChild(style);
        
        document.body.appendChild(notification);
        
        // Remove after 5 seconds (increased from 3 seconds)
        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.animation = 'slideOut 0.3s ease';
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.parentNode.removeChild(notification);
                    }
                }, 300);
            }
        }, 5000);
    }

    async checkShortcut() {
        try {
            const result = await chrome.storage.sync.get(['copyShortcut']);
            return result.copyShortcut || null;
        } catch (error) {
            console.error('Error checking shortcut:', error);
            return null;
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
                    if (url && (url.startsWith('chrome://') || url.startsWith('chrome-extension://'))) {
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

    async handleLockContainerToggle(locked) {
        try {
            // Send message to content script to handle lock state
            const currentTab = await chrome.tabs.query({ active: true, currentWindow: true });
            if (currentTab && currentTab[0]) {
                try {
                    await chrome.tabs.sendMessage(currentTab[0].id, {
                        action: 'toggleLockContainer',
                        locked: locked
                    });
                } catch (messageError) {
                    console.log('Content script not available for lock container toggle:', messageError.message);
                    // This is normal if content script isn't injected yet
                    // The lock state will be handled when the screenshot is taken
                }
            }
        } catch (error) {
            console.error('Error handling lock container toggle:', error);
        }
    }

    updateCopyButtonText(isLocked) {
        const copyBtn = document.getElementById('copyBtn');
        if (isLocked) {
            copyBtn.innerHTML = `
                <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                </svg>
                Copy Container
            `;
        } else {
            copyBtn.innerHTML = `
                <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                </svg>
                Copy Last Screenshot
            `;
        }
    }

    async copyLastScreenshot() {
        try {
            const isLocked = document.getElementById('lockContainerToggle').checked;
            
            if (isLocked) {
                // Copy the locked container content
                await this.copyLockedContainer();
            } else {
                // Copy the last screenshot
                const screenshots = await this.getRecentScreenshots();
                if (screenshots.length === 0) {
                    this.showNotification('No screenshots available to copy', 'error');
                    return;
                }

                const lastScreenshot = screenshots[0];
                await this.copyScreenshotToClipboard(lastScreenshot.dataUrl);
                this.showNotification('Last screenshot copied to clipboard!', 'success');
            }
        } catch (error) {
            console.error('Error copying:', error);
            this.showNotification('Failed to copy', 'error');
        }
    }

    async checkTabLockState() {
        try {
            const currentTab = await chrome.tabs.query({ active: true, currentWindow: true });
            if (currentTab && currentTab[0]) {
                try {
                    const response = await chrome.tabs.sendMessage(currentTab[0].id, {
                        action: 'getTabLockState'
                    });
                    
                    if (response && response.isLocked) {
                        // Update UI to reflect locked state
                        const toggle = document.getElementById('lockContainerToggle');
                        if (toggle) {
                            toggle.checked = true;
                        }
                        this.updateCopyButtonText(true);
                    } else {
                        this.updateCopyButtonText(false);
                    }
                } catch (messageError) {
                    console.log('Content script not available for tab lock state check:', messageError.message);
                    // This is normal if content script isn't injected yet
                    this.updateCopyButtonText(false);
                }
            }
        } catch (error) {
            console.error('Error checking tab lock state:', error);
            this.updateCopyButtonText(false);
        }
    }

    async copyRecentScreenshot(screenshotId) {
        try {
            const screenshots = await this.getRecentScreenshots();
            const screenshot = screenshots.find(s => s.id === screenshotId);
            
            if (screenshot) {
                await this.copyScreenshotToClipboard(screenshot.dataUrl);
                this.showNotification('Screenshot copied to clipboard!', 'success');
            } else {
                this.showNotification('Screenshot not found', 'error');
            }
        } catch (error) {
            console.error('Error copying recent screenshot:', error);
            this.showNotification('Failed to copy screenshot', 'error');
        }
    }

    async copyLockedContainer() {
        try {
            console.log('Starting copyLockedContainer...');
            
            // Send message to content script to get the locked container screenshot
            const currentTab = await chrome.tabs.query({ active: true, currentWindow: true });
            if (currentTab && currentTab[0]) {
                console.log('Sending getLockedContainerScreenshot message to tab:', currentTab[0].id);
                
                try {
                    const response = await chrome.tabs.sendMessage(currentTab[0].id, {
                        action: 'getLockedContainerScreenshot'
                    });
                    
                    console.log('Received response from content script:', response);
                    
                    if (response && response.success && response.dataUrl) {
                        console.log('Successfully got locked container screenshot, copying to clipboard...');
                        console.log('dataUrl length:', response.dataUrl.length);
                        console.log('dataUrl starts with:', response.dataUrl.substring(0, 50));
                        
                        await this.copyScreenshotToClipboard(response.dataUrl, false); // Don't show notification here
                        this.showNotification('Container content copied to clipboard!', 'success');
                    } else {
                        const errorMsg = response ? response.error : 'Unknown error';
                        console.error('Failed to get locked container screenshot:', errorMsg);
                        console.error('Response object:', response);
                        this.showNotification(`No locked container found: ${errorMsg}`, 'error');
                    }
                } catch (messageError) {
                    console.error('Failed to communicate with content script:', messageError);
                    this.showNotification('Content script not available. Please try taking a screenshot first.', 'error');
                }
            } else {
                console.error('Cannot access current tab');
                this.showNotification('Cannot access current tab', 'error');
            }
        } catch (error) {
            console.error('Error copying locked container:', error);
            this.showNotification(`Failed to copy container: ${error.message}`, 'error');
        }
    }
}

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
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
