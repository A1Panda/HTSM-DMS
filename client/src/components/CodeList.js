import React from 'react';
import { List, Button, Tag, Space, Checkbox } from 'antd';
import { DeleteOutlined } from '@ant-design/icons';
import PropTypes from 'prop-types';

/**
 * 编码列表组件
 * @param {Object} props 组件属性
 * @param {Array} props.codes 编码数据
 * @param {Function} props.onDelete 删除回调
 * @param {boolean} props.loading 是否加载中
 * @param {boolean} props.batchMode 是否为批量模式
 * @param {Array} props.selectedCodes 选中的编码ID列表
 * @param {Function} props.onSelect 选择回调
 */
const CodeList = ({ 
  codes, 
  onDelete, 
  loading = false, 
  batchMode = false,
  selectedCodes = [],
  onSelect 
}) => {
  return (
    <List
      itemLayout="horizontal"
      dataSource={codes}
      loading={loading}
      locale={{ emptyText: '暂无编码数据' }}
      pagination={{
        pageSize: 10,
        showSizeChanger: true,
        pageSizeOptions: ['10', '20', '50', '100'],
        showTotal: (total) => `共 ${total} 条编码`
      }}
      renderItem={code => (
        <List.Item
          style={{
            backgroundColor: selectedCodes.includes(code.id) ? '#f0f8ff' : undefined
          }}
          actions={batchMode ? [
            <Checkbox
              key="select"
              checked={selectedCodes.includes(code.id)}
              onChange={(e) => onSelect && onSelect(code.id, e.target.checked)}
            />
          ] : [
            <Button 
              key="delete"
              type="text" 
              danger 
              icon={<DeleteOutlined />} 
              onClick={() => onDelete(code.id)}
            />
          ]}
        >
          <List.Item.Meta
            title={
              <Space>
                <span>{code.code}</span>
                {code.date && <Tag color="blue">{code.date}</Tag>}
              </Space>
            }
            description={code.description || '无描述'}
          />
          <div style={{ color: '#888', fontSize: '12px' }}>
            {new Date(code.createdAt).toLocaleString()}
          </div>
        </List.Item>
      )}
    />
  );
};

CodeList.propTypes = {
  codes: PropTypes.array.isRequired,
  onDelete: PropTypes.func.isRequired,
  loading: PropTypes.bool,
  batchMode: PropTypes.bool,
  selectedCodes: PropTypes.array,
  onSelect: PropTypes.func
};

export default CodeList;