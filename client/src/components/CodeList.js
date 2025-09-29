import React from 'react';
import { List, Button, Tag, Space } from 'antd';
import { DeleteOutlined } from '@ant-design/icons';
import PropTypes from 'prop-types';

/**
 * 编码列表组件
 * @param {Object} props 组件属性
 * @param {Array} props.codes 编码数据
 * @param {Function} props.onDelete 删除回调
 * @param {boolean} props.loading 是否加载中
 */
const CodeList = ({ codes, onDelete, loading = false }) => {
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
          actions={[
            <Button 
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
  loading: PropTypes.bool
};

export default CodeList;