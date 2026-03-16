import React, { useState, useEffect } from 'react';
import { Modal, List, Button, Tag, Space, Popconfirm, Tooltip, Checkbox } from 'antd';
import { UndoOutlined, DeleteOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import PropTypes from 'prop-types';

const RecycleBinModal = ({
  visible,
  onCancel,
  codes,
  onRestore,
  onPermanentDelete,
  onBatchRestore,
  onBatchPermanentDelete,
  loading = false
}) => {
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);

  // 当弹窗关闭或数据变化时，重置选择
  useEffect(() => {
    if (!visible) {
      setSelectedRowKeys([]);
    }
  }, [visible]);
  
  // 监听 codes 变化，剔除已不在列表中的选中项
  useEffect(() => {
    if (codes.length > 0 && selectedRowKeys.length > 0) {
       const currentIds = new Set(codes.map(c => c.id));
       const validKeys = selectedRowKeys.filter(id => currentIds.has(id));
       if (validKeys.length !== selectedRowKeys.length) {
         setSelectedRowKeys(validKeys);
       }
    }
  }, [codes, selectedRowKeys]);

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedRowKeys(codes.map(code => code.id));
    } else {
      setSelectedRowKeys([]);
    }
  };

  const handleSelect = (id, checked) => {
    if (checked) {
      setSelectedRowKeys(prev => [...prev, id]);
    } else {
      setSelectedRowKeys(prev => prev.filter(key => key !== id));
    }
  };

  const handleBatchRestoreClick = () => {
    Modal.confirm({
      title: `确定要恢复选中的 ${selectedRowKeys.length} 个编码吗？`,
      icon: <ExclamationCircleOutlined style={{ color: '#52c41a' }} />,
      content: '恢复后的编码将重新出现在产品列表中。',
      okText: '恢复',
      onOk: () => {
        if (onBatchRestore) {
           onBatchRestore(selectedRowKeys);
           setSelectedRowKeys([]);
        }
      }
    });
  };

  const handleBatchDeleteClick = () => {
    Modal.confirm({
      title: `确定要永久删除选中的 ${selectedRowKeys.length} 个编码吗？`,
      icon: <ExclamationCircleOutlined style={{ color: 'red' }} />,
      content: '此操作无法撤销！',
      okType: 'danger',
      okText: '永久删除',
      onOk: () => {
        if (onBatchPermanentDelete) {
          onBatchPermanentDelete(selectedRowKeys);
          setSelectedRowKeys([]);
        }
      }
    });
  };

  const allSelected = codes.length > 0 && selectedRowKeys.length === codes.length;
  const indeterminate = selectedRowKeys.length > 0 && selectedRowKeys.length < codes.length;

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
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Space>
           <Checkbox 
             indeterminate={indeterminate} 
             onChange={handleSelectAll} 
             checked={allSelected}
             disabled={codes.length === 0}
           >
             全选
           </Checkbox>
           {selectedRowKeys.length > 0 && (
             <span style={{ marginLeft: 8, color: '#666' }}>
               已选择 {selectedRowKeys.length} 项
             </span>
           )}
        </Space>
        <Space>
          <Button 
            icon={<UndoOutlined />} 
            disabled={selectedRowKeys.length === 0}
            onClick={handleBatchRestoreClick}
            // 使用自定义样式来模拟 AntD 的 success 按钮效果（AntD 默认没有 success type）
            style={selectedRowKeys.length > 0 ? { color: '#52c41a', borderColor: '#52c41a' } : {}}
          >
            批量恢复
          </Button>
          <Button 
            danger 
            icon={<DeleteOutlined />} 
            disabled={selectedRowKeys.length === 0}
            onClick={handleBatchDeleteClick}
          >
            批量永久删除
          </Button>
        </Space>
      </div>

      <List
        itemLayout="horizontal"
        dataSource={codes}
        loading={loading}
        locale={{ emptyText: '回收站为空' }}
        pagination={{
          defaultPageSize: 10,
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
             <Checkbox 
               checked={selectedRowKeys.includes(code.id)} 
               onChange={(e) => handleSelect(code.id, e.target.checked)}
               style={{ marginRight: 16 }}
             />
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
  onBatchRestore: PropTypes.func,
  onBatchPermanentDelete: PropTypes.func,
  loading: PropTypes.bool
};

export default RecycleBinModal;
