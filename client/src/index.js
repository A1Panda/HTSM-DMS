import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/es/locale/zh_CN';
import App from './App';
import './index.css';

const brandTheme = {
  token: {
    colorPrimary: '#1747E6',
    colorPrimaryHover: '#3D68F0',
    colorPrimaryActive: '#1037B8',
    colorPrimaryBg: '#E8EEFD',
    colorPrimaryBgHover: '#DCE6FC',
    colorPrimaryBorder: '#A9C0F6',
    colorPrimaryBorderHover: '#3D68F0',
    colorInfo: '#1747E6',
    colorSuccess: '#12A05C',
    colorWarning: '#C98A13',
    colorError: '#D93A3A',
    colorTextBase: '#12203A',
    colorText: '#12203A',
    colorTextSecondary: '#5A6B85',
    colorTextTertiary: '#8A98AE',
    colorTextQuaternary: '#B8C3D4',
    colorBgLayout: '#F3F6FB',
    colorBgContainer: '#FFFFFF',
    colorBgElevated: '#FFFFFF',
    colorBgSpotlight: '#101B30',
    colorBorder: '#E1E8F2',
    colorBorderSecondary: '#EFF3FA',
    borderRadius: 8,
    borderRadiusLG: 12,
    borderRadiusSM: 4,
    boxShadow: '0 1px 2px rgba(18,32,58,.04), 0 4px 12px rgba(18,32,58,.06)',
    boxShadowSecondary: '0 6px 20px rgba(18,32,58,.10)',
    fontSize: 14,
    controlHeight: 36,
    fontFamily:
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif",
  },
  components: {
    Layout: {
      headerBg: '#101B30',
      headerHeight: 64,
      siderBg: '#101B30',
      bodyBg: '#F3F6FB',
      footerBg: '#F3F6FB',
    },
    Menu: {
      darkItemBg: '#101B30',
      darkSubMenuItemBg: '#101B30',
      darkItemColor: '#93A3BF',
      darkItemHoverColor: '#FFFFFF',
      darkItemHoverBg: '#1A2A4A',
      darkItemSelectedBg: '#1747E6',
      darkItemSelectedColor: '#FFFFFF',
      itemSelectedBg: '#E8EEFD',
      itemSelectedColor: '#1747E6',
      itemHoverBg: '#F7F9FD',
      itemBorderRadius: 8,
    },
    Card: {
      borderRadiusLG: 12,
      paddingLG: 20,
    },
    Table: {
      headerBg: '#F7F9FD',
      headerColor: '#5A6B85',
      headerSplitColor: 'transparent',
      rowHoverBg: '#F7F9FD',
      borderColor: '#E1E8F2',
    },
    Modal: {
      borderRadiusLG: 12,
      titleFontSize: 16,
    },
    Button: {
      borderRadius: 8,
      borderRadiusLG: 8,
      fontWeight: 500,
    },
    Tag: {
      borderRadiusSM: 4,
    },
    Pagination: {
      itemActiveBg: '#1747E6',
      itemActiveBgDisabled: '#A9C0F6',
    },
  },
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <ConfigProvider locale={zhCN} theme={brandTheme}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ConfigProvider>
  </React.StrictMode>
);
