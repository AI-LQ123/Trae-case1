import express from 'express';
import fileService from '../../services/fileService';
import { authMiddleware } from '../../middleware/authMiddleware';

const router = express.Router();

// 获取项目信息
router.get('/info', authMiddleware, async (req, res) => {
  try {
    const projectPath = req.query.path as string;
    
    if (!projectPath) {
      return res.status(400).json({ 
        success: false, 
        error: 'Project path is required',
        code: 400 
      });
    }

    const projectInfo = await fileService.getProjectInfo(projectPath);
    res.json({ 
      success: true, 
      data: projectInfo 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: (error as Error).message,
      code: 500 
    });
  }
});

// 获取项目文件树
router.get('/file-tree', authMiddleware, async (req, res) => {
  try {
    const projectPath = req.query.path as string;
    const maxDepth = req.query.maxDepth ? parseInt(req.query.maxDepth as string) : 3;
    
    if (!projectPath) {
      return res.status(400).json({ 
        success: false, 
        error: 'Project path is required',
        code: 400 
      });
    }

    const fileTree = await fileService.getFileTree(projectPath, maxDepth);
    res.json({ 
      success: true, 
      data: fileTree 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: (error as Error).message,
      code: 500 
    });
  }
});

// 搜索项目文件
router.get('/search', authMiddleware, async (req, res) => {
  try {
    const projectPath = req.query.path as string;
    const query = req.query.q as string;
    const maxResults = req.query.maxResults ? parseInt(req.query.maxResults as string) : 50;
    
    if (!projectPath || !query) {
      return res.status(400).json({ 
        success: false, 
        error: 'Project path and search query are required',
        code: 400 
      });
    }

    const results = await fileService.searchFiles(projectPath, query, maxResults);
    res.json({ 
      success: true, 
      data: results 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: (error as Error).message,
      code: 500 
    });
  }
});

export default router;
