import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_BASE_URL } from '../../config';
import { useAuth } from '../../context/AuthContext.jsx';
import LazyImage from '../../components/LazyImage';
import CoverPlaceholder from '../../components/CoverPlaceholder';
import SkeletonCard from '../../components/SkeletonCard';
import { getCache, setCache } from '../../utils/cache';
import { optimizeCloudinaryUrl } from '../../utils/imageOptimizer';
import { Sparkles, Users, BookOpen, Music, Heart, MessageSquare, Calendar, Search, PenTool } from 'lucide-react';
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

  // Recommended sidebar state
  const [recommendedAuthors, setRecommendedAuthors] = useState([]);
  const [loadingRecommended, setLoadingRecommended] = useState(true);

  // Active tab defaults to prop (global state) or 'stories'
  const activeTab = activeGlobalTab || 'stories';

  // Fetch Recommended Authors
  useEffect(() => {
    const fetchRecommended = async () => {
      const cacheKey = `recommended-authors-${authUser?._id || 'anon'}`;
      const cached = getCache(cacheKey);
      if (cached) {
        setRecommendedAuthors(cached);
        setLoadingRecommended(false);
        return;
      }
      try {
        const res = await axios.get(`${API_BASE_URL}/user/recommended-authors`);
        setRecommendedAuthors(res.data || []);
        setCache(cacheKey, res.data || []);
      } catch (err) {
        console.error("Failed to fetch recommended authors", err);
      } finally {
        setLoadingRecommended(false);
      }
    };
    fetchRecommended();
  }, [authUser]);

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

  // Handle follow/unfollow in suggested sidebar
  const handleFollowRecommended = async (authorId, isCurrentlyFollowing) => {
    if (!isLoggedIn) {
      alert("Please log in to follow authors.");
      navigate('/login');
      return;
    }

    // Optimistic state update
    setRecommendedAuthors(prev => prev.map(author => {
      if (author._id === authorId) {
        const isFollowed = author.followers.some(id => id.toString() === authUser._id.toString());
        return {
          ...author,
          followers: isFollowed
            ? author.followers.filter(id => id.toString() !== authUser._id.toString())
            : [...author.followers, authUser._id]
        };
      }
      return author;
    }));

    try {
      const endpoint = isCurrentlyFollowing ? 'unfollow' : 'follow';
      await axios.post(`${API_BASE_URL}/user/${endpoint}/${authorId}`);
    } catch (err) {
      // Revert on failure
      setRecommendedAuthors(prev => prev.map(author => {
        if (author._id === authorId) {
          const isFollowed = author.followers.some(id => id.toString() === authUser._id.toString());
          return {
            ...author,
            followers: isFollowed
              ? author.followers.filter(id => id.toString() !== authUser._id.toString())
              : [...author.followers, authUser._id]
          };
        }
        return author;
      }));
      alert("Action failed. Please try again.");
    }
  };

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
      <main className={`main-container ${collapsed ? 'main-expanded' : ''}`} style={{ paddingRight: '12px' }}>

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
              <div
                key={story._id}
                className="card-container book-card"
                onClick={() => navigate(`/card/${story.slug}-${story._id}`)}
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
                    style={{ cursor: 'pointer', transition: 'color 0.2s', fontWeight: 600 }}
                  >
                    By {story.author || 'Unknown'}
                  </div>
                  <div className="middle-box">
                    <span className="likes"><Heart size={13} /> {story.likedBy?.length ?? story.likes ?? 0}</span>
                    <span className="comments-count"><MessageSquare size={13} /> {story.comments?.length || 0}</span>
                    <span className="posted-on">
                      <Calendar size={13} /> {new Date(story.createdAt).toLocaleDateString()}
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
              <div
                key={song._id}
                className="song-card"
                onClick={() => navigate(`/song/${song._id}`)}
              >
                <div className="song-card-cover">
                  {song.coverImage ? (
                    <>
                      <LazyImage src={optimizeCloudinaryUrl(song.coverImage, 400)} alt={song.title} />
                      <div className="song-card-read-overlay"><PenTool size={32} /></div>
                    </>
                  ) : (
                    <CoverPlaceholder type="song" genre={song.genre} title={song.title} />
                  )}
                </div>
                <div className="song-card-body">
                  <div className="song-card-title">{song.title}</div>
                  <div 
                    className="song-card-artist"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(song.authorId ? `/author/${song.authorId}` : `/author/${song.artistName || song.author}`);
                    }}
                    style={{ cursor: 'pointer', transition: 'color 0.2s', fontWeight: 600 }}
                  >
                    By {song.artistName || song.author}
                  </div>
                  <div className="song-card-meta">
                    <span className="genre">{song.genre}</span>
                    <span className="likes"><Heart size={12} /> {song.likes ?? 0}</span>
                    <span className="posted-on">
                      <Sparkles size={12} /> {(song.contributions?.length ?? 0)} contributions
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

      {/* ── Suggested Sidebar ── */}
      <aside className="homepage-sidebar">
        <h3 className="sidebar-title">
          <Users size={16} />
          <span>Suggested Authors</span>
        </h3>
        {loadingRecommended ? (
          <div style={{ color: 'var(--secondary-text)', fontSize: '14px', marginTop: '10px' }}>Loading...</div>
        ) : recommendedAuthors.length === 0 ? (
          <div style={{ color: 'var(--secondary-text)', fontSize: '14px', fontStyle: 'italic', marginTop: '10px' }}>No recommendations found.</div>
        ) : (
          <div className="sidebar-authors-list">
            {recommendedAuthors.map(author => {
              const isFollowingAuthor = authUser && author.followers.some(id => id.toString() === authUser._id.toString());
              return (
                <div key={author._id} className="sidebar-author-row" onClick={() => navigate(`/author/${author._id}`)}>
                  <div className="sidebar-author-photo">
                    <LazyImage
                      src={optimizeCloudinaryUrl(author.profilePhoto || author.profileImage, 150)}
                      alt={author.username}
                      fallback="https://via.placeholder.com/150"
                    />
                  </div>
                  <div className="sidebar-author-info">
                    <div className="sidebar-author-username">{author.username}</div>
                    <div className="sidebar-author-bio">{author.bio || "Writer on StoryWeave"}</div>
                  </div>
                  <button
                    className={`sidebar-follow-btn ${isFollowingAuthor ? 'following' : 'follow'}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleFollowRecommended(author._id, isFollowingAuthor);
                    }}
                  >
                    {isFollowingAuthor ? 'Following' : 'Follow'}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </aside>
    </div>
  );
};

export default HomePage;