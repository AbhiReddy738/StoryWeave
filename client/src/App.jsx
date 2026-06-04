import { BrowserRouter, Routes, Route } from 'react-router-dom'
import LoginPage from './loginpage/LoginPage'
import RegisterPage from './registerpage/RegisterPage'
import HomePage from './homepage/HomePage'
import Header from './header/Header'

function App() {
  return (
    <BrowserRouter>
      <Header />
      <Routes>
        <Route path='/' element={<HomePage />} />
        <Route path='/login' element={<LoginPage />} />
        <Route path='/register' element={<RegisterPage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App