---
name: "github-deepseek-upload"
description: "Uploads documents to GitHub repository and sends GitHub document links to DeepSeek for analysis. Invoke when user wants to share documents with DeepSeek via GitHub."
---

# GitHub-DeepSeek Document Upload

## Overview

This skill automates the process of uploading documents to a GitHub repository and sharing the document links with DeepSeek for analysis. It ensures that documents are properly uploaded and accessible to DeepSeek through GitHub URLs.

## Prerequisites

- GitHub account
- Local Git repository initialized
- GitHub CLI installed (for authentication if needed)
- DeepSeek account and active conversation

## Step-by-Step Process

### 1. Initialize Git Repository (if not already initialized)

```bash
git init
git config user.name "Your Name"
git config user.email "your.email@example.com"
```

### 2. Create .gitignore File

Create a comprehensive .gitignore file to exclude unnecessary files from version control.

### 3. Add and Commit Documents

**Windows PowerShell Note:** PowerShell does not support the `&&` syntax. Execute commands separately:

```bash
# For Bash/Zsh
git add <document1.md> <document2.md> .gitignore
git commit -m "Add documents for DeepSeek analysis"

# For Windows PowerShell
git add <document1.md> <document2.md> .gitignore
git commit -m "Add documents for DeepSeek analysis"
```

### 4. Add Remote Repository

```bash
git remote add origin <github-repository-url>
```

### 5. Push to GitHub

```bash
git push -u origin master
git push origin master:main  # Ensure files are on main branch
```

### 6. Generate Document URLs

Construct GitHub document URLs in the format:

```
https://github.com/<username>/<repository>/blob/main/<document-name>.md
```

### 7. Send Links to DeepSeek

**Important Notes:**
- **Keep the same DeepSeek conversation** - do not create a new dialog window
- **Use the correct send button** - click the `div` element that serves as the send button in DeepSeek's interface

In the DeepSeek conversation, send a message containing:

```
GitHub document links:
<document1-url>
<document2-url>

Please read these documents and provide your analysis and recommendations.
```

## Conversation History Recording

### Purpose

Maintain a comprehensive record of all DeepSeek conversations by creating and updating a "对话记录.md" (Conversation History) document in the GitHub repository.

### Benefits

- **Traceability**: Track all questions asked and answers received
- **Knowledge Base**: Build a searchable archive of insights and recommendations
- **Context Preservation**: Maintain conversation context across sessions
- **Documentation**: Create a reference for future development decisions

### Implementation Steps

#### 1. Create Conversation History Document

Create a new file named `对话记录.md` in the repository root:

```markdown
# DeepSeek 对话记录

## 对话历史

### [日期] 对话[序号]

**用户问题：**
[用户的问题内容]

**DeepSeek 回复：**
[DeepSeek的完整回复内容]

---
```

#### 2. Record Each Conversation

After each DeepSeek response, update the document with:

- **Timestamp**: Date and conversation number
- **User Question**: Exact question or request sent to DeepSeek
- **DeepSeek Response**: Complete response from DeepSeek
- **Context**: Any relevant context or follow-up actions

#### 3. Update GitHub Repository

After updating the conversation history:

```bash
git add 对话记录.md
git commit -m "Update conversation history - [brief description]"
git push origin master
git push origin master:main
```

#### 4. Document Structure Best Practices

- **Chronological Order**: List conversations from oldest to newest
- **Clear Formatting**: Use consistent markdown formatting
- **Complete Content**: Include full questions and responses
- **Categorization**: Group related conversations under sections if needed

### Example Entry

```markdown
### 2026-03-28 对话1

**用户问题：**
请分析Trae手机端APP的技术架构文档。

**DeepSeek 回复：**
我已经分析了技术架构文档，以下是我的分析...

[完整分析内容]

**后续行动：**
- 创建了技术架构优化任务
- 更新了开发计划
```

### Integration with Main Workflow

The conversation history recording should be integrated into the main document upload workflow:

1. **Initial Setup**: Create `对话记录.md` when setting up the repository
2. **Regular Updates**: Add new entries after each significant DeepSeek interaction
3. **Version Control**: Treat conversation history as important documentation
4. **Accessibility**: Share conversation history link with team members

## Example Workflow

