import React from 'react';
import { BookOpen, Music } from 'lucide-react';
import './CoverPlaceholder.css';

const CoverPlaceholder = ({ type, genre, title }) => {
  const isSong = type === 'song';
  const text = 'No Cover Image';

  return (
    <div 
      className={`cover-placeholder-container ${isSong ? 'song-placeholder' : 'story-placeholder'}`}
      title={title || text}
    >
      <div className="placeholder-content">
        <span className="placeholder-icon">
          {isSong ? <span style={{ fontSize: '28px' }}>🎵</span> : <span style={{ fontSize: '28px' }}>📖</span>}
        </span>
        <span className="placeholder-text">{text}</span>
      </div>
      {genre && (
        <span className="placeholder-genre-badge">{genre}</span>
      )}
    </div>
  );
};

export default CoverPlaceholder;

