import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_BASE_URL } from '../../config';
import LazyImage from '../../components/LazyImage';
import CoverPlaceholder from '../../components/CoverPlaceholder';
import SkeletonCard from '../../components/SkeletonCard';
import { getCache, setCache } from '../../utils/cache';
import { optimizeCloudinaryUrl } from '../../utils/imageOptimizer';
import './CategoriesPage.css';

const STORY_GENRES = [
  { name: 'Fantasy', icon: '🔮' },
  { name: 'Science Fiction', icon: '🚀' },
  { name: 'Romance', icon: '💖' },
  { name: 'Mystery', icon: '🕵️' },
  { name: 'Thriller', icon: '🔪' },
  { name: 'Horror', icon: '👻' },
  { name: 'Adventure', icon: '🏕️' },
  { name: 'Historical Fiction', icon: '📜' },
  { name: 'Literary Fiction', icon: '📚' },
  { name: 'Young Adult', icon: '🎒' },
  { name: 'Children', icon: '🧸' },
  { name: 'Comedy', icon: '😂' },
  { name: 'Drama', icon: '🎭' },
  { name: 'Poetry', icon: '✍️' },
  { name: 'Other', icon: '✨' }
];

const SONG_GENRES = [
  { name: 'Pop', icon: '🎤' },
  { name: 'Rock', icon: '🎸' },
  { name: 'Hip-Hop', icon: '🎧' },
  { name: 'Rap', icon: '🔥' },
  { name: 'Classical', icon: '🎻' },
  { name: 'Lo-Fi', icon: '☕' },
  { name: 'Electronic', icon: '⚡' },
  { name: 'Jazz', icon: '🎷' },
  { name: 'Indie', icon: '🌿' },
  { name: 'R&B', icon: '💿' }
];

