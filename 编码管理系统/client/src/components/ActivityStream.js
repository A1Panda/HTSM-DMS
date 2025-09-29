import React from 'react';
import { Card, List, Avatar, Tag, Tooltip, Row, Col, Statistic, Empty } from 'antd';
import { Link } from 'react-router-dom';
import { Line } from 'react-chartjs-2';
import {
  AppstoreOutlined,
  BarcodeOutlined,
  ClockCircleOutlined,
  TrophyOutlined
} from '@ant-design/icons';

const ActivityStream = ({ activityData, loading }) => {
  if (!activityData) {
    return (
      <Card title="实时活动流" loading={loading}>
        <Empty description="暂无活动数据" />
      </Card>
    );
  }

  const { recentActivities, todayStats, hourlyDistribution } = activityData;

  // 格式化时间
  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return '刚刚';
    if (diffMins < 60) return `${diffMins}分钟前`;
    if (diffHours < 24) return `${diffHours}小时前`;
    if (diffDays < 7) return `${diffDays}天前`;
    return date.toLocaleDateString();
  };

  // 获取活动图标
  const getActivityIcon = (type) => {
    switch (type) {
      case 'product_created':
        return <AppstoreOutlined style={{ color: '#52c41a' }} />;
      case 'code_created':
        return <BarcodeOutlined style={{ color: '#1890ff' }} />;
      default:
        return <ClockCircleOutlined />;
    }
  };

  // 获取活动颜色
  const getActivityColor = (type) => {
    switch (type) {
      case 'product_created':
        return '#52c41a';
      case 'code_created':
        return '#1890ff';
      default:
        return '#666';
    }
  };

  // 今日时间分布图表配置
  const timelineChartData = {
    labels: hourlyDistribution.map(item => item.hour),
    datasets: [
      {
        label: '操作次数',
        data: hourlyDistribution.map(item => item.count),
        borderColor: '#1890ff',
        backgroundColor: 'rgba(24, 144, 255, 0.1)',
        tension: 0.4,
        fill: true,
        pointRadius: 3,
        pointHoverRadius: 5,
      },
    ],
  };

  const timelineChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: (context) => `${context.parsed.y} 次操作`,
        },
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
        ticks: {
          maxTicksLimit: 12,
        },
      },
      y: {
        beginAtZero: true,
        ticks: {
          precision: 0,
        },
        grid: {
          color: '#f0f0f0',
        },
      },
    },
    interaction: {
      intersect: false,
      mode: 'index',
    },
  };

  return (
    <div>
      {/* 今日统计 */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={8}>
          <Card size="small" style={{ textAlign: 'center' }}>
            <Statistic
              title="今日总活动"
              value={todayStats.totalToday}
              prefix={<TrophyOutlined />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card size="small" style={{ textAlign: 'center' }}>
            <Statistic
              title="新增产品"
              value={todayStats.productsToday}
              prefix={<AppstoreOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card size="small" style={{ textAlign: 'center' }}>
            <Statistic
              title="新增编码"
              value={todayStats.codesToday}
              prefix={<BarcodeOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={16}>
        {/* 最近活动列表 */}
        <Col xs={24} md={12}>
          <Card title="最近操作记录" size="small" className="activity-stream">
            {recentActivities.length > 0 ? (
              <List
                size="small"
                dataSource={recentActivities}
                style={{ maxHeight: '300px', overflowY: 'auto' }}
                renderItem={(item) => (
                  <List.Item>
                    <List.Item.Meta
                      avatar={
                        <Avatar 
                          size="small" 
                          icon={getActivityIcon(item.type)}
                          style={{ backgroundColor: getActivityColor(item.type) }}
                        />
                      }
                      title={
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '13px' }}>
                            {item.productId ? (
                              <Link 
                                to={`/products/${item.productId}`}
                                style={{ color: 'inherit', textDecoration: 'none' }}
                              >
                                {item.description}
                              </Link>
                            ) : (
                              item.description
                            )}
                          </span>
                          <Tooltip title={new Date(item.createdAt).toLocaleString()}>
                            <Tag size="small" color="blue">
                              {formatTime(item.createdAt)}
                            </Tag>
                          </Tooltip>
                        </div>
                      }
                      description={
                        <div style={{ fontSize: '12px', color: '#999' }}>
                          {item.type === 'code_created' && item.code && (
                            <span>编码: <strong>{item.code}</strong></span>
                          )}
                          {item.productName && (
                            <span> • 产品: {item.productName}</span>
                          )}
                        </div>
                      }
                    />
                  </List.Item>
                )}
              />
            ) : (
              <Empty 
                description="暂无最近活动" 
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                style={{ margin: '20px 0' }}
              />
            )}
          </Card>
        </Col>

        {/* 今日操作时间线 */}
        <Col xs={24} md={12}>
          <Card title="今日操作时间分布" size="small">
            {todayStats.totalToday > 0 ? (
              <div style={{ height: '300px' }}>
                <Line data={timelineChartData} options={timelineChartOptions} />
              </div>
            ) : (
              <Empty 
                description="今日暂无操作记录" 
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                style={{ margin: '60px 0' }}
              />
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default ActivityStream;
