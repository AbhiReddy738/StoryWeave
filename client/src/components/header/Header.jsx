import { Link, useNavigate } from 'react-router-dom'
import './Header.css'
import logo from '../../assets/storyweaveLogo.jpeg'
import { useTheme } from '../../context/ThemeContext.jsx'
import { useAuth } from '../../context/AuthContext.jsx'

const Header = ({searchTerm, setSearchTerm, sidebarOpen, setSidebarOpen}) => {

  const navigate = useNavigate()
  const { theme, toggleTheme } = useTheme()
  const { isLoggedIn, logout } = useAuth()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <header className='header-container'>

      <button
        className="hamburger-btn"
        onClick={() => setSidebarOpen(!sidebarOpen)}
        aria-label="Toggle Menu"
        title="Toggle Menu"
      >
        ☰
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
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

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

    </header>
  )
}

export default Header