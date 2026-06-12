import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTheme } from '../../context/ThemeContext';
import LazyImage from '../LazyImage';
import CoverPlaceholder from '../CoverPlaceholder';
import { optimizeCloudinaryUrl } from '../../utils/imageOptimizer';
import './StoryReader.css';

const StoryReader = ({ story, onClose }) => {
  const { theme: appTheme } = useTheme();
  const [isClosing, setIsClosing] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);

  // Paragraph highlights state
  const [highlightedParagraphs, setHighlightedParagraphs] = useState([]);

  const readerRef = useRef(null);
  const scrollContainerRef = useRef(null);

  // Parse content: support both old string format and new block array
  const storyContent = story?.content;
  let finalParagraphs = [];

  if (typeof storyContent === 'string') {
    // Old format: split into paragraphs
    const paras = storyContent.split(/\r?\n\r?\n/).filter(p => p.trim() !== '');
    finalParagraphs = paras.length > 0
      ? paras.map((v, i) => ({ id: i, type: 'text', value: v }))
      : storyContent.split(/\r?\n/).filter(p => p.trim() !== '').map((v, i) => ({ id: i, type: 'text', value: v }));
  } else if (Array.isArray(storyContent)) {
    finalParagraphs = storyContent;
  }

  // Close animation trigger
  const handleClose = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
    }, 280); // matches the CSS closing duration
  }, [onClose]);

  // Escape key handler
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleClose]);

  // Watch for browser native fullscreen exits
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Fullscreen support
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      if (readerRef.current?.requestFullscreen) {
        readerRef.current.requestFullscreen();
        setIsFullscreen(true);
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        setIsFullscreen(false);
      }
    }
  };

  // Scroll tracking to toggle floating scroll-to-top button
  const handleScroll = (e) => {
    const scrollTop = e.target.scrollTop;
    setShowScrollTop(scrollTop > 400);
  };

  const scrollToTop = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Toggle paragraph highlights
  const toggleHighlight = (index) => {
    setHighlightedParagraphs((prev) => {
      if (prev.includes(index)) {
        return prev.filter((i) => i !== index);
      } else {
        return [...prev, index];
      }
    });
  };

  return (
    <div
      ref={readerRef}
      className={`story-reader-overlay theme-${appTheme || 'dark'} ${
        isClosing ? 'closing' : ''
      } ${isFullscreen ? 'fullscreen-active' : ''}`}
    >
      <div className="story-reader-paper">
        {/* Top Right Controls */}
        <div className="story-reader-actions">
          <button
            className="story-reader-action-btn"
            onClick={toggleFullscreen}
            title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
            aria-label="Toggle Fullscreen"
          >
            {isFullscreen ? '↙️' : '↗️'}
          </button>
          <button
            className="story-reader-action-btn close-btn"
            onClick={handleClose}
            title="Close reader"
            aria-label="Close reader"
          >
            &times;
          </button>
        </div>

        {/* Main Distraction-Free Book Page */}
        <main
          ref={scrollContainerRef}
          className="story-reader-scrollable"
          onScroll={handleScroll}
        >
          {/* Minimalist Top Header Section */}
          <header className="story-reader-header">
            {/* Cover image inside reader header */}
            <div className="reader-cover-container">
              {story?.coverImage ? (
                <LazyImage 
                  src={optimizeCloudinaryUrl(story.coverImage, 400)} 
                  alt={story?.title} 
                  className="reader-cover-img"
                />
              ) : (
                <CoverPlaceholder type="story" genre={story?.genre} title={story?.title} />
              )}
            </div>
            <h1 className="story-reader-title">{story?.title || 'Untitled'}</h1>
            <div className="story-reader-meta">
              <span>By {story?.author || 'Unknown'}</span>
              {story?.genre && <span className="genre-tag">• {story.genre}</span>}
              {story?.createdAt && (
                <span>
                  • {new Date(story.createdAt).toLocaleDateString(undefined, {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </span>
              )}
            </div>
            {story?.summary && (
              <p className="story-reader-summary" style={{
                marginTop: '20px',
                fontStyle: 'italic',
                color: 'var(--reader-secondary-text)',
                lineHeight: '1.6',
                fontSize: '1.05rem',
                borderLeft: '3px solid var(--reader-accent)',
                paddingLeft: '15px',
                textAlign: 'left'
              }}>
                {story.summary}
              </p>
            )}
          </header>

          <article className="story-reader-body">
            {finalParagraphs.length === 0 && (
              <p style={{ fontStyle: 'italic', textAlign: 'center', opacity: 0.5 }}>
                No content available.
              </p>
            )}
            {finalParagraphs.map((block, idx) => {
              // image block
              if (block.type === 'image') {
                return (
                  <figure key={block.id ?? idx} className="reader-image-block" style={{ height: '350px' }}>
                    <LazyImage src={optimizeCloudinaryUrl(block.value, 800)} alt={`Story image ${idx + 1}`} />
                  </figure>
                );
              }
              // text block — handle both plain string and HTML from editor
              const isParaHighlighted = highlightedParagraphs.includes(idx);
              const isHtml = typeof block.value === 'string' && /<[a-z]/i.test(block.value);
              if (isHtml) {
                return (
                  <div
                    key={block.id ?? idx}
                    className={`story-reader-paragraph ${isParaHighlighted ? 'highlighted' : ''}`}
                    onClick={() => toggleHighlight(idx)}
                    dangerouslySetInnerHTML={{ __html: block.value }}
                  />
                );
              }
              return (
                <p
                  key={block.id ?? idx}
                  className={`story-reader-paragraph ${isParaHighlighted ? 'highlighted' : ''}`}
                  onClick={() => toggleHighlight(idx)}
                >
                  {block.value}
                </p>
              );
            })}
          </article>
        </main>

        {/* Minimal Scroll To Top Action */}
        <button
          className={`scroll-to-top-btn ${showScrollTop ? 'visible' : ''}`}
          onClick={scrollToTop}
          title="Scroll to top"
          aria-label="Scroll to top"
        >
          ▲
        </button>
      </div>
    </div>
  );
};

export default StoryReader;
