import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useState } from 'react';
import { useTheme } from './context/ThemeContext.jsx';

import Header from './components/header/Header';
import Sidebar from './components/sidebar/SideBar';

import HomePage from './pages/homepage/HomePage';
import CardPage from './pages/cardpage/CardPage';
import LoginPage from './pages/loginpage/LoginPage';
import RegisterPage from './pages/registerpage/RegisterPage';
import TrendingPage from './pages/trendingpage/TrendingPage'; 
import PostPage from './pages/postpage/PostPage';
import AccountPage from './pages/accountpage/AccountPage';
import SavedPage from './pages/savedpage/SavedPage';
import CategoriesPage from './pages/categoriespage/CategoriesPage';
import SongPage from './pages/songpage/SongPage';

function App() {
  const [collapsed, setCollapsed] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const { theme } = useTheme();

  // Unified persistent global Stories/Songs view toggle
  const [activeGlobalTab, setActiveGlobalTab] = useState(() => {
    return sessionStorage.getItem('storyweave-global-tab') || 'stories';
  });

  const handleTabChange = (tab) => {
    setActiveGlobalTab(tab);
    sessionStorage.setItem('storyweave-global-tab', tab);
  };

  return (
    <BrowserRouter>
      <div className={`app-container ${theme === 'dark' ? 'dark-theme' : 'light-theme'} ${collapsed ? 'sidebar-collapsed' : ''}`}>
        <Header 
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm} 
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
        />

        <Sidebar
          collapsed={collapsed}
          setCollapsed={setCollapsed}
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
        />

        <Routes>
          <Route 
            path="/" 
            element={
              <HomePage 
                collapsed={collapsed} 
                searchTerm={searchTerm} 
                activeGlobalTab={activeGlobalTab} 
                setActiveGlobalTab={handleTabChange} 
              />
            } 
          />
          <Route 
            path="/trending" 
            element={
              <TrendingPage 
                collapsed={collapsed} 
                activeGlobalTab={activeGlobalTab} 
                setActiveGlobalTab={handleTabChange} 
              />
            } 
          />
          <Route 
            path="/post" 
            element={
              <PostPage 
                collapsed={collapsed} 
                activeGlobalTab={activeGlobalTab} 
                setActiveGlobalTab={handleTabChange} 
              />
            } 
          />
          <Route path="/card/:slug" element={<CardPage collapsed={collapsed} />} />
          <Route 
            path="/saved" 
            element={
              <SavedPage 
                collapsed={collapsed} 
                activeGlobalTab={activeGlobalTab} 
                setActiveGlobalTab={handleTabChange} 
              />
            } 
          />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route 
            path="/account" 
            element={
              <AccountPage 
                collapsed={collapsed} 
                activeGlobalTab={activeGlobalTab} 
                setActiveGlobalTab={handleTabChange} 
              />
            } 
          /> 
          <Route 
            path="/categories" 
            element={
              <CategoriesPage 
                collapsed={collapsed} 
                activeGlobalTab={activeGlobalTab} 
                setActiveGlobalTab={handleTabChange} 
              />
            } 
          />
          <Route path="/song/:id" element={<SongPage collapsed={collapsed} />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;