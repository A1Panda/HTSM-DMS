import React, { useState, useEffect } from 'react';
import { 
  Card, Typography, Button, Upload, message, Popconfirm, 
  Table, Switch, Form, Input, InputNumber, Divider, Space, Tag, Alert 
} from 'antd';
import { 
  DownloadOutlined, UploadOutlined, SyncOutlined, 
  DeleteOutlined, SaveOutlined, SettingOutlined, DatabaseOutlined
} from '@ant-design/icons';
import { backupAPI } from '../services/api';
import cronstrue from 'cronstrue/i18n';

const { Title, Text } = Typography;

const BackupManagement = () => {
  const [configForm] = Form.useForm();
  
  const [loadingConfig, setLoadingConfig] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);
  
  const [backupList, setBackupList] = useState([]);
  const [loadingList, setLoadingList] = useState(false);
  
  const [exporting, setExporting] = useState(false);
  const [cronPreview, setCronPreview] = useState('');

  useEffect(() => {
    fetchConfig();
    fetchBackupList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchConfig = async () => {
    try {
      setLoadingConfig(true);
      const res = await backupAPI.getConfig();
      configForm.setFieldsValue(res.data);
      updateCronPreview(res.data.cronExpression);
    } catch (error) {
      message.error('获取自动备份配置失败');
    } finally {
      setLoadingConfig(false);
    }
  };

  const updateCronPreview = (expression) => {
    if (!expression) {
      setCronPreview('');
      return;
    }
    try {
      const desc = cronstrue.toString(expression, { locale: 'zh_CN' });
      setCronPreview(desc);
    } catch (e) {
      setCronPreview('无效的 Cron 表达式');
    }
  };

  const handleValuesChange = (changedValues) => {
    if ('cronExpression' in changedValues) {
      updateCronPreview(changedValues.cronExpression);
    }
  };

  const fetchBackupList = async () => {
    try {
      setLoadingList(true);
      const res = await backupAPI.listLocalBackups();
      setBackupList(res.data);
    } catch (error) {
      message.error('获取备份列表失败');
    } finally {
      setLoadingList(false);
    }
  };

  const handleSaveConfig = async (values) => {
    try {
      setSavingConfig(true);
      await backupAPI.updateConfig(values);
      message.success('自动备份配置已更新');
      fetchConfig();
    } catch (error) {
      message.error(error.response?.data?.error || '更新配置失败');
    } finally {
      setSavingConfig(false);
    }
  };

  const handleExport = async () => {
    try {
      setExporting(true);
      const res = await backupAPI.exportBackup();
      
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      link.setAttribute('download', `backup-${timestamp}.json`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      message.success('备份导出成功');
    } catch (error) {
      message.error('备份导出失败');
    } finally {
      setExporting(false);
    }
  };

  const uploadProps = {
    accept: '.json',
    showUploadList: false,
    beforeUpload: (file) => {
      const isJson = file.type === 'application/json' || file.name.endsWith('.json');
      if (!isJson) {
        message.error('只能上传 JSON 格式的备份文件!');
        return Upload.LIST_IGNORE;
      }
      
      // We handle the upload manually to show a confirmation first
      return false; 
    },
    onChange: (info) => {
      if (info.fileList.length > 0) {
        const file = info.fileList[0].originFileObj;
        handleManualImport(file);
      }
    }
  };

  const handleManualImport = async (file) => {
    if (!window.confirm('警告：导入备份将完全覆盖当前系统的所有数据！\n确定要继续吗？')) {
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    const hideMsg = message.loading('正在恢复数据，请勿关闭页面...', 0);
    try {
      await backupAPI.importBackup(formData);
      hideMsg();
      message.success('数据恢复成功！请刷新页面以加载最新数据。');
      setTimeout(() => window.location.reload(), 1500);
    } catch (error) {
      hideMsg();
      message.error(error.response?.data?.error || '恢复数据失败，请检查文件格式是否正确');
    }
  };

  const handleServerRestore = async (filename) => {
    const hideMsg = message.loading('正在恢复数据，请勿关闭页面...', 0);
    try {
      await backupAPI.restoreLocalBackup(filename);
      hideMsg();
      message.success('数据恢复成功！页面即将刷新。');
      setTimeout(() => window.location.reload(), 1500);
    } catch (error) {
      hideMsg();
      message.error(error.response?.data?.error || '恢复数据失败');
    }
  };

  const handleServerDownload = async (filename) => {
    try {
      const hideMsg = message.loading('正在下载...', 0);
      const res = await backupAPI.downloadLocalBackup(filename);
      hideMsg();
      
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      message.error('下载失败');
    }
  };

  const handleServerDelete = async (filename) => {
    try {
      await backupAPI.deleteLocalBackup(filename);
      message.success('删除成功');
      fetchBackupList();
    } catch (error) {
      message.error('删除失败');
    }
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const columns = [
    {
      title: '文件名',
      dataIndex: 'filename',
      key: 'filename',
      render: text => <Text strong>{text}</Text>
    },
    {
      title: '大小',
      dataIndex: 'size',
      key: 'size',
      render: size => formatBytes(size)
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: text => new Date(text).toLocaleString()
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Space size="middle">
          <Button 
            type="link" 
            icon={<DownloadOutlined />} 
            onClick={() => handleServerDownload(record.filename)}
          >
            下载
          </Button>
          <Popconfirm
            title="高危操作确认"
            description="恢复此备份将覆盖当前系统所有数据，是否继续？"
            onConfirm={() => handleServerRestore(record.filename)}
            okText="确认恢复"
            okButtonProps={{ danger: true }}
            cancelText="取消"
          >
            <Button type="link" danger icon={<SyncOutlined />}>
              恢复
            </Button>
          </Popconfirm>
          <Popconfirm
            title="确认删除"
            description="确定要删除此备份文件吗？"
            onConfirm={() => handleServerDelete(record.filename)}
            okText="删除"
            okButtonProps={{ danger: true }}
            cancelText="取消"
          >
            <Button type="link" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    }
  ];

  return (
    <div className="backup-container" style={{ padding: '24px 0' }}>
      <div style={{ marginBottom: 24 }}>
        <Title level={2}><DatabaseOutlined /> 数据备份与恢复</Title>
        <Text type="secondary">管理系统数据的自动备份配置、手动导出与数据恢复操作。</Text>
      </div>

      <Alert
        message="高危操作警告"
        description="所有数据恢复操作（包括上传恢复和服务器文件恢复）都会完全覆盖当前系统的数据。执行恢复前，请务必先下载当前数据作为安全备份！"
        type="warning"
        showIcon
        style={{ marginBottom: 24 }}
      />

      <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
        {/* 左侧：手动操作与配置 */}
        <div style={{ flex: '1 1 400px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          <Card title="手动备份与恢复" bordered={false} className="dashboard-card">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <Text strong style={{ display: 'block', marginBottom: 8 }}>导出当前数据</Text>
                <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
                  将系统中现有的所有产品和编码数据打包下载到本地（JSON格式）。
                </Text>
                <Button 
                  type="primary" 
                  icon={<DownloadOutlined />} 
                  onClick={handleExport}
                  loading={exporting}
                >
                  导出全量备份
                </Button>
              </div>
              <Divider style={{ margin: '12px 0' }} />
              <div>
                <Text strong style={{ display: 'block', marginBottom: 8 }}>从本地文件恢复</Text>
                <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
                  上传之前导出的 JSON 备份文件。注意：此操作将清空现有数据！
                </Text>
                <Upload {...uploadProps}>
                  <Button danger icon={<UploadOutlined />}>
                    上传备份并恢复
                  </Button>
                </Upload>
              </div>
            </div>
          </Card>

          <Card title={<><SettingOutlined /> 自动备份设置</>} bordered={false} className="dashboard-card" loading={loadingConfig}>
            <Form
              form={configForm}
              layout="vertical"
              onFinish={handleSaveConfig}
              onValuesChange={handleValuesChange}
            >
              <Form.Item 
                name="autoBackupEnabled" 
                label="开启自动备份" 
                valuePropName="checked"
              >
                <Switch checkedChildren="开启" unCheckedChildren="关闭" />
              </Form.Item>

              <Form.Item 
                name="cronExpression" 
                label="执行频率 (Cron 表达式)"
                rules={[{ required: true, message: '请输入 Cron 表达式' }]}
                tooltip="默认 '0 2 * * *' 表示每天凌晨 2 点执行"
                extra={cronPreview ? <span style={{ color: cronPreview.includes('无效') ? '#ff4d4f' : '#52c41a' }}>执行周期：{cronPreview}</span> : null}
              >
                <Input placeholder="例如: 0 2 * * *" />
              </Form.Item>

              <Form.Item 
                name="retainCount" 
                label="保留备份份数"
                rules={[{ required: true, message: '请输入保留份数' }]}
              >
                <InputNumber min={1} max={100} style={{ width: '100%' }} />
              </Form.Item>

              <Form.Item style={{ marginBottom: 0 }}>
                <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={savingConfig}>
                  保存配置
                </Button>
              </Form.Item>
            </Form>
          </Card>
        </div>

        {/* 右侧：服务器备份列表 */}
        <div style={{ flex: '2 1 600px' }}>
          <Card 
            title="服务器自动备份记录" 
            bordered={false} 
            className="dashboard-card"
            extra={
              <Button type="link" icon={<SyncOutlined />} onClick={fetchBackupList} loading={loadingList}>
                刷新列表
              </Button>
            }
          >
            <Table 
              dataSource={backupList} 
              columns={columns} 
              rowKey="filename"
              loading={loadingList}
              pagination={{ pageSize: 10 }}
              locale={{ emptyText: '暂无服务器备份记录' }}
            />
          </Card>
        </div>
      </div>
    </div>
  );
};

export default BackupManagement;
