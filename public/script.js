let currentProductId = null;
let products = [];
let codes = [];
let filteredProducts = [];
let filteredCodes = [];
let currentFilter = 'all';

// 分页变量
let currentPage = 1;
let totalPages = 1;
let itemsPerPage = systemConfig?.data?.productsPerPage || 12;

// 加载所有编码数据
async function loadAllCodes(page = 1, limit = 1000) {
    try {
        const response = await fetch(`/api/codes?page=${page}&limit=${limit}`);
        const data = await response.json();
        codes = data.codes || []; // 从响应中提取codes数组
        totalPages = data.pagination?.pages || 1;
        console.log('已加载所有编码数据:', codes.length, '总页数:', totalPages);
        // 加载完编码数据后重新渲染产品列表
        renderProducts();
    } catch (error) {
        console.error('加载所有编码数据失败:', error);
    }
}

// 切换显示更多编码
function toggleCodeList(element, type) {
    const codes = JSON.parse(element.dataset.codes);
    const codeClass = type === 'missing' ? 'missing' : 'extra';
    const container = element.parentElement;
    
    // 如果已经展开，则收起
    if (element.classList.contains('expanded')) {
        // 移除所有展开的编码
        const expandedCodes = container.querySelectorAll(`.expanded-${codeClass}`);
        expandedCodes.forEach(code => code.remove());
        
        // 恢复按钮文本
        element.textContent = `+${codes.length}`;
        element.classList.remove('expanded');
    } else {
        // 展开所有编码
        codes.forEach(code => {
            const codeSpan = document.createElement('span');
            codeSpan.className = `code-tag ${codeClass} expanded-${codeClass}`;
            codeSpan.textContent = code;
            container.appendChild(codeSpan);
        });
        
        // 更改按钮文本
        element.textContent = '收起';
        element.classList.add('expanded');
    }
}

// 页面加载时初始化
document.addEventListener('DOMContentLoaded', function() {
    loadProducts();
    loadAllCodes();
    loadStats();
    setupEventListeners();
    
    // 初始化鼠标悬停显示缺失编码功能
    initMissingCodesDisplay();
});

// 设置事件监听器
function setupEventListeners() {
    // 确认对话框事件
    document.getElementById('confirmNo').onclick = () => {
        document.getElementById('confirmDialog').style.display = 'none';
    };
    
    // 点击模态框外部关闭
    document.getElementById('confirmDialog').onclick = (e) => {
        if (e.target.id === 'confirmDialog') {
            document.getElementById('confirmDialog').style.display = 'none';
        }
    };
}

// 显示确认对话框
function showConfirmDialog(message, onConfirm) {
    document.getElementById('confirmMessage').textContent = message;
    document.getElementById('confirmYes').onclick = () => {
        document.getElementById('confirmDialog').style.display = 'none';
        onConfirm();
    };
    
    document.getElementById('confirmNo').onclick = () => {
        document.getElementById('confirmDialog').style.display = 'none';
    };
    
    document.getElementById('confirmDialog').style.display = 'block';
    
    // 自动将焦点设置到确认按钮
    setTimeout(() => {
        document.getElementById('confirmYes').focus();
    }, 100);
}

// 显示消息
function showMessage(text, type = 'success') {
    const messageEl = document.getElementById('message');
    messageEl.textContent = text;
    messageEl.className = `message ${type}`;
    messageEl.classList.add('show');
    
    setTimeout(() => {
        messageEl.classList.remove('show');
    }, 3000);
}

// 加载统计数据
async function loadStats() {
    try {
        const response = await fetch('/api/stats');
        const stats = await response.json();
        
        document.getElementById('totalProducts').textContent = stats.totalProducts;
        document.getElementById('totalCodes').textContent = stats.totalCodes;
        document.getElementById('recentActivity').textContent = stats.recentActivity;
    } catch (error) {
        console.error('加载统计数据失败:', error);
    }
}

// 加载产品列表
async function loadProducts() {
    try {
        const response = await fetch('/api/products');
        products = await response.json();
        // 按创建时间降序排序，最新的在前面
        products.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        filteredProducts = [...products];
        renderProducts();
        updateCategoryFilters(); // 更新分类筛选按钮
        updateCategoryDatalist(); // 更新分类输入建议
        loadStats(); // 更新统计数据
    } catch (error) {
        showMessage('加载产品列表失败', 'error');
    }
}

