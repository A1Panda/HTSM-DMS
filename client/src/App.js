import React, { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from 'antd';
import AppHeader from './components/AppHeader';
import AppFooter from './components/AppFooter';
import ProductList from './pages/ProductList';
import ProductDetail from './pages/ProductDetail';
import BackupManagement from './pages/BackupManagement';
import AdvancedSearch from './pages/AdvancedSearch';
import NotFound from './pages/NotFound';
import './App.css';

const { Content } = Layout;

function App() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <Layout className="brand-layout" style={{ minHeight: '100vh' }}>
      <AppHeader collapsed={collapsed} onCollapse={setCollapsed} />
      <Layout className="brand-body">
        <Content className="brand-content">
          <div className="brand-content-inner">
            <Routes>
              <Route path="/" element={<Navigate to="/products" replace />} />
              <Route path="/products" element={<ProductList />} />
              <Route path="/products/:id" element={<ProductDetail />} />
              <Route path="/backup" element={<BackupManagement />} />
              <Route path="/search" element={<AdvancedSearch />} />
              <Route path="/404" element={<NotFound />} />
              <Route path="*" element={<Navigate to="/404" replace />} />
            </Routes>
          </div>
        </Content>
        <AppFooter />
      </Layout>
    </Layout>
  );
}

export default App;
