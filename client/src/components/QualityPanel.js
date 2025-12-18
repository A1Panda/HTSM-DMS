import React from 'react';
import { Card, Row, Col, Progress, Statistic, Tag, Tooltip } from 'antd';
import {
  ExclamationCircleOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  TrophyOutlined
} from '@ant-design/icons';

const QualityPanel = ({ qualityStats, loading }) => {
  if (!qualityStats) {
    return (
      <Card title="数据质量监控" loading={loading}>
        <p>暂无数据质量统计</p>
      </Card>
    );
  }

  const {
    totalMissingCodes,
    totalExcessCodes,
    productsWithMissing,
    productsWithExcess,
    totalProducts,
    validProducts,
    avgCompleteness,
    qualityScore,
    excessCodeRatio
  } = qualityStats;

  // 根据质量评分确定颜色和状态
  const getQualityColor = (score) => {
    if (score >= 90) return '#52c41a'; // 绿色
    if (score >= 70) return '#faad14'; // 黄色
    if (score >= 50) return '#fa8c16'; // 橙色
    return '#f5222d'; // 红色
  };

  const getQualityStatus = (score) => {
    if (score >= 90) return { text: '优秀', icon: <CheckCircleOutlined /> };
    if (score >= 70) return { text: '良好', icon: <TrophyOutlined /> };
    if (score >= 50) return { text: '一般', icon: <WarningOutlined /> };
    return { text: '需改进', icon: <ExclamationCircleOutlined /> };
  };

  const qualityColor = getQualityColor(qualityScore);
  const qualityStatus = getQualityStatus(qualityScore);

  return (
    <Card 
      title="数据质量监控" 
      loading={loading}
      className="quality-panel"
      extra={
        <Tag color={qualityColor} icon={qualityStatus.icon}>
          {qualityStatus.text}
        </Tag>
      }
    >
      <Row gutter={16}>
        {/* 质量评分 */}
        <Col xs={24} sm={12} md={6}>
          <Card 
            size="small" 
            style={{ 
              textAlign: 'center', 
              height: '100%',
              display: 'flex',
              flexDirection: 'column'
            }}
            styles={{ body: { 
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              minHeight: '160px',
              padding: '16px'
            } }}
          >
            <Progress
              type="circle"
              percent={qualityScore}
              strokeColor={qualityColor}
              format={percent => `${percent}分`}
              size={80}
            />
            <p style={{ marginTop: 12, marginBottom: 0, fontWeight: 'bold', fontSize: '14px' }}>
              数据质量评分
            </p>
          </Card>
        </Col>

        {/* 编码完整度 */}
        <Col xs={24} sm={12} md={6}>
          <Card 
            size="small" 
            style={{ 
              textAlign: 'center', 
              height: '100%',
              display: 'flex',
              flexDirection: 'column'
            }}
            styles={{ body: { 
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              minHeight: '160px',
              padding: '16px'
            } }}
          >
            <Progress
              type="circle"
              percent={avgCompleteness}
              strokeColor="#1890ff"
              format={percent => `${percent}%`}
              size={80}
            />
            <p style={{ marginTop: 12, marginBottom: 0, fontWeight: 'bold', fontSize: '14px' }}>
              平均完整度
            </p>
          </Card>
        </Col>

        {/* 缺失编码统计 */}
        <Col xs={24} sm={12} md={6}>
          <Card 
            size="small" 
            style={{ 
              textAlign: 'center', 
              height: '100%',
              display: 'flex',
              flexDirection: 'column'
            }}
            styles={{ body: { 
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              minHeight: '160px',
              padding: '16px'
            } }}
          >
            <Statistic
              title="缺失编码"
              value={totalMissingCodes}
              valueStyle={{ 
                color: totalMissingCodes > 0 ? '#f5222d' : '#52c41a',
                fontSize: '28px'
              }}
              prefix={totalMissingCodes > 0 ? <ExclamationCircleOutlined /> : <CheckCircleOutlined />}
            />
            <Tooltip title={`${productsWithMissing} 个产品存在缺失编码`}>
              <Tag 
                color={productsWithMissing > 0 ? 'red' : 'green'} 
                size="small"
                style={{ marginTop: 8 }}
              >
                {productsWithMissing}/{validProducts} 产品
              </Tag>
            </Tooltip>
          </Card>
        </Col>

        {/* 超出范围编码统计 */}
        <Col xs={24} sm={12} md={6}>
          <Card 
            size="small" 
            style={{ 
              textAlign: 'center', 
              height: '100%',
              display: 'flex',
              flexDirection: 'column'
            }}
            styles={{ body: { 
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              minHeight: '160px',
              padding: '16px'
            } }}
          >
            <Statistic
              title="超出范围编码"
              value={totalExcessCodes}
              valueStyle={{ 
                color: totalExcessCodes > 0 ? '#fa8c16' : '#52c41a',
                fontSize: '28px'
              }}
              prefix={totalExcessCodes > 0 ? <WarningOutlined /> : <CheckCircleOutlined />}
            />
            <Tooltip title={`占总编码数的 ${excessCodeRatio}%`}>
              <Tag 
                color={totalExcessCodes > 0 ? 'orange' : 'green'} 
                size="small"
                style={{ marginTop: 8 }}
              >
                {productsWithExcess}/{totalProducts} 产品
              </Tag>
            </Tooltip>
          </Card>
        </Col>
      </Row>

      {/* 质量建议 */}
      <div style={{ marginTop: 16, padding: '12px', backgroundColor: '#fafafa', borderRadius: '6px' }}>
        <h4 style={{ margin: '0 0 8px 0', fontSize: '14px' }}>💡 质量改进建议：</h4>
        <div style={{ fontSize: '12px', color: '#666' }}>
          {totalMissingCodes > 0 && (
            <p style={{ margin: '4px 0' }}>
              • 发现 <strong>{totalMissingCodes}</strong> 个缺失编码，建议及时补充完整
            </p>
          )}
          {totalExcessCodes > 0 && (
            <p style={{ margin: '4px 0' }}>
              • 发现 <strong>{totalExcessCodes}</strong> 个超出范围编码，建议检查编码规范
            </p>
          )}
          {avgCompleteness < 80 && (
            <p style={{ margin: '4px 0' }}>
              • 平均完整度为 <strong>{avgCompleteness.toFixed(1)}%</strong>，建议提高编码录入完整性
            </p>
          )}
          {qualityScore >= 90 && totalMissingCodes === 0 && totalExcessCodes === 0 && (
            <p style={{ margin: '4px 0', color: '#52c41a' }}>
              • 数据质量优秀！继续保持良好的录入习惯 🎉
            </p>
          )}
        </div>
      </div>
    </Card>
  );
};

export default QualityPanel;