// 渲染产品列表
function renderProducts() {
    const productsList = document.getElementById('productsList');
    
    if (filteredProducts.length === 0) {
        productsList.innerHTML = `
            <div class="empty-state">
                <h3>暂无产品</h3>
                <p>点击"添加产品"按钮创建新产品</p>
            </div>
        `;
        return;
    }
    
    console.log('渲染产品列表，当前编码数据:', codes);
    
    // 根据当前页码计算要显示的产品
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const displayedProducts = filteredProducts.slice(startIndex, endIndex);
    
    productsList.innerHTML = displayedProducts.map(product => {
        // 获取该产品的编码数量
        let codeCount = 0;
        const productCodes = codes.filter(code => code.productId === product.id);
        codeCount = productCodes.length;
        
        console.log(`产品 ${product.name} (ID: ${product.id}) 的编码数量:`, codeCount);
        
        // 计算完成率
        const requiredQuantity = product.requiredQuantity || 0;
        const completionRate = requiredQuantity > 0 ? Math.min(100, Math.round((codeCount / requiredQuantity) * 100)) : 100;
        const remainingCount = Math.max(0, requiredQuantity - codeCount);
        
        // 格式化大数字显示
        const formatNumber = (num) => {
            return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
        };
        
        // 编码范围信息
        const rangeInfo = product.codeStart && product.codeEnd 
            ? `<div class="stat range-info">
                <i class="fas fa-exchange-alt"></i> 编码范围: <span class="code-range">${product.codeStart} - ${product.codeEnd}</span>
               </div>` 
            : `<div class="stat range-info"><i class="fas fa-exchange-alt"></i> 编码范围: <span class="code-range">未设置</span></div>`;
        
        // 判断范围内是否有缺失编码
        let hasMissingCodesInRange = false;
        let missingCodes = [];
        if (product.codeStart && product.codeEnd) {
            const start = parseInt(product.codeStart);
            const end = parseInt(product.codeEnd);
            if (!isNaN(start) && !isNaN(end)) {
                // 检查范围内是否有未录入的编码
                const productCodes = codes.filter(code => code.productId === product.id).map(code => code.code);
                for (let i = start; i <= end; i++) {
                    if (!productCodes.includes(i.toString())) {
                        hasMissingCodesInRange = true;
                        missingCodes.push(i);
                    }
                }
            }
        }
        
        return `
            <div class="product-card" data-category="${product.category || ''}">
                <h3><i class="fas fa-box"></i> ${product.name}</h3>
                <p>${product.description || '暂无描述'}</p>
                <div class="product-stats">
                    <div class="stat">
                        <i class="fas fa-clipboard-list"></i> <span class="stat-label">需求:</span> <span class="stat-value">${formatNumber(requiredQuantity || 0)}</span>
                    </div>
                    <div class="stat">
                        <i class="fas fa-barcode"></i> <span class="stat-label">已录入:</span> <span class="stat-value">${formatNumber(codeCount || 0)}</span>
                    </div>
                    <div class="stat">
                        <i class="fas fa-exclamation-circle"></i> <span class="stat-label">缺少:</span> <span class="stat-value">${formatNumber(remainingCount)}</span>
                    </div>
                    <div class="stat">
                        <i class="fas fa-exclamation-triangle"></i> <span class="stat-label">缺失码:</span> 
                        ${product.codeStart && product.codeEnd ? 
                        `<span class="stat-value missing-codes-status" data-missing-codes="${missingCodes.join(',')}">${ hasMissingCodesInRange ? '<span style="color: #ff3333; font-weight: bold;">是</span>' : '否'}</span>
                        ${hasMissingCodesInRange ? '<div class="tooltip"></div>' : ''}` : 
                        '<span class="stat-value">未设置</span>'}
                    </div>
                </div>
                ${rangeInfo}
                <div class="progress-bar">
                    <div class="progress" style="width: ${completionRate}%"></div>
                    <span>${completionRate}%</span>
                </div>
                <div class="meta">
                    ${product.category ? `<i class="fas fa-layer-group"></i> 分类: ${product.category} | ` : ''}
                    <i class="fas fa-calendar"></i> 创建时间: ${new Date(product.createdAt).toLocaleString()}
                </div>
                <div class="card-actions">
                    <button class="view-btn" onclick="viewProductCodes('${product.id}', '${product.name}')">
                        <i class="fas fa-eye"></i> 查看编码
                    </button>
                    <button class="delete-btn" onclick="confirmDeleteProduct('${product.id}')">
                        <i class="fas fa-trash"></i> 删除产品
                    </button>
                </div>
            </div>
        `;
    }).join('');
    
    // 渲染分页控件
    renderPagination();
}

