import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_BASE_URL } from '../../config';
import SkeletonCard from '../../components/SkeletonCard';
import { BookOpen, Music } from 'lucide-react';
import ContentCard from '../../components/ContentCard';
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
                    <ContentCard
                      key={story._id || story.id}
                      type="story"
                      title={story.title}
                      author={story.author || 'Unknown'}
                      authorId={story.authorId}
                      summary={story.summary}
                      coverImage={story.coverImage}
                      genre={story.genre}
                      likes={story.likedBy?.length ?? story.likes ?? 0}
                      comments={story.comments?.length || 0}
                      date={story.createdAt}
                      slug={story.slug}
                      id={story._id || story.id}
                      actionButton={
                        <button
                          className="remove-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeStory(story._id || story.id);
                          }}
                        >
                          Remove
                        </button>
                      }
                    />
                  ))
                ) : (
                  <div className="empty-box">
                    <BookOpen size={24} />
                    <span>No Saved Stories</span>
                  </div>
                )
              )}

              {activeTab === 'songs' && (
                savedSongs.length > 0 ? (
                  savedSongs.map((song) => (
                    <ContentCard
                      key={song._id || song.id}
                      type="song"
                      title={song.title}
                      author={song.artistName || song.author || 'Unknown'}
                      authorId={song.authorId}
                      summary={song.summary}
                      coverImage={song.coverImage}
                      genre={song.genre}
                      likes={song.likes}
                      comments={song.contributions?.length || 0}
                      date={song.createdAt}
                      id={song._id || song.id}
                      actionButton={
                        <button
                          className="remove-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeSong(song._id || song.id);
                          }}
                        >
                          Remove
                        </button>
                      }
                    />
                  ))
                ) : (
                  <div className="empty-box">
                    <Music size={24} />
                    <span>No Saved Songs</span>
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