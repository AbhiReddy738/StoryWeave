import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, Sun, Moon, LogIn, LogOut, UserRound, UserPlus, Menu, X } from 'lucide-react';
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
        <Menu size={18} />
        <span>Menu</span>
      </button>

      <div className="logo">
        <Link to='/'>
          <img src={logo} alt="StoryWeave" />
        </Link>
      </div>

      <div className="search-box">
        <Search size={18} className="search-icon" />
        <input
          type="text"
          placeholder='Search stories, lyrics, poetry...'
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
        <Search size={18} />
        <span>Search</span>
      </button>

      <div className="header-actions">
        <button
          className="theme-toggle-btn"
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
          <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
        </button>

        {!isLoggedIn ? (
          <div className="login-register">
            <button
              className='log-reg'
              onClick={() => navigate('/login')}
            >
              <LogIn size={15} />
              <span>Login</span>
            </button>
            <button
              className='register-btn'
              onClick={() => navigate('/register')}
            >
              <UserPlus size={15} />
              <span>Register</span>
            </button>
          </div>
        ) : (
          <div className="account">
            <button
              className='account-btn'
              onClick={() => navigate('/account')}
            >
              <UserRound size={15} />
              <span>Account</span>
            </button>
            <button
              className='logout-btn'
              onClick={handleLogout}
            >
              <LogOut size={15} />
              <span>Logout</span>
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
            <div style={{ position: 'relative', width: '100%' }}>
              <Search size={22} className="search-overlay-icon" />
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
                <X size={20} />
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;