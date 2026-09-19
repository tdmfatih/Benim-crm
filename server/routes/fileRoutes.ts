import { Router, Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { uploadMiddleware, getUploadsDirectory } from '../services/fileStorage';
import { optionalAuth, AuthenticatedRequest } from '../middleware/auth';
import { logAudit } from '../middleware/audit';

const router = Router();

// POST /api/upload
router.post('/upload', optionalAuth, uploadMiddleware.single('file'), async (req: AuthenticatedRequest, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Yüklenecek dosya bulunamadı.' });
  }

  const fileUrl = `/api/files/${req.file.filename}`;

  await logAudit({
    req,
    user: req.user,
    action: 'FILE_UPLOADED',
    entityType: 'file',
    entityId: req.file.filename,
    entityName: req.file.originalname,
    newValues: { size: req.file.size, mimetype: req.file.mimetype, url: fileUrl },
  });

  res.json({
    success: true,
    url: fileUrl,
    filename: req.file.filename,
    originalname: req.file.originalname,
    size: req.file.size,
    mimetype: req.file.mimetype,
  });
});

// GET /api/files/:filename
router.get('/files/:filename', (req: Request, res: Response) => {
  const { filename } = req.params;
  const safeFilename = path.basename(filename);
  const filePath = path.join(getUploadsDirectory(), safeFilename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Dosya bulunamadı.' });
  }

  res.sendFile(filePath);
});

export default router;
