import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from 'antd';
import AppHeader from './components/AppHeader';
import AppFooter from './components/AppFooter';
import Dashboard from './pages/Dashboard';
import ProductList from './pages/ProductList';
import ProductDetail from './pages/ProductDetail';
import NotFound from './pages/NotFound';
import './App.css';

const { Content } = Layout;

function App() {
  return (
    <Layout className="layout" style={{ minHeight: '100vh' }}>
      <AppHeader />
      <Content style={{ padding: '0 50px', marginTop: 64 }}>
        <div className="site-layout-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/products" element={<ProductList />} />
            <Route path="/products/:id" element={<ProductDetail />} />
            <Route path="/404" element={<NotFound />} />
            <Route path="*" element={<Navigate to="/404" replace />} />
          </Routes>
        </div>
      </Content>
      <AppFooter />
    </Layout>
  );
}

export default App;