// 渲染分页控件
function renderPagination() {
    const paginationControls = document.getElementById('paginationControls');
    if (!paginationControls) return;
    
    paginationControls.innerHTML = '';
    
    // 计算总页数
    totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
    
    // 如果只有一页，不显示分页控件
    if (totalPages <= 1) {
        return;
    }
    
    // 创建上一页按钮
    const prevButton = document.createElement('button');
    prevButton.textContent = '上一页';
    prevButton.className = 'pagination-btn';
    prevButton.disabled = currentPage === 1;
    prevButton.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            renderProducts();
        }
    });
    paginationControls.appendChild(prevButton);
    
    // 创建页码按钮
    const maxPageButtons = 5; // 最多显示的页码按钮数
    let startPage = Math.max(1, currentPage - Math.floor(maxPageButtons / 2));
    let endPage = Math.min(totalPages, startPage + maxPageButtons - 1);
    
    if (endPage - startPage + 1 < maxPageButtons) {
        startPage = Math.max(1, endPage - maxPageButtons + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
        const pageButton = document.createElement('button');
        pageButton.textContent = i;
        pageButton.className = 'pagination-btn' + (i === currentPage ? ' active' : '');
        pageButton.addEventListener('click', () => {
            currentPage = i;
            renderProducts();
        });
        paginationControls.appendChild(pageButton);
    }
    
    // 创建下一页按钮
    const nextButton = document.createElement('button');
    nextButton.textContent = '下一页';
    nextButton.className = 'pagination-btn';
    nextButton.disabled = currentPage === totalPages;
    nextButton.addEventListener('click', () => {
        if (currentPage < totalPages) {
            currentPage++;
            renderProducts();
        }
    });
    paginationControls.appendChild(nextButton);
}

// 添加产品
async function addProduct() {
    const nameInput = document.getElementById('productName');
    const descriptionInput = document.getElementById('productDescription');
    const categoryInput = document.getElementById('productCategory');
    const requiredQuantityInput = document.getElementById('productRequiredQuantity');
    const codeStartInput = document.getElementById('productCodeStart');
    const codeEndInput = document.getElementById('productCodeEnd');
    
    const name = nameInput.value.trim();
    const description = descriptionInput.value.trim();
    const category = categoryInput.value.trim();
    let requiredQuantity = parseInt(requiredQuantityInput?.value) || 0;
    const codeStart = codeStartInput.value.trim();
    const codeEnd = codeEndInput.value.trim();
    
    if (!name) {
        showMessage('请输入产品名称', 'error');
        return;
    }
    
    // 如果设置了编码范围，自动计算需求数量
    if (codeStart && codeEnd) {
        const start = parseInt(codeStart);
        const end = parseInt(codeEnd);
        if (!isNaN(start) && !isNaN(end) && start <= end) {
            // 计算范围内的编码数量（包括起始和结束编码）
            requiredQuantity = end - start + 1;
        }
    }
    
    try {
        const response = await fetch('/api/products', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name, description, category, requiredQuantity, codeStart, codeEnd })
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showMessage(`产品 "${name}" 添加成功`);
            nameInput.value = '';
            descriptionInput.value = '';
            categoryInput.value = '';
            if(requiredQuantityInput) requiredQuantityInput.value = '0';
            if(codeStartInput) codeStartInput.value = '';
            if(codeEndInput) codeEndInput.value = '';
            loadProducts();
        } else {
            showMessage(result.error || '添加产品失败', 'error');
        }
    } catch (error) {
        showMessage('添加产品失败', 'error');
    }
}

// 确认删除产品
function confirmDeleteProduct(productId) {
    showConfirmDialog('确定要删除这个产品吗？这将同时删除该产品的所有编码。', () => {
        deleteProduct(productId);
    });
}

