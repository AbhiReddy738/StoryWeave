import React from 'react';
import './SkeletonCard.css';

const SkeletonCard = ({ type = 'story' }) => {
  const isSong = type === 'song';

  return (
    <div className={`content-card skeleton-card skeleton ${isSong ? 'song-card' : 'story-card'}`}>
      <div className="card-cover loading-skeleton" />
      <div className="card-body">
        <div className="loading-skeleton" style={{ height: '26px', width: '80%', borderRadius: '6px', marginBottom: '8px' }} />
        <div className="loading-skeleton" style={{ height: '18px', width: '50%', borderRadius: '4px', marginBottom: '18px' }} />
        
        <div className="card-middle-metrics">
          <span className="loading-skeleton" style={{ height: '16px', width: '40px', borderRadius: '4px' }} />
          <span className="loading-skeleton" style={{ height: '16px', width: '50px', borderRadius: '4px' }} />
          <span className="loading-skeleton" style={{ height: '16px', width: '80px', borderRadius: '4px' }} />
        </div>
        
        <div className="card-summary-box" style={{ marginTop: '5px' }}>
          <div className="loading-skeleton" style={{ height: '18px', width: '30%', borderRadius: '4px', marginBottom: '10px' }} />
          <div className="loading-skeleton" style={{ height: '14px', width: '100%', borderRadius: '4px', marginBottom: '8px' }} />
          <div className="loading-skeleton" style={{ height: '14px', width: '90%', borderRadius: '4px' }} />
        </div>
      </div>
    </div>
  );
};

export default SkeletonCard;
