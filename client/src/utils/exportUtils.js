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
  }
};

export default ExportUtils;