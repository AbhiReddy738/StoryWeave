// import { StrictMode } from 'react'
import{BrowserRouter, Routes, Route} from 'react-router-dom'
// import { createRoot } from 'react-dom/client'
import LoginPage from './loginpage/LoginPage'
import RegisterPage from './registerpage/RegisterPage.jsx'
// import './index.css'
// import App from './App.jsx'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path='/login' element={<LoginPage /> } />
        <Route path='/register' element={<RegisterPage />} />
      </Routes>
    </BrowserRouter>

  )
}

export default App
