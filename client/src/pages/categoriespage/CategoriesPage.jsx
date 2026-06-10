import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
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

  // Load items when a genre is selected
  useEffect(() => {
    if (!selectedGenre) return;

    const fetchFiltered = async () => {
      setLoading(true);
      try {
        if (activeGlobalTab === 'stories') {
          const res = await axios.get('https://storyweave-fxdt.onrender.com/api/story/all');
          const filtered = res.data.filter(s => s.genre?.toLowerCase() === selectedGenre.toLowerCase());
          setItems(filtered);
        } else {
          const res = await axios.get('https://storyweave-fxdt.onrender.com/api/song/all');
          const filtered = res.data.filter(s => s.genre?.toLowerCase() === selectedGenre.toLowerCase());
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
      await axios.put(`https://storyweave-fxdt.onrender.com/api/song/save/${songId}`, { userId: user._id });
      // Reload items to show updated state
      const res = await axios.get('https://storyweave-fxdt.onrender.com/api/song/all');
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
              <div className="loading-results">Loading category content...</div>
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
                        className="story-list-card"
                        onClick={() => handleCardClick(item)}
                      >
                        <div className="story-name">{item.title}</div>
                        <div className="middle-box">
                          <span className="genre">{item.genre}</span>
                          <span className="likes">❤️ {item.likes || 0}</span>
                          <span className="posted-on">📅 {new Date(item.createdAt).toLocaleDateString()}</span>
                        </div>
                        <div className="summary">
                          <p className="summary-heading">Summary</p>
                          <p className="summary-lines">{item.summary || 'No summary available.'}</p>
                        </div>
                      </div>
                    );
                  } else {
                    const isSaved = user?._id ? (item.savedBy || []).some(id => id.toString() === user._id) : false;
                    return (
                      <div 
                        key={item._id}
                        className="spotify-song-card"
                        onClick={() => handleCardClick(item)}
                      >
                        <div className="song-card-img" style={{ backgroundImage: `url(${item.coverImage || 'https://via.placeholder.com/300'})` }} />
                        <div className="song-card-info">
                          <div className="song-title">{item.title}</div>
                          <div className="song-artist">{item.artist}</div>
                          <div className="song-meta">
                            <span className="song-genre">{item.genre}</span>
                            <span className="song-likes">❤️ {item.likes || 0}</span>
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