1. Initialize Git repository and add documents
2. Create `对话记录.md` for conversation tracking
3. Commit and push to GitHub
4. Generate document URLs
5. Open existing DeepSeek conversation
6. Paste URLs into input box
7. Click the `div` send button
8. Wait for DeepSeek's analysis
9. Record conversation in `对话记录.md`
10. Update GitHub repository with new conversation entry

## Troubleshooting

- **GitHub repository is empty**: Ensure files are pushed to the correct branch (both master and main)
- **DeepSeek can't access links**: Verify URLs are correct and documents are public
- **Send button not working**: Click the `div` element specifically, not other elements
- **Authentication issues**: Use GitHub CLI for interactive login if needed
- **Conversation history not updating**: Ensure proper git add, commit, and push sequence
- **SSH Host Key Verification**: 
  - **Symptom**: `The authenticity of host 'github.com' can't be established`
  - **Solution**: Switch to HTTPS remote URL
    ```bash
    git remote set-url origin https://github.com/<username>/<repository>.git
    ```
- **PowerShell Command Not Found**:
  - **Symptom**: `grep : The term 'grep' is not recognized`
  - **Solution**: Use PowerShell-native alternatives
    ```powershell
    # Use Select-String instead of grep
    git ls-files | Select-String -Pattern "pattern"
    
    # Use semicolon or separate lines instead of &&
    git add .; git commit -m "message"; git push
    ```

## Best Practices

- Use descriptive commit messages
- Include a comprehensive .gitignore file
- Test document URLs in a browser before sending to DeepSeek
- Keep DeepSeek conversation focused on the document analysis
- Follow up with specific questions after receiving DeepSeek's initial analysis
- **Maintain conversation history regularly** - update after each significant interaction
- **Use consistent formatting** in conversation history for readability
- **Include context** in conversation entries for future reference

## Recent Operation Experience

### Process Summary

1. **Document Preparation**: Updated `对话记录.md` and `开发任务分解.md` with the latest content
2. **Version Control**: 
   - Added modified files to git staging area
   - Committed changes with descriptive commit messages
   - Pushed changes to GitHub remote repository
3. **DeepSeek Interaction**: 
   - Constructed GitHub document URLs
   - Sent URLs to DeepSeek for analysis
   - Received comprehensive evaluation and recommendations
4. **Documentation Update**: Recorded DeepSeek's response in `对话记录.md` and pushed updates

### Challenges Encountered

1. **Windows PowerShell Syntax**: PowerShell does not support `&&` command chaining syntax
   - **Solution**: Executed git commands separately

2. **Line Ending Warnings**: Git showed warnings about LF being replaced by CRLF
   - **Solution**: Ignored warnings as they are normal for Windows systems

3. **Branch Synchronization**: Ensuring documents are available on both master and main branches
   - **Solution**: Pushed changes to both branches to maintain consistency

4. **DeepSeek Access**: Ensuring DeepSeek can access GitHub document links
   - **Solution**: Verified URLs in browser before sending to DeepSeek

5. **GitHub SSH Host Verification**: When using SSH remote URL, git push prompts for host authenticity verification
   - **Problem**: `The authenticity of host 'github.com' can't be established`
   - **Solution**: Switch to HTTPS remote URL to avoid SSH key verification
   ```bash
   # Check current remote URL
   git remote -v
   
   # Switch from SSH to HTTPS
   git remote set-url origin https://github.com/<username>/<repository>.git
   
   # Now push works without SSH verification
   git push origin master
   ```

6. **PowerShell grep Command Not Found**: PowerShell does not have `grep` command
   - **Problem**: `grep : Cannot find path... because it does not exist`
   - **Solution**: Use PowerShell's `Select-String` cmdlet instead
   ```powershell
   # Instead of: git ls-files | grep "pattern"
   # Use: 
   git ls-files | Select-String -Pattern "pattern"
   ```

