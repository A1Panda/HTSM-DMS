import React from 'react';
import { Layout, Typography, Space, Avatar, Dropdown, Badge } from 'antd';
import { 
  UserOutlined, 
  BellOutlined, 
  SettingOutlined,
  LogoutOutlined,
  ToolOutlined
} from '@ant-design/icons';

const { Header } = Layout;
const { Text } = Typography;

const AppHeader = () => {
  const userMenuItems = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: '个人资料',
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: '系统设置',
    },
    {
      type: 'divider',
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      danger: true,
    },
  ];

  const handleMenuClick = ({ key }) => {
    switch (key) {
      case 'logout':
        console.log('退出登录');
        break;
      default:
        console.log(`点击了菜单项: ${key}`);
    }
  };

  return (
    <Header 
      style={{ 
        padding: '0 24px',
        background: '#fff',
        borderBottom: '1px solid #f0f0f0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: '0 1px 4px rgba(0,21,41,.08)'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <ToolOutlined 
          style={{ 
            fontSize: '24px', 
            color: '#1890ff', 
            marginRight: '12px' 
          }} 
        />
        <div>
          <Text strong style={{ fontSize: '18px', color: '#262626' }}>
            刀头管理系统
          </Text>
          <Text 
            type="secondary" 
            style={{ 
              fontSize: '12px', 
              marginLeft: '8px',
              color: '#8c8c8c'
            }}
          >
            v1.0.0
          </Text>
        </div>
      </div>

      <Space size="large">
        <Badge count={3} size="small">
          <BellOutlined 
            style={{ 
              fontSize: '18px', 
              color: '#8c8c8c',
              cursor: 'pointer'
            }} 
          />
        </Badge>
        
        <Dropdown
          menu={{
            items: userMenuItems,
            onClick: handleMenuClick,
          }}
          placement="bottomRight"
          trigger={['click']}
        >
          <Space style={{ cursor: 'pointer' }}>
            <Avatar 
              size="small" 
              icon={<UserOutlined />} 
              style={{ 
                backgroundColor: '#1890ff',
                border: '2px solid #f0f0f0'
              }}
            />
            <Text style={{ color: '#262626' }}>管理员</Text>
          </Space>
        </Dropdown>
      </Space>
    </Header>
  );
};

export default AppHeader;
