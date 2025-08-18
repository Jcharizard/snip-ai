# Installation Guide - AI Snip Chrome Extension

## Quick Start (5 minutes)

### Step 1: Download the Extension
1. Download or clone this repository to your computer
2. Extract the files if downloaded as a ZIP
3. Make sure all files are in one folder

### Step 2: Load in Chrome
1. Open Google Chrome
2. Navigate to `chrome://extensions/`
3. Enable **"Developer mode"** (toggle in top-right corner)
4. Click **"Load unpacked"**
5. Select the folder containing the extension files
6. The AI Snip extension should now appear in your extensions list

### Step 3: Get OpenAI API Key
1. Visit [OpenAI Platform](https://platform.openai.com/api-keys)
2. Sign in or create an account
3. Click **"Create new secret key"**
4. Give it a name (e.g., "AI Snip Extension")
5. Copy the key (starts with `sk-`)
6. **Important**: Save this key securely - you won't see it again!

### Step 4: Configure the Extension
1. Click the **AI Snip icon** in your Chrome toolbar
2. In the settings section, paste your OpenAI API key
3. Click **"Save"**
4. You should see a success message

### Step 5: Test the Extension
1. Go to any webpage with questions or problems
2. Click the AI Snip extension icon
3. Try the **"Full Tab Screenshot"** first (easier to test)
4. Wait for the AI analysis
5. Copy the answer to your clipboard

## Troubleshooting

### Extension Won't Load
- **Error**: "Manifest file is missing or unreadable"
  - **Solution**: Make sure all files are in the same folder
  - **Solution**: Check that `manifest.json` exists and is readable

- **Error**: "Extension is invalid"
  - **Solution**: Ensure you're using Chrome version 88 or later
  - **Solution**: Check the console for specific error messages

### API Key Issues
- **Error**: "API key not found"
  - **Solution**: Make sure you've saved the API key in the extension settings
  - **Solution**: Verify the key starts with `sk-`

- **Error**: "Invalid API key"
  - **Solution**: Check that you copied the entire key correctly
  - **Solution**: Verify the key is active on OpenAI's platform
  - **Solution**: Ensure you have credits in your OpenAI account

### Screenshot Problems
- **Error**: "Screenshot failed"
  - **Solution**: Make sure you're on a regular webpage (not chrome:// URLs)
  - **Solution**: Try refreshing the page and retrying
  - **Solution**: Check that the extension has necessary permissions

### AI Analysis Issues
- **Error**: "Analysis failed"
  - **Solution**: Check your internet connection
  - **Solution**: Verify your OpenAI account has credits
  - **Solution**: Ensure the screenshot contains readable text

## File Structure Check

Make sure your extension folder contains these files:
```
ai-snip/
├── manifest.json
├── popup.html
├── popup.css
├── popup.js
├── background.js
├── content.js
├── content.css
├── welcome.html
├── README.md
└── INSTALLATION.md
```

## Permissions Explained

The extension requests these permissions:
- **activeTab**: To capture screenshots of the current tab
- **storage**: To save your API key and screenshot history
- **clipboardWrite**: To copy answers to your clipboard
- **scripting**: To inject the selection interface
- **contextMenus**: To add right-click menu options

## Security Notes

- Your API key is stored securely in Chrome's sync storage
- Screenshots are only sent to OpenAI for analysis
- No data is collected or stored by the extension developers
- All API calls use HTTPS encryption

## Getting Help

If you're still having issues:
1. Check the troubleshooting section above
2. Open Chrome DevTools (F12) and look for error messages
3. Try reloading the extension
4. Check that all files are present and readable

## Next Steps

Once installed and working:
1. Try the area selection feature
2. Explore the screenshot history
3. Test with different types of questions
4. Check out the keyboard shortcuts

Happy learning! 🎉
