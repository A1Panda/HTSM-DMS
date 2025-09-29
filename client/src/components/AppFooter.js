import React from 'react';
import { Layout } from 'antd';
import config from '../config';

const { Footer } = Layout;

const AppFooter = () => {
  const { company } = config;
  
  return (
    <Footer style={{ textAlign: 'center' }}>
      {company.systemName} ©{new Date().getFullYear()} {company.name}
    </Footer>
  );
};

export default AppFooter;