const fs = require('fs');
const path = require('path');
const cron = require('node-cron');
const { generateBackupData } = require('../utils/backupUtils');
const { getSettings } = require('../utils/settingsUtils');

const DATA_DIR = path.join(__dirname, '../../../data');
const BACKUPS_DIR = path.join(DATA_DIR, 'backups');

let scheduledTask = null;

/**
 * 确保备份目录存在
 */
const ensureBackupDir = () => {
  if (!fs.existsSync(BACKUPS_DIR)) {
    fs.mkdirSync(BACKUPS_DIR, { recursive: true });
  }
};

/**
 * 清理过期的备份文件
 * @param {number} retainCount 保留份数
 */
const cleanOldBackups = (retainCount) => {
  ensureBackupDir();
  
  const files = fs.readdirSync(BACKUPS_DIR)
    .filter(f => f.startsWith('autobackup-') && f.endsWith('.json'))
    .map(f => {
      const filePath = path.join(BACKUPS_DIR, f);
      const stat = fs.statSync(filePath);
      return {
        name: f,
        path: filePath,
        time: stat.mtime.getTime()
      };
    })
    .sort((a, b) => b.time - a.time); // 按时间降序（最新的在前面）

  if (files.length > retainCount) {
    const filesToDelete = files.slice(retainCount);
    filesToDelete.forEach(file => {
      try {
        fs.unlinkSync(file.path);
        console.log(`已清理过期备份: ${file.name}`);
      } catch (err) {
        console.error(`清理过期备份失败 ${file.name}:`, err);
      }
    });
  }
};

/**
 * 执行一次自动备份
 */
const executeAutoBackup = async () => {
  console.log('开始执行自动备份...');
  try {
    const settings = getSettings();
    const backupData = await generateBackupData();
    
    ensureBackupDir();
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `autobackup-${timestamp}.json`;
    const filePath = path.join(BACKUPS_DIR, filename);
    
    fs.writeFileSync(filePath, JSON.stringify(backupData));
    console.log(`自动备份成功: ${filename}`);
    
    // 清理旧备份
    cleanOldBackups(settings.retainCount);
  } catch (err) {
    console.error('自动备份执行失败:', err);
  }
};

/**
 * 初始化或重新调度定时任务
 */
const scheduleAutoBackup = () => {
  const settings = getSettings();
  
  // 停止现有的任务
  if (scheduledTask) {
    scheduledTask.stop();
    scheduledTask = null;
    console.log('已停止先前的自动备份任务');
  }

  if (settings.autoBackupEnabled) {
    // 将 Quartz 风格的 ? 替换为标准的 *，以兼容 node-cron
    const expression = settings.cronExpression.replace(/\?/g, '*');

    const isValidCron = cron.validate(expression);
    if (!isValidCron) {
      console.error(`无效的 Cron 表达式: ${settings.cronExpression}，自动备份未启动。`);
      return;
    }

    scheduledTask = cron.schedule(expression, () => {
      executeAutoBackup();
    });
    console.log(`已启动自动备份任务，调度表达式: ${expression}`);
  } else {
    console.log('自动备份功能未开启');
  }
};

module.exports = {
  scheduleAutoBackup,
  executeAutoBackup,
  BACKUPS_DIR
};
