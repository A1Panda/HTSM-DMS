import React, { memo } from 'react';
import { Card, Statistic } from 'antd';
import PropTypes from 'prop-types';

/**
 * 统计卡片组件
 * @param {Object} props 组件属性
 * @param {string} props.title 标题
 * @param {number} props.value 数值
 * @param {React.ReactNode} props.icon 图标
 * @param {string} props.color 颜色
 * @param {string} props.suffix 后缀
 * @param {string} props.prefix 前缀
 * @param {Object} props.style 自定义样式
 */
const StatCard = memo(({ 
  title, 
  value, 
  icon, 
  color = '#1890ff', 
  suffix, 
  prefix, 
  style = {} 
}) => {
  return (
    <Card className="dashboard-card" style={style} hoverable>
      <Statistic
        title={title}
        value={value}
        valueStyle={{ color, fontSize: 28 }}
        prefix={prefix || icon}
        suffix={suffix}
      />
    </Card>
  );
});

StatCard.displayName = 'StatCard';

StatCard.propTypes = {
  title: PropTypes.string.isRequired,
  value: PropTypes.number.isRequired,
  icon: PropTypes.node,
  color: PropTypes.string,
  suffix: PropTypes.node,
  prefix: PropTypes.node,
  style: PropTypes.object
};

export default StatCard;