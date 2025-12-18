import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Row, Col, Card, Spin, Alert, Typography, Divider, Button, Empty } from 'antd';
import { 
  AppstoreOutlined, 
  BarcodeOutlined, 
  ClockCircleOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import { Link } from 'react-router-dom';
import { Line, Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { statsAPI, productAPI, codeAPI } from '../services/api';
import StatCard from '../components/StatCard';
import QualityPanel from '../components/QualityPanel';
import ActivityStream from '../components/ActivityStream';

// 注册Chart.js组件（移到组件外部避免重复注册）
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const { Title: TitleText } = Typography;

// 图表颜色配置常量
const CHART_COLORS = {
  pie: [
    'rgba(255, 99, 132, 0.6)',
    'rgba(54, 162, 235, 0.6)',
    'rgba(255, 206, 86, 0.6)',
    'rgba(75, 192, 192, 0.6)',
    'rgba(153, 102, 255, 0.6)',
    'rgba(255, 159, 64, 0.6)',
  ],
  line: {
    product: { border: 'rgb(255, 99, 132)', background: 'rgba(255, 99, 132, 0.5)' },
    code: { border: 'rgb(53, 162, 235)', background: 'rgba(53, 162, 235, 0.5)' },
  },
};

// 刷新间隔（毫秒）
const REFRESH_INTERVAL = 60000;

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalCodes: 0,
    recentActivity: 0
  });
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [categoryData, setCategoryData] = useState({
    labels: [],
    datasets: []
  });
  const [activityData, setActivityData] = useState({
    labels: [],
    datasets: []
  });
  const [qualityStats, setQualityStats] = useState(null);
  const [recentActivity, setRecentActivity] = useState(null);
  const [qualityLoading, setQualityLoading] = useState(true);
  const [activityLoading, setActivityLoading] = useState(true);

  // 处理产品分类数据（使用useCallback优化）
  const processProductCategories = useCallback((productsData) => {
    // 按分类统计产品数量
    const categories = {};
    productsData.forEach(product => {
      const category = product.category || '未分类';
      categories[category] = (categories[category] || 0) + 1;
    });
    
    // 准备图表数据
    const labels = Object.keys(categories);
    const data = Object.values(categories);
    
    setCategoryData({
      labels,
      datasets: [
        {
          label: '产品数量',
          data,
          backgroundColor: CHART_COLORS.pie,
          borderWidth: 1,
        },
      ],
    });
  }, []);

  // 加载统计数据
  const fetchStats = useCallback(async () => {
    try {
      const response = await statsAPI.getStats();
      setStats(response.data);
      setError(null);
      return response.data;
    } catch (err) {
      console.error('获取统计数据失败:', err);
      setError('获取统计数据失败，请稍后再试');
      throw err;
    }
  }, []);

  // 加载产品数据
  const fetchProducts = useCallback(async () => {
    try {
      const response = await productAPI.getAllProducts();
      setProducts(response.data);
      processProductCategories(response.data);
      return response.data;
    } catch (err) {
      console.error('获取产品数据失败:', err);
      throw err;
    }
  }, [processProductCategories]);

  // 加载活动数据
  const fetchActivityData = useCallback(async () => {
    try {
      const response = await statsAPI.getActivityData();
      const activityData = response.data;
      
      // 提取日期标签和数据
      const dates = activityData.map(item => {
        const date = new Date(item.date);
        return `${date.getMonth() + 1}-${date.getDate()}`;
      });
      const productCounts = activityData.map(item => item.products);
      const codeCounts = activityData.map(item => item.codes);
      
      setActivityData({
        labels: dates,
        datasets: [
          {
            label: '新增产品',
            data: productCounts,
            borderColor: CHART_COLORS.line.product.border,
            backgroundColor: CHART_COLORS.line.product.background,
            tension: 0.1,
          },
          {
            label: '新增编码',
            data: codeCounts,
            borderColor: CHART_COLORS.line.code.border,
            backgroundColor: CHART_COLORS.line.code.background,
            tension: 0.1,
          },
        ],
      });
    } catch (err) {
      console.error('获取活动数据失败:', err);
      // 如果API失败，显示空数据
      setActivityData({
        labels: [],
        datasets: [
          {
            label: '新增产品',
            data: [],
            borderColor: CHART_COLORS.line.product.border,
            backgroundColor: CHART_COLORS.line.product.background,
            tension: 0.1,
          },
          {
            label: '新增编码',
            data: [],
            borderColor: CHART_COLORS.line.code.border,
            backgroundColor: CHART_COLORS.line.code.background,
            tension: 0.1,
          },
        ],
      });
    }
  }, []);

  // 获取数据质量统计
  const fetchQualityStats = useCallback(async () => {
    try {
      setQualityLoading(true);
      const response = await statsAPI.getQualityStats();
      setQualityStats(response.data);
    } catch (err) {
      console.error('获取数据质量统计失败:', err);
    } finally {
      setQualityLoading(false);
    }
  }, []);

  // 获取最近活动流
  const fetchRecentActivity = useCallback(async () => {
    try {
      setActivityLoading(true);
      const response = await statsAPI.getRecentActivity();
      setRecentActivity(response.data);
    } catch (err) {
      console.error('获取最近活动失败:', err);
    } finally {
      setActivityLoading(false);
    }
  }, []);

  // 并行加载所有数据（性能优化）
  const loadAllData = useCallback(async (isInitial = false) => {
    try {
      if (isInitial) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }
      setError(null);

      // 并行获取所有数据
      await Promise.allSettled([
        fetchStats(),
        fetchProducts(),
        fetchActivityData(),
        fetchQualityStats(),
        fetchRecentActivity(),
      ]);
    } catch (err) {
      console.error('加载数据失败:', err);
      if (!error) {
        setError('部分数据加载失败，请稍后刷新');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [fetchStats, fetchProducts, fetchActivityData, fetchQualityStats, fetchRecentActivity, error]);

  // 手动刷新
  const handleRefresh = useCallback(() => {
    loadAllData(false);
  }, [loadAllData]);

  // 初始加载和定时刷新
  useEffect(() => {
    loadAllData(true);
    
    // 定时刷新关键数据（不刷新全部，避免影响性能）
    const interval = setInterval(() => {
      Promise.allSettled([
        fetchStats(),
        fetchQualityStats(),
        fetchRecentActivity(),
      ]);
    }, REFRESH_INTERVAL);
    
    return () => clearInterval(interval);
  }, [loadAllData, fetchStats, fetchQualityStats, fetchRecentActivity]);

  // 使用useMemo优化图表配置
  const pieChartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const label = context.label || '';
            const value = context.parsed || 0;
            const total = context.dataset.data.reduce((a, b) => a + b, 0);
            const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
            return `${label}: ${value} (${percentage}%)`;
          },
        },
      },
    },
  }), []);

  const lineChartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          precision: 0,
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.05)',
        },
      },
      x: {
        grid: {
          display: false,
        },
      },
    },
    interaction: {
      intersect: false,
      mode: 'index',
    },
  }), []);

  // 初始加载状态
  if (loading && !stats.totalProducts) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 20px' }}>
        <Spin size="large" />
        <p style={{ marginTop: 16, color: '#666' }}>正在加载仪表盘数据...</p>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <TitleText level={2} style={{ margin: 0 }}>系统概览</TitleText>
        <Button
          icon={<ReloadOutlined />}
          onClick={handleRefresh}
          loading={refreshing}
          type="default"
        >
          刷新数据
        </Button>
      </div>
      
      {error && (
        <Alert
          message="数据加载错误"
          description={error}
          type="error"
          showIcon
          closable
          onClose={() => setError(null)}
          style={{ marginBottom: 24 }}
          action={
            <Button size="small" onClick={handleRefresh}>
              重试
            </Button>
          }
        />
      )}
      
      <Row gutter={16}>
        <Col xs={24} sm={8}>
          <StatCard
            title="总产品数"
            value={stats.totalProducts}
            icon={<AppstoreOutlined />}
            color="#3f8600"
          />
        </Col>
        <Col xs={24} sm={8}>
          <StatCard
            title="总编码数"
            value={stats.totalCodes}
            icon={<BarcodeOutlined />}
            color="#1890ff"
          />
        </Col>
        <Col xs={24} sm={8}>
          <StatCard
            title="今日活动"
            value={stats.recentActivity}
            icon={<ClockCircleOutlined />}
            color="#722ed1"
          />
        </Col>
      </Row>
      
      <Divider />
      
      <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
        <Col xs={24} md={12}>
          <Card 
            title="产品分类分布" 
            className="dashboard-card"
            extra={categoryData.labels.length > 0 && (
              <span style={{ fontSize: 12, color: '#999' }}>
                共 {categoryData.labels.length} 个分类
              </span>
            )}
          >
            {categoryData.labels.length > 0 ? (
              <div style={{ height: 300, position: 'relative' }}>
                <Pie data={categoryData} options={pieChartOptions} />
              </div>
            ) : (
              <Empty 
                description="暂无产品数据" 
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                style={{ padding: '40px 0' }}
              />
            )}
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card title="最近7天活动" className="dashboard-card">
            {activityData.labels.length > 0 ? (
              <div style={{ height: 300, position: 'relative' }}>
                <Line data={activityData} options={lineChartOptions} />
              </div>
            ) : (
              <Empty 
                description="暂无活动数据" 
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                style={{ padding: '40px 0' }}
              />
            )}
          </Card>
        </Col>
      </Row>
      
      <Divider style={{ margin: '32px 0' }} />
      
      {/* 数据质量监控面板 */}
      <Row gutter={[16, 16]}>
        <Col xs={24}>
          <QualityPanel qualityStats={qualityStats} loading={qualityLoading} />
        </Col>
      </Row>

      <Divider style={{ margin: '32px 0' }} />

      {/* 实时活动流 */}
      <Row gutter={[16, 16]}>
        <Col xs={24}>
          <Card title="实时活动流" className="dashboard-card">
            <ActivityStream activityData={recentActivity} loading={activityLoading} />
          </Card>
        </Col>
      </Row>
      
      <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
        <Col xs={24} sm={12}>
          <Card
            title="产品管理"
            extra={<Link to="/products">查看全部 →</Link>}
            className="dashboard-card"
            hoverable
          >
            <p style={{ color: '#666', marginBottom: 12 }}>
              管理所有产品，添加新产品，查看产品详情。
            </p>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              <div>
                <span style={{ color: '#999', fontSize: 12 }}>产品总数</span>
                <div style={{ fontSize: 24, fontWeight: 'bold', color: '#3f8600' }}>
                  {stats.totalProducts}
                </div>
              </div>
              <div>
                <span style={{ color: '#999', fontSize: 12 }}>编码总数</span>
                <div style={{ fontSize: 24, fontWeight: 'bold', color: '#1890ff' }}>
                  {stats.totalCodes}
                </div>
              </div>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12}>
          <Card
            title="系统信息"
            className="dashboard-card"
            hoverable
          >
            <div style={{ lineHeight: 1.8 }}>
              <p style={{ marginBottom: 8 }}>
                <strong>产品编码管理系统</strong>
              </p>
              <p style={{ color: '#666', fontSize: 13, marginBottom: 4 }}>
                版本: v1.0.0
              </p>
              <p style={{ color: '#666', fontSize: 13 }}>
                最后更新: {new Date().toLocaleDateString('zh-CN', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </p>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard;