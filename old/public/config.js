// 系统配置文件
let systemConfig = {
    // 界面配置
    ui: {
        // 默认显示的编码数量
        defaultDisplayCodeCount: 3,
        // 提示框最大高度
        tooltipMaxHeight: '300px',
        // 提示框网格列数
        tooltipGridColumns: 2
    },
    
    // 数据配置
    data: {
        // 每页显示的产品数量
        productsPerPage: 12
    }
};

// 保存配置到本地存储
function saveConfig() {
    const yamlStr = jsyaml.dump(systemConfig);
    localStorage.setItem('systemConfig', yamlStr);
    
    // 可选：也保存到文件（如果在服务器端实现）
    // 这里仅使用localStorage作为演示
}

// 从本地存储加载配置
function loadConfig() {
    try {
        // 首先尝试从localStorage加载
        const savedConfig = localStorage.getItem('systemConfig');
        if (savedConfig) {
            const parsedConfig = jsyaml.load(savedConfig);
            Object.assign(systemConfig, parsedConfig);
            return;
        }
        
        // 如果localStorage中没有，则尝试从文件加载（需要服务器支持）
        fetch('config.yaml')
            .then(response => response.text())
            .then(yamlText => {
                const parsedConfig = jsyaml.load(yamlText);
                Object.assign(systemConfig, parsedConfig);
                console.log('配置已从YAML文件加载');
            })
            .catch(err => {
                console.warn('无法加载配置文件:', err);
            });
    } catch (error) {
        console.error('加载配置时出错:', error);
    }
}

// 重置配置为默认值
function resetConfig() {
    localStorage.removeItem('systemConfig');
    location.reload();
}

// 初始化时加载配置
loadConfig();