import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import './Header.css'
import logo from '../assets/storyweaveLogo.jpeg'

const Header = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token) {
      setIsLoggedIn(true)
    }
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('username')
    setIsLoggedIn(false)
    navigate('/login')
  }

  return (
    <header className='header-container'>

      <div className="logo">
        <Link to='/'>
          <img src={logo} alt="StoryWeave" />
        </Link>
      </div>

      <div className="search-box">
        <input
          type="text"
          placeholder='🔍 Search stories, lyrics, poetry...'
        />
      </div>

      <div className="header-actions">

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

            <div className="avatar">
              {localStorage.getItem("username")?.charAt(0).toUpperCase() || "A"}
            </div>

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