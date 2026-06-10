import { useState, useEffect } from 'react';
import axios from 'axios';
import './SavedPage.css';

const SavedPage = ({ collapsed }) => {

  const [activeTab, setActiveTab] = useState('stories');
  const [savedStories, setSavedStories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [savedSongs] = useState([]);

  useEffect(() => {
    const fetchSavedStories = async () => {
      const userStr = localStorage.getItem('user');
      if (!userStr) {
        setError("Please login to see your saved stories");
        setLoading(false);
        return;
      }
      const userObj = JSON.parse(userStr);
      const userId = userObj._id;

      try {
        const response = await axios.get(`https://storyweave-fxdt.onrender.com/api/story/saved/${userId}`);
        setSavedStories(response.data);
      } catch (err) {
        setError("Error loading saved stories");
      } finally {
        setLoading(false);
      }
    };

    fetchSavedStories();
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
              ⏳ Loading Saved Stories...
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
                    >

                      <div className="story-name">
                        {story.title}
                      </div>

                      <div className="middle-box">

                        <span className="genre">
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
                        onClick={() =>
                          removeStory(story._id || story.id)
                        }
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
                      key={song.id}
                      className="saved-card"
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

                      </div>

                      <div className="summary">

                        <p className="summary-heading">
                          Lyrics
                        </p>

                        <p className="summary-lines">
                          {song.summary}
                        </p>

                      </div>

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