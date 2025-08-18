# AI Snip - Smart Screenshot Assistant

A Chrome extension that revolutionizes the way you get answers from screenshots. Capture any question or problem on the web and get instant AI-powered answers using OpenAI's GPT-4 Vision model.

## 🎯 Project Overview

**AI Snip** solves a real pain point: the tedious process of manually taking screenshots, switching tabs, and pasting into ChatGPT. This extension streamlines the entire workflow into a seamless, one-click experience.

### The Problem
- Manual screenshot capture using Windows Snipping Tool
- Switching between browser tabs
- Copying and pasting images into ChatGPT
- Waiting for responses
- Copying answers back to clipboard

### The Solution
- **One-click screenshot capture** directly in the browser
- **Instant AI analysis** using OpenAI's GPT-4 Vision
- **Automatic clipboard copying** of answers
- **Smart area selection** or full tab capture
- **Answer history** for future reference

## 🚀 Features

### Core Functionality
- **Smart Screenshot Tool**: Drag to select specific areas or capture entire tabs
- **AI-Powered Analysis**: Uses OpenAI's GPT-4 Vision for accurate answers
- **One-Click Copy**: Instantly copy answers to clipboard
- **Answer History**: View and reuse previous screenshots and answers
- **Modern UI**: Clean, intuitive interface with smooth animations

### Advanced Features
- **Context Menu Integration**: Right-click to start screenshot mode
- **Keyboard Shortcuts**: ESC to cancel, Enter to confirm selections
- **Responsive Design**: Works on different screen sizes
- **Error Handling**: Graceful error messages and recovery
- **API Key Management**: Secure storage of OpenAI API credentials

## 🛠️ Technical Architecture

### Technology Stack
- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Chrome Extension API**: Manifest V3
- **AI Integration**: OpenAI GPT-4 Vision API
- **Storage**: Chrome Storage API (sync & local)
- **Image Processing**: Canvas API for cropping

### File Structure
```
ai-snip/
├── manifest.json          # Extension configuration
├── popup.html            # Main popup interface
├── popup.css             # Popup styling
├── popup.js              # Popup logic and UI interactions
├── background.js         # Service worker for core functionality
├── content.js            # Content script for selection interface
├── content.css           # Content script styling
├── welcome.html          # Installation welcome page
└── README.md            # Project documentation
```

### Key Components

#### 1. Popup Interface (`popup.html/js`)
- Modern, responsive UI design
- API key management
- Screenshot history display
- Status notifications and loading states

#### 2. Background Service Worker (`background.js`)
- Screenshot capture using Chrome API
- OpenAI API integration
- Image cropping and processing
- Message handling between components

#### 3. Content Script (`content.js`)
- Visual selection overlay
- Drag-and-drop selection interface
- Keyboard shortcuts
- Real-time feedback

## 📦 Installation

