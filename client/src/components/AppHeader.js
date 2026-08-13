import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Layout, Menu, Tooltip } from 'antd';
import {
  AppstoreOutlined,
  DatabaseOutlined,
  SearchOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined
} from '@ant-design/icons';
import config from '../config';

const { Sider } = Layout;

const AppHeader = ({ collapsed, onCollapse }) => {
  const location = useLocation();
  const { company } = config;

  // 根据当前路径确定选中的菜单项
  const getSelectedKey = () => {
    const path = location.pathname;
    if (path.startsWith('/products')) return '1';
    if (path.startsWith('/search')) return '3';
    if (path.startsWith('/backup')) return '2';
    return '1';
  };

  const collapseBtn = (
    <button
      type="button"
      className="brand-sider-collapse"
      onClick={() => onCollapse(!collapsed)}
      aria-label={collapsed ? '展开侧边栏' : '折叠侧边栏'}
    >
      {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
    </button>
  );

  return (
    <Sider
      className="brand-sider"
      width={224}
      collapsedWidth={64}
      collapsed={collapsed}
      trigger={null}
    >
      {/* 品牌区 */}
      <Link to="/" className="brand-logo" title={collapsed ? company.systemName : undefined}>
        <img src="/Icon.png" alt="Logo" className="brand-logo-img" />
        {!collapsed && (
          <span className="brand-logo-name">{company.systemName}</span>
        )}
      </Link>

      {/* 主导航 */}
      <Menu
        theme="dark"
        mode="inline"
        selectedKeys={[getSelectedKey()]}
        items={[
          {
            key: '1',
            icon: <AppstoreOutlined />,
            label: <Link to="/products">产品管理</Link>,
          },
          {
            key: '2',
            icon: <DatabaseOutlined />,
            label: <Link to="/backup">数据备份</Link>,
          },
          {
            key: '3',
            icon: <SearchOutlined />,
            label: <Link to="/search">高级搜索</Link>,
          }
        ]}
        style={{ borderInlineEnd: 'none' }}
      />

      {/* 折叠按钮 */}
      <div className="brand-sider-footer">
        {collapsed ? (
          <Tooltip title="展开侧边栏" placement="right">
            {collapseBtn}
          </Tooltip>
        ) : (
          collapseBtn
        )}
      </div>
    </Sider>
  );
};

export default AppHeader;
