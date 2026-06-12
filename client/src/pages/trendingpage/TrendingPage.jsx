import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_BASE_URL } from '../../config';
import SkeletonCard from '../../components/SkeletonCard';
import { getCache, setCache } from '../../utils/cache';
import { BookOpen, Music } from 'lucide-react';
import ContentCard from '../../components/ContentCard';
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
            <BookOpen size={14} />
            <span>Stories</span>
          </button>

          <button
            className={
              activeTab === 'lyrics'
                ? 'tab-btn active-tab'
                : 'tab-btn'
            }
            onClick={() => setActiveTab('lyrics')}
          >
            <Music size={14} />
            <span>Lyrics</span>
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
              <ContentCard
                key={story._id}
                type="story"
                title={story.title}
                author={story.author}
                authorId={story.authorId}
                summary={story.summary}
                coverImage={story.coverImage}
                genre={story.genre}
                likes={story.likes}
                comments={story.comments?.length || 0}
                date={story.createdAt}
                slug={story.slug}
                id={story._id}
              />
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
                <ContentCard
                  key={song._id}
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
                  id={song._id}
                />
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