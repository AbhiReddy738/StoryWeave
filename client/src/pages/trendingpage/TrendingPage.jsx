import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_BASE_URL } from '../../config';
import LazyImage from '../../components/LazyImage';
import CoverPlaceholder from '../../components/CoverPlaceholder';
import SkeletonCard from '../../components/SkeletonCard';
import { getCache, setCache } from '../../utils/cache';
import { optimizeCloudinaryUrl } from '../../utils/imageOptimizer';
import './TrendingPage.css';

const TrendingPage = ({ collapsed }) => {
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('stories');
  const [stories, setStories] = useState([]);
  const [songs, setSongs] = useState([]);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTrendingData = async () => {
      setLoading(true);
      const cachedStories = getCache('trending-stories');
      const cachedSongs = getCache('trending-songs');
      
      if (cachedStories && cachedSongs) {
        setStories(cachedStories);
        setSongs(cachedSongs);
        setLoading(false);
        return;
      }

      try {
        const [storiesRes, songsRes] = await Promise.all([
          axios.get(`${API_BASE_URL}/story/trending`),
          axios.get(`${API_BASE_URL}/song/trending`)
        ]);
        setStories(storiesRes.data);
        setSongs(songsRes.data);
        setCache('trending-stories', storiesRes.data);
        setCache('trending-songs', songsRes.data);
      } catch (err) {
        console.error("Failed to fetch trending data", err);
      } finally {
        setLoading(false);
      }
    };

    fetchTrendingData();
  }, []);

  return (
    <div className="trending-page">
      <div
        className={`trending-container ${
          collapsed ? 'trending-expanded' : ''
        }`}
      >
        <h1 className="trending-title">
          Trending
        </h1>

        <div className="tab-box">
          <button
            className={
              activeTab === 'stories'
                ? 'tab-btn active-tab'
                : 'tab-btn'
            }
            onClick={() => setActiveTab('stories')}
          >
            Stories
          </button>

          <button
            className={
              activeTab === 'lyrics'
                ? 'tab-btn active-tab'
                : 'tab-btn'
            }
            onClick={() => setActiveTab('lyrics')}
          >
            Lyrics
          </button>
        </div>

        {activeTab === 'stories' && (
          <div className="cards-grid">
            {loading ? (
              <>
                <SkeletonCard type="story" />
                <SkeletonCard type="story" />
                <SkeletonCard type="story" />
              </>
            ) : stories.map((story) => (
              <div
                key={story._id}
                className="card-container book-card"
                onClick={() =>
                  navigate(
                    `/card/${story.slug}-${story._id}`
                  )
                }
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
                  <div className="story-name" title={story.title}>
                    {story.title}
                  </div>
                  <div 
                    className="story-author"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(story.authorId ? `/author/${story.authorId}` : `/author/${story.author || 'Unknown'}`);
                    }}
                    style={{ cursor: 'pointer', fontSize: '13px', color: 'var(--secondary-text)', marginBottom: '8px', textDecoration: 'underline' }}
                  >
                    By {story.author || 'Unknown'}
                  </div>
                  <div className="middle-box">
                    <span className="likes">
                      ❤️ {story.likes}
                    </span>
                    <span className="posted-on">
                      📅 {
                        new Date(
                          story.createdAt
                        ).toLocaleDateString()
                      }
                    </span>
                  </div>
                  <div className="summary">
                    <p className="summary-heading">
                      Summary
                    </p>
                    <p className="summary-lines">
                      {story.summary}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'lyrics' && (
          loading ? (
            <div className="cards-grid">
              <SkeletonCard type="song" />
              <SkeletonCard type="song" />
              <SkeletonCard type="song" />
            </div>
          ) : songs.length > 0 ? (
            <div className="cards-grid">
              {songs.map((song) => (
                <div
                  key={song._id}
                  className="card-container"
                  onClick={() =>
                    navigate(
                      `/song/${song._id}`
                    )
                  }
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
                    style={{ cursor: 'pointer', fontSize: '13px', color: 'var(--secondary-text)', marginBottom: '8px', textDecoration: 'underline' }}
                  >
                    By {song.artistName || song.author || 'Unknown'}
                  </div>

                  <div className="middle-box">
                    <span className="genre">
                      {song.genre}
                    </span>
                    <span className="likes">
                      ❤️ {song.likes}
                    </span>
                    <span className="posted-on">
                      ✍️ {song.contributions?.length || 0} contributions
                    </span>
                  </div>

                  <div className="summary">
                    <p className="summary-heading">
                      Summary
                    </p>
                    <p className="summary-lines">
                      {song.summary}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-box">
              No Lyrics Available Yet
            </div>
          )
        )}
      </div>
    </div>
  );
};

export default TrendingPage;