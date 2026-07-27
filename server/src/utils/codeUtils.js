/**
 * 编码工具函数
 */

/**
 * 从编码中提取末尾数字，用于范围计算和排序比较
 * "文版-123" → 123
 * "HTSM1/3SN69801" → 69801
 * "123" → 123
 * "ABC" → NaN
 * @param {string} code 编码字符串
 * @returns {number} 提取的数字，无数字时返回 NaN
 */
const extractNumericValue = (code) => {
  if (!code) return NaN;
  const match = String(code).match(/(\d+)$/);
  return match ? parseInt(match[1], 10) : NaN;
};

/**
 * 从编码中提取末尾数字字符串（保留前导零）
 * "文版-00123" → "00123"
 * "123" → "123"
 * "ABC" → ""
 * @param {string} code 编码字符串
 * @returns {string} 提取的数字字符串
 */
const extractNumericString = (code) => {
  if (!code) return '';
  const match = String(code).match(/(\d+)$/);
  return match ? match[1] : '';
};

module.exports = { extractNumericValue, extractNumericString };
