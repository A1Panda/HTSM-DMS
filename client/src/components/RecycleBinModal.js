import React from 'react';
import { Modal, List, Button, Tag, Space, Popconfirm, Tooltip } from 'antd';
import { UndoOutlined, DeleteOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import PropTypes from 'prop-types';

const RecycleBinModal = ({
  visible,
  onCancel,
  codes,
  onRestore,
  onPermanentDelete,
  loading = false
}) => {
  return (
    <Modal
      title="回收站"
      open={visible}
      onCancel={onCancel}
      footer={[
        <Button key="close" onClick={onCancel}>
          关闭
        </Button>
      ]}
      width={800}
    >
      <List
        itemLayout="horizontal"
        dataSource={codes}
        loading={loading}
        locale={{ emptyText: '回收站为空' }}
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          pageSizeOptions: ['10', '20', '50', '100'],
          showTotal: (total) => `共 ${total} 条已删除编码`
        }}
        renderItem={code => (
          <List.Item
            actions={[
              <Tooltip title="恢复">
                <Button 
                  key="restore"
                  type="text" 
                  style={{ color: '#52c41a' }}
                  icon={<UndoOutlined />} 
                  onClick={() => onRestore(code.id)}
                />
              </Tooltip>,
              <Popconfirm
                title="确定要永久删除吗？"
                description="此操作无法撤销！"
                onConfirm={() => onPermanentDelete(code.id)}
                okText="删除"
                cancelText="取消"
                okType="danger"
                icon={<ExclamationCircleOutlined style={{ color: 'red' }} />}
              >
                <Tooltip title="永久删除">
                  <Button 
                    key="delete"
                    type="text" 
                    danger 
                    icon={<DeleteOutlined />} 
                  />
                </Tooltip>
              </Popconfirm>
            ]}
          >
            <List.Item.Meta
              title={
                <Space>
                  <span>{code.code}</span>
                  {code.date && <Tag color="default">{code.date}</Tag>}
                </Space>
              }
              description={
                <Space direction="vertical" size={0}>
                  <span>{code.description || '无描述'}</span>
                  <span style={{ fontSize: '12px', color: '#999' }}>
                    删除时间: {code.deletedAt ? new Date(code.deletedAt).toLocaleString() : '未知'}
                  </span>
                </Space>
              }
            />
          </List.Item>
        )}
      />
    </Modal>
  );
};

RecycleBinModal.propTypes = {
  visible: PropTypes.bool.isRequired,
  onCancel: PropTypes.func.isRequired,
  codes: PropTypes.array.isRequired,
  onRestore: PropTypes.func.isRequired,
  onPermanentDelete: PropTypes.func.isRequired,
  loading: PropTypes.bool
};

export default RecycleBinModal;
