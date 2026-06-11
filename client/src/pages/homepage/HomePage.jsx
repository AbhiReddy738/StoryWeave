import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_BASE_URL } from '../../config';
import LazyImage from '../../components/LazyImage';
import './HomePage.css';

const STORY_API = `${API_BASE_URL}/story`;
const SONG_API  = `${API_BASE_URL}/song`;

const HomePage = ({ collapsed, searchTerm, activeGlobalTab, setActiveGlobalTab }) => {
  const navigate = useNavigate();

  const [stories, setStories] = useState([]);
  const [songs,   setSongs]   = useState([]);
  const [loadingStories, setLoadingStories] = useState(true);
  const [loadingSongs,   setLoadingSongs]   = useState(true);

  // Active tab defaults to prop (global state) or 'stories'
  const activeTab = activeGlobalTab || 'stories';

  const filteredStories = stories.filter(story =>
    (story.title?.toLowerCase().includes((searchTerm || '').toLowerCase())) ||
    (story.author?.toLowerCase().includes((searchTerm || '').toLowerCase())) ||
    (story.genre?.toLowerCase().includes((searchTerm || '').toLowerCase()))
  );

  const filteredSongs = songs.filter(song =>
    (song.title?.toLowerCase().includes((searchTerm || '').toLowerCase())) ||
    (song.artistName?.toLowerCase().includes((searchTerm || '').toLowerCase())) ||
    (song.author?.toLowerCase().includes((searchTerm || '').toLowerCase())) ||
    (song.genre?.toLowerCase().includes((searchTerm || '').toLowerCase()))
  );

  useEffect(() => {
    const fetchStories = async () => {
      try {
        const res = await axios.get(`${STORY_API}/all`);
        console.log('[DEBUG - CLIENT] Stories fetched from API:', res.data);
        console.log('[DEBUG - CLIENT] Homepage story count:', res.data.length);
        setStories(res.data);
      } catch (err) {
        console.error('[DEBUG - CLIENT] Failed to fetch stories:', err);
      }
      finally { setLoadingStories(false); }
    };
    fetchStories();
  }, []);

  useEffect(() => {
    const fetchSongs = async () => {
      try {
        const res = await axios.get(`${SONG_API}/all`);
        console.log('[DEBUG - CLIENT] Songs fetched from API:', res.data);
        console.log('[DEBUG - CLIENT] Homepage song count:', res.data.length);
        setSongs(res.data);
      } catch (err) {
        console.error('[DEBUG - CLIENT] Failed to fetch songs:', err);
      }
      finally { setLoadingSongs(false); }
    };
    fetchSongs();
  }, []);

  return (
    <div className="page-container">
      <main className={`main-container ${collapsed ? 'main-expanded' : ''}`}>

        {/* ── Global Toggle ── */}
        <div className="home-tabs">
          <button
            className={`tab-btn ${activeTab === 'stories' ? 'active-tab' : ''}`}
            onClick={() => setActiveGlobalTab('stories')}
          >
            📖 Stories
          </button>
          <button
            className={`tab-btn ${activeTab === 'songs' ? 'active-tab' : ''}`}
            onClick={() => setActiveGlobalTab('songs')}
          >
            🎵 Songs
          </button>
        </div>

        {/* ── STORIES TAB ── */}
        {activeTab === 'stories' && (
          <>
            {loadingStories && (
              <div className="empty-songs">⏳ Loading stories...</div>
            )}
            {!loadingStories && filteredStories.length === 0 && (
              <div className="empty-songs">🔍 No Stories Found</div>
            )}
            {filteredStories.map(story => (
              <div
                key={story._id}
                className="card-container book-card"
                onClick={() => navigate(`/card/${story.slug}-${story._id}`)}
              >
                <div className="card-cover">
                  <LazyImage 
                    src={story.coverImage} 
                    alt={story.title} 
                  />
                  <div className="card-cover-overlay"></div>
                  <span className="genre-badge" onClick={e => e.stopPropagation()}>
                    {story.genre}
                  </span>
                </div>
                <div className="book-card-body">
                  <div className="story-name" title={story.title}>{story.title}</div>
                  <div className="story-author">By {story.author || 'Unknown'}</div>
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
                </div>
              </div>
            ))}
          </>
        )}

        {/* ── SONGS TAB ── */}
        {activeTab === 'songs' && (
          <>
            {loadingSongs && (
              <div className="empty-songs">⏳ Loading songs...</div>
            )}
            {!loadingSongs && filteredSongs.length === 0 && (
              <div className="empty-songs">🎵 No Songs Found</div>
            )}
            {filteredSongs.map(song => (
              <div
                key={song._id}
                className="song-card"
                onClick={() => navigate(`/song/${song._id}`)}
              >
                <div className="song-card-cover">
                  <LazyImage src={song.coverImage} alt={song.title} />
                  <div className="song-card-read-overlay">📝</div>
                </div>
                <div className="song-card-body">
                  <div className="song-card-title">{song.title}</div>
                  <div className="song-card-artist">
                    🎤 {song.artistName || song.author}
                  </div>
                  <div className="song-card-meta">
                    <span className="genre">{song.genre}</span>
                    <span className="likes">❤️ {song.likes ?? 0}</span>
                    <span className="posted-on">
                      ✍️ {(song.contributions?.length ?? 0)} contributions
                    </span>
                  </div>
                  {song.summary && (
                    <p className="song-card-summary">{song.summary}</p>
                  )}
                </div>
              </div>
            ))}
          </>
        )}

      </main>
    </div>
  );
};

export default HomePage;