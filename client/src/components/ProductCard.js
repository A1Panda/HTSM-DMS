import React from 'react';
import { Card, Tag, Progress, Tooltip } from 'antd';
import { Link } from 'react-router-dom';
import { EyeOutlined, DeleteOutlined } from '@ant-design/icons';
import PropTypes from 'prop-types';

const { Meta } = Card;

/**
 * 产品卡片组件
 * @param {Object} props 组件属性
 * @param {Object} props.product 产品数据
 * @param {number} props.codeCount 编码数量
 * @param {Function} props.onDelete 删除回调
 * @param {Object} props.codeRangeStatus 编码范围状态信息
 * @param {Object} props.missingCodes 缺失编码信息（兼容旧版本）
 */
const ProductCard = ({ product, codeCount = 0, onDelete, codeRangeStatus, missingCodes }) => {
  // 支持新旧两种数据格式
  const rangeStatus = codeRangeStatus || missingCodes || { 
    hasMissing: false, 
    missingCodes: [], 
    hasExcess: false, 
    excessCodes: [] 
  };
  
  const { hasMissing, missingCodes: missingCodesList, hasExcess, excessCodes } = rangeStatus;
  const requiredQuantity = product.requiredQuantity || 0;
  const completionRate = requiredQuantity > 0 
    ? Math.min(100, Math.round((codeCount / requiredQuantity) * 100)) 
    : 100;

  return (
    <Card
      className="product-card"
      style={{ 
        height: '100%',
        display: 'flex',
        flexDirection: 'column'
      }}
      styles={{
        body: {
          flex: 1,
          display: 'flex',
          flexDirection: 'column'
        }
      }}
      actions={[
        <Tooltip title="查看编码">
          <Link to={`/products/${product.id}`}>
            <EyeOutlined key="view" />
          </Link>
        </Tooltip>,
        <Tooltip title="删除产品">
          <DeleteOutlined 
            key="delete" 
            onClick={() => onDelete(product.id, product.name)} 
          />
        </Tooltip>
      ]}
    >
      {/* 产品标题和描述区域 */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ 
          fontSize: '16px', 
          fontWeight: 'bold', 
          marginBottom: 8,
          minHeight: '24px',
          lineHeight: '24px'
        }}>
          {product.name}
        </div>
        <div style={{ 
          color: '#666', 
          fontSize: '14px',
          minHeight: '20px',
          lineHeight: '20px'
        }}>
          {product.description || '暂无描述'}
        </div>
      </div>

      {/* 分类标签区域 */}
      <div style={{ marginBottom: 12, minHeight: '24px' }}>
        {product.category && (
          <Tag color="blue">{product.category}</Tag>
        )}
      </div>

      {/* 进度统计区域 */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          <span>已录入: {codeCount}</span>
          <span>需求: {requiredQuantity}</span>
        </div>
        <Progress 
          percent={completionRate} 
          size="small" 
          status={completionRate < 100 ? "active" : "success"}
        />
      </div>
      
      {/* 编码范围和状态区域 */}
      <div style={{ marginBottom: 12, minHeight: '40px' }}>
        {product.codeStart && product.codeEnd ? (
          <>
            <div style={{ fontSize: '12px', marginBottom: 4 }}>
              编码范围: {product.codeStart} - {product.codeEnd}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
              {hasMissing && (
                <Tooltip 
                  title={
                    <div>
                      缺失编码: 
                      {missingCodesList && missingCodesList.length > 10 
                        ? `${missingCodesList.slice(0, 10).join(', ')}... 等${missingCodesList.length}个` 
                        : missingCodesList && missingCodesList.join(', ')
                      }
                    </div>
                  }
                >
                  <Tag color="red" size="small">
                    缺失 {missingCodesList && missingCodesList.length} 个
                  </Tag>
                </Tooltip>
              )}
              {hasExcess && (
                <Tooltip 
                  title={
                    <div>
                      超出范围编码: 
                      {excessCodes && excessCodes.length > 10 
                        ? `${excessCodes.slice(0, 10).join(', ')}... 等${excessCodes.length}个` 
                        : excessCodes && excessCodes.join(', ')
                      }
                    </div>
                  }
                >
                  <Tag color="orange" size="small">
                    超出 {excessCodes && excessCodes.length} 个
                  </Tag>
                </Tooltip>
              )}
            </div>
          </>
        ) : (
          <div style={{ fontSize: '12px', color: '#ccc' }}>
            未设置编码范围
          </div>
        )}
      </div>
      
      {/* 底部时间区域 - 使用flex-grow推到底部 */}
      <div style={{ 
        marginTop: 'auto',
        fontSize: '12px', 
        color: '#888',
        borderTop: '1px solid #f0f0f0',
        paddingTop: 8
      }}>
        创建时间: {new Date(product.createdAt).toLocaleDateString()}
      </div>
    </Card>
  );
};

ProductCard.propTypes = {
  product: PropTypes.object.isRequired,
  codeCount: PropTypes.number,
  onDelete: PropTypes.func.isRequired,
  codeRangeStatus: PropTypes.shape({
    hasMissing: PropTypes.bool,
    missingCodes: PropTypes.array,
    hasExcess: PropTypes.bool,
    excessCodes: PropTypes.array
  }),
  missingCodes: PropTypes.shape({
    hasMissing: PropTypes.bool,
    missingCodes: PropTypes.array
  })
};

export default ProductCard;