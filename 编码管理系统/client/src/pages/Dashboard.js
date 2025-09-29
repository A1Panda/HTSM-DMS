import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Spin, Alert, Typography, Divider } from 'antd';
import { 
  AppstoreOutlined, 
  BarcodeOutlined, 
  ClockCircleOutlined 
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
} from 'chart.js';
import { statsAPI, productAPI, codeAPI } from '../services/api';
import StatCard from '../components/StatCard';
import QualityPanel from '../components/QualityPanel';
import ActivityStream from '../components/ActivityStream';

// 注册Chart.js组件
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

const { Title: TitleText } = Typography;

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalCodes: 0,
    recentActivity: 0
  });
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
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

  // 加载统计数据
  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await statsAPI.getStats();
      setStats(response.data);
      setError(null);
    } catch (err) {
      console.error('获取统计数据失败:', err);
      setError('获取统计数据失败，请稍后再试');
    } finally {
      setLoading(false);
    }
  };

  // 加载产品数据
  const fetchProducts = async () => {
    try {
      const response = await productAPI.getAllProducts();
      setProducts(response.data);
      
      // 处理分类数据
      processProductCategories(response.data);
    } catch (err) {
      console.error('获取产品数据失败:', err);
    }
  };

  // 处理产品分类数据
  const processProductCategories = (productsData) => {
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
          backgroundColor: [
            'rgba(255, 99, 132, 0.6)',
            'rgba(54, 162, 235, 0.6)',
            'rgba(255, 206, 86, 0.6)',
            'rgba(75, 192, 192, 0.6)',
            'rgba(153, 102, 255, 0.6)',
            'rgba(255, 159, 64, 0.6)',
          ],
          borderWidth: 1,
        },
      ],
    });
  };

  // 加载活动数据
  const fetchActivityData = async () => {
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
            borderColor: 'rgb(255, 99, 132)',
            backgroundColor: 'rgba(255, 99, 132, 0.5)',
            tension: 0.1,
          },
          {
            label: '新增编码',
            data: codeCounts,
            borderColor: 'rgb(53, 162, 235)',
            backgroundColor: 'rgba(53, 162, 235, 0.5)',
            tension: 0.1,
          },
        ],
      });
    } catch (err) {
      console.error('获取活动数据失败:', err);
      // 如果API失败，显示空数据而不是随机数据
      setActivityData({
        labels: [],
        datasets: [
          {
            label: '新增产品',
            data: [],
            borderColor: 'rgb(255, 99, 132)',
            backgroundColor: 'rgba(255, 99, 132, 0.5)',
            tension: 0.1,
          },
          {
            label: '新增编码',
            data: [],
            borderColor: 'rgb(53, 162, 235)',
            backgroundColor: 'rgba(53, 162, 235, 0.5)',
            tension: 0.1,
          },
        ],
      });
    }
  };

  // 获取数据质量统计
  const fetchQualityStats = async () => {
    try {
      setQualityLoading(true);
      const response = await statsAPI.getQualityStats();
      setQualityStats(response.data);
    } catch (err) {
      console.error('获取数据质量统计失败:', err);
    } finally {
      setQualityLoading(false);
    }
  };

  // 获取最近活动流
  const fetchRecentActivity = async () => {
    try {
      setActivityLoading(true);
      const response = await statsAPI.getRecentActivity();
      setRecentActivity(response.data);
    } catch (err) {
      console.error('获取最近活动失败:', err);
    } finally {
      setActivityLoading(false);
    }
  };

  // 初始加载
  useEffect(() => {
    fetchStats();
    fetchProducts();
    fetchActivityData();
    fetchQualityStats();
    fetchRecentActivity();
    
    // 每60秒刷新一次数据
    const interval = setInterval(() => {
      fetchStats();
      fetchQualityStats();
      fetchRecentActivity();
    }, 60000);
    
    return () => clearInterval(interval);
  }, []);

  if (loading && !stats.totalProducts) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin size="large" />
        <p>加载统计数据...</p>
      </div>
    );
  }

  return (
    <div>
      <TitleText level={2}>系统概览</TitleText>
      
      {error && (
        <Alert
          message="错误"
          description={error}
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
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
      
      <Row gutter={16} style={{ marginTop: 24 }}>
        <Col xs={24} md={12}>
          <Card title="产品分类分布" className="dashboard-card">
            {categoryData.labels.length > 0 ? (
              <Pie data={categoryData} options={{ responsive: true, maintainAspectRatio: false }} height={300} />
            ) : (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <p>暂无产品数据</p>
              </div>
            )}
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card title="最近7天活动" className="dashboard-card">
            <Line 
              data={activityData} 
              options={{ 
                responsive: true, 
                maintainAspectRatio: false,
                scales: {
                  y: {
                    beginAtZero: true,
                    ticks: {
                      precision: 0
                    }
                  }
                }
              }} 
              height={300} 
            />
          </Card>
        </Col>
      </Row>
      
      <Divider />
      
      {/* 数据质量监控面板 */}
      <Row gutter={16} style={{ marginTop: 24 }}>
        <Col xs={24}>
          <QualityPanel qualityStats={qualityStats} loading={qualityLoading} />
        </Col>
      </Row>

      <Divider />

      {/* 实时活动流 */}
      <Row gutter={16} style={{ marginTop: 24 }}>
        <Col xs={24}>
          <Card title="实时活动流" className="dashboard-card">
            <ActivityStream activityData={recentActivity} loading={activityLoading} />
          </Card>
        </Col>
      </Row>
      
      <Row gutter={16} style={{ marginTop: 16 }}>
        <Col xs={24} sm={12}>
          <Card
            title="产品管理"
            extra={<Link to="/products">查看全部</Link>}
            className="dashboard-card"
          >
            <p>管理所有产品，添加新产品，查看产品详情。</p>
            <p>当前共有 <strong>{stats.totalProducts}</strong> 个产品，<strong>{stats.totalCodes}</strong> 个编码。</p>
          </Card>
        </Col>
        <Col xs={24} sm={12}>
          <Card
            title="系统信息"
            className="dashboard-card"
          >
            <p>产品编码管理系统 v1.0.0</p>
            <p>最后更新: {new Date().toLocaleDateString()}</p>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard;