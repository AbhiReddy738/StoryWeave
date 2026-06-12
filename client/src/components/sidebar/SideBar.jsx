import { useNavigate, useLocation } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { 
  House, 
  TrendingUp, 
  SquarePen, 
  Bookmark, 
  LayoutGrid, 
  UserRound, 
  LogOut, 
  LogIn, 
  UserPlus, 
  Sun, 
  Moon,
  Menu
} from 'lucide-react';
import './SideBar.css';

const Sidebar = ({ collapsed, setCollapsed, sidebarOpen, setSidebarOpen }) => {
  const navigate = useNavigate();
  const location = useLocation();
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

  const isActive = (path) => location.pathname === path;

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
          aria-label="Toggle Sidebar"
        >
          <Menu size={20} />
        </button>

        <button
          className={`sidebar-btn ${isActive('/') ? 'active' : ''}`}
          onClick={() => handleNav('/')}
        >
          <span className="icon">
            <House size={18} />
          </span>
          {(!collapsed || sidebarOpen) && (
            <span className="btn-text">Home</span>
          )}
        </button>

        <button
          className={`sidebar-btn ${isActive('/trending') ? 'active' : ''}`}
          onClick={() => handleNav('/trending')}
        >
          <span className="icon">
            <TrendingUp size={18} />
          </span>
          {(!collapsed || sidebarOpen) && (
            <span className="btn-text">Trending</span>
          )}
        </button>

        <button
          className={`sidebar-btn ${isActive('/post') ? 'active' : ''}`}
          onClick={() => handleNav('/post')}
        >
          <span className="icon">
            <SquarePen size={18} />
          </span>
          {(!collapsed || sidebarOpen) && (
            <span className="btn-text">Post</span>
          )}
        </button>

        <button
          className={`sidebar-btn ${isActive('/saved') ? 'active' : ''}`}
          onClick={() => handleNav('/saved')}
        >
          <span className="icon">
            <Bookmark size={18} />
          </span>
          {(!collapsed || sidebarOpen) && (
            <span className="btn-text">Saved</span>
          )}
        </button>

        <button
          className={`sidebar-btn ${isActive('/categories') ? 'active' : ''}`}
          onClick={() => handleNav('/categories')}
        >
          <span className="icon">
            <LayoutGrid size={18} />
          </span>
          {(!collapsed || sidebarOpen) && (
            <span className="btn-text">Categories</span>
          )}
        </button>

        {/* Mobile Quick Actions Block */}
        <div className="sidebar-mobile-actions">
          <button className="sidebar-mobile-btn theme-btn" onClick={toggleTheme}>
            <span className="icon">
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </span>
            <span className="btn-text">{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
          </button>
          
          {!isLoggedIn ? (
            <>
              <button className="sidebar-mobile-btn login-btn" onClick={() => handleNav('/login')}>
                <span className="icon">
                  <LogIn size={18} />
                </span>
                <span className="btn-text">Login</span>
              </button>
              <button className="sidebar-mobile-btn register-btn" onClick={() => handleNav('/register')}>
                <span className="icon">
                  <UserPlus size={18} />
                </span>
                <span className="btn-text">Register</span>
              </button>
            </>
          ) : (
            <>
              <button className={`sidebar-mobile-btn account-btn ${isActive('/account') ? 'active' : ''}`} onClick={() => handleNav('/account')}>
                <span className="icon">
                  <UserRound size={18} />
                </span>
                <span className="btn-text">Account</span>
              </button>
              <button className="sidebar-mobile-btn logout-btn" onClick={handleLogout}>
                <span className="icon">
                  <LogOut size={18} />
                </span>
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