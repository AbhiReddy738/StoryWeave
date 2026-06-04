import { useState } from 'react'
import './LoginPage.css'
import { Link, useNavigate } from 'react-router-dom'
import axios from 'axios'

const LoginPage = () => {

  const navigate = useNavigate()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")

  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!email || !password) {
      setError("Please enter all details")
      return
    }

    try {
      setLoading(true)
      setError("")

      const res = await axios.post(
        "http://localhost:5000/api/auth/login",
        {
          email,
          password
        }
      )

      console.log(res.data)

      setEmail("")
      setPassword("")

      navigate("/")

    } catch (err) {

      if (err.response?.data?.message) {
        setError(err.response.data.message)
      } else {
        setError("Invalid Email or Password")
      }

    } finally {
      setLoading(false)
    }
  }

  return (
    <div className='container'>
      <div className='login-box'>

        <h2 className='title'>Welcome Back</h2>
        <p className='subtitle'>Login to StoryWeave</p>

        <form onSubmit={handleSubmit}>

          <div className='email'>
            <label>Email</label>
            <input
              type='email'
              placeholder='Enter your email'
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className='pass'>
            <label>Password</label>

            <div className='password-input'>
              <input
                type={showPassword ? "text" : "password"}
                placeholder='Enter your password'
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />

              <span
                className='eye-icon'
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? "🙈" : "👁"}
              </span>
            </div>

            {error && (
              <p className='error-message'>
                {error}
              </p>
            )}
          </div>

          <div className='signin'>
            <button
              type='submit'
              disabled={loading}
            >
              {loading ? "Logging in..." : "Login"}
            </button>
          </div>

        </form>

        <p className='register-link'>
          Don't have an account? <Link to='/register'>Register</Link>
        </p>

      </div>
    </div>
  )
}

export default LoginPage