// 删除产品
async function deleteProduct(productId) {
    try {
        const response = await fetch(`/api/products/${productId}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            showMessage('产品删除成功');
            loadProducts();
        } else {
            showMessage('删除产品失败', 'error');
        }
    } catch (error) {
        showMessage('删除产品失败', 'error');
    }
}

// 获取所有唯一的分类
function getUniqueCategories() {
    const categories = products
        .map(product => product.category)
        .filter(category => category && category.trim() !== '')
        .filter((category, index, arr) => arr.indexOf(category) === index)
        .sort();
    return categories;
}

// 更新分类筛选按钮
function updateCategoryFilters() {
    const filterButtons = document.getElementById('filterButtons');
    const categories = getUniqueCategories();
    
    // 保留"全部"按钮，添加动态分类按钮
    let buttonsHTML = '<button class="filter-btn active" onclick="filterByCategory(\'all\')">全部</button>';
    
    categories.forEach(category => {
        buttonsHTML += `<button class="filter-btn" onclick="filterByCategory('${category}')">${category}</button>`;
    });
    
    filterButtons.innerHTML = buttonsHTML;
}

// 更新分类输入建议
function updateCategoryDatalist() {
    const categoryList = document.getElementById('categoryList');
    const categories = getUniqueCategories();
    
    categoryList.innerHTML = categories.map(category => 
        `<option value="${category}">`
    ).join('');
}

// 按分类筛选产品
function filterByCategory(category) {
    currentFilter = category;
    
    // 更新按钮状态
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    if (category === 'all') {
        filteredProducts = [...products];
    } else {
        filteredProducts = products.filter(product => product.category === category);
    }
    
    renderProducts();
}

// 搜索产品
function filterProducts() {
    const searchTerm = document.getElementById('searchProducts').value.toLowerCase();
    
    let baseProducts = currentFilter === 'all' ? products : products.filter(p => p.category === currentFilter);
    
    if (searchTerm) {
        filteredProducts = baseProducts.filter(product => 
            product.name.toLowerCase().includes(searchTerm) ||
            product.description.toLowerCase().includes(searchTerm)
        );
    } else {
        filteredProducts = [...baseProducts];
    }
    
    renderProducts();
}

// 查看产品编码
async function viewProductCodes(productId, productName) {
    currentProductId = productId;
    document.getElementById('currentProductName').textContent = productName;
    
    // 隐藏产品列表，显示编码管理
    document.querySelector('.product-section').style.display = 'none';
    document.getElementById('codesSection').style.display = 'block';
    
    // 确保我们有最新的产品信息
    try {
        const response = await fetch(`/api/products/${productId}`);
        const productDetails = await response.json();
        // 更新当前产品在products数组中的信息
        const index = products.findIndex(p => p.id === productId);
        if (index !== -1) {
            products[index] = productDetails;
        } else {
            // 如果在数组中找不到，添加到数组
            products.push(productDetails);
        }
        
        // 先加载编码，然后更新统计信息
        await loadCodes();
        
        // 显示当前产品的编码数量和统计信息
        updateProductCodeCount();
    } catch (error) {
        console.error('获取产品详情失败:', error);
        // 即使获取详情失败，也尝试加载编码
        await loadCodes();
    }
}

// 返回产品列表
function backToProducts() {
    currentProductId = null;
    document.querySelector('.product-section').style.display = 'block';
    document.getElementById('codesSection').style.display = 'none';
    
    // 清空编码输入框
    document.getElementById('codeInput').value = '';
    document.getElementById('codeDescription').value = '';
}

// 加载编码列表
async function loadCodes() {
    if (!currentProductId) return;
    
    try {
        const response = await fetch(`/api/products/${currentProductId}/codes`);
        codes = await response.json();
        // 按创建时间降序排序，最新的在前面
        codes.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        renderCodes();
        // 直接在这里更新编码数量显示
        updateProductCodeCount();
    } catch (error) {
        showMessage('加载编码列表失败', 'error');
    }
}

// 渲染编码列表
function renderCodes() {
    const codesList = document.getElementById('codesList');
    
    // 更新产品名称，显示编码数量
    updateProductCodeCount();
    
    if (codes.length === 0) {
        codesList.innerHTML = `
            <div class="empty-state">
                <h3>暂无编码</h3>
                <p>请为此产品添加第一个编码</p>
            </div>
        `;
        return;
    }
    
    codesList.innerHTML = codes.map(code => `
        <div class="code-card">
            <h3>${code.code}</h3>
            <p>${code.description || '暂无描述'}</p>
            <div class="meta">创建时间: ${new Date(code.createdAt).toLocaleString()}</div>
            <div class="card-actions">
                <button class="delete-btn" onclick="deleteCode('${code.id}')">
                    删除编码
                </button>
            </div>
        </div>
    `).join('');
}

// 更新产品编码数量显示和统计信息
function updateProductCodeCount() {
    if (currentProductId) {
        const productNameElement = document.getElementById('currentProductName');
        const productName = productNameElement.textContent.split(' (')[0];
        productNameElement.textContent = `${productName} (${codes.length} 个编码)`;
        
        // 更新编码统计信息
        updateCodeStats();
    }
}

// 更新编码统计信息
function updateCodeStats() {
    const codeStatsContainer = document.getElementById('codeStatsContainer');
    const currentProduct = products.find(p => p.id === currentProductId);
    
    console.log("更新编码统计信息:", currentProduct);
    console.log("当前编码数量:", codes.length);
    
    // 如果没有设置需求数量，不显示统计信息
    if (!currentProduct || !currentProduct.requiredQuantity) {
        codeStatsContainer.innerHTML = '';
        return;
    }
    
    // 计算缺少的编码
    let missingCodes = [];
    let extraCodes = [];
    
    // 如果设置了编码范围
    if (currentProduct.codeStart && currentProduct.codeEnd) {
        const start = parseInt(currentProduct.codeStart);
        const end = parseInt(currentProduct.codeEnd);
        
        // 确保开始和结束都是有效数字
        if (!isNaN(start) && !isNaN(end) && start <= end) {
            // 创建一个包含所有已录入编码的集合
            const existingCodes = new Set(codes.map(c => c.code));
            
            // 检查范围内的每个编码是否存在
            for (let i = start; i <= end; i++) {
                const codeStr = i.toString();
                if (!existingCodes.has(codeStr)) {
                    missingCodes.push(codeStr);
                }
            }
            
            // 检查是否有超出范围的编码
            extraCodes = codes.filter(c => {
                const codeNum = parseInt(c.code);
                return isNaN(codeNum) || codeNum < start || codeNum > end;
            }).map(c => c.code);
        }
    } else {
        // 如果没有设置编码范围，但设置了需求数量
        const requiredQuantity = parseInt(currentProduct.requiredQuantity);
        if (codes.length < requiredQuantity) {
            missingCodes = [`还需录入 ${requiredQuantity - codes.length} 个编码`];
        } else if (codes.length > requiredQuantity) {
            extraCodes = [`多录入了 ${codes.length - requiredQuantity} 个编码`];
        }
    }
    
    console.log("缺少的编码:", missingCodes.length);
    console.log("多余的编码:", extraCodes.length);
    
    // 生成统计信息HTML
    let statsHTML = '<div class="code-stats">';
    
    if (missingCodes.length > 0) {
        statsHTML += `<div class="missing-codes">
            <h4><i class="fas fa-exclamation-triangle"></i> 缺少的编码 (${missingCodes.length})</h4>
            <div class="code-list">`;
        
        // 使用配置中的默认显示数量
        const displayCount = systemConfig.ui.defaultDisplayCodeCount;
        if (missingCodes.length > displayCount) {
            const displayCodes = missingCodes.slice(0, displayCount);
            statsHTML += displayCodes.map(code => `<span class="code-tag missing">${code}</span>`).join('');
            statsHTML += `<span class="code-tag missing-more" onclick="toggleCodeList(this, 'missing')" 
                          data-codes='${JSON.stringify(missingCodes.slice(displayCount))}'>
                        +${missingCodes.length - displayCount}
                      </span>`;
        } else {
            statsHTML += missingCodes.map(code => `<span class="code-tag missing">${code}</span>`).join('');
        }
        
        statsHTML += '</div></div>';
    }
    
    if (extraCodes.length > 0) {
        statsHTML += `<div class="extra-codes">
            <h4><i class="fas fa-plus-circle"></i> 多出的编码 (${extraCodes.length})</h4>
            <div class="code-list">`;
            
        // 使用配置中的默认显示数量
        const displayCount = systemConfig.ui.defaultDisplayCodeCount;
        if (extraCodes.length > displayCount) {
            const displayCodes = extraCodes.slice(0, displayCount);
            statsHTML += displayCodes.map(code => `<span class="code-tag extra">${code}</span>`).join('');
            statsHTML += `<span class="code-tag extra-more" onclick="toggleCodeList(this, 'extra')" 
                          data-codes='${JSON.stringify(extraCodes.slice(displayCount))}'>
                        +${extraCodes.length - displayCount}
                      </span>`;
        } else {
            statsHTML += extraCodes.map(code => `<span class="code-tag extra">${code}</span>`).join('');
        }
        
        statsHTML += '</div></div>';
    }
    
    statsHTML += '</div>';
    
    // 确保显示统计信息
    console.log("更新编码统计信息:", {
        currentProduct,
        missingCodes: missingCodes.length,
        extraCodes: extraCodes.length
    });
    
    codeStatsContainer.innerHTML = statsHTML;
}

// 添加编码
async function addCode() {
    const codeInput = document.getElementById('codeInput');
    const descriptionInput = document.getElementById('codeDescription');
    
    const code = codeInput.value.trim();
    const description = descriptionInput.value.trim();
    
    if (!code) {
        showMessage('请输入产品编码', 'error');
        return;
    }
    
    if (!currentProductId) {
        showMessage('请先选择产品', 'error');
        return;
    }
    
    // 获取当前产品信息
    const currentProduct = products.find(p => p.id === currentProductId);
    
    // 检查编码是否在范围内
    if (currentProduct && currentProduct.codeStart && currentProduct.codeEnd) {
        const codeNum = parseInt(code);
        const startNum = parseInt(currentProduct.codeStart);
        const endNum = parseInt(currentProduct.codeEnd);
        
        if (!isNaN(codeNum) && !isNaN(startNum) && !isNaN(endNum)) {
            if (codeNum < startNum || codeNum > endNum) {
                showMessage(`编码必须在范围 ${currentProduct.codeStart}-${currentProduct.codeEnd} 内`, 'error');
                return;
            }
        }
    }
    
    try {
        const response = await fetch(`/api/products/${currentProductId}/codes`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ code, description })
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showMessage('编码添加成功');
            codeInput.value = '';
            descriptionInput.value = '';
            await loadCodes();
            updateProductCodeCount();
        } else {
            showMessage(result.error || '添加编码失败', 'error');
        }
    } catch (error) {
        showMessage('添加编码失败', 'error');
    }
}

// 删除编码
async function deleteCode(codeId) {
    try {
        const response = await fetch(`/api/products/${currentProductId}/codes/${codeId}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            showMessage('编码删除成功');
            await loadCodes();
            updateProductCodeCount();
        } else {
            showMessage('删除编码失败', 'error');
        }
    } catch (error) {
        showMessage('删除编码失败', 'error');
    }
}

