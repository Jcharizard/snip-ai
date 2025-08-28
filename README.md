# SnipFlow - Smart Screenshot Assistant

A powerful Chrome extension that revolutionizes screenshot capture and management. Capture any area of the web with precision, manage your screenshots, and copy them to clipboard instantly - all without any API costs or external dependencies.

## 🎯 Project Overview

**SnipFlow** transforms the way you capture and manage screenshots. No more switching between tools or dealing with complex workflows. This extension provides a seamless, one-click experience for capturing, organizing, and sharing screenshots.

### The Problem
- Manual screenshot capture using system tools
- Switching between browser tabs and applications
- Difficulty in managing multiple screenshots
- No quick way to copy specific areas
- Limited screenshot organization

### The Solution
- **One-click screenshot capture** directly in the browser
- **Smart area selection** with drag-and-drop interface
- **Lock container mode** to keep selections visible
- **Instant clipboard copying** of any screenshot
- **Screenshot history** for easy access and management
- **Cross-platform compatibility** (Windows, macOS, Linux)
- **Dark mode support** for comfortable usage

## 🚀 Features

### Core Functionality
- **Smart Screenshot Tool**: Drag to select specific areas or capture entire tabs
- **Lock Container Mode**: Keep selection boxes visible on screen for reference
- **Instant Copy**: Copy any screenshot to clipboard with one click
- **Screenshot History**: View and manage recent screenshots
- **Modern UI**: Clean, intuitive interface with smooth animations
- **Dark Mode**: Toggle between light and dark themes
- **Cross-Platform**: Works seamlessly on Windows, macOS, and Linux

### Advanced Features
- **Context Menu Integration**: Right-click to start screenshot mode
- **Keyboard Shortcuts**: 
  - **ESC**: Cancel selection or unlock container
  - **Enter**: Confirm current selection
  - **Ctrl+Shift+C / Cmd+Shift+C**: Copy locked container to clipboard
- **Responsive Design**: Works on different screen sizes
- **Error Handling**: Graceful error messages and recovery
- **Tab-Specific State**: Remembers settings per tab
- **No External Dependencies**: Works completely offline

## 🛠️ Technical Architecture

### Technology Stack
- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Chrome Extension API**: Manifest V3
- **Storage**: Chrome Storage API (sync & local)
- **Image Processing**: Canvas API for cropping
- **Clipboard API**: Native browser clipboard integration

### File Structure
```
snipflow/
├── manifest.json          # Extension configuration
├── popup.html            # Main popup interface
├── popup.css             # Popup styling
├── popup.js              # Popup logic and UI interactions
├── background.js         # Service worker for core functionality
├── content.js            # Content script for selection interface
├── content.css           # Content script styling
├── icon.png              # Extension icon
├── welcome.html          # Installation welcome page
└── README.md            # Project documentation
```

### Key Components

#### 1. Popup Interface (`popup.html/js`)
- Modern, responsive UI design with dark mode support
- Screenshot history display with copy buttons
- Settings management (dark mode, shortcuts)
- Status notifications and loading states

#### 2. Background Service Worker (`background.js`)
- Screenshot capture using Chrome API
- Image processing and cropping
- Message handling between components
- Keyboard shortcut management

#### 3. Content Script (`content.js`)
- Visual selection overlay with lock container support
- Drag-and-drop selection interface
- Keyboard shortcuts and tab state persistence
- Real-time feedback and notifications

## 📦 Installation

### System Requirements
- **Chrome Browser**: Version 88 or later
- **Operating System**: Windows, macOS, or Linux
- **Internet Connection**: Not required for core functionality

