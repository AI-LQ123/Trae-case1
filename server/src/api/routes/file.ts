import express from 'express';
import fileService from '../../services/fileService';
import { authMiddleware } from '../../middleware/authMiddleware';

const router = express.Router();

// 读取文件
router.get('/read', authMiddleware, async (req, res) => {
  try {
    const filePath = req.query.path as string;
    
    if (!filePath) {
      return res.status(400).json({ error: 'File path is required' });
    }

    const content = await fileService.readFile(filePath);
    res.json({ content });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// 写入文件
router.post('/write', authMiddleware, async (req, res) => {
  try {
    const { path: filePath, content } = req.body;
    
    if (!filePath || content === undefined) {
      return res.status(400).json({ error: 'File path and content are required' });
    }

    await fileService.writeFile(filePath, content);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// 删除文件
router.delete('/delete', authMiddleware, async (req, res) => {
  try {
    const filePath = req.query.path as string;
    
    if (!filePath) {
      return res.status(400).json({ error: 'File path is required' });
    }

    await fileService.deleteFile(filePath);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// 列出目录内容
router.get('/list', authMiddleware, async (req, res) => {
  try {
    const directoryPath = req.query.path as string;
    
    if (!directoryPath) {
      return res.status(400).json({ error: 'Directory path is required' });
    }

    const items = await fileService.listDirectory(directoryPath);
    res.json(items);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

export default router;