// Content Script - Handles visual selection interface

class AISnipContent {
    constructor() {
        this.isSelectionMode = false;
        this.selectionOverlay = null;
        this.selectionBox = null;
        this.startX = 0;
        this.startY = 0;
        this.isDragging = false;
        
        this.init();
    }

    init() {
        this.setupMessageListeners();
        this.setupKeyboardShortcuts();
    }

    setupMessageListeners() {
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            if (request.action === 'startSelectionMode') {
                this.startSelectionMode();
                sendResponse({ success: true });
            }
        });
    }

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // ESC to cancel selection
            if (e.key === 'Escape' && this.isSelectionMode) {
                this.cancelSelection();
            }
            
            // Enter to confirm selection
            if (e.key === 'Enter' && this.isSelectionMode && this.selectionBox) {
                this.confirmSelection();
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
            } else {
                this.showErrorMessage(response.error);
            }
        } catch (error) {
            console.error('Error capturing selection:', error);
            this.showErrorMessage('Failed to capture selection');
        }
        
        this.cleanup();
    }

    cancelSelection() {
        this.cleanup();
    }

    cleanup() {
        this.isSelectionMode = false;
        
        // Remove overlay
        if (this.selectionOverlay && this.selectionOverlay.parentNode) {
            this.selectionOverlay.parentNode.removeChild(this.selectionOverlay);
        }
        
        // Remove instructions
        const instructions = document.getElementById('ai-snip-instructions');
        if (instructions && instructions.parentNode) {
            instructions.parentNode.removeChild(instructions);
        }
        
        // Reset cursor and scrolling
        document.body.style.cursor = '';
        document.body.style.overflow = '';
        
        // Reset variables
        this.selectionOverlay = null;
        this.selectionBox = null;
        this.isDragging = false;
    }

    showScreenshotCaptured(dataUrl) {
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
                <h3 style="margin: 0; color: #28a745;">✓ Screenshot Captured</h3>
                <button onclick="this.parentElement.parentElement.remove()" style="background: none; border: none; font-size: 20px; cursor: pointer; color: #666;">×</button>
            </div>
            <div style="margin-bottom: 15px; line-height: 1.5;">Your screenshot has been captured and saved to the extension history.</div>
            <div style="display: flex; gap: 10px;">
                <button onclick="navigator.clipboard.writeText('${dataUrl}')" style="background: #667eea; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer;">Copy Image URL</button>
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
new AISnipContent();
