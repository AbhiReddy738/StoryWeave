import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useState } from 'react';

import Header from './components/header/Header';
import Sidebar from './components/sidebar/Sidebar';

import HomePage from './pages/homepage/HomePage';
import CardPage from './pages/cardpage/CardPage';
import LoginPage from './pages/loginpage/LoginPage';
import RegisterPage from './pages/registerpage/RegisterPage';

function App() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <BrowserRouter>
      <Header />

      <Sidebar
        collapsed={collapsed}
        setCollapsed={setCollapsed}
      />

      <Routes>
        <Route path="/" element={<HomePage collapsed={collapsed} />} />
        <Route path="/card" element={<CardPage collapsed={collapsed} />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;