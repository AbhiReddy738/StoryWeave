import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Header.css';
import logo from '../../assets/storyweaveLogo.jpeg';
import { useTheme } from '../../context/ThemeContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';

const Header = ({searchTerm, setSearchTerm, sidebarOpen, setSidebarOpen}) => {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { isLoggedIn, logout } = useAuth();

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchInputRef = useRef(null);

  useEffect(() => {
    if (isSearchOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isSearchOpen]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsSearchOpen(false);
      }
    };
    if (isSearchOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isSearchOpen]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleOverlaySearchChange = (e) => {
    setSearchTerm(e.target.value);
    if (window.location.pathname !== '/') {
      navigate('/');
    }
  };

  return (
    <header className='header-container'>
      <button
        className="hamburger-btn"
        onClick={() => setSidebarOpen(!sidebarOpen)}
        aria-label="Toggle Menu"
        title="Toggle Menu"
      >
        ☰ <span>Menu</span>
      </button>

      <div className="logo">
        <Link to='/'>
          <img src={logo} alt="StoryWeave" />
        </Link>
      </div>

      <div className="search-box">
        <input
          type="text"
          placeholder='🔍 Search stories, lyrics, poetry...'
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            if (window.location.pathname !== '/') {
              navigate('/');
            }
          }}
        />
      </div>

      <button
        className="mobile-search-btn"
        onClick={() => setIsSearchOpen(true)}
        aria-label="Search"
        title="Search"
      >
        🔍 <span>Search</span>
      </button>

      <div className="header-actions">
        <button
          className="theme-toggle-btn"
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {theme === 'dark' ? '☀️ Light Mode' : '🌙 Dark Mode'}
        </button>

        {!isLoggedIn ? (
          <div className="login-register">
            <button
              className='log-reg'
              onClick={() => navigate('/login')}
            >
              Login
            </button>
            <button
              className='register-btn'
              onClick={() => navigate('/register')}
            >
              Register
            </button>
          </div>
        ) : (
          <div className="account">
            <button
              className='account-btn'
              onClick={() => navigate('/account')}
            >
              Account
            </button>
            <button
              className='logout-btn'
              onClick={handleLogout}
            >
              Logout
            </button>
          </div>
        )}
      </div>

      {isSearchOpen && (
        <div className="search-overlay" onClick={(e) => {
          if (e.target.className === 'search-overlay') {
            setIsSearchOpen(false);
          }
        }}>
          <div className="search-overlay-content">
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search stories, lyrics, poetry..."
              value={searchTerm}
              onChange={handleOverlaySearchChange}
            />
            <button
              className="search-overlay-close"
              onClick={() => setIsSearchOpen(false)}
              aria-label="Close search"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;