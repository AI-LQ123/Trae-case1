---
name: "browser-use-agent"
description: "Controls browser to perform web operations like visiting websites, filling forms, clicking buttons, and extracting data. Invoke when user needs to interact with web pages or automate browser tasks."
---

# Browser Use Agent

## Overview

This skill provides browser automation capabilities, allowing you to control a browser to perform various web operations such as visiting websites, interacting with web elements, filling forms, and extracting data.

## When to Use

Invoke this skill when you need to:
- Visit and navigate websites
- Fill out web forms
- Click buttons or links
- Extract data from web pages
- Interact with web applications
- Perform automated web testing
- Send messages through web interfaces (like DeepSeek chat)

## Prerequisites

- Browser must be available and accessible
- Target website should be reachable
- For authenticated sites, credentials may be required

## Key Capabilities

### 1. Navigation
- Visit specific URLs
- Navigate between pages
- Handle page redirects
- Wait for page loads

### 2. Element Interaction
- Click buttons, links, and other clickable elements
- Fill input fields and forms
- Select dropdown options
- Handle checkboxes and radio buttons

### 3. Data Extraction
- Extract text content from elements
- Get page titles and metadata
- Capture screenshots
- Extract structured data

### 4. Form Handling
- Fill out forms with data
- Submit forms
- Handle file uploads (when supported)
- Validate form inputs

## Important Notes

### DeepSeek Interface Specifics

When interacting with DeepSeek's web interface:

1. **Keep the same conversation**: Do not create new dialog windows
2. **Use the correct send button**: Click the `div` element that serves as the send button
3. **Wait for responses**: Allow time for the page to load and respond
4. **Handle login**: If prompted to login, this may require manual intervention

### General Best Practices

1. **Be specific**: Clearly describe what element to interact with
2. **Wait appropriately**: Allow time for page loads and responses
3. **Handle errors**: Be prepared for elements not found or timeouts
4. **Verify actions**: Confirm that actions were completed successfully

## Example Usage Scenarios

### Scenario 1: Send Message to DeepSeek
```
Navigate to https://chat.deepseek.com/
Type message in input field
Click the div send button
Wait for response
Extract the response text
```

### Scenario 2: Visit and Extract Data
```
Navigate to https://example.com
Click on "Products" link
Extract product names and prices
Navigate to next page if available
```

### Scenario 3: Fill and Submit Form
```
Navigate to https://example.com/form
Fill "username" field with "user123"
Fill "password" field with "pass123"
Click submit button
Verify success message
```

## Troubleshooting

- **Element not found**: The element may not be loaded yet or selector may be incorrect
- **Page not loading**: Check network connection and URL validity
- **Login required**: Some sites require authentication before access
- **Timeouts**: Increase wait time for slow-loading pages
- **JavaScript errors**: Some sites may have JavaScript that prevents automation

## Limitations

- Cannot interact with native file dialogs directly
- Some sites may block automated browser access
- JavaScript-heavy sites may require additional wait times
- File uploads may require manual intervention
- Cannot access content behind authentication without credentials

## Security Considerations

- Never share sensitive credentials in logs
- Be cautious when automating actions on production sites
- Respect website terms of service
- Avoid excessive automation that may be flagged as bot activity