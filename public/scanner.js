// 扫码功能模块
let codeReader = null;
let scanStream = null;
let scanResult = null;

// 检查设备是否支持摄像头
async function checkCameraSupport() {
    try {
        // 检查基本API支持
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            return { supported: false, reason: 'API_NOT_SUPPORTED' };
        }

        // 检查是否有摄像头设备
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(device => device.kind === 'videoinput');
        
        if (videoDevices.length === 0) {
            return { supported: false, reason: 'NO_CAMERA_DEVICE' };
        }

        // 尝试获取摄像头权限（不实际启动）
        try {
            const testStream = await navigator.mediaDevices.getUserMedia({ 
                video: { width: 320, height: 240 } 
            });
            testStream.getTracks().forEach(track => track.stop());
            return { supported: true, devices: videoDevices };
        } catch (permissionError) {
            if (permissionError.name === 'NotAllowedError') {
                return { supported: true, needsPermission: true, devices: videoDevices };
            }
            return { supported: false, reason: 'PERMISSION_DENIED', error: permissionError };
        }
    } catch (error) {
        console.error('检查摄像头支持时出错:', error);
        return { supported: false, reason: 'CHECK_FAILED', error };
    }
}

// 初始化扫码器
function initScanner() {
    if (typeof ZXing !== 'undefined') {
        codeReader = new ZXing.BrowserMultiFormatReader();
        console.log('扫码器初始化成功');
        return true;
    } else {
        console.error('ZXing库未加载');
        showMessage('扫码功能不可用，请检查网络连接', 'error');
        return false;
    }
}

// 开始扫码
async function startScan() {
    if (!codeReader) {
        if (!initScanner()) {
            return;
        }
    }

    try {
        // 检查摄像头支持
        const cameraCheck = await checkCameraSupport();
        
        if (!cameraCheck.supported) {
            let errorMessage = '启动扫码失败';
            
            switch (cameraCheck.reason) {
                case 'API_NOT_SUPPORTED':
                    errorMessage = '您的浏览器不支持摄像头功能，请使用Chrome、Safari或Firefox等现代浏览器';
                    break;
                case 'NO_CAMERA_DEVICE':
                    errorMessage = '未检测到摄像头设备，请确保设备已连接摄像头';
                    break;
                case 'PERMISSION_DENIED':
                    errorMessage = '摄像头权限被拒绝，请在浏览器设置中允许访问摄像头';
                    break;
                default:
                    errorMessage = '无法访问摄像头，请检查设备和浏览器设置';
            }
            
            showMessage(errorMessage, 'error');
            return;
        }

        // 显示扫码对话框
        document.getElementById('scanDialog').style.display = 'block';
        document.getElementById('scanResult').style.display = 'none';
        document.getElementById('useScanResult').style.display = 'none';

        // 获取摄像头权限并开始扫码
        const videoElement = document.getElementById('scanVideo');
        
        // 尝试多种摄像头配置
        const constraints = [
            // 优先尝试后置摄像头，高分辨率
            {
                video: {
                    facingMode: { ideal: 'environment' },
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                }
            },
            // 备选：后置摄像头，中等分辨率
            {
                video: {
                    facingMode: { ideal: 'environment' },
                    width: { ideal: 640 },
                    height: { ideal: 480 }
                }
            },
            // 备选：任意摄像头，中等分辨率
            {
                video: {
                    width: { ideal: 640 },
                    height: { ideal: 480 }
                }
            },
            // 最后备选：基本配置
            {
                video: true
            }
        ];

        let streamObtained = false;
        
        for (const constraint of constraints) {
            try {
                scanStream = await navigator.mediaDevices.getUserMedia(constraint);
                videoElement.srcObject = scanStream;
                streamObtained = true;
                console.log('摄像头启动成功，使用配置:', constraint);
                break;
            } catch (error) {
                console.warn('尝试摄像头配置失败:', constraint, error);
                continue;
            }
        }

        if (!streamObtained) {
            throw new Error('所有摄像头配置都失败');
        }

        // 等待视频加载
        await new Promise((resolve) => {
            videoElement.onloadedmetadata = resolve;
        });

        // 开始解码
        codeReader.decodeFromVideoDevice(null, videoElement, (result, err) => {
            if (result) {
                console.log('扫码成功:', result.text);
                onScanSuccess(result.text);
            }
            if (err && !(err instanceof ZXing.NotFoundException)) {
                console.error('扫码错误:', err);
            }
        });

    } catch (error) {
        console.error('启动扫码失败:', error);
        let errorMessage = '启动扫码失败';
        
        if (error.name === 'NotAllowedError') {
            errorMessage = '请允许访问摄像头权限，然后重试';
        } else if (error.name === 'NotFoundError') {
            errorMessage = '未找到可用的摄像头设备';
        } else if (error.name === 'NotSupportedError') {
            errorMessage = '您的设备不支持摄像头功能';
        } else if (error.name === 'NotReadableError') {
            errorMessage = '摄像头被其他应用占用，请关闭其他应用后重试';
        } else if (error.name === 'OverconstrainedError') {
            errorMessage = '摄像头配置不兼容，请尝试重新打开';
        } else {
            errorMessage = `摄像头启动失败: ${error.message || '未知错误'}`;
        }
        
        showMessage(errorMessage, 'error');
        closeScan();
    }
}