### For Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/Jcharizard/snip-ai.git
   cd snip-ai
   ```

2. **Load in Chrome**
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top right)
   - Click "Load unpacked" and select the project folder

3. **Start Using**
   - Click the SnipFlow extension icon in your toolbar
   - No API keys or configuration required!

### For Users (Future)
- Install from Chrome Web Store (when published)
- No setup required - works out of the box

## 🎮 Usage

### Basic Workflow

1. **Navigate to a webpage** you want to capture
2. **Click the SnipFlow extension icon** in your browser toolbar
3. **Choose screenshot method**:
   - **"Take Screenshot"**: Drag to select specific area
   - **"Lock Container"**: Toggle to keep selection visible on screen
   - **"Full Tab Screenshot"**: Capture entire visible page
   - **"Copy Last Screenshot"**: Quickly copy most recent screenshot
4. **Use keyboard shortcuts** for quick access
5. **View history** of recent screenshots
6. **Copy any screenshot** with one click

### Advanced Features

#### Area Selection Mode
- Click "Take Screenshot" to enter selection mode
- Drag to create a selection rectangle
- Press **Enter** to confirm or **ESC** to cancel
- Selection must be at least 10x10 pixels
- Enable "Lock Container" to keep selection visible on screen

#### Lock Container Mode
- Toggle "Lock Container" before taking a screenshot
- Selection box stays visible on screen with dimmed background
- Page remains scrollable while container stays in position
- Use "Copy Container" button to copy the locked area
- Press **Ctrl+Shift+C** (or **Cmd+Shift+C** on Mac) for quick copy

#### Full Tab Screenshot
- Click "Full Tab Screenshot" for instant capture
- Automatically copies to clipboard
- Perfect for capturing entire pages
- Use "Copy Last Screenshot" to quickly copy the most recent capture

#### Context Menu
- Right-click anywhere on a webpage
- Select "SnipFlow: Take Screenshot" from context menu
- Starts selection mode immediately

#### Keyboard Shortcuts
- **ESC**: Cancel selection mode or unlock container
- **Enter**: Confirm current selection
- **Ctrl+Shift+C / Cmd+Shift+C**: Copy locked container to clipboard

## 🔧 Configuration

### Settings

- **Dark Mode**: Toggle between light and dark themes
- **Copy Container Shortcut**: Customize keyboard shortcut (when lock container is enabled)
- **Tab-Specific State**: Settings are remembered per tab

### Storage
- **Sync Storage**: Global settings (dark mode, shortcuts)
- **Local Storage**: Screenshot history (last 10 items) and tab-specific state
- **Privacy**: No data sent to external servers

## 🎨 Design Philosophy

### User Experience
- **Minimal Friction**: One-click operations where possible
- **Visual Feedback**: Clear status indicators and animations
- **Error Recovery**: Helpful error messages and fallbacks
- **Accessibility**: Keyboard navigation and screen reader support
- **Responsive Design**: Works on all screen sizes

### Visual Design
- **Modern Aesthetic**: Clean gradients and smooth animations
- **Dark Mode Support**: Comfortable usage in any lighting
- **Consistent Branding**: Professional color scheme throughout
- **Professional Polish**: Attention to detail in every interaction

## 🔒 Privacy & Security

### Data Handling
- **Local Processing**: All screenshots processed locally
- **No External APIs**: No data sent to external servers
- **Secure Storage**: Data stored securely in Chrome storage
- **No Tracking**: No analytics or user tracking

### Privacy Features
- **No Data Collection**: Extension doesn't collect personal information
- **Local History**: Screenshot history stored locally on device
- **Minimal Permissions**: Only requests necessary permissions
- **Offline Capable**: Core functionality works without internet

## 🚧 Development Roadmap

### Phase 1: MVP ✅
- [x] Basic screenshot functionality
- [x] Area selection tool
- [x] Popup interface
- [x] Screenshot history

### Phase 2: Enhanced Features ✅
- [x] Lock container mode
- [x] Keyboard shortcuts
- [x] Dark mode support
- [x] Cross-platform compatibility
- [x] Context menu integration
- [x] Tab-specific state persistence

### Phase 3: Advanced Features 📋
- [ ] Batch processing for multiple screenshots
- [ ] Screenshot annotation tools
- [ ] Export features (PDF, different formats)
- [ ] Cloud sync for history
- [ ] Smart screenshot organization

### Phase 4: Polish & Portfolio 📋
- [ ] Performance optimization
- [ ] Cross-browser support
- [ ] Mobile companion app
- [ ] Chrome Web Store submission
- [ ] Documentation and tutorials

## 🐛 Troubleshooting

### Common Issues

#### Screenshot Not Working
- Make sure you're on a regular webpage (not chrome:// URLs)
- Check that the extension has necessary permissions
- Try refreshing the page and retrying

#### Lock Container Not Working
- Ensure "Lock Container" is toggled on before taking screenshot
- Check that the page allows content script injection
- Try refreshing the page and retrying

#### Keyboard Shortcuts Not Working
- Verify the shortcut is properly configured in settings
- Check that no other extensions are conflicting
- Ensure the content script is properly injected

#### Extension Not Loading
- Check Chrome's extension page for error messages
- Try reloading the extension
- Ensure you're using Chrome version 88 or later

### Debug Mode
- Open Chrome DevTools (F12)
- Check the Console tab for error messages
- Look for "SnipFlow" related logs

## 🤝 Contributing

This is a portfolio project, but contributions are welcome! Here's how you can help:

### Development Setup
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

### Areas for Contribution
- **UI/UX Improvements**: Better designs and animations
- **Feature Additions**: New functionality and integrations
- **Bug Fixes**: Identify and fix issues
- **Documentation**: Improve README and code comments
- **Testing**: Add unit tests and integration tests

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## 🙏 Acknowledgments

- **Chrome Extension Team** for the excellent documentation
- **Open Source Community** for inspiration and tools
- **GitHub** for providing the platform for this project

## 📞 Support

For questions, issues, or feature requests:
- Create an issue on [GitHub](https://github.com/Jcharizard/snip-ai)
- Check the troubleshooting section above
- Review the Chrome extension documentation

---

**Built with ❤️ for productivity and efficiency**

*This project demonstrates modern web development, Chrome extension development, and user experience design - perfect for a developer portfolio!*

## 🎯 Use Cases

### Common Scenarios
- **Documentation**: Capture specific sections of documentation
- **Bug Reports**: Screenshot error messages and UI issues
- **Design Reference**: Save design inspiration and layouts
- **Learning**: Capture educational content for later reference
- **Communication**: Quickly share visual information with colleagues
- **Research**: Save important information from web pages

### Professional Use
- **Developers**: Capture error messages, UI bugs, and code examples
- **Designers**: Save design inspiration and reference materials
- **Writers**: Capture research materials and reference content
- **Students**: Save educational content and study materials
- **Support Teams**: Capture and share user issues and solutions

## 🚀 Promotion Strategies

### For Your Portfolio
1. **Create a Demo Video**: Showcase the extension in action
2. **Write a Blog Post**: Explain the development process and challenges
3. **Share on Social Media**: Post about the project on LinkedIn, Twitter, etc.
4. **Add to GitHub**: Keep the repository active with updates
5. **Create Documentation**: Write detailed usage guides

### For Growth
1. **Chrome Web Store**: Submit for publication when ready
2. **Open Source**: Encourage community contributions
3. **Feedback Loop**: Gather user feedback and iterate
4. **Feature Requests**: Implement popular user requests
5. **Performance**: Continuously optimize and improve

---

**SnipFlow** - Making screenshot capture effortless and efficient! 📸✨
