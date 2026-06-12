import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_BASE_URL } from '../../config';
import { useAuth } from '../../context/AuthContext.jsx';
import SkeletonCard from '../../components/SkeletonCard';
import { getCache, setCache } from '../../utils/cache';
import { Sparkles, Users, BookOpen, Music, Search } from 'lucide-react';
import ContentCard from '../../components/ContentCard';
import './HomePage.css';

const STORY_API = `${API_BASE_URL}/story`;
const SONG_API  = `${API_BASE_URL}/song`;

const HomePage = ({ collapsed, searchTerm, activeGlobalTab, setActiveGlobalTab }) => {
  const navigate = useNavigate();
  const { isLoggedIn, user: authUser } = useAuth();

  // Feed type & lists
  const [feedType, setFeedType] = useState('foryou'); // 'foryou' | 'following'
  const [stories, setStories] = useState([]);
  const [songs,   setSongs]   = useState([]);
  const [followingStories, setFollowingStories] = useState([]);
  const [followingSongs, setFollowingSongs] = useState([]);
  
  const [loadingStories, setLoadingStories] = useState(true);
  const [loadingSongs,   setLoadingSongs]   = useState(true);
  const [loadingFollowing, setLoadingFollowing] = useState(false);

  // Active tab defaults to prop (global state) or 'stories'
  const activeTab = activeGlobalTab || 'stories';

  // Fetch Following Feed Content
  useEffect(() => {
    if (!isLoggedIn || feedType !== 'following') return;
    const fetchFollowingFeed = async () => {
      setLoadingFollowing(true);
      try {
        const res = await axios.get(`${API_BASE_URL}/user/following-feed`);
        setFollowingStories(res.data.stories || []);
        setFollowingSongs(res.data.songs || []);
      } catch (err) {
        console.error("Failed to fetch following feed", err);
      } finally {
        setLoadingFollowing(false);
      }
    };
    fetchFollowingFeed();
  }, [feedType, isLoggedIn]);

  // Fetch all stories & songs
  useEffect(() => {
    const fetchStories = async () => {
      const cached = getCache('homepage-stories');
      if (cached) {
        setStories(cached);
        setLoadingStories(false);
        return;
      }
      try {
        const res = await axios.get(`${STORY_API}/all`);
        setStories(res.data);
        setCache('homepage-stories', res.data);
      } catch (err) {
        console.error('[DEBUG - CLIENT] Failed to fetch stories:', err);
      } finally {
        setLoadingStories(false);
      }
    };
    fetchStories();
  }, []);

  useEffect(() => {
    const fetchSongs = async () => {
      const cached = getCache('homepage-songs');
      if (cached) {
        setSongs(cached);
        setLoadingSongs(false);
        return;
      }
      try {
        const res = await axios.get(`${SONG_API}/all`);
        setSongs(res.data);
        setCache('homepage-songs', res.data);
      } catch (err) {
        console.error('[DEBUG - CLIENT] Failed to fetch songs:', err);
      } finally {
        setLoadingSongs(false);
      }
    };
    fetchSongs();
  }, []);

  // Determine lists to show
  const currentStories = feedType === 'following' ? followingStories : stories;
  const currentSongs = feedType === 'following' ? followingSongs : songs;
  const currentLoading = feedType === 'following' ? loadingFollowing : (activeTab === 'stories' ? loadingStories : loadingSongs);

  const filteredStories = currentStories.filter(story =>
    (story.title?.toLowerCase().includes((searchTerm || '').toLowerCase())) ||
    (story.author?.toLowerCase().includes((searchTerm || '').toLowerCase())) ||
    (story.genre?.toLowerCase().includes((searchTerm || '').toLowerCase()))
  );

  const filteredSongs = currentSongs.filter(song =>
    (song.title?.toLowerCase().includes((searchTerm || '').toLowerCase())) ||
    (song.artistName?.toLowerCase().includes((searchTerm || '').toLowerCase())) ||
    (song.author?.toLowerCase().includes((searchTerm || '').toLowerCase())) ||
    (song.genre?.toLowerCase().includes((searchTerm || '').toLowerCase()))
  );

  return (
    <div className="page-container">
      <main className={`main-container ${collapsed ? 'main-expanded' : ''}`} style={{ paddingRight: '24px' }}>

        {/* ── Feed Selection ── */}
        {isLoggedIn && (
          <div className="feed-toggle-wrapper">
            <button 
              className={`feed-toggle-btn ${feedType === 'foryou' ? 'active-feed' : ''}`}
              onClick={() => setFeedType('foryou')}
            >
              <Sparkles size={14} />
              <span>For You</span>
            </button>
            <button 
              className={`feed-toggle-btn ${feedType === 'following' ? 'active-feed' : ''}`}
              onClick={() => setFeedType('following')}
            >
              <Users size={14} />
              <span>Following</span>
            </button>
          </div>
        )}

        {/* ── Global Toggle ── */}
        <div className="home-tabs">
          <button
            className={`tab-btn ${activeTab === 'stories' ? 'active-tab' : ''}`}
            onClick={() => setActiveGlobalTab('stories')}
          >
            <BookOpen size={15} />
            <span>Stories</span>
          </button>
          <button
            className={`tab-btn ${activeTab === 'songs' ? 'active-tab' : ''}`}
            onClick={() => setActiveGlobalTab('songs')}
          >
            <Music size={15} />
            <span>Songs</span>
          </button>
        </div>

        {/* ── STORIES TAB ── */}
        {activeTab === 'stories' && (
          <>
            {currentLoading && (
              <>
                <SkeletonCard type="story" />
                <SkeletonCard type="story" />
                <SkeletonCard type="story" />
              </>
            )}
            {!currentLoading && filteredStories.length === 0 && (
              <div className="empty-songs">
                {feedType === 'following' ? (
                  <>
                    <BookOpen size={32} />
                    <span>No stories from authors you follow yet.</span>
                  </>
                ) : (
                  <>
                    <Search size={32} />
                    <span>No Stories Found</span>
                  </>
                )}
              </div>
            )}
            {!currentLoading && filteredStories.map(story => (
              <ContentCard
                key={story._id}
                type="story"
                title={story.title}
                author={story.author}
                authorId={story.authorId}
                summary={story.summary}
                coverImage={story.coverImage}
                genre={story.genre}
                likes={story.likedBy?.length ?? story.likes ?? 0}
                comments={story.comments?.length || 0}
                date={story.createdAt}
                slug={story.slug}
                id={story._id}
              />
            ))}
          </>
        )}

        {/* ── SONGS TAB ── */}
        {activeTab === 'songs' && (
          <>
            {currentLoading && (
              <>
                <SkeletonCard type="song" />
                <SkeletonCard type="song" />
                <SkeletonCard type="song" />
              </>
            )}
            {!currentLoading && filteredSongs.length === 0 && (
              <div className="empty-songs">
                {feedType === 'following' ? (
                  <>
                    <Music size={32} />
                    <span>No songs from authors you follow yet.</span>
                  </>
                ) : (
                  <>
                    <Search size={32} />
                    <span>No Songs Found</span>
                  </>
                )}
              </div>
            )}
            {!currentLoading && filteredSongs.map(song => (
              <ContentCard
                key={song._id}
                type="song"
                title={song.title}
                author={song.artistName || song.author}
                authorId={song.authorId}
                summary={song.summary}
                coverImage={song.coverImage}
                genre={song.genre}
                likes={song.likes ?? 0}
                comments={song.contributions?.length || 0}
                date={song.createdAt}
                id={song._id}
              />
            ))}
          </>
        )}

      </main>
    </div>
  );
};

export default HomePage;