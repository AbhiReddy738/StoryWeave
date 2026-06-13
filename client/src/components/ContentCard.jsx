import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, MessageSquare, Calendar, Sparkles, Eye } from 'lucide-react';
import CoverPlaceholder from './CoverPlaceholder';
import LazyImage from './LazyImage';
import { optimizeCloudinaryUrl } from '../utils/imageOptimizer';
import './ContentCard.css';

const ContentCard = ({
  type, // 'story' | 'song'
  title,
  author,
  authorId,
  summary,
  coverImage,
  genre,
  likes,
  comments,
  views,
  date,
  slug,
  id,
  actionButton,
  onClick
}) => {
  const navigate = useNavigate();

  const handleCardClick = () => {
    if (onClick) {
      onClick();
      return;
    }
    if (type === 'story') {
      const targetSlug = slug || id;
      navigate(`/card/${targetSlug}`);
    } else {
      navigate(`/song/${id}`);
    }
  };

  const handleAuthorClick = (e) => {
    e.stopPropagation();
    if (authorId) {
      navigate(`/author/${authorId}`);
    } else if (author) {
      navigate(`/author/${author}`);
    }
  };

  const likesCount = typeof likes === 'number' ? likes : (likes?.length || 0);
  const commentsCount = typeof comments === 'number' ? comments : (comments?.length || 0);

  return (
    <div 
      className={`content-card ${type}-card ${actionButton ? 'has-action' : ''}`} 
      onClick={handleCardClick}
    >
      <div className="card-cover">
        {coverImage ? (
          <>
            <LazyImage 
              src={optimizeCloudinaryUrl(coverImage, 400)} 
              alt={title} 
            />
            <div className="card-cover-overlay"></div>
            <span className="genre-badge" onClick={e => e.stopPropagation()}>
              {genre}
            </span>
          </>
        ) : (
          <CoverPlaceholder type={type} genre={genre} title={title} />
        )}
      </div>
      
      <div className="card-body">
        <div className="card-title-text" title={title}>{title}</div>
        <div 
          className="card-author-text"
          onClick={handleAuthorClick}
        >
          By {author || 'Unknown'}
        </div>
        
        <div className="card-middle-metrics">
          <span className="card-metriclikes">
            <Heart size={14} /> {likesCount}
          </span>
          {views !== undefined && (
            <span className="card-metricviews" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <Eye size={14} /> {views}
            </span>
          )}
          {type === 'story' && comments !== undefined && (
            <span className="card-metriccomments">
              <MessageSquare size={14} /> {commentsCount}
            </span>
          )}
          {type === 'song' && comments !== undefined && (
            <span className="card-metriccomments">
              <Sparkles size={14} /> {commentsCount} contributions
            </span>
          )}
          {date && (
            <span className="card-metricdate">
              <Calendar size={14} /> {new Date(date).toLocaleDateString()}
            </span>
          )}
        </div>
        
        {summary && (
          <div className="card-summary-box">
            <p className="card-summary-heading">{type === 'song' ? 'Lyrics' : 'Summary'}</p>
            <p className="card-summary-lines">{summary}</p>
          </div>
        )}
        
        {actionButton && (
          <div className="card-action-wrapper" onClick={e => e.stopPropagation()}>
            {actionButton}
          </div>
        )}
      </div>
    </div>
  );
};

export default ContentCard;