// 回车键快捷操作
document.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        const activeElement = document.activeElement;
        
        if (activeElement.id === 'productName' || activeElement.id === 'productDescription') {
            addProduct();
        } else if (activeElement.id === 'codeInput' || activeElement.id === 'codeDescription') {
            addCode();
        }
    }
});

// 初始化鼠标悬停显示缺失编码功能
function initMissingCodesDisplay() {
    let tooltipTimeout;
    let activeTooltipTarget = null;
    
    // 创建或获取提示框
    function getTooltip() {
        let tooltip = document.getElementById('missing-codes-tooltip');
        if (!tooltip) {
            tooltip = document.createElement('div');
            tooltip.id = 'missing-codes-tooltip';
            tooltip.style.position = 'absolute';
            tooltip.style.backgroundColor = '#333';
            tooltip.style.color = '#fff';
            tooltip.style.padding = '10px';
            tooltip.style.borderRadius = '4px';
            tooltip.style.fontSize = '12px';
            tooltip.style.zIndex = '1000';
            tooltip.style.maxWidth = '300px';
            tooltip.style.maxHeight = '200px';
            tooltip.style.overflowY = 'auto';
            tooltip.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
            tooltip.style.pointerEvents = 'auto'; // 确保提示框可以接收鼠标事件
            document.body.appendChild(tooltip);
        }
        return tooltip;
    }
    
    // 显示提示框
    function showTooltip(target) {
        if (!target || !target.dataset.missingCodes) return;
        
        activeTooltipTarget = target;
        const missingCodes = target.dataset.missingCodes.split(',').filter(code => code !== '');
        if (missingCodes.length === 0) return;
        
        const tooltip = getTooltip();
        
        // 增加提示框的高度，以显示更多编码
        tooltip.style.maxHeight = '300px';
        
        // 显示所有缺失编码，并使用表格布局以便更紧凑地显示
        let codesHtml = '<strong>缺失编码列表:</strong><br><div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 5px; margin-top: 8px;">';
        
        // 优化大量编码的显示方式
        const maxDisplayCodes = systemConfig?.ui?.maxDisplayCodes || 100; // 从配置中获取最大显示数量
        const displayCodes = missingCodes.length > maxDisplayCodes ? 
                            missingCodes.slice(0, maxDisplayCodes) : 
                            missingCodes;
        
        // 使用虚拟DOM技术优化大量编码的渲染性能
        const fragment = document.createDocumentFragment();
        const tempContainer = document.createElement('div');
        
        displayCodes.forEach(code => {
            codesHtml += `<div style="padding: 2px 4px; background: rgba(255,255,255,0.1); border-radius: 3px;">${code}</div>`;
        });
        
        // 如果有更多编码，显示提示信息
        if (missingCodes.length > maxDisplayCodes) {
            codesHtml += `<div style="grid-column: span 3; text-align: center; padding: 5px; background: rgba(255,255,255,0.2); border-radius: 3px;">显示前${maxDisplayCodes}个，共${missingCodes.length}个缺失编码</div>`;
        }
        
        codesHtml += '</div>';
        tooltip.innerHTML = codesHtml;
        
        // 定位提示框，优化显示位置以避免超出视口
        const rect = target.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        const tooltipHeight = tooltip.offsetHeight;
        
        // 检查是否有足够空间在下方显示
        if (rect.bottom + tooltipHeight > viewportHeight) {
            // 如果下方空间不足，则在上方显示
            tooltip.style.top = `${rect.top + window.scrollY - tooltipHeight - 5}px`;
        } else {
            tooltip.style.top = `${rect.bottom + window.scrollY + 5}px`;
        }
        
        tooltip.style.left = `${rect.left}px`;
        tooltip.style.display = 'block';
        
        // 清除任何可能存在的隐藏计时器
        clearTimeout(tooltipTimeout);
    }
    
    // 隐藏提示框
    function hideTooltip() {
        tooltipTimeout = setTimeout(() => {
            const tooltip = document.getElementById('missing-codes-tooltip');
            if (tooltip) {
                tooltip.style.display = 'none';
                activeTooltipTarget = null;
            }
        }, 300);
    }
    
    // 使用事件委托监听整个产品列表区域
    document.getElementById('productsList').addEventListener('mouseover', function(e) {
        // 检查是否悬停在缺失编码状态元素上
        const target = e.target.closest('.missing-codes-status');
        if (target && target.dataset.missingCodes) {
            showTooltip(target);
        }
    });
    
    // 鼠标移出时处理
    document.getElementById('productsList').addEventListener('mouseout', function(e) {
        // 如果移出的不是当前活动的提示框目标，或者移入的是提示框，则不处理
        const target = e.target.closest('.missing-codes-status');
        const tooltip = document.getElementById('missing-codes-tooltip');
        
        if (!target || (tooltip && e.relatedTarget && (tooltip.contains(e.relatedTarget) || tooltip === e.relatedTarget))) {
            return;
        }
        
        // 如果移出的是当前活动的提示框目标，且不是移入提示框，则延迟隐藏
        if (target === activeTooltipTarget) {
            hideTooltip();
        }
    });
    
    // 为文档添加事件监听，处理提示框的鼠标事件
    document.addEventListener('mouseover', function(e) {
        const tooltip = document.getElementById('missing-codes-tooltip');
        if (tooltip && (tooltip === e.target || tooltip.contains(e.target))) {
            clearTimeout(tooltipTimeout);
        }
    });
    
    document.addEventListener('mouseout', function(e) {
        const tooltip = document.getElementById('missing-codes-tooltip');
        if (tooltip && (tooltip === e.target || tooltip.contains(e.target))) {
            // 确保不是移入到触发元素
            if (!e.relatedTarget || !e.relatedTarget.closest || !e.relatedTarget.closest('.missing-codes-status')) {
                hideTooltip();
            }
        }
    });
}