const CategoriesPage = ({ collapsed, activeGlobalTab, setActiveGlobalTab }) => {
  const navigate = useNavigate();
  const [selectedGenre, setSelectedGenre] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  // Clear selected genre on tab toggle
  useEffect(() => {
    setSelectedGenre(null);
    setItems([]);
  }, [activeGlobalTab]);

  const genresMatch = (itemGenre, targetGenre) => {
    if (!itemGenre || !targetGenre) return false;
    const ig = itemGenre.toLowerCase().trim();
    const tg = targetGenre.toLowerCase().trim();
    if (ig === tg) return true;
    if ((ig === 'sci-fi' || ig === 'science fiction') && (tg === 'sci-fi' || tg === 'science fiction')) {
      return true;
    }
    return false;
  };

  // Load items when a genre is selected
  useEffect(() => {
    if (!selectedGenre) return;

    const fetchFiltered = async () => {
      setLoading(true);
      try {
        if (activeGlobalTab === 'stories') {
          let data;
          const cached = getCache('homepage-stories');
          if (cached) {
            data = cached;
          } else {
            const res = await axios.get(`${API_BASE_URL}/story/all`);
            data = res.data;
            setCache('homepage-stories', data);
          }
          const filtered = data.filter(s => genresMatch(s.genre, selectedGenre));
          setItems(filtered);
        } else {
          let data;
          const cached = getCache('homepage-songs');
          if (cached) {
            data = cached;
          } else {
            const res = await axios.get(`${API_BASE_URL}/song/all`);
            data = res.data;
            setCache('homepage-songs', data);
          }
          const filtered = data.filter(s => genresMatch(s.genre, selectedGenre));
          setItems(filtered);
        }
      } catch (err) {
        // silent
      } finally {
        setLoading(false);
      }
    };

    fetchFiltered();
  }, [selectedGenre, activeGlobalTab]);

  const handleCardClick = (item) => {
    if (activeGlobalTab === 'stories') {
      navigate(`/card/${item.slug}-${item._id}`);
    } else {
      navigate(`/song/${item._id}`);
    }
  };

  const handleSaveToggle = async (e, songId, isCurrentlySaved) => {
    e.stopPropagation();
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user?._id) return;
    try {
      await axios.put(`${API_BASE_URL}/song/save/${songId}`, { userId: user._id });
      // Reload items to show updated state
      const res = await axios.get(`${API_BASE_URL}/song/all`);
      const filtered = res.data.filter(s => s.genre?.toLowerCase() === selectedGenre.toLowerCase());
      setItems(filtered);
    } catch {
      // silent
    }
  };

  const genres = activeGlobalTab === 'stories' ? STORY_GENRES : SONG_GENRES;
  const user = JSON.parse(localStorage.getItem('user'));

  return (
    <div className="categories-page">
      <div className={`categories-container ${collapsed ? 'categories-expanded' : ''}`}>
        
        {/* Global Stories/Songs view toggle */}
        <div className="global-toggle-pill">
          <button 
            className={`toggle-tab-btn ${activeGlobalTab === 'stories' ? 'active' : ''}`}
            onClick={() => setActiveGlobalTab('stories')}
          >
            📖 Stories
          </button>
          <button 
            className={`toggle-tab-btn ${activeGlobalTab === 'songs' ? 'active' : ''}`}
            onClick={() => setActiveGlobalTab('songs')}
          >
            🎵 Songs
          </button>
        </div>

        <h1 className="categories-title">
          {activeGlobalTab === 'stories' ? 'Story Categories' : 'Song Categories'}
        </h1>

        {/* Categories Grid */}
        <div className="categories-grid">
          {genres.map((g) => (
            <div 
              key={g.name}
              className={`category-pill-card ${selectedGenre === g.name ? 'selected' : ''}`}
              onClick={() => setSelectedGenre(g.name)}
            >
              <span className="category-card-icon">{g.icon}</span>
              <span className="category-card-name">{g.name}</span>
            </div>
          ))}
        </div>

        {/* Filtered Content Grid */}
        {selectedGenre && (
          <div className="filtered-results-section">
            <div className="results-header">
              <h2>{selectedGenre} {activeGlobalTab === 'stories' ? 'Stories' : 'Songs'}</h2>
              <button className="clear-filter-btn" onClick={() => setSelectedGenre(null)}>✕ Clear Filter</button>
            </div>

            {loading ? (
              <div className="category-cards-grid">
                <SkeletonCard type={activeGlobalTab === 'stories' ? 'story' : 'song'} />
                <SkeletonCard type={activeGlobalTab === 'stories' ? 'story' : 'song'} />
                <SkeletonCard type={activeGlobalTab === 'stories' ? 'story' : 'song'} />
              </div>
            ) : items.length === 0 ? (
              <div className="empty-category-results">
                No {activeGlobalTab === 'stories' ? 'stories' : 'songs'} available in this category yet.
              </div>
            ) : (
              <div className="category-cards-grid">
                {items.map((item) => {
                  if (activeGlobalTab === 'stories') {
                    return (
                      <div 
                        key={item._id}
                        className="story-list-card book-card"
                        onClick={() => handleCardClick(item)}
                      >
                        <div className="card-cover">
                          {item.coverImage ? (
                            <>
                              <LazyImage 
                                src={optimizeCloudinaryUrl(item.coverImage, 400)} 
                                alt={item.title} 
                              />
                              <div className="card-cover-overlay"></div>
                              <span className="genre-badge" onClick={e => e.stopPropagation()}>
                                {item.genre}
                              </span>
                            </>
                          ) : (
                            <CoverPlaceholder type="story" genre={item.genre} title={item.title} />
                          )}
                        </div>
                        <div className="book-card-body">
                          <div className="story-name" title={item.title}>{item.title}</div>
                          <div 
                            className="story-author"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(item.authorId ? `/author/${item.authorId}` : `/author/${item.author || 'Unknown'}`);
                            }}
                            style={{ cursor: 'pointer', textDecoration: 'underline' }}
                          >
                            By {item.author || 'Unknown'}
                          </div>
                          <div className="middle-box">
                            <span className="likes">❤️ {item.likedBy?.length ?? item.likes ?? 0}</span>
                            <span className="comments-count">💬 {item.comments?.length || 0}</span>
                            <span className="posted-on">
                              📅 {new Date(item.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="summary">
                            <p className="summary-heading">Summary</p>
                            <p className="summary-lines">{item.summary || 'No summary available.'}</p>
                          </div>
                        </div>
                      </div>
                    );
                  } else {
                    const isSaved = user?._id ? (item.savedBy || []).some(id => id.toString() === user._id) : false;
                    return (
                      <div 
                        key={item._id}
                        className="category-song-card"
                        onClick={() => handleCardClick(item)}
                      >
                        {item.coverImage ? (
                          <div className="song-card-img" style={{ backgroundImage: `url(${optimizeCloudinaryUrl(item.coverImage, 400)})` }} />
                        ) : (
                          <div className="song-card-img" style={{ border: 'none', background: 'none', boxShadow: 'none' }}>
                            <CoverPlaceholder type="song" genre={item.genre} title={item.title} />
                          </div>
                        )}
                        <div className="song-card-info">
                          <div className="song-title">{item.title}</div>
                          <div 
                            className="song-artist"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(item.authorId ? `/author/${item.authorId}` : `/author/${item.artistName || item.author}`);
                            }}
                            style={{ cursor: 'pointer', textDecoration: 'underline' }}
                          >
                            {item.artistName || item.author}
                          </div>
                          <div className="song-meta">
                            <span className="song-genre">{item.genre}</span>
                            <span className="song-likes">❤️ {item.likes || 0}</span>
                            <span className="song-contributions">✍️ {item.contributions?.length || 0}</span>
                          </div>
                        </div>
                        <div className="song-card-actions" onClick={e => e.stopPropagation()}>
                          <button 
                            className={`song-save-btn ${isSaved ? 'saved' : ''}`}
                            onClick={(e) => handleSaveToggle(e, item._id, isSaved)}
                          >
                            {isSaved ? '🔖 Saved' : '🔖 Save'}
                          </button>
                        </div>
                      </div>
                    );
                  }
                })}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
};

export default CategoriesPage;
