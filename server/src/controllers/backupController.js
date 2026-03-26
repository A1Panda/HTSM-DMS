const fs = require('fs');
const path = require('path');
const { generateBackupData, performRestore } = require('../utils/backupUtils');
const { getSettings, updateSettings } = require('../utils/settingsUtils');
const { scheduleAutoBackup, BACKUPS_DIR } = require('../services/backupService');

// ================= 手动备份与恢复 =================

// 导出备份（手动下载）
exports.exportBackup = async (req, res) => {
  try {
    const backupData = await generateBackupData();
    
    res.setHeader('Content-Disposition', `attachment; filename=backup-${Date.now()}.json`);
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify(backupData));
  } catch (error) {
    console.error('导出备份失败:', error);
    res.status(500).json({ error: '导出备份失败' });
  }
};

// 导入备份（手动上传恢复）
exports.importBackup = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '未上传备份文件' });
    }

    const backupData = JSON.parse(req.file.buffer.toString('utf8'));
    await performRestore(backupData);

    res.json({ success: true, message: '备份导入并恢复成功' });
  } catch (error) {
    console.error('导入备份失败:', error);
    res.status(500).json({ error: error.message || '导入备份失败，请检查文件格式' });
  }
};

// ================= 自动备份配置 =================

exports.getConfig = (req, res) => {
  try {
    const settings = getSettings();
    res.json(settings);
  } catch (error) {
    console.error('获取配置失败:', error);
    res.status(500).json({ error: '获取自动备份配置失败' });
  }
};

exports.updateConfig = (req, res) => {
  try {
    const newSettings = req.body;
    const updatedSettings = updateSettings(newSettings);
    // 重新调度定时任务
    scheduleAutoBackup();
    res.json(updatedSettings);
  } catch (error) {
    console.error('更新配置失败:', error);
    res.status(500).json({ error: '更新自动备份配置失败' });
  }
};

// ================= 服务器备份文件管理 =================

exports.listLocalBackups = (req, res) => {
  try {
    if (!fs.existsSync(BACKUPS_DIR)) {
      return res.json([]);
    }

    const files = fs.readdirSync(BACKUPS_DIR)
      .filter(f => f.endsWith('.json'))
      .map(f => {
        const filePath = path.join(BACKUPS_DIR, f);
        const stat = fs.statSync(filePath);
        return {
          filename: f,
          size: stat.size,
          createdAt: stat.mtime
        };
      })
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json(files);
  } catch (error) {
    console.error('获取备份列表失败:', error);
    res.status(500).json({ error: '获取备份列表失败' });
  }
};

exports.downloadLocalBackup = (req, res) => {
  try {
    const filename = req.params.filename;
    const filePath = path.join(BACKUPS_DIR, filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: '备份文件不存在' });
    }

    res.download(filePath);
  } catch (error) {
    console.error('下载备份文件失败:', error);
    res.status(500).json({ error: '下载备份文件失败' });
  }
};

exports.restoreLocalBackup = async (req, res) => {
  try {
    const filename = req.params.filename;
    const filePath = path.join(BACKUPS_DIR, filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: '备份文件不存在' });
    }

    const data = fs.readFileSync(filePath, 'utf8');
    const backupData = JSON.parse(data);
    
    await performRestore(backupData);

    res.json({ success: true, message: '系统数据已成功从该备份恢复' });
  } catch (error) {
    console.error('服务器备份恢复失败:', error);
    res.status(500).json({ error: error.message || '恢复失败' });
  }
};

exports.deleteLocalBackup = (req, res) => {
  try {
    const filename = req.params.filename;
    const filePath = path.join(BACKUPS_DIR, filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: '备份文件不存在' });
    }

    fs.unlinkSync(filePath);
    res.json({ success: true, message: '备份文件已删除' });
  } catch (error) {
    console.error('删除备份文件失败:', error);
    res.status(500).json({ error: '删除备份文件失败' });
  }
};
