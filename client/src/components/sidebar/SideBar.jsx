import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import './SideBar.css';

const Sidebar = ({ collapsed, setCollapsed, sidebarOpen, setSidebarOpen }) => {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { isLoggedIn, logout } = useAuth();

  const handleNav = (path) => {
    navigate(path);
    if (setSidebarOpen) {
      setSidebarOpen(false);
    }
  };

  const handleLogout = () => {
    logout();
    if (setSidebarOpen) {
      setSidebarOpen(false);
    }
    navigate('/login');
  };

  return (
    <>
      {/* Mobile Sidebar backdrop */}
      {sidebarOpen && (
        <div 
          className="sidebar-backdrop" 
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`side-bar ${collapsed ? 'collapsed' : ''} ${sidebarOpen ? 'mobile-open' : ''}`}
      >
        <button
          className="menu-btn"
          onClick={() => setCollapsed(!collapsed)}
        >
          ☰
        </button>

        <button
          className="sidebar-btn"
          onClick={() => handleNav('/')}
        >
          <span className="icon">🏠</span>
          {(!collapsed || sidebarOpen) && (
            <span className="btn-text">Home</span>
          )}
        </button>

        <button
          className="sidebar-btn"
          onClick={() => handleNav('/trending')}
        >
          <span className="icon">🔥</span>
          {(!collapsed || sidebarOpen) && (
            <span className="btn-text">Trending</span>
          )}
        </button>

        <button
          className="sidebar-btn"
          onClick={() => handleNav('/post')}
        >
          <span className="icon">➕</span>
          {(!collapsed || sidebarOpen) && (
            <span className="btn-text">Post</span>
          )}
        </button>

        <button
          className="sidebar-btn"
          onClick={() => handleNav('/saved')}
        >
          <span className="icon">🔖</span>
          {(!collapsed || sidebarOpen) && (
            <span className="btn-text">Saved</span>
          )}
        </button>

        <button
          className="sidebar-btn"
          onClick={() => handleNav('/categories')}
        >
          <span className="icon">🏷️</span>
          {(!collapsed || sidebarOpen) && (
            <span className="btn-text">Categories</span>
          )}
        </button>

        {/* Mobile Quick Actions Block */}
        <div className="sidebar-mobile-actions">
          <button className="sidebar-mobile-btn theme-btn" onClick={toggleTheme}>
            <span className="icon">{theme === 'dark' ? '☀️' : '🌙'}</span>
            <span className="btn-text">{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
          </button>
          
          {!isLoggedIn ? (
            <>
              <button className="sidebar-mobile-btn login-btn" onClick={() => handleNav('/login')}>
                <span className="icon">🔑</span>
                <span className="btn-text">Login</span>
              </button>
              <button className="sidebar-mobile-btn register-btn" onClick={() => handleNav('/register')}>
                <span className="icon">📝</span>
                <span className="btn-text">Register</span>
              </button>
            </>
          ) : (
            <>
              <button className="sidebar-mobile-btn account-btn" onClick={() => handleNav('/account')}>
                <span className="icon">👤</span>
                <span className="btn-text">Account</span>
              </button>
              <button className="sidebar-mobile-btn logout-btn" onClick={handleLogout}>
                <span className="icon">🚪</span>
                <span className="btn-text">Logout</span>
              </button>
            </>
          )}
        </div>
      </aside>
    </>
  );
};

export default Sidebar;