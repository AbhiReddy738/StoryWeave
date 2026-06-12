import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useState } from 'react';
import { useTheme } from './context/ThemeContext.jsx';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';

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
import AuthorProfile from './pages/authorprofile/AuthorProfile';

// Protected Route Wrapper Component
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        background: 'var(--bg-color)',
        color: 'var(--text-color)',
        fontSize: '20px'
      }}>
        ⏳ Checking session...
      </div>
    );
  }
  if (!user) {
    console.log('[DEBUG - CLIENT] Unauthenticated route access attempt. Redirecting to /login');
    return <Navigate to="/login" replace />;
  }
  return children;
};

function AppContent() {
  const [collapsed, setCollapsed] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const { theme } = useTheme();
  const { loading } = useAuth();

  // Unified persistent global Stories/Songs view toggle
  const [activeGlobalTab, setActiveGlobalTab] = useState(() => {
    return sessionStorage.getItem('storyweave-global-tab') || 'stories';
  });

  const handleTabChange = (tab) => {
    setActiveGlobalTab(tab);
    sessionStorage.setItem('storyweave-global-tab', tab);
  };

  // Render root-level loading screen while checking session validation
  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        background: theme === 'dark' ? '#121212' : '#f8f9fa',
        color: theme === 'dark' ? '#ffffff' : '#212529',
        fontSize: '22px',
        fontWeight: 'bold',
        fontFamily: 'sans-serif'
      }}>
        ⏳ Loading StoryWeave...
      </div>
    );
  }

  return (
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
            <ProtectedRoute>
              <PostPage 
                collapsed={collapsed} 
                activeGlobalTab={activeGlobalTab} 
                setActiveGlobalTab={handleTabChange} 
              />
            </ProtectedRoute>
          } 
        />
        <Route path="/card/:slug" element={<CardPage collapsed={collapsed} />} />
        <Route 
          path="/saved" 
          element={
            <ProtectedRoute>
              <SavedPage 
                collapsed={collapsed} 
                activeGlobalTab={activeGlobalTab} 
                setActiveGlobalTab={handleTabChange} 
              />
            </ProtectedRoute>
          } 
        />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route 
          path="/account" 
          element={
            <ProtectedRoute>
              <AccountPage 
                collapsed={collapsed} 
                activeGlobalTab={activeGlobalTab} 
                setActiveGlobalTab={handleTabChange} 
              />
            </ProtectedRoute>
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
        <Route path="/author/:id" element={<AuthorProfile collapsed={collapsed} />} />
      </Routes>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;