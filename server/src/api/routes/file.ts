import express from 'express';
import fileService from '../../services/fileService';
import { authMiddleware } from '../../middleware/authMiddleware';

const router = express.Router();

// 读取文件
router.get('/read', authMiddleware, async (req, res) => {
  try {
    const filePath = req.query.path as string;
    
    if (!filePath) {
      return res.status(400).json({ 
        success: false, 
        error: 'File path is required',
        code: 400 
      });
    }

    const content = await fileService.readFile(filePath);
    res.json({ 
      success: true, 
      data: { content } 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: (error as Error).message,
      code: 500 
    });
  }
});

// 写入文件
router.post('/write', authMiddleware, async (req, res) => {
  try {
    const { path: filePath, content } = req.body;
    
    if (!filePath || content === undefined) {
      return res.status(400).json({ 
        success: false, 
        error: 'File path and content are required',
        code: 400 
      });
    }

    await fileService.writeFile(filePath, content);
    res.json({ 
      success: true,
      data: { message: 'File written successfully' }
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: (error as Error).message,
      code: 500 
    });
  }
});

// 删除文件
router.delete('/delete', authMiddleware, async (req, res) => {
  try {
    const filePath = req.query.path as string;
    
    if (!filePath) {
      return res.status(400).json({ 
        success: false, 
        error: 'File path is required',
        code: 400 
      });
    }

    await fileService.deleteFile(filePath);
    res.json({ 
      success: true,
      data: { message: 'File deleted successfully' }
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: (error as Error).message,
      code: 500 
    });
  }
});

// 列出目录内容
router.get('/list', authMiddleware, async (req, res) => {
  try {
    const directoryPath = req.query.path as string;
    
    if (!directoryPath) {
      return res.status(400).json({ 
        success: false, 
        error: 'Directory path is required',
        code: 400 
      });
    }

    const items = await fileService.listDirectory(directoryPath);
    res.json({ 
      success: true, 
      data: items 
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
