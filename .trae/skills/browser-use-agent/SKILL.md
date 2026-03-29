---
name: "browser-use-agent"
description: "Controls browser to perform web operations like visiting websites, filling forms, clicking buttons, and extracting data. Supports both external browser (browser-use CLI) and Trae IDE built-in browser (Playwright MCP)."
---

# Browser Use Agent

## Overview

This skill provides browser automation capabilities, allowing you to control a browser to perform various web operations such as visiting websites, interacting with web elements, filling forms, and extracting data.

**Two Methods Available:**
1. **External Browser** - Using `browser-use` CLI tool (controls separate Chrome window)
2. **Trae Built-in Browser** - Using Playwright MCP (controls Trae IDE's built-in browser)

## When to Use

Invoke this skill when you need to:
- Visit and navigate websites
- Fill out web forms
- Click buttons or links
- Extract data from web pages
- Interact with web applications
- Perform automated web testing
- Send messages through web interfaces (like DeepSeek chat)

## Method 1: Trae Built-in Browser (Recommended for Trae IDE)

### Overview

Trae IDE has a **built-in browser** that can be controlled using **Playwright MCP**. This is the preferred method when working within Trae IDE because:
- ✅ Uses Trae's built-in browser panel
- ✅ Can access already logged-in sessions
- ✅ No need to install external browser tools
- ✅ Integrated with Trae's MCP system

### Installation Steps

#### Step 1: Install Playwright Python Package

```bash
pip install playwright
python -m playwright install chromium
```

#### Step 2: Add Playwright MCP in Trae IDE

1. Open **Trae IDE**
2. Click the **Settings** icon (设置) in the top right corner
3. Select **MCP** from the left sidebar
4. Click **+ Add** button in the top right
5. Select **Add from Market** (从市场添加)
6. Search for **Playwright** in the MCP market
7. Click the **+** button next to Playwright
8. The configuration will be automatically added
9. Ensure the toggle switch is **ON** (green)

**Configuration Details:**
- Name: Playwright
- Status: Ready (准备中...)
- Toggle: ON ✅

#### Step 3: Available Playwright MCP Tools

Once configured, you can use these MCP tools:

| Tool | Description |
|------|-------------|
| `mcp_playwright_playwright_navigate` | Navigate to a URL |
| `mcp_playwright_playwright_click` | Click an element |
| `mcp_playwright_playwright_fill` | Fill input field |
| `mcp_playwright_playwright_type` | Type text |
| `mcp_playwright_playwright_screenshot` | Take screenshot |
| `mcp_playwright_playwright_evaluate` | Execute JavaScript |
| `mcp_playwright_playwright_get_visible_text` | Get page text |
| `mcp_playwright_playwright_press_key` | Press keyboard key |
| `mcp_playwright_playwright_select` | Select dropdown option |
| `mcp_playwright_playwright_upload_file` | Upload file |
| `mcp_playwright_playwright_console_logs` | Get console logs |
| `mcp_playwright_playwright_resize` | Resize viewport |
| `mcp_playwright_playwright_go_back` | Navigate back |
| `mcp_playwright_playwright_go_forward` | Navigate forward |
| `mcp_playwright_playwright_close` | Close browser |

### Example: Send Message to DeepSeek Using Trae Built-in Browser

```typescript
// Step 1: Navigate to DeepSeek
await mcp_playwright_playwright_navigate({
  url: "https://chat.deepseek.com/"
});

// Step 2: Type message
await mcp_playwright_playwright_fill({
  selector: "textarea[placeholder='给 DeepSeek 发送消息']",
  value: "Your message here"
});

// Step 3: Press Enter to send
await mcp_playwright_playwright_press_key({
  key: "Enter"
});

// Step 4: Take screenshot to verify
await mcp_playwright_playwright_screenshot({
  name: "deepseek_message_sent"
});
```

### Project-level MCP Configuration

You can also enable project-level MCP by creating `.trae/mcp.json`:

```json
{
  "mcpServers": {
    "playwright": {
      "command": "python",
      "args": ["-m", "playwright", "mcp-server"]
    }
  }
}
```

Then enable **Project-level MCP** toggle in Trae IDE MCP settings.

---

## Method 2: External Browser (browser-use CLI)

### Overview

Use this method when:
- You need to control a separate Chrome browser window
- Trae's built-in browser is not available
- You need to use an existing Chrome profile with saved logins

### Installation

#### Installing browser-use

The `browser-use` tool is a Python package:

```bash
# Install via pip
pip install browser-use

# Verify installation
browser-use --help
```

#### Installation Requirements

- Python 3.11 or higher
- Chrome or Chromium browser installed
- For Windows: PowerShell or Command Prompt
- For macOS/Linux: Bash or Zsh

### Command Reference

#### Basic Commands

```bash
# Open a URL
browser-use open "https://example.com"

# Open with visible browser window
browser-use --headed open "https://example.com"

# Connect to existing Chrome instance
browser-use --connect open "https://example.com"

# Use specific Chrome profile
browser-use --profile Default open "https://example.com"
```

#### Interaction Commands

```bash
# Type text
browser-use type "Your message here"

# Type with newlines (PowerShell)
browser-use type "Line 1`nLine 2`nLine 3"

# Send keyboard keys
browser-use keys "Return"
browser-use keys "Escape"
browser-use keys "Tab"

# Click element by index
browser-use click 5

# Get page state
browser-use state

# Take screenshot
browser-use screenshot

# Close browser
browser-use close
```

#### Session Management

```bash
# List active sessions
browser-use sessions

# Close specific session
browser-use close --session <session-name>

# Use named session
browser-use --session mysession open "https://example.com"
```

### Example: Send Message to DeepSeek Using External Browser

```bash
# Step 1: Open DeepSeek with visible browser
browser-use --headed open "https://chat.deepseek.com/"

# Step 2: Type your message
browser-use type "Your message here`n`nWith multiple lines"

# Step 3: Send the message
browser-use keys "Return"

# Step 4: Take screenshot
browser-use screenshot

# Step 5: Close browser
browser-use close
```

---

## Comparison: Trae Built-in vs External Browser

| Feature | Trae Built-in (Playwright MCP) | External Browser (browser-use) |
|---------|-------------------------------|-------------------------------|
| **Location** | Inside Trae IDE panel | Separate Chrome window |
| **Setup** | Install Playwright MCP in Trae settings | Install browser-use CLI |
| **Logged-in sessions** | ✅ Can access if already logged in | ✅ Can use Chrome profiles |
| **Integration** | Native MCP tools | External CLI commands |
| **Best for** | Trae IDE workflows | External automation |
| **Screenshot** | Built into Trae | Saved to file |

---

## Important Notes

### DeepSeek Interface Specifics

When interacting with DeepSeek's web interface:

1. **Keep the same conversation**: Do not create new dialog windows
2. **Use the correct send button**: Click the `div` element or press Enter
3. **Wait for responses**: Allow time for the page to load and respond
4. **Handle login**: If prompted to login, this may require manual intervention

### General Best Practices

1. **Be specific**: Clearly describe what element to interact with
2. **Wait appropriately**: Allow time for page loads and responses
3. **Handle errors**: Be prepared for elements not found or timeouts
4. **Verify actions**: Confirm that actions were completed successfully

---

## Troubleshooting

### Trae Built-in Browser Issues

| Issue | Solution |
|-------|----------|
| **MCP shows "准备中..."** | Wait a moment for Playwright to initialize |
| **Cannot find element** | Use `mcp_playwright_playwright_get_visible_text` to see available elements |
| **Page not loading** | Check URL and network connection |
| **MCP not available** | Ensure Playwright MCP is installed and toggled ON |

### External Browser Issues

| Issue | Solution |
|-------|----------|
| **Element not found** | Wait for page to load, check if element index is correct |
| **Page not loading** | Check network connection and URL validity |
| **Login required** | Use `--profile` to use existing Chrome profile with saved login |
| **Timeouts** | Increase wait time for slow-loading pages |
| **Session already running** | Run `browser-use close` first |
| **Cannot connect to Chrome** | Use `--headed` flag or enable remote debugging |

---

## Platform-Specific Notes

### Windows PowerShell
- Use `` `n `` for newlines (not `\n`)
- Execute commands separately (no `&&` chaining)
- Use quotes around URLs and messages with spaces

### macOS/Linux
- Can use `&&` for command chaining
- Use `\n` for newlines
- Standard bash syntax works

---

## Best Practices

1. **Always close sessions when done**: `browser-use close` or `mcp_playwright_playwright_close`
2. **Use screenshots to verify**: Take screenshots after important actions
3. **Check state before interacting**: Use state/text tools to understand page structure
4. **Handle errors gracefully**: Check command exit codes and tool responses
5. **Choose the right method**:
   - Use **Trae Built-in** for Trae IDE workflows
   - Use **External Browser** for standalone automation

---

## Version Information

- **browser-use**: 0.12.5+
- **Playwright**: 1.58.0+
- **Python**: 3.11+
- **Documentation**: https://browser-use.com, https://docs.trae.cn