### For Development

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd ai-snip
   ```

2. **Load in Chrome**
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top right)
   - Click "Load unpacked" and select the project folder

3. **Get OpenAI API Key**
   - Visit [OpenAI Platform](https://platform.openai.com/api-keys)
   - Create a new API key
   - Copy the key (starts with `sk-`)

4. **Configure the Extension**
   - Click the AI Snip extension icon in your toolbar
   - Paste your API key in the settings section
   - Click "Save"

### For Users (Future)
- Install from Chrome Web Store (when published)
- Follow the same API key setup process

## 🎮 Usage

### Basic Workflow

1. **Navigate to a webpage** with questions or problems
2. **Click the AI Snip extension icon** in your browser toolbar
3. **Choose screenshot method**:
   - **"Take Screenshot"**: Drag to select specific area
   - **"Full Tab Screenshot"**: Capture entire visible page
4. **Wait for AI analysis** (usually 5-10 seconds)
5. **Copy the answer** with one click
6. **View history** of recent screenshots and answers

### Advanced Features

#### Area Selection Mode
- Click "Take Screenshot" to enter selection mode
- Drag to create a selection rectangle
- Press **Enter** to confirm or **ESC** to cancel
- Selection must be at least 10x10 pixels

#### Full Tab Screenshot
- Click "Full Tab Screenshot" for instant capture
- Automatically processes the entire visible page
- Perfect for multiple questions on one page

#### Context Menu
- Right-click anywhere on a webpage
- Select "AI Snip: Take Screenshot" from context menu
- Starts selection mode immediately

#### Keyboard Shortcuts
- **ESC**: Cancel selection mode
- **Enter**: Confirm current selection
- **Ctrl+C**: Copy answer to clipboard (when available)

## 🔧 Configuration

### API Settings
- **OpenAI API Key**: Required for AI functionality
- **Model**: Uses GPT-4 Vision by default
- **Max Tokens**: Limited to 500 for concise answers
- **Temperature**: Set to 0.1 for consistent results

### Storage
- **Sync Storage**: API key (encrypted)
- **Local Storage**: Screenshot history (last 10 items)
- **Privacy**: No data sent to external servers except OpenAI

## 🎨 Design Philosophy

### User Experience
- **Minimal Friction**: One-click operations where possible
- **Visual Feedback**: Clear status indicators and animations
- **Error Recovery**: Helpful error messages and fallbacks
- **Accessibility**: Keyboard navigation and screen reader support

### Visual Design
- **Modern Aesthetic**: Clean gradients and smooth animations
- **Consistent Branding**: Purple/blue color scheme throughout
- **Responsive Layout**: Adapts to different screen sizes
- **Professional Polish**: Attention to detail in every interaction

## 🔒 Privacy & Security

### Data Handling
- **Local Processing**: Screenshots processed locally when possible
- **Secure Storage**: API keys stored securely in Chrome sync storage
- **No Tracking**: No analytics or user tracking
- **OpenAI Only**: Images only sent to OpenAI API for analysis

### Privacy Features
- **No Data Collection**: Extension doesn't collect personal information
- **Local History**: Screenshot history stored locally on device
- **Secure API**: All API calls use HTTPS
- **Minimal Permissions**: Only requests necessary permissions

## 🚧 Development Roadmap

### Phase 1: MVP ✅
- [x] Basic screenshot functionality
- [x] OpenAI API integration
- [x] Popup interface
- [x] Area selection tool

### Phase 2: Enhanced Features 🚧
- [ ] Batch processing for multiple questions
- [ ] Custom prompt templates
- [ ] Answer export features
- [ ] Keyboard shortcuts
- [ ] Context menu integration

### Phase 3: Advanced Features 📋
- [ ] Multi-AI support (Claude, local models)
- [ ] Smart question detection
- [ ] Study mode with explanations
- [ ] Answer quality scoring
- [ ] Cloud sync for history

### Phase 4: Polish & Portfolio 📋
- [ ] Performance optimization
- [ ] Cross-browser support
- [ ] Mobile companion app
- [ ] Chrome Web Store submission
- [ ] Documentation and tutorials

## 🐛 Troubleshooting

### Common Issues

#### "API key not found" Error
- Ensure you've added your OpenAI API key in the extension settings
- Check that the key starts with `sk-`
- Verify the key is valid on OpenAI's platform

#### Screenshot Not Working
- Make sure you're on a regular webpage (not chrome:// URLs)
- Check that the extension has necessary permissions
- Try refreshing the page and retrying

#### AI Analysis Fails
- Verify your OpenAI API key is valid and has credits
- Check your internet connection
- Ensure the screenshot contains readable text

#### Extension Not Loading
- Check Chrome's extension page for error messages
- Try reloading the extension
- Ensure you're using Chrome version 88 or later

### Debug Mode
- Open Chrome DevTools (F12)
- Check the Console tab for error messages
- Look for "AI Snip" related logs

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

- **OpenAI** for providing the GPT-4 Vision API
- **Chrome Extension Team** for the excellent documentation
- **Open Source Community** for inspiration and tools

## 📞 Support

For questions, issues, or feature requests:
- Create an issue on GitHub
- Check the troubleshooting section above
- Review the Chrome extension documentation

---

**Built with ❤️ for learning and productivity**

*This project demonstrates modern web development, Chrome extension development, AI integration, and user experience design - perfect for a junior developer portfolio!*
