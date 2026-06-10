import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
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
        const storiesResponse = await axios.get(`https://storyweave-fxdt.onrender.com/api/story/saved/${userId}`);
        setSavedStories(storiesResponse.data);

        const songsResponse = await axios.get(`https://storyweave-fxdt.onrender.com/api/song/saved/${userId}`);
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
      await axios.post(`https://storyweave-fxdt.onrender.com/api/story/unsave/${id}`, { userId });
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
      await axios.post(`https://storyweave-fxdt.onrender.com/api/song/unsave/${id}`, { userId });
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
            <div className="empty-box">
              ⏳ Loading Saved Items...
            </div>
          ) : error ? (
            <div className="empty-box">
              ⚠️ {error}
            </div>
          ) : (
            <>
              {activeTab === 'stories' && (
                savedStories.length > 0 ? (
                  savedStories.map((story) => (
                    <div
                      key={story._id || story.id}
                      className="saved-card"
                      onClick={() => navigate(`/card/${story.slug}-${story._id}`)}
                      style={{ cursor: 'pointer' }}
                    >
                      <div className="story-name">
                        {story.title}
                      </div>

                      <div className="middle-box">
                        <span className="genre" onClick={e => e.stopPropagation()}>
                          {story.genre}
                        </span>

                        <span className="likes">
                          ❤️ {story.likes}
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