7. **Browser Instance Conflict**: Using Chrome DevTools MCP tool causes browser conflict
   - **Problem**: 
     ```
     The browser is already running for C:\\Users\\15389\\.cache\\chrome-devtools-mcp\\chrome-profile
     Use --isolated to run multiple browser instances.
     ```
   - **Root Cause**: 
     - `mcp_Chrome_DevTools_MCP` tool uses fixed user data directory
     - Only allows one browser instance to run at a time
     - Cannot reuse existing browser sessions
   - **Solution**: Use `browser_use` tool instead of `mcp_Chrome_DevTools_MCP`
     - `browser_use` can detect and reuse existing browser tabs
     - No browser instance conflict issues
     - Perfect for DeepSeek since it requires logged-in state
   - **Implementation**:
     ```
     # Instead of: mcp_Chrome_DevTools_MCP_navigate
     # Use: browser_use tool with description and query
     ```

### Verified Successful Solutions

1. **PowerShell Compatibility**: Using separate git commands instead of `&&` syntax
2. **Document Encoding**: Ensuring all documents use UTF-8 encoding
3. **URL Construction**: Using the correct GitHub URL format for document access
4. **Conversation History**: Maintaining a structured `对话记录.md` file
5. **Version Control**: Following a consistent git workflow (add → commit → push)
6. **DeepSeek Communication**: Using the correct send button element in DeepSeek's interface
7. **Branch Management**: Synchronizing changes across both master and main branches
8. **SSH to HTTPS Migration**: Successfully switched remote URL from SSH to HTTPS to avoid authentication prompts
   ```bash
   git remote set-url origin https://github.com/<username>/<repository>.git
   git push origin master
   git push origin master:main
   ```
9. **PowerShell Text Filtering**: Using `Select-String` as PowerShell alternative to `grep`
   ```powershell
   git ls-files | Select-String -Pattern "websocket|\.test\.ts"
   ```

10. **Browser Tool Selection**: Using `browser_use` instead of `mcp_Chrome_DevTools_MCP` for DeepSeek interaction
    - **Problem**: Browser instance conflict when using Chrome DevTools MCP
    - **Solution**: `browser_use` tool can reuse existing browser tabs and sessions
    - **Result**: Successfully sent message to DeepSeek without browser conflict
    - **Key Insight**: `browser_use` is better suited for DeepSeek since it maintains logged-in state

### Key Lessons Learned

- **Platform Awareness**: Different shells have different syntax requirements
- **Error Handling**: Git warnings can often be safely ignored
- **Verification**: Always test document URLs before sharing
- **Documentation**: Regularly update conversation history for traceability
- **Consistency**: Maintain consistent branch management practices
- **Clarity**: Use descriptive commit messages for better project tracking
- **Remote URL Selection**: 
  - SSH URLs require host key verification and SSH key setup
  - HTTPS URLs are simpler for automated workflows but may require credential input
  - Choose based on your environment and security requirements
- **PowerShell Command Equivalents**:
  - `grep` → `Select-String`
  - `&&` → Execute commands separately or use `;` separator
  - Always verify command availability in PowerShell before use

- **Browser Tool Selection**:
  - **For DeepSeek interaction**: Always use `browser_use` tool, not `mcp_Chrome_DevTools_MCP`
  - **Why**: `browser_use` can detect and reuse existing browser tabs, maintains logged-in state
  - **Avoid**: `mcp_Chrome_DevTools_MCP` uses fixed user data directory, causes browser conflicts
  - **Best Practice**: Choose the right tool for the specific use case based on tool capabilities

- **Tool Capability Awareness**:
  - Different tools have different strengths and limitations
  - `mcp_Chrome_DevTools_MCP`: Good for isolated browser testing
  - `browser_use`: Better for interactive sessions requiring login state
  - Always check tool documentation before choosing which tool to use

## Expected Outcome

DeepSeek will access the GitHub document links, read the content, and provide a detailed analysis and recommendations based on the documents. All conversations will be systematically recorded in the `对话记录.md` file for future reference and knowledge management.

## Complete Workflow Summary

```
Setup Phase:
├── Initialize Git repository
├── Create .gitignore
├── Create 对话记录.md
└── Add remote repository

Document Upload Phase:
├── Add documents to repository
├── Commit changes
├── Push to GitHub (master & main)
└── Generate document URLs

DeepSeek Interaction Phase:
├── Send document URLs to DeepSeek
├── Receive analysis and recommendations
└── Record conversation in 对话记录.md

Maintenance Phase:
├── Update conversation history
├── Commit and push changes
└── Share updated links as needed
```