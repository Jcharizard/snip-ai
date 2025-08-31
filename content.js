// Content Script - Handles visual selection interface

class AISnipContent {
    constructor() {
        this.isSelectionMode = false;
        this.selectionOverlay = null;
        this.selectionBox = null;
        this.startX = 0;
        this.startY = 0;
        this.isDragging = false;
        this.isLocked = false;
        this.lockContainer = false;
        
        this.init();
    }

    async init() {
        this.setupMessageListeners();
        this.setupKeyboardShortcuts();
        
        // Load saved tab state
        await this.loadTabState();
    }

    setupMessageListeners() {
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            if (request.action === 'ping') {
                sendResponse({ success: true });
                return;
            }
            
            if (request.action === 'startSelectionMode') {
                this.lockContainer = request.lockContainer || false;
                this.startSelectionMode();
                sendResponse({ success: true });
            }
            
            if (request.action === 'toggleLockContainer') {
                this.handleLockContainerToggle(request.locked);
                sendResponse({ success: true });
            }
            
            if (request.action === 'getLockedContainerScreenshot') {
                this.getLockedContainerScreenshot().then(result => {
                    sendResponse(result);
                });
                return true; // Keep message channel open for async response
            }
            
            if (request.action === 'cropImage') {
                console.log('content.js received cropImage action');
                console.log('request.dataUrl length:', request.dataUrl ? request.dataUrl.length : 'null');
                console.log('request.selection:', request.selection);
                
                this.cropImage(request.dataUrl, request.selection).then(result => {
                    console.log('cropImage completed, sending response:', result);
                    sendResponse(result);
                });
                return true; // Keep message channel open for async response
            }
            
            if (request.action === 'getTabLockState') {
                sendResponse({ 
                    isLocked: this.isLocked, 
                    lockContainer: this.lockContainer 
                });
            }
            
            if (request.action === 'handleCopyShortcut') {
                this.handleCopyShortcut().then(result => {
                    sendResponse(result);
                });
                return true; // Keep message channel open for async response
            }
            
            if (request.action === 'copyImageToClipboard') {
                this.copyScreenshotToClipboard(request.dataUrl).then(result => {
                    sendResponse({ success: true });
                }).catch(error => {
                    console.error('Error copying image to clipboard:', error);
                    sendResponse({ success: false, error: error.message });
                });
                return true; // Keep message channel open for async response
            }
        });
    }

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // ESC to cancel selection or unlock
            if (e.key === 'Escape') {
                if (this.isSelectionMode) {
                    this.cancelSelection();
                } else if (this.isLocked) {
                    this.cleanup();
                }
            }
            
            // Enter to confirm selection
            if (e.key === 'Enter' && this.isSelectionMode && this.selectionBox) {
                this.confirmSelection();
            }
            
            // Global shortcut for copying locked container (Ctrl+Shift+C or Cmd+Shift+C)
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'C') {
                console.log('Global shortcut detected: Ctrl/Cmd+Shift+C');
                e.preventDefault();
                e.stopPropagation();
                
                // Try local copy first
                this.handleCopyShortcut().then(result => {
                    console.log('Local shortcut copy result:', result);
                    if (!result || !result.success) {
                        // Fallback: send message to background script
                        console.log('Local copy failed, trying background script fallback');
                        chrome.runtime.sendMessage({ action: 'copyLockedContainerShortcut' });
                    }
                });
            }
            
            // Global shortcut for copying full tab screenshot (Ctrl+Shift+F or Cmd+Shift+F)
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'F') {
                console.log('Global shortcut detected: Ctrl/Cmd+Shift+F');
                e.preventDefault();
                e.stopPropagation();
                
                // Send message to background script to take full tab screenshot
                chrome.runtime.sendMessage({ action: 'takeFullTabScreenshot' }).then(result => {
                    if (result && result.success && result.dataUrl) {
                        // Copy to clipboard
                        this.copyScreenshotToClipboard(result.dataUrl).then(() => {
                            this.showQuickNotification('Full tab screenshot copied to clipboard!');
                        });
                    }
                });
            }
        });
    }

    startSelectionMode() {
        if (this.isSelectionMode) return;
        
        this.isSelectionMode = true;
        this.createSelectionOverlay();
        this.showInstructions();
        
        // Change cursor
        document.body.style.cursor = 'crosshair';
        
        // Prevent scrolling
        document.body.style.overflow = 'hidden';
    }

    createSelectionOverlay() {
        // Create overlay
        this.selectionOverlay = document.createElement('div');
        this.selectionOverlay.id = 'ai-snip-overlay';
        this.selectionOverlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: rgba(0, 0, 0, 0.3);
            z-index: 999999;
            cursor: crosshair;
        `;

        // Create selection box
        this.selectionBox = document.createElement('div');
        this.selectionBox.id = 'ai-snip-selection';
        this.selectionBox.style.cssText = `
            position: absolute;
            border: 2px solid #667eea;
            background: rgba(102, 126, 234, 0.1);
            display: none;
            pointer-events: none;
        `;

        this.selectionOverlay.appendChild(this.selectionBox);
        document.body.appendChild(this.selectionOverlay);

        // Add event listeners
        this.selectionOverlay.addEventListener('mousedown', (e) => this.startSelection(e));
        this.selectionOverlay.addEventListener('mousemove', (e) => this.updateSelection(e));
        this.selectionOverlay.addEventListener('mouseup', (e) => this.endSelection(e));
        
        // Prevent context menu
        this.selectionOverlay.addEventListener('contextmenu', (e) => e.preventDefault());
    }

    showInstructions() {
        const instructions = document.createElement('div');
        instructions.id = 'ai-snip-instructions';
        instructions.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            font-family: Arial, sans-serif;
            font-size: 14px;
            z-index: 1000000;
            pointer-events: none;
        `;
        instructions.textContent = 'Drag to select area • ESC to cancel • Enter to confirm';
        
        document.body.appendChild(instructions);
        
        // Auto-hide after 3 seconds
        setTimeout(() => {
            if (instructions.parentNode) {
                instructions.style.opacity = '0';
                instructions.style.transition = 'opacity 0.5s ease';
                setTimeout(() => {
                    if (instructions.parentNode) {
                        instructions.parentNode.removeChild(instructions);
                    }
                }, 500);
            }
        }, 3000);
    }

    startSelection(e) {
        this.isDragging = true;
        this.startX = e.clientX;
        this.startY = e.clientY;
        
        this.selectionBox.style.display = 'block';
        this.selectionBox.style.left = this.startX + 'px';
        this.selectionBox.style.top = this.startY + 'px';
        this.selectionBox.style.width = '0px';
        this.selectionBox.style.height = '0px';
    }

    updateSelection(e) {
        if (!this.isDragging) return;
        
        const currentX = e.clientX;
        const currentY = e.clientY;
        
        const left = Math.min(this.startX, currentX);
        const top = Math.min(this.startY, currentY);
        const width = Math.abs(currentX - this.startX);
        const height = Math.abs(currentY - this.startY);
        
        this.selectionBox.style.left = left + 'px';
        this.selectionBox.style.top = top + 'px';
        this.selectionBox.style.width = width + 'px';
        this.selectionBox.style.height = height + 'px';
    }

    endSelection(e) {
        if (!this.isDragging) return;
        
        this.isDragging = false;
        
        const width = parseInt(this.selectionBox.style.width);
        const height = parseInt(this.selectionBox.style.height);
        
        // Only confirm if selection is large enough
        if (width > 10 && height > 10) {
            this.confirmSelection();
        } else {
            this.cancelSelection();
        }
    }

    async confirmSelection() {
        if (!this.selectionBox) return;
        
        const rect = this.selectionBox.getBoundingClientRect();
        const selection = {
            x: rect.left,
            y: rect.top,
            width: rect.width,
            height: rect.height
        };
        
        try {
            // Send selection to background script
            const response = await chrome.runtime.sendMessage({
                action: 'captureSelection',
                selection: selection
            });
            
            if (response.success) {
                this.showScreenshotCaptured(response.dataUrl);
                
                // If lock container is enabled, keep the selection visible
                if (this.lockContainer) {
                    this.lockSelection();
                } else {
                    this.cleanup();
                }
            } else {
                this.showErrorMessage(response.error);
                this.cleanup();
            }
        } catch (error) {
            console.error('Error capturing selection:', error);
            this.showErrorMessage('Failed to capture selection');
            this.cleanup();
        }
    }

    cancelSelection() {
        this.cleanup();
    }

    lockSelection() {
        this.isLocked = true;
        this.isSelectionMode = false;
        
        // Remove instructions
        const instructions = document.getElementById('ai-snip-instructions');
        if (instructions && instructions.parentNode) {
            instructions.parentNode.removeChild(instructions);
        }
        
        // Reset cursor and scrolling - allow full page interaction
        document.body.style.cursor = '';
        document.body.style.overflow = '';
        
        // Make overlay completely transparent and non-interactive
        if (this.selectionOverlay) {
            this.selectionOverlay.style.background = 'transparent';
            this.selectionOverlay.style.pointerEvents = 'none';
            this.selectionOverlay.style.cursor = 'default';
            
            // Remove all event listeners by cloning
            const newOverlay = this.selectionOverlay.cloneNode(true);
            this.selectionOverlay.parentNode.replaceChild(newOverlay, this.selectionOverlay);
            this.selectionOverlay = newOverlay;
            
            // Update the selectionBox reference to point to the new one
            this.selectionBox = this.selectionOverlay.querySelector('#ai-snip-selection');
            
            // Make selection box non-interactive but keep it visible
            if (this.selectionBox) {
                this.selectionBox.style.pointerEvents = 'none';
            }
        }
        
        // Save lock state to tab storage
        this.saveTabState();
        
        // Show lock indicator
        this.showLockIndicator();
    }

    handleLockContainerToggle(locked) {
        if (locked && this.isLocked) {
            // Already locked, do nothing
            return;
        } else if (!locked && this.isLocked) {
            // Unlock the selection
            this.cleanup();
        }
    }

    showLockIndicator() {
        const lockIndicator = document.createElement('div');
        lockIndicator.id = 'ai-snip-lock-indicator';
        lockIndicator.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 8px 12px;
            border-radius: 6px;
            font-family: Arial, sans-serif;
            font-size: 12px;
            z-index: 1000001;
            display: flex;
            align-items: center;
            gap: 6px;
        `;
        lockIndicator.innerHTML = `
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                <circle cx="12" cy="16" r="1"></circle>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
            </svg>
            Container Locked
        `;
        
        document.body.appendChild(lockIndicator);
        
        // Auto-remove after 3 seconds
        setTimeout(() => {
            if (lockIndicator.parentNode) {
                lockIndicator.style.opacity = '0';
                lockIndicator.style.transition = 'opacity 0.5s ease';
                setTimeout(() => {
                    if (lockIndicator.parentNode) {
                        lockIndicator.parentNode.removeChild(lockIndicator);
                    }
                }, 500);
            }
        }, 3000);
    }

    async getLockedContainerScreenshot() {
        try {
            console.log('getLockedContainerScreenshot called');
            console.log('isLocked:', this.isLocked);
            console.log('selectionBox:', this.selectionBox);
            console.log('selectionBox in DOM:', this.selectionBox && document.contains(this.selectionBox));
            
            if (!this.isLocked || !this.selectionBox) {
                console.log('No locked container found - isLocked:', this.isLocked, 'selectionBox exists:', !!this.selectionBox);
                return { success: false, error: 'No locked container found' };
            }

            // Check if selection box is still in the DOM and has dimensions
            if (!document.contains(this.selectionBox)) {
                console.log('Selection box no longer in DOM');
                return { success: false, error: 'Selection box was removed from DOM' };
            }

            // Get the current selection coordinates
            const rect = this.selectionBox.getBoundingClientRect();
            const selection = {
                x: rect.left,
                y: rect.top,
                width: rect.width,
                height: rect.height
            };
            
            console.log('Selection coordinates:', selection);
            console.log('Selection box computed style:', window.getComputedStyle(this.selectionBox));
            
            // Check if selection has valid dimensions
            if (selection.width <= 0 || selection.height <= 0) {
                console.log('Selection has invalid dimensions:', selection);
                return { success: false, error: 'Selection has invalid dimensions' };
            }

            // Send to background script to capture the selection
            console.log('Sending captureSelection message to background script...');
            const response = await chrome.runtime.sendMessage({
                action: 'captureSelection',
                selection: selection
            });
            
            console.log('Received response from background script:', response);
            
            // Ensure we return the correct format
            if (response && response.success && response.dataUrl) {
                console.log('Successfully got cropped screenshot, returning dataUrl');
                return { success: true, dataUrl: response.dataUrl };
            } else {
                console.error('Invalid response format:', response);
                return { success: false, error: response ? response.error : 'Invalid response format' };
            }
        } catch (error) {
            console.error('Error getting locked container screenshot:', error);
            return { success: false, error: error.message };
        }
    }

    async cropImage(dataUrl, selection) {
        console.log('content.js cropImage called');
        console.log('dataUrl length:', dataUrl.length);
        console.log('selection:', selection);
        
        return new Promise((resolve, reject) => {
            try {
                const img = new Image();
                
                img.onload = () => {
                    try {
                        console.log('Image loaded successfully');
                        console.log('Image dimensions:', img.width, 'x', img.height);
                        
                        // Create canvas for cropping
                        const canvas = document.createElement('canvas');
                        const ctx = canvas.getContext('2d');
                        
                        // Set canvas size to selection size
                        canvas.width = selection.width;
                        canvas.height = selection.height;
                        
                        console.log('Canvas size set to:', canvas.width, 'x', canvas.height);
                        console.log('Drawing image with crop coordinates:', selection.x, selection.y, selection.width, selection.height);
                        
                        // Draw cropped portion
                        ctx.drawImage(
                            img,
                            selection.x, selection.y, selection.width, selection.height,
                            0, 0, selection.width, selection.height
                        );
                        
                        // Convert to data URL
                        const croppedDataUrl = canvas.toDataURL('image/png');
                        console.log('Cropped data URL length:', croppedDataUrl.length);
                        console.log('Cropped data URL starts with:', croppedDataUrl.substring(0, 50));
                        
                        resolve({ success: true, croppedDataUrl: croppedDataUrl });
                    } catch (error) {
                        console.error('Error cropping image:', error);
                        resolve({ success: false, error: error.message });
                    }
                };
                
                img.onerror = (error) => {
                    console.error('Failed to load image for cropping:', error);
                    resolve({ success: false, error: 'Failed to load image for cropping' });
                };
                
                console.log('Setting image src...');
                img.src = dataUrl;
            } catch (error) {
                console.error('Error in cropImage:', error);
                resolve({ success: false, error: error.message });
            }
        });
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

    async handleCopyShortcut() {
        try {
            console.log('Content script: handleCopyShortcut called');
            
            // Check if we have a locked container
            if (!this.isLocked || !this.selectionBox) {
                console.log('No locked container found for shortcut');
                return { success: false, error: 'No locked container found' };
            }

            // Get the locked container screenshot
            const screenshotResult = await this.getLockedContainerScreenshot();
            
            if (screenshotResult && screenshotResult.success && screenshotResult.dataUrl) {
                console.log('Got locked container screenshot, copying to clipboard...');
                
                // Copy to clipboard
                await this.copyScreenshotToClipboard(screenshotResult.dataUrl);
                
                // Show a quick notification
                this.showQuickNotification('Container copied to clipboard!');
                
                console.log('Successfully copied locked container via shortcut');
                return { success: true };
            } else {
                console.log('Failed to get locked container screenshot:', screenshotResult);
                return { success: false, error: screenshotResult ? screenshotResult.error : 'Failed to capture screenshot' };
            }
        } catch (error) {
            console.error('Error in handleCopyShortcut:', error);
            return { success: false, error: error.message };
        }
    }

    showQuickNotification(message) {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 8px 12px;
            border-radius: 6px;
            font-family: Arial, sans-serif;
            font-size: 12px;
            z-index: 1000002;
            animation: slideIn 0.3s ease;
        `;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        // Auto-remove after 2 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.animation = 'slideOut 0.3s ease';
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.parentNode.removeChild(notification);
                    }
                }, 300);
            }
        }, 2000);
    }

    // Tab state persistence methods
    async saveTabState() {
        try {
            const tabState = {
                isLocked: this.isLocked,
                lockContainer: this.lockContainer,
                timestamp: Date.now()
            };
            
            // Save to chrome.storage.local with tab-specific key
            const tabId = await this.getCurrentTabId();
            const key = `tabState_${tabId}`;
            await chrome.storage.local.set({ [key]: tabState });
        } catch (error) {
            console.error('Error saving tab state:', error);
        }
    }

    async loadTabState() {
        try {
            const tabId = await this.getCurrentTabId();
            const key = `tabState_${tabId}`;
            const result = await chrome.storage.local.get([key]);
            
            if (result[key]) {
                const state = result[key];
                // Only restore if the state is recent (within last 30 minutes)
                if (Date.now() - state.timestamp < 30 * 60 * 1000) {
                    this.isLocked = state.isLocked;
                    this.lockContainer = state.lockContainer;
                    
                    // If we were locked, restore the lock state
                    if (this.isLocked) {
                        this.restoreLockState();
                    }
                    
                    return true;
                }
            }
            return false;
        } catch (error) {
            console.error('Error loading tab state:', error);
            return false;
        }
    }

    async getCurrentTabId() {
        try {
            const response = await chrome.runtime.sendMessage({ action: 'getCurrentTabId' });
            return response.tabId;
        } catch (error) {
            console.error('Error getting current tab ID:', error);
            return null;
        }
    }

    restoreLockState() {
        // This method will be called when we need to restore a locked state
        // For now, we'll just set the flag - the UI will be restored when popup opens
        console.log('Restoring lock state for tab');
    }

    cleanup() {
        this.isSelectionMode = false;
        this.isLocked = false;
        
        // Remove overlay
        if (this.selectionOverlay && this.selectionOverlay.parentNode) {
            this.selectionOverlay.parentNode.removeChild(this.selectionOverlay);
        }
        
        // Remove instructions
        const instructions = document.getElementById('ai-snip-instructions');
        if (instructions && instructions.parentNode) {
            instructions.parentNode.removeChild(instructions);
        }
        
        // Remove lock indicator
        const lockIndicator = document.getElementById('ai-snip-lock-indicator');
        if (lockIndicator && lockIndicator.parentNode) {
            lockIndicator.parentNode.removeChild(lockIndicator);
        }
        
        // Reset cursor and scrolling
        document.body.style.cursor = '';
        document.body.style.overflow = '';
        
        // Reset variables
        this.selectionOverlay = null;
        this.selectionBox = null;
        this.isDragging = false;
        
        // Clear tab state when cleaning up
        this.saveTabState();
    }

    async showScreenshotCaptured(dataUrl) {
        // Auto-copy screenshot to clipboard
        try {
            await this.copyScreenshotToClipboard(dataUrl);
        } catch (error) {
            console.error('Failed to copy screenshot to clipboard:', error);
        }
        
        const message = document.createElement('div');
        message.id = 'ai-snip-success';
        message.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: white;
            border: 2px solid #28a745;
            border-radius: 12px;
            padding: 20px;
            max-width: 400px;
            max-height: 300px;
            overflow-y: auto;
            font-family: Arial, sans-serif;
            font-size: 14px;
            z-index: 1000001;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
        `;
        
        // Create header with close button
        const header = document.createElement('div');
        header.style.cssText = 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;';
        
        const title = document.createElement('h3');
        title.style.cssText = 'margin: 0; color: #28a745;';
        title.textContent = '✓ Screenshot Captured';
        
        const closeBtn = document.createElement('button');
        closeBtn.style.cssText = 'background: none; border: none; font-size: 20px; cursor: pointer; color: #666; padding: 0; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center;';
        closeBtn.textContent = '×';
        closeBtn.addEventListener('click', () => {
            if (message.parentNode) {
                message.parentNode.removeChild(message);
            }
        });
        
        header.appendChild(title);
        header.appendChild(closeBtn);
        
        // Create message text
        const messageText = document.createElement('div');
        messageText.style.cssText = 'margin-bottom: 15px; line-height: 1.5;';
        messageText.textContent = 'Your screenshot has been captured and saved to the extension history. Copied to clipboard.';
        
        // Create button container
        const buttonContainer = document.createElement('div');
        buttonContainer.style.cssText = 'display: flex; gap: 10px;';
        
        // Create Copy Image URL button
        const copyUrlBtn = document.createElement('button');
        copyUrlBtn.style.cssText = 'background: #667eea; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer;';
        copyUrlBtn.textContent = 'Copy Image URL';
        copyUrlBtn.addEventListener('click', async () => {
            try {
                await navigator.clipboard.writeText(dataUrl);
                // Show a quick success indicator
                copyUrlBtn.textContent = 'Copied!';
                setTimeout(() => {
                    copyUrlBtn.textContent = 'Copy Image URL';
                }, 1000);
            } catch (error) {
                console.error('Failed to copy URL:', error);
            }
        });
        
        // Create Close button
        const closeButton = document.createElement('button');
        closeButton.style.cssText = 'background: #6c757d; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer;';
        closeButton.textContent = 'Close';
        closeButton.addEventListener('click', () => {
            if (message.parentNode) {
                message.parentNode.removeChild(message);
            }
        });
        
        buttonContainer.appendChild(copyUrlBtn);
        buttonContainer.appendChild(closeButton);
        
        // Assemble the message
        message.appendChild(header);
        message.appendChild(messageText);
        message.appendChild(buttonContainer);
        
        document.body.appendChild(message);
        
        // Auto-remove after 8 seconds (reduced from 10)
        setTimeout(() => {
            if (message.parentNode) {
                message.parentNode.removeChild(message);
            }
        }, 8000);
    }

    showSuccessMessage(answer) {
        const message = document.createElement('div');
        message.id = 'ai-snip-success';
        message.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: white;
            border: 2px solid #28a745;
            border-radius: 12px;
            padding: 20px;
            max-width: 400px;
            max-height: 300px;
            overflow-y: auto;
            font-family: Arial, sans-serif;
            font-size: 14px;
            z-index: 1000001;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
        `;
        
        message.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                <h3 style="margin: 0; color: #28a745;">✓ Analysis Complete</h3>
                <button onclick="this.parentElement.parentElement.remove()" style="background: none; border: none; font-size: 20px; cursor: pointer; color: #666;">×</button>
            </div>
            <div style="margin-bottom: 15px; line-height: 1.5;">${answer}</div>
            <div style="display: flex; gap: 10px;">
                <button onclick="navigator.clipboard.writeText('${answer.replace(/'/g, "\\'")}')" style="background: #667eea; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer;">Copy Answer</button>
                <button onclick="this.parentElement.parentElement.remove()" style="background: #6c757d; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer;">Close</button>
            </div>
        `;
        
        document.body.appendChild(message);
        
        // Auto-remove after 10 seconds
        setTimeout(() => {
            if (message.parentNode) {
                message.parentNode.removeChild(message);
            }
        }, 10000);
    }

    showErrorMessage(error) {
        const message = document.createElement('div');
        message.id = 'ai-snip-error';
        message.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: white;
            border: 2px solid #dc3545;
            border-radius: 12px;
            padding: 20px;
            max-width: 400px;
            font-family: Arial, sans-serif;
            font-size: 14px;
            z-index: 1000001;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
        `;
        
        message.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                <h3 style="margin: 0; color: #dc3545;">✗ Error</h3>
                <button onclick="this.parentElement.parentElement.remove()" style="background: none; border: none; font-size: 20px; cursor: pointer; color: #666;">×</button>
            </div>
            <div style="margin-bottom: 15px; color: #666;">${error}</div>
            <button onclick="this.parentElement.parentElement.remove()" style="background: #dc3545; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer;">Close</button>
        `;
        
        document.body.appendChild(message);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (message.parentNode) {
                message.parentNode.removeChild(message);
            }
        }, 5000);
    }
}

// Initialize content script
(async () => {
    const content = new AISnipContent();
})();
