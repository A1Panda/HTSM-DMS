import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

/**
 * 导出工具类
 */
const ExportUtils = {
  /**
   * 导出数据到Excel文件
   * @param {Array} data 要导出的数据数组
   * @param {Object} options 导出选项
   * @param {string} options.fileName 文件名
   * @param {string} options.sheetName 工作表名
   * @param {Object} options.headers 自定义表头 {key: '显示名'}
   * @returns {void}
   */
  exportToExcel: (data, options = {}) => {
    try {
      const {
        fileName = `导出数据_${new Date().toISOString().split('T')[0]}`,
        sheetName = '数据',
        headers = null
      } = options;

      // 如果提供了自定义表头，转换数据
      let exportData = data;
      if (headers) {
        exportData = data.map(item => {
          const newItem = {};
          Object.keys(headers).forEach(key => {
            if (item[key] !== undefined) {
              newItem[headers[key]] = item[key];
            }
          });
          return newItem;
        });
      }

      // 创建工作簿
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(exportData);
      
      // 添加工作表到工作簿
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
      
      // 生成Excel文件并下载
      const fullFileName = fileName.endsWith('.xlsx') ? fileName : `${fileName}.xlsx`;
      const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      
      const blob = new Blob([wbout], { type: 'application/octet-stream' });
      saveAs(blob, fullFileName);
      
      return true;
    } catch (error) {
      console.error('导出Excel失败:', error);
      return false;
    }
  },

  /**
   * 导出编码数据到Excel
   * @param {Array} codes 编码数据
   * @param {string} productName 产品名称
   * @returns {boolean} 是否成功
   */
  exportCodes: (codes, productName) => {
    // 准备导出数据
    const exportData = codes.map(code => ({
      '编码': code.code,
      '描述': code.description || '',
      '日期': code.date || '',
      '创建时间': new Date(code.createdAt).toLocaleString()
    }));
    
    return ExportUtils.exportToExcel(exportData, {
      fileName: `${productName}_编码列表_${new Date().toISOString().split('T')[0]}`,
      sheetName: '编码列表'
    });
  },

  /**
   * 导出多Sheet页数据到Excel文件
   * @param {Array} sheetsData 要导出的Sheet数据数组 [{sheetName: 'xxx', data: []}]
   * @param {Object} options 导出选项
   * @returns {boolean} 是否成功
   */
  exportToExcelMultipleSheets: (sheetsData, options = {}) => {
    try {
      const {
        fileName = `导出数据_${new Date().toISOString().split('T')[0]}`
      } = options;

      const wb = XLSX.utils.book_new();

      sheetsData.forEach(({ sheetName, data }) => {
        const ws = XLSX.utils.json_to_sheet(data);
        XLSX.utils.book_append_sheet(wb, ws, sheetName);
      });

      const fullFileName = fileName.endsWith('.xlsx') ? fileName : `${fileName}.xlsx`;
      const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });

      const blob = new Blob([wbout], { type: 'application/octet-stream' });
      saveAs(blob, fullFileName);

      return true;
    } catch (error) {
      console.error('导出多Sheet Excel失败:', error);
      return false;
    }
  },

  /**
   * 智能导出编码：按创建日期分组导出到不同Sheet页
   * @param {Array} codes 编码数据
   * @param {string} productName 产品名称
   * @returns {boolean} 是否成功
   */
  exportCodesSmart: (codes, productName) => {
    // 按照创建日期(YYYY-MM-DD)分组
    const groups = {};
    codes.forEach(code => {
      let dateKey = '未分类';
      if (code.createdAt) {
        const dateObj = new Date(code.createdAt);
        if (!isNaN(dateObj.getTime())) {
          // 使用本地时区提取 YYYY-MM-DD
          const year = dateObj.getFullYear();
          const month = String(dateObj.getMonth() + 1).padStart(2, '0');
          const day = String(dateObj.getDate()).padStart(2, '0');
          dateKey = `${year}-${month}-${day}`;
        }
      } else if (code.date) {
        dateKey = code.date;
      }
      
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(code);
    });

    const sheetsData = Object.keys(groups).map(dateKey => {
      const groupCodes = groups[dateKey];
      const exportData = groupCodes.map(code => ({
        '编码': code.code,
        '描述': code.description || '',
        '录入日期': code.date || '',
        '创建时间': code.createdAt ? new Date(code.createdAt).toLocaleString() : ''
      }));
      
      // Excel sheet名称长度不能超过31个字符，也不能包含特殊字符
      const validSheetName = dateKey.substring(0, 31).replace(/[\\/*?:\[\]]/g, '_');

      return {
        sheetName: validSheetName,
        data: exportData
      };
    });

    return ExportUtils.exportToExcelMultipleSheets(sheetsData, {
      fileName: `${productName}_智能导出编码_${new Date().toISOString().split('T')[0]}`
    });
  },

  /**
   * 导出指定数量的最新编码
   * @param {Array} codes 编码数据
   * @param {string} productName 产品名称
   * @param {number} quantity 导出的数量
   * @returns {boolean} 是否成功
   */
  exportCodesByQuantity: (codes, productName, quantity) => {
    // 按创建时间降序排序（最新的在前）
    const sortedCodes = [...codes].sort((a, b) => {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    // 截取指定数量
    const targetCodes = sortedCodes.slice(0, quantity);

    // 调用原有的单sheet导出
    return ExportUtils.exportCodes(targetCodes, productName);
  },

  /**
   * 仅导出编码的数字部分（去掉前面的文本）
   * @param {Array} codes 编码数据
   * @param {string} productName 产品名称
   * @param {string} mode 导出模式 'smart' | 'quantity' | 'all'
   * @param {number} quantity 当 mode='quantity' 时的导出数量
   * @returns {boolean} 是否成功
   */
  exportCodesNumericOnly: (codes, productName, mode = 'all', quantity = null) => {
    // 从编码中提取末尾数字字符串
    const extractNumeric = (code) => {
      if (!code) return '';
      const match = String(code).match(/(\d+)$/);
      return match ? match[1] : code;
    };

    // 转换编码数据，仅保留数字部分
    const mapToNumericOnly = (codeList) => codeList.map(code => ({
      '编码': extractNumeric(code.code),
      '描述': code.description || '',
      '日期': code.date || '',
      '创建时间': new Date(code.createdAt).toLocaleString()
    }));

    const today = new Date().toISOString().split('T')[0];
    const baseFileName = `${productName}_仅数字编码`;

    if (mode === 'smart') {
      // 按日期分组导出多Sheet
      const groups = {};
      codes.forEach(code => {
        let dateKey = '未分类';
        if (code.createdAt) {
          const dateObj = new Date(code.createdAt);
          if (!isNaN(dateObj.getTime())) {
            const year = dateObj.getFullYear();
            const month = String(dateObj.getMonth() + 1).padStart(2, '0');
            const day = String(dateObj.getDate()).padStart(2, '0');
            dateKey = `${year}-${month}-${day}`;
          }
        } else if (code.date) {
          dateKey = code.date;
        }
        if (!groups[dateKey]) groups[dateKey] = [];
        groups[dateKey].push(code);
      });

      const sheetsData = Object.keys(groups).map(dateKey => ({
        sheetName: dateKey.substring(0, 31).replace(/[\\/*?:\[\]]/g, '_'),
        data: mapToNumericOnly(groups[dateKey])
      }));

      return ExportUtils.exportToExcelMultipleSheets(sheetsData, {
        fileName: `${baseFileName}_智能_${today}`
      });
    }

    if (mode === 'quantity') {
      const sortedCodes = [...codes].sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      const targetCodes = sortedCodes.slice(0, Math.min(quantity, codes.length));
      return ExportUtils.exportToExcel(mapToNumericOnly(targetCodes), {
        fileName: `${baseFileName}_${targetCodes.length}条_${today}`,
        sheetName: '编码列表'
      });
    }

    // mode === 'all'
    return ExportUtils.exportToExcel(mapToNumericOnly(codes), {
      fileName: `${baseFileName}_${today}`,
      sheetName: '编码列表'
    });
  }
};

export default ExportUtils;