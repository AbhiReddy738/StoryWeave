import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Compass, House } from 'lucide-react';
import './NotFoundPage.css';

const NotFoundPage = () => {
  const navigate = useNavigate();

  return (
    <div className="notfound-page">
      <div className="notfound-glass-card">
        <div className="notfound-icon-wrapper">
          <Compass className="notfound-icon" size={64} />
        </div>
        <h1 className="notfound-title">404</h1>
        <h2 className="notfound-subtitle">Lost in the Story?</h2>
        <p className="notfound-text">
          The page you are looking for doesn't exist or has been moved to another chapter. Let's get you back on track!
        </p>
        <button className="notfound-home-btn" onClick={() => navigate('/')}>
          <House size={18} />
          <span>Back to Home</span>
        </button>
      </div>
    </div>
  );
};

export default NotFoundPage;
