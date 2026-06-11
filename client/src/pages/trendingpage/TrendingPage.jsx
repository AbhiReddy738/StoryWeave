import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_BASE_URL } from '../../config';
import LazyImage from '../../components/LazyImage';
import './TrendingPage.css';

const TrendingPage = ({ collapsed }) => {
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('stories');
  const [stories, setStories] = useState([]);
  const [songs, setSongs] = useState([]);

  useEffect(() => {
    const fetchStories = async () => {
      try {
        const response = await axios.get(
          `${API_BASE_URL}/story/all`
        );
        const sortedStories = response.data.sort(
          (a, b) => b.likes - a.likes
        );
        setStories(sortedStories);
      } catch (err) {
        console.log(err);
      }
    };

    const fetchSongs = async () => {
      try {
        const response = await axios.get(
          `${API_BASE_URL}/song/trending`
        );
        setSongs(response.data);
      } catch (err) {
        console.log(err);
      }
    };

    fetchStories();
    fetchSongs();
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
            {stories.map((story) => (
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
                  <div className="story-name" title={story.title}>
                    {story.title}
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
          songs.length > 0 ? (
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