// 扫码成功处理
function onScanSuccess(text) {
    scanResult = text;
    document.getElementById('scanResultText').textContent = text;
    document.getElementById('scanResult').style.display = 'block';
    document.getElementById('useScanResult').style.display = 'inline-flex';
    document.getElementById('fillScanResult').style.display = 'inline-flex';
    
    // 停止扫码但保持对话框打开
    if (codeReader) {
        codeReader.reset();
    }
}

// 仅填入扫码结果到输入框
function fillScanResult() {
    if (scanResult) {
        document.getElementById('codeInput').value = scanResult;
        closeScan();
        showMessage('扫码结果已填入编码框', 'success');
    }
}

// 使用扫码结果
async function useScanResult() {
    if (scanResult) {
        // 填入编码框
        document.getElementById('codeInput').value = scanResult;
        
        // 获取其他输入框的值
        const descriptionInput = document.getElementById('codeDescription');
        const dateInput = document.getElementById('codeDate');
        
        const description = descriptionInput.value.trim();
        const date = dateInput.value;
        
        // 检查是否在编码管理页面且有选中的产品
        if (!currentProductId) {
            closeScan();
            showMessage('扫码结果已填入编码框，请手动添加', 'success');
            return;
        }
        
        try {
            // 自动添加编码
            const response = await fetch(`/api/products/${currentProductId}/codes`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    code: scanResult, 
                    description: description,
                    date: date
                })
            });
            
            const result = await response.json();
            
            if (response.ok) {
                // 成功添加
                closeScan();
                showMessage('扫码成功！编码已自动添加', 'success');
                
                // 清空输入框
                document.getElementById('codeInput').value = '';
                descriptionInput.value = '';
                dateInput.value = '';
                
                // 刷新编码列表
                if (typeof loadCodes === 'function') {
                    loadCodes();
                }
                
                // 更新统计数据
                if (typeof loadStats === 'function') {
                    loadStats();
                }
            } else {
                // 添加失败，保留在输入框中让用户手动处理
                closeScan();
                if (result.error && result.error.includes('编码已存在')) {
                    showMessage('扫码成功，但编码已存在！请检查或修改后手动添加', 'error');
                } else {
                    showMessage(`扫码成功，但自动添加失败：${result.error || '未知错误'}`, 'error');
                }
            }
        } catch (error) {
            console.error('自动添加编码失败:', error);
            closeScan();
            showMessage('扫码成功，但网络错误！编码已填入输入框，请手动添加', 'error');
        }
    }
}

// 关闭扫码
function closeScan() {
    // 停止扫码器
    if (codeReader) {
        codeReader.reset();
    }
    
    // 停止摄像头流
    if (scanStream) {
        scanStream.getTracks().forEach(track => track.stop());
        scanStream = null;
    }
    
    // 隐藏对话框和重置按钮状态
    document.getElementById('scanDialog').style.display = 'none';
    document.getElementById('scanResult').style.display = 'none';
    document.getElementById('useScanResult').style.display = 'none';
    document.getElementById('fillScanResult').style.display = 'none';
    scanResult = null;
}

// 页面加载时初始化
document.addEventListener('DOMContentLoaded', function() {
    // 延迟初始化扫码器，等待ZXing库加载
    setTimeout(() => {
        initScanner();
    }, 1000);
    
    // 绑定事件
    document.getElementById('useScanResult').onclick = useScanResult;
    document.getElementById('fillScanResult').onclick = fillScanResult;
    document.getElementById('closeScan').onclick = closeScan;
    
    // 点击对话框外部关闭
    document.getElementById('scanDialog').onclick = (e) => {
        if (e.target.id === 'scanDialog') {
            closeScan();
        }
    };
    
    // 检测设备能力并显示/隐藏扫码按钮
    checkDeviceCapabilities();
});

// 检测设备能力
async function checkDeviceCapabilities() {
    const scanBtn = document.getElementById('scanBtn');
    
    try {
        const cameraCheck = await checkCameraSupport();
        
        if (!cameraCheck.supported) {
            // 设备不支持摄像头，隐藏扫码按钮
            scanBtn.style.display = 'none';
            
            // 检查是否已经添加过提示，避免重复添加
            const codesSection = document.getElementById('codesSection');
            const existingHint = codesSection.querySelector('.camera-hint');
            
            if (!existingHint) {
                // 在编码管理区域的标题后添加提示信息
                const sectionTitle = codesSection.querySelector('h2');
                const hint = document.createElement('div');
                hint.className = 'camera-hint';
                hint.innerHTML = '<i class="fas fa-info-circle"></i> 当前设备不支持扫码功能，请手动输入编码';
                
                // 插入到标题后面，表单前面
                sectionTitle.insertAdjacentElement('afterend', hint);
            }
            
            console.log('设备不支持摄像头，隐藏扫码按钮');
        } else {
            // 设备支持摄像头，显示扫码按钮
            scanBtn.style.display = 'inline-flex';
            console.log('设备支持摄像头，显示扫码按钮');
            
            if (cameraCheck.needsPermission) {
                // 需要权限，在按钮上添加提示
                scanBtn.title = '首次使用需要允许摄像头权限';
            }
        }
    } catch (error) {
        console.error('检测设备能力失败:', error);
        // 出错时保守处理，显示扫码按钮
        scanBtn.style.display = 'inline-flex';
        scanBtn.title = '点击尝试扫码功能';
    }
}

// 处理页面卸载时清理资源
window.addEventListener('beforeunload', function() {
    closeScan();
});