// 快工单开放接口代理（只读，供前端获取商品名称来源）
// 通过「快工单工序细化管理系统」的 /api/report-data/* 转发，凭证 X-API-Key 由本服务端持有，不暴露给浏览器
const axios = require('axios');

const KGD_BASE_URL = process.env.KGD_API_BASE_URL || 'http://localhost:3001';
const KGD_API_KEY = process.env.KGD_API_KEY || '';

/**
 * 拉取快工单商品列表（keyword 透传 goods_keyword，空则返回全部）
 */
async function fetchGoods(keyword) {
  const url = `${KGD_BASE_URL}/api/report-data/goods`;
  const response = await axios.get(url, {
    params: keyword ? { keyword } : {},
    headers: { 'X-API-Key': KGD_API_KEY },
    timeout: 30000
  });
  const data = response.data;
  // 兼容主系统不同版本的返回结构：数组 / { list } / { data }
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.list)) return data.list;
  if (data && Array.isArray(data.data)) return data.data;
  // 主系统返回了异常体（非数组），抛带明细的错误，避免误报“list.filter is not a function”
  const detail = data?.error || data?.message || JSON.stringify(data).slice(0, 200);
  throw new Error(`主系统返回异常数据: ${detail}`);
}

/**
 * 商品列表代理：GET /api/kgd/goods?keyword=xxx
 * 转发到快工单系统 /api/report-data/goods。
 * 快工单已升级：读本地缓存（毫秒级）+ keyword 支持名称/编号/规格/扩展字段（HT图号）过滤，
 * 这里无需再做本地补滤，直接透传关键字并限制返回条数。
 */
exports.getGoods = async (req, res) => {
  try {
    if (!KGD_API_KEY) {
      return res.status(500).json({ error: '服务器未配置快工单 API Key，请在 .env 中设置 KGD_API_KEY' });
    }

    const keyword = (req.query.keyword || '').trim();

    const list = await fetchGoods(keyword);

    // 限制返回条数，避免宽泛关键字返回上千条导致网络传输与前端渲染卡顿
    const MAX_RESULTS = 200;
    res.json(list.slice(0, MAX_RESULTS));
  } catch (error) {
    console.error('获取快工单商品列表失败:', error.response?.data || error.message);
    res.status(502).json({
      error: '获取快工单商品列表失败',
      detail: error.response?.data?.error || error.message
    });
  }
};

/**
 * 加工单数量代理：GET /api/kgd/bill-num?goodsName=xxx
 * 转发到快工单系统 /api/report-data/produce-bills（goods_keyword 模糊查询），
 * 本地再按商品名精确匹配，返回该商品的加工单列表（含计划数 num 与创建时间），
 * 供前端选择商品后按最新订单自动填写需求数量。
 */
exports.getBillNum = async (req, res) => {
  try {
    if (!KGD_API_KEY) {
      return res.status(500).json({ error: '服务器未配置快工单 API Key，请在 .env 中设置 KGD_API_KEY' });
    }

    const goodsName = (req.query.goodsName || '').trim();
    if (!goodsName) {
      return res.status(400).json({ error: '缺少 goodsName 参数' });
    }

    const url = `${KGD_BASE_URL}/api/report-data/produce-bills`;
    const response = await axios.get(url, {
      params: { goods_keyword: goodsName },
      headers: { 'X-API-Key': KGD_API_KEY },
      timeout: 30000
    });

    const payload = response.data;
    // 兼容主系统不同版本的返回结构：数组 / { list } / { success, data: { list, count } }
    let rawList = [];
    if (Array.isArray(payload)) {
      rawList = payload;
    } else if (Array.isArray(payload?.list)) {
      rawList = payload.list;
    } else if (Array.isArray(payload?.data?.list)) {
      rawList = payload.data.list;
    } else if (Array.isArray(payload?.data)) {
      rawList = payload.data;
    }
    // goods_keyword 为模糊查询，这里按完整商品名精确匹配
    const bills = rawList
      .filter((b) => (b.goods?.name ?? '') === goodsName)
      .map((b) => ({
        code: b.code ?? '',
        num: b.num ?? '0',
        status: b.status ?? null,
        statusName: b.status_name ?? '',
        createdAt: b.created_at ?? null,
      }));

    res.json(bills);
  } catch (error) {
    console.error('获取加工单数量失败:', error.response?.data || error.message);
    res.status(502).json({
      error: '获取加工单数量失败',
      detail: error.response?.data?.error || error.message
    });
  }
};
