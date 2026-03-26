const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '../../../data');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');

// 默认配置
const DEFAULT_SETTINGS = {
  autoBackupEnabled: true,
  cronExpression: '0 2 * * *', // 每天凌晨2点
  retainCount: 7 // 保留7份备份
};

/**
 * 获取当前设置
 */
const getSettings = () => {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (fs.existsSync(SETTINGS_FILE)) {
    try {
      const data = fs.readFileSync(SETTINGS_FILE, 'utf8');
      return { ...DEFAULT_SETTINGS, ...JSON.parse(data) };
    } catch (err) {
      console.error('读取设置失败，使用默认设置:', err);
      return DEFAULT_SETTINGS;
    }
  } else {
    // 写入默认配置
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(DEFAULT_SETTINGS, null, 2));
    return DEFAULT_SETTINGS;
  }
};

/**
 * 更新设置
 */
const updateSettings = (newSettings) => {
  const currentSettings = getSettings();
  const updatedSettings = { ...currentSettings, ...newSettings };
  
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(updatedSettings, null, 2));
  return updatedSettings;
};

module.exports = {
  getSettings,
  updateSettings
};
