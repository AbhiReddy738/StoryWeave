import React from 'react';
import './CoverPlaceholder.css';

const CoverPlaceholder = ({ type, genre, title }) => {
  const isSong = type === 'song';
  const icon = isSong ? '🎵' : '📖';
  const text = 'No Cover Image';

  return (
    <div 
      className={`cover-placeholder-container ${isSong ? 'song-placeholder' : 'story-placeholder'}`}
      title={title || text}
    >
      <div className="placeholder-content">
        <span className="placeholder-icon">{icon}</span>
        <span className="placeholder-text">{text}</span>
      </div>
      {genre && (
        <span className="placeholder-genre-badge">{genre}</span>
      )}
    </div>
  );
};

export default CoverPlaceholder;
