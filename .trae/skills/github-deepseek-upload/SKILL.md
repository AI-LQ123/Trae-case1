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

## Best Practices

- Use descriptive commit messages
- Include a comprehensive .gitignore file
- Test document URLs in a browser before sending to DeepSeek
- Keep DeepSeek conversation focused on the document analysis
- Follow up with specific questions after receiving DeepSeek's initial analysis
- **Maintain conversation history regularly** - update after each significant interaction
- **Use consistent formatting** in conversation history for readability
- **Include context** in conversation entries for future reference

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