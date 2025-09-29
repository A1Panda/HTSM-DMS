import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Layout, Menu } from 'antd';
import { 
  DashboardOutlined, 
  AppstoreOutlined
} from '@ant-design/icons';
import config from '../config';

const { Header } = Layout;

const AppHeader = () => {
  const location = useLocation();
  const { company } = config;
  
  // 根据当前路径确定选中的菜单项
  const getSelectedKey = () => {
    const path = location.pathname;
    if (path === '/') return '1';
    if (path.startsWith('/products')) return '2';
    return '1';
  };

  return (
    <Header style={{ position: 'fixed', zIndex: 1, width: '100%', display: 'flex', alignItems: 'center' }}>
      <div className="logo">
        <img 
          src="/Icon.jpg" 
          alt="Logo" 
          style={{ 
            height: '32px', 
            width: '32px', 
            marginRight: '12px',
            borderRadius: '4px',
            objectFit: 'contain'
          }} 
        />
        {company.systemName}
      </div>
      <Menu
        theme="dark"
        mode="horizontal"
        selectedKeys={[getSelectedKey()]}
        items={[
          {
            key: '1',
            icon: <DashboardOutlined />,
            label: <Link to="/">仪表盘</Link>,
          },
          {
            key: '2',
            icon: <AppstoreOutlined />,
            label: <Link to="/products">产品管理</Link>,
          }
        ]}
      />
    </Header>
  );
};

export default AppHeader;