const express = require('express');
const router = express.Router();
const multer = require('multer');
const backupController = require('../controllers/backupController');

// 配置 multer，使用内存存储
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024 // 限制 50MB
  }
});

// 手动备份与恢复路由
router.get('/export', backupController.exportBackup);
router.post('/import', upload.single('file'), backupController.importBackup);

// 自动备份配置路由
router.get('/config', backupController.getConfig);
router.post('/config', backupController.updateConfig);

// 服务器本地备份文件管理路由
router.get('/list', backupController.listLocalBackups);
router.get('/download/:filename', backupController.downloadLocalBackup);
router.post('/restore/:filename', backupController.restoreLocalBackup);
router.delete('/:filename', backupController.deleteLocalBackup);

module.exports = router;
