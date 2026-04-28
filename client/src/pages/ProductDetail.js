import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Card, 
  Button, 
  Input, 
  Spin, 
  Modal, 
  message, 
  Typography, 
  Descriptions, 
  Progress, 
  Space,
  Tooltip,
  Empty,
  Tag,
  Divider,
  Checkbox,
  Select,
  Pagination
} from 'antd';
import { 
  ArrowLeftOutlined, 
  PlusOutlined, 
  SearchOutlined, 
  DownloadOutlined,
  QrcodeOutlined,
  ExclamationCircleOutlined,
  DeleteOutlined,
  CheckOutlined,
  CloseOutlined,
  RestOutlined
} from '@ant-design/icons';
import { productAPI, codeAPI } from '../services/api';
import CodeList from '../components/CodeList';
import CodeForm from '../components/CodeForm';
import ScannerModal from '../components/ScannerModal';
import QuickCodeInput from '../components/QuickCodeInput';
import RecycleBinModal from '../components/RecycleBinModal';
import ExportUtils from '../utils/exportUtils';

const { Title } = Typography;
const { confirm } = Modal;
const { Search } = Input;

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [codes, setCodes] = useState([]);
  const [filteredCodes, setFilteredCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [scanModalVisible, setScanModalVisible] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [quickInputLoading, setQuickInputLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [sortOrder, setSortOrder] = useState('timeDesc');
  const [selectedCodes, setSelectedCodes] = useState([]);
  const [codeBatchMode, setCodeBatchMode] = useState(false);
  const [codesModalVisible, setCodesModalVisible] = useState(false);
  const [codesModalTitle, setCodesModalTitle] = useState('');
  const [codesModalList, setCodesModalList] = useState([]);
  const [modalType, setModalType] = useState(''); // 'missing' or 'excess'
  const [modalSortOrder, setModalSortOrder] = useState('asc');
  const [modalSelectedCodes, setModalSelectedCodes] = useState([]);
  const [modalActionLoading, setModalActionLoading] = useState(false);
  const [modalCurrentPage, setModalCurrentPage] = useState(1);
  const modalPageSize = 100;
  
  // 回收站状态
  const [recycleBinVisible, setRecycleBinVisible] = useState(false);
  const [deletedCodes, setDeletedCodes] = useState([]);
  const [recycleLoading, setRecycleLoading] = useState(false);

  // 扫码枪删除状态
  const [scanDeleteModalVisible, setScanDeleteModalVisible] = useState(false);
  const [scanDeleteCode, setScanDeleteCode] = useState('');
  const [scanDeleteLoading, setScanDeleteLoading] = useState(false);
  const [scanDeleteSuccessCount, setScanDeleteSuccessCount] = useState(0);
  const [scanDeleteFailedCodes, setScanDeleteFailedCodes] = useState([]);
  const scanDeleteInputRef = useRef(null);

  // 当弹窗打开时，自动聚焦输入框
  useEffect(() => {
    if (scanDeleteModalVisible) {
      setTimeout(() => {
        if (scanDeleteInputRef.current) {
          scanDeleteInputRef.current.focus();
        }
      }, 100);
    }
  }, [scanDeleteModalVisible]);

  // 统一处理排序和过滤
  useEffect(() => {
    let result = [...codes];
    
    // 1. 过滤
    if (searchText) {
      const searchLower = searchText.toLowerCase();
      result = result.filter(code => 
        code.code.toLowerCase().includes(searchLower) ||
        (code.description && code.description.toLowerCase().includes(searchLower))
      );
    }
    
    // 2. 排序
    result.sort((a, b) => {
      switch (sortOrder) {
        case 'timeDesc':
          return new Date(b.createdAt) - new Date(a.createdAt);
        case 'timeAsc':
          return new Date(a.createdAt) - new Date(b.createdAt);
        case 'codeAsc':
          return a.code.localeCompare(b.code, undefined, { numeric: true });
        case 'codeDesc':
          return b.code.localeCompare(a.code, undefined, { numeric: true });
        default:
          return 0;
      }
    });
    
    setFilteredCodes(result);
  }, [codes, searchText, sortOrder]);

  // 加载产品详情
  const loadProduct = async () => {
    try {
      if (!id || id === 'undefined') return; // 防止 id 为 undefined
      setLoading(true);
      const response = await productAPI.getProductById(id);
      setProduct(response.data);
    } catch (error) {
      console.error('获取产品详情失败:', error);
      message.error('获取产品详情失败');
      navigate('/products');
    } finally {
      setLoading(false);
    }
  };

  // 加载产品编码
  const loadCodes = async () => {
    try {
      if (!id || id === 'undefined') return; // 防止 id 为 undefined
      const response = await codeAPI.getProductCodes(id);
      const codesData = response.data;
      
      // 初始加载由useEffect处理排序
      setCodes(codesData);
      // setFilteredCodes will be handled by useEffect
    } catch (error) {
      console.error('获取编码列表失败:', error);
      message.error('获取编码列表失败');
    }
  };

  // 加载已删除编码
  const loadDeletedCodes = async () => {
    try {
      if (!id || id === 'undefined') return; // 防止 id 为 undefined
      setRecycleLoading(true);
      const response = await codeAPI.getProductCodes(id, true); // true for deleted
      // Sort by deletedAt descending
      const codes = response.data;
      codes.sort((a, b) => new Date(b.deletedAt || 0) - new Date(a.deletedAt || 0));
      setDeletedCodes(codes);
    } catch (error) {
      console.error('获取回收站数据失败:', error);
      message.error('获取回收站数据失败');
    } finally {
      setRecycleLoading(false);
    }
  };

  // 打开回收站
  const handleOpenRecycleBin = () => {
    // 刷新数据并显示
    setRecycleBinVisible(true);
    loadDeletedCodes();
  };

  // 恢复编码
  const handleRestoreCode = async (codeId) => {
    try {
      await codeAPI.restoreCode(id, codeId);
      message.success('编码已恢复');
      loadDeletedCodes(); // Reload recycle bin
      loadCodes(); // Reload main list
    } catch (error) {
      console.error('恢复编码失败:', error);
      message.error('恢复编码失败');
    }
  };

  // 永久删除编码
  const handlePermanentDeleteCode = async (codeId) => {
    try {
      await codeAPI.permanentDeleteCode(id, codeId);
      message.success('编码已永久删除');
      loadDeletedCodes();
    } catch (error) {
      console.error('永久删除编码失败:', error);
      message.error('永久删除编码失败');
    }
  };

  // 批量恢复编码
  const handleBatchRestoreCodes = async (codeIds) => {
    try {
      setRecycleLoading(true);
      const BATCH_SIZE = 50;
      for (let i = 0; i < codeIds.length; i += BATCH_SIZE) {
        const batch = codeIds.slice(i, i + BATCH_SIZE);
        await Promise.all(batch.map(codeId => codeAPI.restoreCode(id, codeId)));
      }
      message.success(`已恢复 ${codeIds.length} 个编码`);
      loadDeletedCodes(); // Reload recycle bin
      loadCodes(); // Reload main list
    } catch (error) {
      console.error('批量恢复编码失败:', error);
      message.error('批量恢复编码失败');
    } finally {
      setRecycleLoading(false);
    }
  };

  // 批量永久删除编码
  const handleBatchPermanentDeleteCodes = async (codeIds) => {
    try {
      setRecycleLoading(true);
      const BATCH_SIZE = 50;
      for (let i = 0; i < codeIds.length; i += BATCH_SIZE) {
        const batch = codeIds.slice(i, i + BATCH_SIZE);
        await Promise.all(batch.map(codeId => codeAPI.permanentDeleteCode(id, codeId)));
      }
      message.success(`已永久删除 ${codeIds.length} 个编码`);
      loadDeletedCodes();
    } catch (error) {
      console.error('批量永久删除编码失败:', error);
      message.error('批量永久删除编码失败');
    } finally {
      setRecycleLoading(false);
    }
  };

  // 初始加载
  useEffect(() => {
    loadProduct();
    loadCodes();
  }, [id]);

  // 添加编码
  const handleAddCode = async (values) => {
    try {
      setFormLoading(true);
      await codeAPI.addCode(id, values);
      message.success('编码添加成功');
      setAddModalVisible(false);
      loadCodes();
    } catch (error) {
      console.error('添加编码失败:', error);
      message.error('添加编码失败: ' + (error.response?.data?.error || '未知错误'));
    } finally {
      setFormLoading(false);
    }
  };

  // 快速添加编码
  const handleQuickAddCode = async (values) => {
    try {
      setQuickInputLoading(true);
      await codeAPI.addCode(id, values);
      message.success('编码添加成功');
      loadCodes();
    } catch (error) {
      console.error('添加编码失败:', error);
      message.error('添加编码失败: ' + (error.response?.data?.error || '未知错误'));
    } finally {
      setQuickInputLoading(false);
    }
  };

  // 处理重复编码
  const handleDuplicateCode = (duplicateCode) => {
    message.error(`编码 "${duplicateCode}" 已存在，请使用不同的编码！`);
    // 可以在这里添加声音提示或其他操作
  };

  // 删除编码
  const handleDeleteCode = async (codeId) => {
    try {
      await codeAPI.deleteCode(id, codeId);
      message.success('编码已移入回收站');
      loadCodes();
    } catch (error) {
      console.error('删除编码失败:', error);
      message.error('删除编码失败');
    }
  };

  // 批量删除编码
  const confirmBatchDeleteCodes = () => {
    if (selectedCodes.length === 0) {
      message.warning('请先选择要删除的编码');
      return;
    }
    
    confirm({
      title: `确定要删除这 ${selectedCodes.length} 个编码吗？`,
      icon: <ExclamationCircleOutlined />,
      content: '删除后可从回收站恢复。',
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          // 批量删除，分块处理
          const BATCH_SIZE = 50;
          for (let i = 0; i < selectedCodes.length; i += BATCH_SIZE) {
            const batch = selectedCodes.slice(i, i + BATCH_SIZE);
            await Promise.all(batch.map(codeId => codeAPI.deleteCode(id, codeId)));
          }
          message.success(`已将 ${selectedCodes.length} 个编码移入回收站`);
          setSelectedCodes([]);
          setCodeBatchMode(false);
          loadCodes();
        } catch (error) {
          console.error('批量删除编码失败:', error);
          message.error('批量删除编码失败');
        }
      }
    });
  };

  // 处理编码选择
  const handleCodeSelect = (codeId, checked) => {
    if (checked) {
      setSelectedCodes(prev => [...prev, codeId]);
    } else {
      setSelectedCodes(prev => prev.filter(id => id !== codeId));
    }
  };

  // 全选/取消全选编码
  const handleSelectAllCodes = (checked) => {
    if (checked) {
      setSelectedCodes(filteredCodes.map(code => code.id));
    } else {
      setSelectedCodes([]);
    }
  };

  // 切换编码批量模式
  const toggleCodeBatchMode = () => {
    setCodeBatchMode(!codeBatchMode);
    setSelectedCodes([]);
  };

  // 搜索编码
  const handleSearch = (value) => {
    setSearchText(value);
  };

  // 导出编码
  const handleExportCodes = () => {
    if (codes.length === 0) {
      message.warning('没有可导出的编码');
      return;
    }
    
    const success = ExportUtils.exportCodes(codes, product.name);
    if (success) {
      message.success('编码导出成功');
    } else {
      message.error('编码导出失败');
    }
  };

  // 智能提取编码（优先提取末尾数字）
  const extractCode = (value) => {
    if (!value) return '';
    
    // 1. 尝试匹配末尾的连续数字 (针对 "HTSM1/3SN69801" -> "69801" 场景)
    const endMatch = value.match(/(\d+)$/);
    if (endMatch) {
      return endMatch[1];
    }
    
    // 2. 如果没有末尾数字，回退到提取所有数字
    const numbers = value.replace(/\D/g, '');
    return numbers || value.trim();
  };

  const lastErrorRef = React.useRef({ code: '', time: 0 });

  // 处理扫码结果
  const handleScanResult = (result) => {
    // 智能提取有效编码
    const extractedResult = extractCode(result);
    
    if (!extractedResult) {
      message.warning('未能识别有效编码');
      return;
    }

    // 1. 检查本地已存在的编码（预检查）
    const isDuplicate = codes.some(c => c.code === extractedResult);
    if (isDuplicate) {
      const now = Date.now();
      // 如果同一个重复编码在 2 秒内再次被扫到，则忽略，不弹窗提示
      if (lastErrorRef.current.code === extractedResult && now - lastErrorRef.current.time < 2000) {
        return;
      }
      
      // 更新最后一次错误记录
      lastErrorRef.current = { code: extractedResult, time: now };
      message.error(`编码 "${extractedResult}" 已存在！`);
      // 可以在这里播放错误提示音
      return;
    }

    const initialValues = { code: extractedResult };
    handleAddCode(initialValues);
  };

  // 处理扫码枪删除提交
  const handleScanDeleteSubmit = async () => {
    const extractedResult = extractCode(scanDeleteCode);
    
    if (!extractedResult) {
      message.warning('请输入或扫入有效编码');
      return;
    }

    const targetCode = codes.find(c => c.code === extractedResult);

    if (!targetCode) {
      message.error(`编码 "${extractedResult}" 之前没有录入，无法删除！`);
      setScanDeleteFailedCodes(prev => {
        if (!prev.includes(extractedResult)) {
          return [...prev, extractedResult];
        }
        return prev;
      });
      setScanDeleteCode('');
      // 保持聚焦
      setTimeout(() => {
        if (scanDeleteInputRef.current) {
          scanDeleteInputRef.current.focus();
        }
      }, 100);
      return;
    }

    try {
      setScanDeleteLoading(true);
      await codeAPI.deleteCode(id, targetCode.id);
      message.success(`编码 "${extractedResult}" 已成功删除并移入回收站`);
      setScanDeleteSuccessCount(prev => prev + 1);
      loadCodes();
    } catch (error) {
      console.error('扫码枪删除失败:', error);
      message.error(`删除编码 "${extractedResult}" 失败`);
    } finally {
      setScanDeleteLoading(false);
      setScanDeleteCode('');
      // 保持聚焦
      setTimeout(() => {
        if (scanDeleteInputRef.current) {
          scanDeleteInputRef.current.focus();
        }
      }, 100);
    }
  };

  // 检查范围内缺失编码和超出范围的编码
  const checkCodeRangeStatus = () => {
    if (!product) {
      return { 
        hasMissing: false, 
        missingCodes: [], 
        hasExcess: false, 
        excessCodes: [] 
      };
    }
    
    // 获取所有的编码区间
    const ranges = [];
    if (product.codeRanges && product.codeRanges.length > 0) {
      ranges.push(...product.codeRanges);
    } else if (product.codeStart && product.codeEnd) {
      ranges.push({ start: product.codeStart, end: product.codeEnd });
    }
    
    if (ranges.length === 0) {
      return { 
        hasMissing: false, 
        missingCodes: [], 
        hasExcess: false, 
        excessCodes: [] 
      };
    }
    
    const existingCodes = codes.map(code => code.code);
    const existingCodesSet = new Set(existingCodes);
    
    const missingCodes = [];
    
    // 检查缺失的编码
    for (const range of ranges) {
      const start = parseInt(range.start);
      const end = parseInt(range.end);
      
      // 检查原字符串是否包含前导零
      const startStr = String(range.start).trim();
      const endStr = String(range.end).trim();
      const hasLeadingZero = startStr.startsWith('0') || endStr.startsWith('0');
      
      const width = Math.max(
        startStr.length, 
        endStr.length
      );
      
      if (!isNaN(start) && !isNaN(end) && start <= end) {
        // 防止超大范围导致页面卡死：放宽限制，以时间为主
        const MAX_ITERATIONS = 5000000; // 调高到 500万 次
        const MAX_TIME_MS = 800; // 调高到 800ms
        const startTime = Date.now();
        let iterations = 0;

        for (let i = start; i <= end; i++) {
          iterations++;
          
          // 每 10000 次检查一次时间，减少 Date.now() 调用开销
          if (iterations % 10000 === 0) {
            if (Date.now() - startTime > MAX_TIME_MS) {
              console.warn(`[ProductDetail] Range checking stopped due to timeout (${MAX_TIME_MS}ms). iterations: ${iterations}`);
              break;
            }
          }
          
          if (iterations > MAX_ITERATIONS) {
            console.warn(`[ProductDetail] Range checking stopped due to max iterations (${MAX_ITERATIONS}).`);
            break;
          }

          let expected = i.toString();
          
          // 如果起始值和结束值长度相同，则严格按照该长度补零（例如 1-100 不补，001-100 补零到3位）
          if (startStr.length === endStr.length) {
            expected = expected.padStart(startStr.length, '0');
          } else if (hasLeadingZero) {
            // 如果长度不同，但存在明确的前导零，按照最大宽度补零
            expected = expected.padStart(width, '0');
          }
          
          if (!existingCodesSet.has(expected)) {
            missingCodes.push(expected);
          }
        }
      }
    }
    
    // 检查超出范围的编码
    const excessCodes = [];
    existingCodes.forEach(code => {
      const str = String(code).trim();
      const codeNum = parseInt(str);
      
      let inAnyRange = false;
      let formatOk = false;
      
      for (const range of ranges) {
        const start = parseInt(range.start);
        const end = parseInt(range.end);
        
        const startStr = String(range.start).trim();
        const endStr = String(range.end).trim();
        const hasLeadingZero = startStr.startsWith('0') || endStr.startsWith('0');
        
        const width = Math.max(
          startStr.length, 
          endStr.length
        );
        
        if (!isNaN(start) && !isNaN(end) && start <= end) {
          const inRange = !isNaN(codeNum) && codeNum >= start && codeNum <= end;
          
          let currentFormatOk = true;
          // 只有在明确需要固定长度时，才检查格式
          if (startStr.length === endStr.length) {
            // 如果起止长度相同，说明是固定宽度，比如 100-200，那么输入的码必须也是3位
            currentFormatOk = str.length === startStr.length;
          } else if (hasLeadingZero) {
            // 如果有前导零，比如 01-100，则要求输入码的长度必须等于最大宽度
            currentFormatOk = str.length === width;
          } else {
            // 如果没有前导零（例如 1-100），那么输入的码也不应该有前导零（除非它本身就是数字0）
            if (str.length > 1 && str.startsWith('0')) {
              currentFormatOk = false;
            }
          }
          
          if (inRange && currentFormatOk) {
            inAnyRange = true;
            formatOk = true;
            break;
          }
        }
      }
      
      if (!inAnyRange || !formatOk) {
        excessCodes.push(code);
      } 
    });
    
    return { 
      hasMissing: missingCodes.length > 0,
      missingCodes,
      hasExcess: excessCodes.length > 0,
      excessCodes
    };
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin size="large" />
        <p>加载产品详情...</p>
      </div>
    );
  }

  if (!product) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Empty description="产品不存在" />
        <Button type="primary" onClick={() => navigate('/products')}>
          返回产品列表
        </Button>
      </div>
    );
  }

  const { hasMissing, missingCodes, hasExcess, excessCodes } = checkCodeRangeStatus();
  const codeCount = codes.length;
  const requiredQuantity = product.requiredQuantity || 0;
  const completionRate = requiredQuantity > 0 
    ? Math.min(100, Math.round((codeCount / requiredQuantity) * 100)) 
    : 100;

  // 模态框逻辑
  const sortedModalList = [...codesModalList].sort((a, b) => {
    return modalSortOrder === 'asc' 
      ? String(a).localeCompare(String(b), undefined, { numeric: true })
      : String(b).localeCompare(String(a), undefined, { numeric: true });
  });

  const paginatedModalList = sortedModalList.slice(
    (modalCurrentPage - 1) * modalPageSize,
    modalCurrentPage * modalPageSize
  );

  const handleModalSelectAll = (e) => {
    if (e.target.checked) {
      setModalSelectedCodes(sortedModalList);
    } else {
      setModalSelectedCodes([]);
    }
  };

  const handleModalCodeSelect = (codeStr, checked) => {
    if (checked) {
      setModalSelectedCodes(prev => [...prev, codeStr]);
    } else {
      setModalSelectedCodes(prev => prev.filter(c => c !== codeStr));
    }
  };

  const handleModalSingleAction = async (codeStr) => {
    try {
      setModalActionLoading(true);
      if (modalType === 'missing') {
        await codeAPI.addCode(id, { code: codeStr });
        message.success(`已添加缺失编码: ${codeStr}`);
      } else {
        const targetCode = codes.find(c => c.code === codeStr);
        if (!targetCode) {
          message.error('找不到该编码的记录');
          return;
        }
        await codeAPI.deleteCode(id, targetCode.id);
        message.success(`已删除超出编码: ${codeStr}`);
      }
      
      // Remove from modal list and selected
      setCodesModalList(prev => prev.filter(c => c !== codeStr));
      setModalSelectedCodes(prev => prev.filter(c => c !== codeStr));
      
      // Update main list silently
      loadCodes();
    } catch (error) {
      message.error(`${modalType === 'missing' ? '添加' : '删除'}失败: ${error.message || '未知错误'}`);
    } finally {
      setModalActionLoading(false);
    }
  };

  const handleModalBatchAction = async () => {
    if (modalSelectedCodes.length === 0) return;
    let hasError = false;
    try {
      setModalActionLoading(true);
      
      const BATCH_SIZE = 50;
      
      if (modalType === 'missing') {
        let successCount = 0;
        for (let i = 0; i < modalSelectedCodes.length; i += BATCH_SIZE) {
          const batch = modalSelectedCodes.slice(i, i + BATCH_SIZE);
          try {
            await Promise.all(batch.map(codeStr => codeAPI.addCode(id, { code: codeStr })));
            successCount += batch.length;
          } catch (err) {
            console.error('Batch add error:', err);
            hasError = true;
            break; // Stop further batches on error
          }
        }
        if (successCount > 0) message.success(`成功批量添加 ${successCount} 个缺失编码`);
        if (hasError) message.error('部分编码添加失败，已中断操作');
      } else {
        const idsToDelete = modalSelectedCodes.map(codeStr => {
          const target = codes.find(c => c.code === codeStr);
          return target ? target.id : null;
        }).filter(codeId => codeId !== null);
        
        if (idsToDelete.length > 0) {
          let successCount = 0;
          for (let i = 0; i < idsToDelete.length; i += BATCH_SIZE) {
            const batch = idsToDelete.slice(i, i + BATCH_SIZE);
            try {
              await Promise.all(batch.map(codeId => codeAPI.deleteCode(id, codeId)));
              successCount += batch.length;
            } catch (err) {
              console.error('Batch delete error:', err);
              hasError = true;
              break;
            }
          }
          if (successCount > 0) message.success(`成功批量删除 ${successCount} 个超出编码`);
          if (hasError) message.error('部分编码删除失败，已中断操作');
        } else {
          message.error('未找到对应编码记录');
          return;
        }
      }
      
    } catch (error) {
      message.error(`批量操作出现异常: ${error.message || '未知错误'}`);
    } finally {
      // 无论成功还是部分失败，都清理状态并刷新列表
      setCodesModalList(prev => prev.filter(c => !modalSelectedCodes.includes(c)));
      setModalSelectedCodes([]);
      setModalCurrentPage(1);
      
      // Update main list silently
      loadCodes();
      
      setModalActionLoading(false);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Button 
          icon={<ArrowLeftOutlined />} 
          onClick={() => navigate('/products')}
        >
          返回产品列表
        </Button>
      </div>
      
      <Card style={{ marginBottom: 16 }}>
        <Title level={2}>{product.name}</Title>
        
        <Descriptions bordered column={{ xs: 1, sm: 2, md: 3 }}>
          <Descriptions.Item label="产品描述">{product.description || '暂无描述'}</Descriptions.Item>
          <Descriptions.Item label="产品分类">{product.category || '未分类'}</Descriptions.Item>
          <Descriptions.Item label="创建时间">{new Date(product.createdAt).toLocaleString()}</Descriptions.Item>
          <Descriptions.Item label="需求数量">{requiredQuantity}</Descriptions.Item>
          <Descriptions.Item label="已录入编码">{codeCount}</Descriptions.Item>
          <Descriptions.Item label="完成率">
            <Progress 
              percent={completionRate} 
              size="small" 
              status={completionRate < 100 ? "active" : "success"}
            />
          </Descriptions.Item>
          {((product.codeRanges && product.codeRanges.length > 0) || (product.codeStart && product.codeEnd)) && (
            <Descriptions.Item label="编码范围" span={3}>
              {product.codeRanges && product.codeRanges.length > 0 
                ? product.codeRanges.map(r => `${r.start} - ${r.end}`).join(', ') 
                : `${product.codeStart} - ${product.codeEnd}`}
              {hasMissing && (
                <Tooltip 
                  title={
                    <div>
                      缺失编码: 
                      {missingCodes.length > 20 
                        ? `${missingCodes.slice(0, 20).join(', ')}... 等${missingCodes.length}个` 
                        : missingCodes.join(', ')
                      }
                    </div>
                  }
                >
                  <Tag color="red" style={{ marginLeft: 8, cursor: 'pointer' }} onClick={() => { 
                    setCodesModalTitle(`${product.name} - 缺失编码`); 
                    setCodesModalList(missingCodes); 
                    setModalType('missing');
                    setModalSortOrder('asc');
                    setModalSelectedCodes([]);
                    setModalCurrentPage(1);
                    setCodesModalVisible(true); 
                  }}>
                    缺失 {missingCodes.length} 个编码
                  </Tag>
                </Tooltip>
              )}
              {hasExcess && (
                <Tooltip 
                  title={
                    <div>
                      超出范围编码: 
                      {excessCodes.length > 20 
                        ? `${excessCodes.slice(0, 20).join(', ')}... 等${excessCodes.length}个` 
                        : excessCodes.join(', ')
                      }
                    </div>
                  }
                >
                  <Tag color="orange" style={{ marginLeft: 8, cursor: 'pointer' }} onClick={() => { 
                    setCodesModalTitle(`${product.name} - 超出范围编码`); 
                    setCodesModalList(excessCodes); 
                    setModalType('excess');
                    setModalSortOrder('asc');
                    setModalSelectedCodes([]);
                    setModalCurrentPage(1);
                    setCodesModalVisible(true); 
                  }}>
                    超出 {excessCodes.length} 个编码
                  </Tag>
                </Tooltip>
              )}
            </Descriptions.Item>
          )}
        </Descriptions>
      </Card>
      
      <Card
        title="编码管理"
        extra={
          <Space>
            {codeBatchMode ? (
              <>
                <Button 
                  icon={<CloseOutlined />} 
                  onClick={toggleCodeBatchMode}
                >
                  取消批量
                </Button>
                <Button 
                  type="primary" 
                  danger
                  icon={<DeleteOutlined />} 
                  onClick={confirmBatchDeleteCodes}
                  disabled={selectedCodes.length === 0}
                >
                  删除选中 ({selectedCodes.length})
                </Button>
              </>
            ) : (
              <>
                 <Button 
                  icon={<RestOutlined />} 
                  onClick={handleOpenRecycleBin}
                >
                  回收站
                </Button>
                <Button 
                  icon={<DownloadOutlined />} 
                  onClick={handleExportCodes}
                  disabled={codes.length === 0}
                >
                  导出编码
                </Button>
                <Button 
                  icon={<CheckOutlined />} 
                  onClick={toggleCodeBatchMode}
                  disabled={filteredCodes.length === 0}
                >
                  批量选择
                </Button>
                <Button 
                  icon={<QrcodeOutlined />} 
                  onClick={() => setScanDeleteModalVisible(true)}
                  danger
                >
                  扫码删除
                </Button>
                <Button 
                  icon={<QrcodeOutlined />} 
                  onClick={() => setScanModalVisible(true)}
                >
                  扫码添加
                </Button>
                <Button 
                  type="primary" 
                  icon={<PlusOutlined />} 
                  onClick={() => setAddModalVisible(true)}
                >
                  添加编码
                </Button>
              </>
            )}
          </Space>
        }
      >
        {/* 快速编码输入区域 */}
        <QuickCodeInput 
          onSubmit={handleQuickAddCode}
          loading={quickInputLoading}
          existingCodes={codes}
          onDuplicate={handleDuplicateCode}
        />
        <Divider style={{ margin: '0 0 16px 0' }} />
        
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {codeBatchMode && (
              <Checkbox
                indeterminate={selectedCodes.length > 0 && selectedCodes.length < filteredCodes.length}
                onChange={(e) => handleSelectAllCodes(e.target.checked)}
                checked={selectedCodes.length === filteredCodes.length && filteredCodes.length > 0}
              >
                全选 ({selectedCodes.length}/{filteredCodes.length})
              </Checkbox>
            )}
            
            <Search
              placeholder="搜索编码..."
              allowClear
              enterButton={<SearchOutlined />}
              onSearch={handleSearch}
              style={{ width: 300 }}
            />
            
            <Select
              defaultValue="timeDesc"
              style={{ width: 160 }}
              onChange={setSortOrder}
              options={[
                { value: 'timeDesc', label: '时间 (最新在前)' },
                { value: 'timeAsc', label: '时间 (最早在前)' },
                { value: 'codeAsc', label: '编码 (从小到大)' },
                { value: 'codeDesc', label: '编码 (从大到小)' },
              ]}
            />
          </div>
        </div>
        
        <CodeList 
          codes={filteredCodes}
          onDelete={handleDeleteCode}
          batchMode={codeBatchMode}
          selectedCodes={selectedCodes}
          onSelect={handleCodeSelect}
        />
      </Card>
      
      {/* 添加编码表单 */}
      <Modal
        title="添加编码"
        open={addModalVisible}
        onCancel={() => setAddModalVisible(false)}
        footer={null}
      >
        <CodeForm 
          onFinish={handleAddCode}
          onCancel={() => setAddModalVisible(false)}
          loading={formLoading}
        />
      </Modal>
      
      <Modal
        title={codesModalTitle}
        open={codesModalVisible}
        onCancel={() => setCodesModalVisible(false)}
        footer={null}
        width={700}
      >
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Space>
            <Checkbox 
              onChange={handleModalSelectAll} 
              checked={modalSelectedCodes.length === sortedModalList.length && sortedModalList.length > 0}
              indeterminate={modalSelectedCodes.length > 0 && modalSelectedCodes.length < sortedModalList.length}
            >
              全选
            </Checkbox>
            <Select 
              value={modalSortOrder} 
              onChange={setModalSortOrder} 
              style={{ width: 120 }}
              options={[
                { value: 'asc', label: '升序排列' },
                { value: 'desc', label: '降序排列' }
              ]}
            />
          </Space>
          <Button 
            type="primary" 
            danger={modalType === 'excess'}
            disabled={modalSelectedCodes.length === 0}
            loading={modalActionLoading}
            onClick={handleModalBatchAction}
          >
            {modalType === 'missing' ? `批量添加 (${modalSelectedCodes.length})` : `批量删除 (${modalSelectedCodes.length})`}
          </Button>
        </div>

        <Spin spinning={modalActionLoading}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, maxHeight: '400px', overflowY: 'auto', padding: '4px' }}>
            {paginatedModalList && paginatedModalList.length > 0 ? (
              paginatedModalList.map((c) => (
                <div key={c} style={{ 
                  padding: '6px 8px', 
                  background: '#fafafa', 
                  borderRadius: 4, 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  border: '1px solid #f0f0f0'
                }}>
                  <Checkbox 
                    checked={modalSelectedCodes.includes(c)}
                    onChange={(e) => handleModalCodeSelect(c, e.target.checked)}
                  >
                    <span style={{ marginLeft: 4 }}>{c}</span>
                  </Checkbox>
                  <Tooltip title={modalType === 'missing' ? '添加此编码' : '删除此编码'}>
                    <Button 
                      type="text" 
                      size="small" 
                      icon={modalType === 'missing' ? <PlusOutlined /> : <DeleteOutlined />} 
                      onClick={() => handleModalSingleAction(c)}
                      danger={modalType === 'excess'}
                      style={{ padding: '0 4px', height: '20px' }}
                    />
                  </Tooltip>
                </div>
              ))
            ) : (
              <div style={{ gridColumn: 'span 4', color: '#999', textAlign: 'center', padding: '20px' }}>
                <Empty description="暂无数据" image={Empty.PRESENTED_IMAGE_SIMPLE} />
              </div>
            )}
          </div>
          {sortedModalList.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <Pagination
                current={modalCurrentPage}
                pageSize={modalPageSize}
                total={sortedModalList.length}
                onChange={(page) => setModalCurrentPage(page)}
                showSizeChanger={false}
                size="small"
                className="full-width-pagination"
              />
            </div>
          )}
        </Spin>
      </Modal>
      
      {/* 扫码对话框 */}
      <ScannerModal 
        visible={scanModalVisible}
        onCancel={() => setScanModalVisible(false)}
        onScan={handleScanResult}
        continuous
      />

      {/* 扫码枪删除对话框 */}
      <Modal
        title="扫码枪删除编码"
        open={scanDeleteModalVisible}
        onCancel={() => {
          setScanDeleteModalVisible(false);
          setScanDeleteCode('');
          setScanDeleteSuccessCount(0);
          setScanDeleteFailedCodes([]);
        }}
        footer={null}
        width={500}
      >
        <div style={{ padding: '20px 0', textAlign: 'center' }}>
          <Input
            ref={scanDeleteInputRef}
            placeholder="请使用扫码枪扫描..."
            value={scanDeleteCode}
            onChange={(e) => setScanDeleteCode(e.target.value)}
            onPressEnter={handleScanDeleteSubmit}
            disabled={scanDeleteLoading}
            autoFocus
            size="large"
            prefix={<QrcodeOutlined style={{ color: '#1890ff' }} />}
            autoComplete="off"
          />
          {scanDeleteLoading && (
            <div style={{ marginTop: 16 }}>
              <Spin /> <span style={{ marginLeft: 8 }}>正在删除...</span>
            </div>
          )}
          
          <div style={{ marginTop: 24, textAlign: 'left' }}>
            <div style={{ marginBottom: 8 }}>
              <strong>已成功删除：</strong> <span style={{ color: '#52c41a', fontWeight: 'bold' }}>{scanDeleteSuccessCount}</span> 个编码
            </div>
            {scanDeleteFailedCodes.length > 0 && (
              <div>
                <div style={{ marginBottom: 8, color: '#f5222d' }}>
                  <strong>以下编码因为没有录入，无法删除 ({scanDeleteFailedCodes.length} 个)：</strong>
                </div>
                <div style={{ 
                  maxHeight: '150px', 
                  overflowY: 'auto', 
                  padding: '8px', 
                  background: '#fafafa', 
                  border: '1px solid #f0f0f0',
                  borderRadius: '4px',
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '8px'
                }}>
                  {scanDeleteFailedCodes.map(code => (
                    <Tag key={code} color="error" style={{ margin: 0 }}>
                      {code}
                    </Tag>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </Modal>

      {/* 回收站对话框 */}
      <RecycleBinModal
        visible={recycleBinVisible}
        onCancel={() => setRecycleBinVisible(false)}
        codes={deletedCodes}
        onRestore={handleRestoreCode}
        onPermanentDelete={handlePermanentDeleteCode}
        onBatchRestore={handleBatchRestoreCodes}
        onBatchPermanentDelete={handleBatchPermanentDeleteCodes}
        loading={recycleLoading}
      />
    </div>
  );
};

export default ProductDetail;
