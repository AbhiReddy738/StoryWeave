import React, { useState, useEffect, useRef } from 'react';
import logoPlaceholder from '../assets/storyweaveLogo.png';

const LazyImage = ({ src, alt, className, fallback = logoPlaceholder, style = {}, ...props }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef(null);

  // Reset state when src changes
  useEffect(() => {
    setIsLoading(true);
    setHasError(false);
  }, [src]);

  // Handle cached images
  useEffect(() => {
    if (imgRef.current && imgRef.current.complete) {
      setIsLoading(false);
    }
  }, [src]);

  return (
    <div 
      className={`lazy-image-wrapper ${isLoading ? 'loading-skeleton' : ''}`} 
      style={{ 
        width: '100%', 
        height: '100%', 
        position: 'relative',
        borderRadius: 'inherit',
        overflow: 'hidden',
        background: isLoading ? 'var(--hover-color)' : 'transparent'
      }}
    >
      <img
        ref={imgRef}
        src={hasError || !src ? fallback : src}
        alt={alt}
        className={className}
        onLoad={() => setIsLoading(false)}
        onError={() => {
          setHasError(true);
          setIsLoading(false);
        }}
        loading="lazy"
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          opacity: isLoading ? 0 : 1,
          transition: 'opacity 0.3s ease, transform 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
          ...style
        }}
        {...props}
      />
    </div>
  );
};

export default LazyImage;
