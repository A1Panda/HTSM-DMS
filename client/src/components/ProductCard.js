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
 * @param {Object} props.missingCodes 缺失编码信息
 */
const ProductCard = ({ product, codeCount = 0, onDelete, missingCodes = { hasMissing: false, missingCodes: [] } }) => {
  const { hasMissing, missingCodes: missingCodesList } = missingCodes;
  const requiredQuantity = product.requiredQuantity || 0;
  const completionRate = requiredQuantity > 0 
    ? Math.min(100, Math.round((codeCount / requiredQuantity) * 100)) 
    : 100;

  return (
    <Card
      className="product-card"
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
      <Meta
        title={product.name}
        description={product.description || '暂无描述'}
      />
      <div style={{ marginTop: 16 }}>
        {product.category && (
          <Tag color="blue">{product.category}</Tag>
        )}
        <div style={{ marginTop: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>已录入: {codeCount}</span>
            <span>需求: {requiredQuantity}</span>
          </div>
          <Progress 
            percent={completionRate} 
            size="small" 
            status={completionRate < 100 ? "active" : "success"}
          />
        </div>
        
        {product.codeStart && product.codeEnd && (
          <div style={{ marginTop: 8, fontSize: '12px' }}>
            <div>编码范围: {product.codeStart} - {product.codeEnd}</div>
            {hasMissing && (
              <Tooltip 
                title={
                  <div>
                    缺失编码: 
                    {missingCodesList.length > 10 
                      ? `${missingCodesList.slice(0, 10).join(', ')}... 等${missingCodesList.length}个` 
                      : missingCodesList.join(', ')
                    }
                  </div>
                }
              >
                <Tag color="red" style={{ marginTop: 4 }}>
                  有 {missingCodesList.length} 个缺失编码
                </Tag>
              </Tooltip>
            )}
          </div>
        )}
        
        <div style={{ marginTop: 8, fontSize: '12px', color: '#888' }}>
          创建时间: {new Date(product.createdAt).toLocaleString()}
        </div>
      </div>
    </Card>
  );
};

ProductCard.propTypes = {
  product: PropTypes.object.isRequired,
  codeCount: PropTypes.number,
  onDelete: PropTypes.func.isRequired,
  missingCodes: PropTypes.shape({
    hasMissing: PropTypes.bool,
    missingCodes: PropTypes.array
  })
};

export default ProductCard;