---
name: "browser-use-agent"
description: "Controls browser to perform web operations like visiting websites, filling forms, clicking buttons, and extracting data. Uses browser-use CLI tool to automate Chrome browser."
---

# Browser Use Agent

## Overview

This skill provides browser automation capabilities using the `browser-use` CLI tool, allowing you to control Chrome browser to perform various web operations such as visiting websites, interacting with web elements, filling forms, and extracting data.

## Prerequisites

- **browser-use CLI tool must be installed** (Python package)
- Chrome or Chromium browser installed
- For Windows: PowerShell or Command Prompt

## Installation

```bash
# Install via pip
pip install browser-use

# Verify installation
browser-use --help
```

## Command Reference

### Session Management

```bash
# List active sessions
browser-use sessions

# Close browser session
browser-use close
```

### Navigation

```bash
# Open a URL with visible browser window
browser-use --headed open "https://example.com"

# Open URL (headless mode, no visible window)
browser-use open "https://example.com"
```

### Page Interaction

```bash
# Get current page state (shows all elements)
browser-use state

# Type text into focused element
browser-use type "Your message here"

# Type with newlines (PowerShell)
browser-use type "Line 1`nLine 2`nLine 3"

# Send keyboard keys
browser-use keys "Return"    # Press Enter
browser-use keys "Escape"    # Press Escape
browser-use keys "Tab"       # Press Tab

# Click element by index
browser-use click 5

# Take screenshot
browser-use screenshot
```

## Real-World Example: Complete Workflow

### Example: Send Message to DeepSeek

```bash
# Step 1: Open DeepSeek with visible browser
browser-use --headed open "https://chat.deepseek.com/"

# Step 2: Check page state to see available elements
browser-use state

# Step 3: Type your message
browser-use type "你好"

# Step 4: Send the message (press Enter)
browser-use keys "Return"

# Step 5: Wait for response and check state
Start-Sleep -Seconds 3
browser-use state

# Step 6: Take screenshot to verify
browser-use screenshot

# Step 7: Close browser when done
browser-use close
```

### Example: Multi-line Message

```bash
# Open DeepSeek
browser-use --headed open "https://chat.deepseek.com/"

# Type introduction
browser-use type "我已经完成了任务3.1：任务管理服务端的实现。"

# Add document links (using newlines)
browser-use type "`n`n文档链接："
browser-use type "`n1. https://github.com/AI-LQ123/Trae-case1/blob/master/server/src/models/types.ts"
browser-use type "`n2. https://github.com/AI-LQ123/Trae-case1/blob/master/server/src/store/taskStore.ts"

# Add questions
browser-use type "`n`n请评估："
browser-use type "`n1. 数据模型设计是否合理？"
browser-use type "`n2. 代码质量如何？"

# Send message
browser-use keys "Return"

# Screenshot for confirmation
browser-use screenshot
```

## Important Notes

### Platform-Specific Syntax

**Windows PowerShell:**
- Use `` `n `` for newlines (not `\n`)
- Execute commands separately (no `&&` chaining)
- Use quotes around URLs and messages with spaces

**macOS/Linux:**
- Can use `&&` for command chaining
- Use `\n` for newlines
- Standard bash syntax works

### DeepSeek Interface

When interacting with DeepSeek:
1. **Login required** - First time requires manual login in the browser window
2. **Use `keys "Return"`** to send messages (don't look for send button)
3. **Wait for responses** - Use `Start-Sleep` to wait for AI response
4. **Check state** - Use `browser-use state` to see conversation content

## Troubleshooting

| Issue | Solution |
|-------|----------|
| **No active browser session** | Run `browser-use --headed open "URL"` first |
| **Element not found** | Check `browser-use state` to see available elements |
| **Message not sent** | Use `browser-use keys "Return"` instead of clicking |
| **Page not loading** | Check network connection and URL validity |
| **Command not found** | Install browser-use: `pip install browser-use` |

## Best Practices

1. **Always use `--headed`** for visual feedback when debugging
2. **Check state** before interacting: `browser-use state`
3. **Use newlines** with `` `n `` in PowerShell for multi-line text
4. **Send messages** with `keys "Return"` 
5. **Take screenshots** to verify actions: `browser-use screenshot`
6. **Close session** when done: `browser-use close`
7. **Wait appropriately** - Use `Start-Sleep` after sending messages

## Limitations

- Cannot interact with native file dialogs directly
- Some sites may block automated browser access
- JavaScript-heavy sites may require additional wait times
- File uploads may require manual intervention
- Requires manual login for authenticated sites

## Security Considerations

- Never share sensitive credentials in logs
- Be cautious when automating actions on production sites
- Respect website terms of service
- Avoid excessive automation that may be flagged as bot activity

## Version Information

- **browser-use**: 0.12.5+
- **Installation**: `pip install browser-use`
- **Documentation**: https://browser-use.com
- **Requirements**: Python 3.11+, Chrome/Chromium
