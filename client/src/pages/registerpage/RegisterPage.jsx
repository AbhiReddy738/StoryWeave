import { useState } from 'react'
import './RegisterPage.css'
import { Link, useNavigate } from 'react-router-dom'
import axios from 'axios'

const RegisterPage = () => {

  const navigate = useNavigate();

  const [username, setUsername] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")

  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!username || !email || !password || !confirmPassword) {
      setError("Please enter all details")
      return
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match")
      return
    }

    try {
      setLoading(true)
      setError("")

      const res = await axios.post(
        "https://storyweave-fxdt.onrender.com/api/auth/register",
        {
          username,
          email,
          password
        }
      )

      console.log(res.data)

      localStorage.setItem("token", "registered")
      localStorage.setItem("username", username)

      setUsername("")
      setEmail("")
      setPassword("")
      setConfirmPassword("")

      alert("User Registered")

      navigate("/")
      window.location.reload()

    } catch (err) {
      console.log(err)

      if (err.response?.data?.message) {
        setError(err.response.data.message)
      } else {
        setError("Registration Failed")
      }

    } finally {
      setLoading(false)
    }
  }

  return (
    <div className='container'>
      <div className='sign-up-box'>

        <h2 className='title'>Welcome to StoryWeave</h2>
        <p className='subtitle'>Create your account</p>

        <form onSubmit={handleSubmit}>

          <div className="name">
            <label>Name</label>
            <input
              type="text"
              placeholder="Enter your name"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>

          <div className="email">
            <label>Email</label>
            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="password">
            <label>Password</label>

            <div className="password-input">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />

              <span
                className="eye-icon"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? "🙈" : "👁"}
              </span>
            </div>
          </div>

          <div className="password">
            <label>Confirm Password</label>

            <div className="password-input">
              <input
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Confirm your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />

              <span
                className="eye-icon"
                onClick={() =>
                  setShowConfirmPassword(!showConfirmPassword)
                }
              >
                {showConfirmPassword ? "🙈" : "👁"}
              </span>
            </div>

            {error && (
              <p className="error-message">
                {error}
              </p>
            )}
          </div>

          <div className="sign-up">
            <button
              type="submit"
              disabled={loading}
            >
              {loading ? "Registering..." : "Register"}
            </button>
          </div>

        </form>

        <p className="login-link">
          Already have an account? <Link to="/login">Login</Link>
        </p>

      </div>
    </div>
  )
}

export default RegisterPage