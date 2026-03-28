import express from 'express';
import fileService from '../../services/fileService';
import { authMiddleware } from '../../middleware/authMiddleware';

const router = express.Router();

// 获取项目信息
router.get('/info', authMiddleware, async (req, res) => {
  try {
    const projectPath = req.query.path as string;
    
    if (!projectPath) {
      return res.status(400).json({ error: 'Project path is required' });
    }

    const projectInfo = await fileService.getProjectInfo(projectPath);
    res.json(projectInfo);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// 获取项目文件树
router.get('/file-tree', authMiddleware, async (req, res) => {
  try {
    const projectPath = req.query.path as string;
    const maxDepth = req.query.maxDepth ? parseInt(req.query.maxDepth as string) : 3;
    
    if (!projectPath) {
      return res.status(400).json({ error: 'Project path is required' });
    }

    const fileTree = await fileService.getFileTree(projectPath, maxDepth);
    res.json(fileTree);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// 搜索项目文件
router.get('/search', authMiddleware, async (req, res) => {
  try {
    const projectPath = req.query.path as string;
    const query = req.query.q as string;
    const maxResults = req.query.maxResults ? parseInt(req.query.maxResults as string) : 50;
    
    if (!projectPath || !query) {
      return res.status(400).json({ error: 'Project path and search query are required' });
    }

    const results = await fileService.searchFiles(projectPath, query, maxResults);
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

export default router;