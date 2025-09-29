// 扩展功能模块

// 搜索编码
function filterCodes() {
    const searchTerm = document.getElementById('searchCodes').value.toLowerCase();
    
    if (searchTerm) {
        filteredCodes = codes.filter(code => 
            code.code.toLowerCase().includes(searchTerm) ||
            code.description.toLowerCase().includes(searchTerm)
        );
    } else {
        filteredCodes = [...codes];
    }
    
    renderFilteredCodes();
}

// 渲染筛选后的编码
function renderFilteredCodes() {
    const codesList = document.getElementById('codesList');
    
    if (filteredCodes.length === 0) {
        codesList.innerHTML = `
            <div class="empty-state">
                <h3>未找到匹配的编码</h3>
                <p>请尝试其他搜索关键词</p>
            </div>
        `;
        return;
    }
    
    codesList.innerHTML = filteredCodes.map(code => `
        <div class="code-card">
            <h3><i class="fas fa-barcode"></i> ${code.code}</h3>
            <p>${code.description || '暂无描述'}</p>
            <div class="meta">
                ${code.date ? `<i class="fas fa-calendar"></i> 生产日期: ${code.date} | ` : ''}
                <i class="fas fa-clock"></i> 创建时间: ${new Date(code.createdAt).toLocaleString()}
            </div>
            <div class="card-actions">
                <button class="delete-btn" onclick="deleteCode('${code.id}')">
                    <i class="fas fa-trash"></i> 删除编码
                </button>
            </div>
        </div>
    `).join('');
}

// 确认删除编码
function confirmDeleteCode(codeId) {
    showConfirmDialog('确定要删除这个编码吗？', () => {
        deleteCode(codeId);
    });
}

// 导出编码数据
function exportCodes() {
    if (!codes || codes.length === 0) {
        showMessage('暂无编码数据可导出', 'error');
        return;
    }
    
    const productName = document.getElementById('currentProductName').textContent;
    const csvContent = generateCSV(codes, productName);
    downloadCSV(csvContent, `${productName}_编码数据.csv`);
    showMessage('编码数据导出成功');
}

// 生成CSV内容
function generateCSV(data, productName) {
    const headers = ['编码', '描述', '生产日期', '创建时间'];
    const csvRows = [headers.join(',')];
    
    data.forEach(code => {
        const row = [
            `"${code.code}"`,
            `"${code.description || ''}"`,
            `"${code.date || ''}"`,
            `"${new Date(code.createdAt).toLocaleString()}"`
        ];
        csvRows.push(row.join(','));
    });
    
    return csvRows.join('\n');
}

// 下载CSV文件
function downloadCSV(csvContent, filename) {
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}

// 增强的添加编码功能
async function addCodeEnhanced() {
    const codeInput = document.getElementById('codeInput');
    const descriptionInput = document.getElementById('codeDescription');
    const dateInput = document.getElementById('codeDate');
    
    const code = codeInput.value.trim();
    const description = descriptionInput.value.trim();
    const date = dateInput.value;
    
    if (!code) {
        showMessage('请输入产品编码', 'error');
        return;
    }
    
    if (!currentProductId) {
        showMessage('请先选择产品', 'error');
        return;
    }
    
    try {
        const response = await fetch(`/api/products/${currentProductId}/codes`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ code, description, date })
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showMessage('编码添加成功');
            codeInput.value = '';
            descriptionInput.value = '';
            dateInput.value = '';
            loadCodes();
            loadStats(); // 更新统计数据
        } else {
            if (result.error && result.error.includes('编码已存在')) {
                showConfirmDialog('编码已存在，请使用不同的编码', () => {
                    // 用户确认后的回调，这里不需要执行任何操作
                });
            } else {
                showMessage(result.error || '添加编码失败', 'error');
            }
        }
    } catch (error) {
        showMessage('添加编码失败', 'error');
    }
}

// 批量导入编码
function showImportDialog() {
    const importDialog = document.createElement('div');
    importDialog.className = 'modal';
    importDialog.innerHTML = `
        <div class="modal-content">
            <h3><i class="fas fa-upload"></i> 批量导入编码</h3>
            <p>请选择CSV文件进行批量导入（格式：编码,描述,生产日期）</p>
            <input type="file" id="importFile" accept=".csv" style="margin: 20px 0;">
            <div class="modal-actions">
                <button onclick="importCodes()" class="view-btn">导入</button>
                <button onclick="closeImportDialog()" class="secondary-btn">取消</button>
            </div>
        </div>
    `;
    document.body.appendChild(importDialog);
    importDialog.style.display = 'block';
    
    window.closeImportDialog = () => {
        document.body.removeChild(importDialog);
    };
}

// 导入编码数据
async function importCodes() {
    const fileInput = document.getElementById('importFile');
    const file = fileInput.files[0];
    
    if (!file) {
        showMessage('请选择文件', 'error');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = async (e) => {
        const csv = e.target.result;
        const lines = csv.split('\n');
        const codes = [];
        
        // 跳过标题行
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line) {
                const [code, description, date] = line.split(',').map(item => item.replace(/"/g, ''));
                if (code) {
                    codes.push({ code, description: description || '', date: date || '' });
                }
            }
        }
        
        // 批量添加编码
        let successCount = 0;
        for (const codeData of codes) {
            try {
                const response = await fetch(`/api/products/${currentProductId}/codes`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(codeData)
                });
                
                if (response.ok) {
                    successCount++;
                }
            } catch (error) {
                console.error('导入编码失败:', error);
            }
        }
        
        showMessage(`成功导入 ${successCount} 个编码`);
        loadCodes();
        loadStats();
        closeImportDialog();
    };
    
    reader.readAsText(file);
}

// 重写addCode函数以使用增强版本
window.addCode = addCodeEnhanced;

// 初始化筛选编码数组
document.addEventListener('DOMContentLoaded', function() {
    filteredCodes = [...codes];
});

// 重写renderCodes函数以支持筛选
const originalRenderCodes = window.renderCodes;
window.renderCodes = function() {
    filteredCodes = [...codes];
    renderFilteredCodes();
};