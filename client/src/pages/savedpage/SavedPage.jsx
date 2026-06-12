import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_BASE_URL } from '../../config';
import LazyImage from '../../components/LazyImage';
import CoverPlaceholder from '../../components/CoverPlaceholder';
import SkeletonCard from '../../components/SkeletonCard';
import { optimizeCloudinaryUrl } from '../../utils/imageOptimizer';
import './SavedPage.css';

const SavedPage = ({ collapsed }) => {
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('stories');
  const [savedStories, setSavedStories] = useState([]);
  const [savedSongs, setSavedSongs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchSavedData = async () => {
      const userStr = localStorage.getItem('user');
      if (!userStr) {
        setError("Please login to see your saved stories and songs");
        setLoading(false);
        return;
      }
      const userObj = JSON.parse(userStr);
      const userId = userObj._id;

      try {
        const storiesResponse = await axios.get(`${API_BASE_URL}/story/saved/${userId}`);
        setSavedStories(storiesResponse.data);

        const songsResponse = await axios.get(`${API_BASE_URL}/song/saved/${userId}`);
        setSavedSongs(songsResponse.data);
      } catch (err) {
        setError("Error loading saved items");
      } finally {
        setLoading(false);
      }
    };

    fetchSavedData();
  }, []);

  const removeStory = async (id) => {
    const userStr = localStorage.getItem('user');
    if (!userStr) return;
    const userObj = JSON.parse(userStr);
    const userId = userObj._id;

    try {
      await axios.post(`${API_BASE_URL}/story/unsave/${id}`, { userId });
      setSavedStories(savedStories.filter(story => (story._id || story.id) !== id));
    } catch (err) {
      // silent
    }
  };

  const removeSong = async (id) => {
    const userStr = localStorage.getItem('user');
    if (!userStr) return;
    const userObj = JSON.parse(userStr);
    const userId = userObj._id;

    try {
      await axios.post(`${API_BASE_URL}/song/unsave/${id}`, { userId });
      setSavedSongs(savedSongs.filter(song => (song._id || song.id) !== id));
    } catch (err) {
      // silent
    }
  };

  return (
    <div className="saved-page">
      <div
        className={`saved-container ${
          collapsed
            ? 'saved-expanded'
            : ''
        }`}
      >
        <div className="saved-tabs">
          <button
            className={
              activeTab === 'stories'
                ? 'saved-tab active-tab'
                : 'saved-tab'
            }
            onClick={() =>
              setActiveTab('stories')
            }
          >
            Saved Stories
          </button>

          <button
            className={
              activeTab === 'songs'
                ? 'saved-tab active-tab'
                : 'saved-tab'
            }
            onClick={() =>
              setActiveTab('songs')
            }
          >
            Saved Songs
          </button>
        </div>

        <div className="saved-grid">
          {loading ? (
            <>
              <SkeletonCard type={activeTab === 'stories' ? 'story' : 'song'} />
              <SkeletonCard type={activeTab === 'stories' ? 'story' : 'song'} />
              <SkeletonCard type={activeTab === 'stories' ? 'story' : 'song'} />
            </>
          ) : error ? (
            <div className="empty-box">
              {error}
            </div>
          ) : (
            <>
              {activeTab === 'stories' && (
                savedStories.length > 0 ? (
                  savedStories.map((story) => (
                    <div
                      key={story._id || story.id}
                      className="saved-card book-card"
                      onClick={() => navigate(`/card/${story.slug}-${story._id}`)}
                      style={{ cursor: 'pointer' }}
                    >
                      <div className="card-cover">
                        {story.coverImage ? (
                          <>
                            <LazyImage 
                              src={optimizeCloudinaryUrl(story.coverImage, 400)} 
                              alt={story.title} 
                            />
                            <div className="card-cover-overlay"></div>
                            <span className="genre-badge" onClick={e => e.stopPropagation()}>
                              {story.genre}
                            </span>
                          </>
                        ) : (
                          <CoverPlaceholder type="story" genre={story.genre} title={story.title} />
                        )}
                      </div>
                      <div className="book-card-body">
                        <div className="story-name" title={story.title}>{story.title}</div>
                        <div 
                          className="story-author"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(story.authorId ? `/author/${story.authorId}` : `/author/${story.author || 'Unknown'}`);
                          }}
                          style={{ cursor: 'pointer', textDecoration: 'underline' }}
                        >
                          By {story.author || 'Unknown'}
                        </div>
                        <div className="middle-box">
                          <span className="likes">❤️ {story.likedBy?.length ?? story.likes ?? 0}</span>
                          <span className="comments-count">💬 {story.comments?.length || 0}</span>
                          <span className="posted-on">
                            📅 {new Date(story.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="summary">
                          <p className="summary-heading">Summary</p>
                          <p className="summary-lines">{story.summary}</p>
                        </div>
                        <button
                          className="remove-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeStory(story._id || story.id);
                          }}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="empty-box">
                    📚 No Saved Stories
                  </div>
                )
              )}

              {activeTab === 'songs' && (
                savedSongs.length > 0 ? (
                  savedSongs.map((song) => (
                    <div
                      key={song._id || song.id}
                      className="saved-card"
                      onClick={() => navigate(`/song/${song._id || song.id}`)}
                      style={{ cursor: 'pointer' }}
                    >
                      <div className="story-name">
                        {song.title}
                      </div>
                      <div 
                        className="song-artist"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(song.authorId ? `/author/${song.authorId}` : `/author/${song.artistName || song.author || 'Unknown'}`);
                        }}
                        style={{ cursor: 'pointer', fontSize: '13px', color: 'var(--secondary-text)', marginTop: '4px', textDecoration: 'underline' }}
                      >
                        By {song.artistName || song.author || 'Unknown'}
                      </div>

                      <div className="middle-box">
                        <span className="genre" onClick={e => e.stopPropagation()}>
                          {song.genre}
                        </span>

                        <span className="likes">
                          ❤️ {song.likes}
                        </span>
                      </div>

                      <div className="summary">
                        <p className="summary-heading">
                          Lyrics
                        </p>

                        <p className="summary-lines">
                          {song.summary}
                        </p>
                      </div>

                      <button
                        className="remove-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeSong(song._id || song.id);
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="empty-box">
                    🎵 No Saved Songs
                  </div>
                )
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default SavedPage;