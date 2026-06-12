import React from 'react';
import './SkeletonCard.css';

const SkeletonCard = ({ type = 'story' }) => {
  const isSong = type === 'song';

  if (isSong) {
    return (
      <div className="song-card skeleton">
        <div className="song-card-cover loading-skeleton" />
        <div className="song-card-body">
          <div className="song-card-title loading-skeleton" style={{ height: '22px', width: '70%', borderRadius: '4px' }} />
          <div className="song-card-artist loading-skeleton" style={{ height: '16px', width: '40%', borderRadius: '4px', marginTop: '10px' }} />
          <div className="song-card-meta">
            <span className="loading-skeleton" style={{ height: '14px', width: '50px', borderRadius: '4px' }} />
            <span className="loading-skeleton" style={{ height: '14px', width: '40px', borderRadius: '4px' }} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card-container book-card skeleton">
      <div className="card-cover loading-skeleton" />
      <div className="book-card-body">
        <div className="story-name loading-skeleton" style={{ height: '26px', width: '80%', borderRadius: '4px' }} />
        <div className="story-author loading-skeleton" style={{ height: '18px', width: '50%', borderRadius: '4px', marginTop: '10px' }} />
        <div className="middle-box">
          <span className="loading-skeleton" style={{ height: '16px', width: '40px', borderRadius: '4px' }} />
          <span className="loading-skeleton" style={{ height: '16px', width: '50px', borderRadius: '4px' }} />
          <span className="loading-skeleton" style={{ height: '16px', width: '80px', borderRadius: '4px' }} />
        </div>
        <div className="summary" style={{ marginTop: '15px' }}>
          <div className="summary-heading loading-skeleton" style={{ height: '18px', width: '30%', borderRadius: '4px' }} />
          <div className="summary-lines loading-skeleton" style={{ height: '14px', width: '100%', borderRadius: '4px', marginTop: '8px' }} />
          <div className="summary-lines loading-skeleton" style={{ height: '14px', width: '90%', borderRadius: '4px', marginTop: '6px' }} />
        </div>
      </div>
    </div>
  );
};

export default SkeletonCard;
