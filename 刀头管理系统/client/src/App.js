import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from 'antd';
import AppHeader from './components/Layout/AppHeader';
import AppSider from './components/Layout/AppSider';
import AppFooter from './components/Layout/AppFooter';

// 页面组件
import Dashboard from './pages/Dashboard';
import ToolHeadManagement from './pages/ToolHeadManagement';
import ToolHeadDetail from './pages/ToolHeadDetail';
import InventoryManagement from './pages/InventoryManagement';
import UsageTracking from './pages/UsageTracking';
import MaintenanceManagement from './pages/MaintenanceManagement';
import SupplierManagement from './pages/SupplierManagement';
import Reports from './pages/Reports';
import NotFound from './pages/NotFound';

import './App.css';

const { Content } = Layout;

function App() {
  return (
    <Layout className="app-layout">
      <AppHeader />
      <Layout>
        <AppSider />
        <Layout style={{ padding: '0 24px 24px' }}>
          <Content className="app-content">
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/toolheads" element={<ToolHeadManagement />} />
              <Route path="/toolheads/:id" element={<ToolHeadDetail />} />
              <Route path="/inventory" element={<InventoryManagement />} />
              <Route path="/usage" element={<UsageTracking />} />
              <Route path="/maintenance" element={<MaintenanceManagement />} />
              <Route path="/suppliers" element={<SupplierManagement />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Content>
          <AppFooter />
        </Layout>
      </Layout>
    </Layout>
  );
}

export default App;
