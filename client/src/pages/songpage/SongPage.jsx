import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_BASE_URL } from '../../config';
import { useAuth } from '../../context/AuthContext.jsx';
import LazyImage from '../../components/LazyImage';
import CoverPlaceholder from '../../components/CoverPlaceholder';
import { optimizeCloudinaryUrl } from '../../utils/imageOptimizer';
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Shuffle, 
  Repeat, 
  Volume2, 
  VolumeX, 
  Heart, 
  Bookmark, 
  Share2, 
  MessageSquare, 
  Sparkles, 
  Calendar, 
  ArrowLeft, 
  Clock, 
  UserPlus, 
  UserCheck, 
  Music,
  Send
} from 'lucide-react';
import './SongPage.css';

const API = `${API_BASE_URL}/song`;

const SongPage = ({ collapsed }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user: authUser } = useAuth();

  // Simulated Player States
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(214); // 3:34 mock duration
  const [volume, setVolume] = useState(70);
  const [isMuted, setIsMuted] = useState(false);
  const [isShuffle, setIsShuffle] = useState(false);
  const [isRepeat, setIsRepeat] = useState(false);

  useEffect(() => {
    let interval = null;
    if (isPlaying) {
      interval = setInterval(() => {
        setCurrentTime((prevTime) => {
          if (prevTime >= duration) {
            if (isRepeat) {
              return 0;
            } else {
              setIsPlaying(false);
              return 0;
            }
          }
          return prevTime + 1;
        });
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isPlaying, duration, isRepeat]);

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleVolumeChange = (e) => {
    setVolume(Number(e.target.value));
    if (isMuted) setIsMuted(false);
  };

  const handleMuteToggle = () => {
    setIsMuted(!isMuted);
  };

  const handleShuffleToggle = () => {
    setIsShuffle(!isShuffle);
  };

  const handleRepeatToggle = () => {
    setIsRepeat(!isRepeat);
  };

  const handlePrevSong = () => {
    setCurrentTime(0);
  };

  const handleNextSong = () => {
    setCurrentTime(0);
  };

  const handleProgressClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const width = rect.width;
    const clickPercent = clickX / width;
    setCurrentTime(Math.floor(clickPercent * duration));
  };

  const formatTime = (time) => {
    const minutes = Math.floor(time / 60);
    const seconds = time % 60;
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  const [song, setSong] = useState(null);
  const [relatedSongs, setRelatedSongs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Follow State
  const [isFollowingArtist, setIsFollowingArtist] = useState(false);

  // Likes & saves
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [saved, setSaved] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState('');

  // Comments
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [commentPosting, setCommentPosting] = useState(false);

  // Contributions
  const [contributions, setContributions] = useState([]);
  const [contributionText, setContributionText] = useState('');

  // Active tab
  const [activeTab, setActiveTab] = useState('lyrics');

  const getUser = () => {
    try { return JSON.parse(localStorage.getItem('user')); } catch { return null; }
  };

  // Follow status check
  useEffect(() => {
    if (!song || !song.authorId || !authUser) return;
    const checkFollowStatus = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/user/follow-status/${song.authorId}`);
        setIsFollowingArtist(res.data.isFollowing);
      } catch (err) {
        console.error("Failed to fetch follow status", err);
      }
    };
    checkFollowStatus();
  }, [song, authUser]);

  const handleFollowToggle = async () => {
    if (!authUser) {
      alert("Please log in to follow authors.");
      navigate('/login');
      return;
    }
    const targetId = song.authorId;
    if (authUser._id.toString() === targetId.toString()) {
      alert("You cannot follow yourself.");
      return;
    }

    const originalFollowingState = isFollowingArtist;
    setIsFollowingArtist(!originalFollowingState);

    try {
      const endpoint = originalFollowingState ? 'unfollow' : 'follow';
      await axios.post(`${API_BASE_URL}/user/${endpoint}/${targetId}`);
    } catch (err) {
      setIsFollowingArtist(originalFollowingState);
      alert("Follow action failed. Please try again.");
    }
  };

  // Fetch song
  useEffect(() => {
    const fetchSong = async () => {
      setLoading(true);
      try {
        const res = await axios.get(`${API}/${id}`);
        setSong(res.data);
        setLikeCount(res.data.likes || 0);
        setComments(res.data.comments || []);
        
        // Sort contributions by upvotes desc on load
        const sorted = [...(res.data.contributions || [])].sort(
          (a, b) => b.upvotes - a.upvotes
        );
        setContributions(sorted);

        // Check if user already liked/saved
        const user = getUser();
        if (user) {
          const likedBy = res.data.likedBy || [];
          setLiked(likedBy.some(uid => uid.toString() === user._id));
          const isSavedRes = await axios.get(`${API}/is-saved/${id}/${user._id}`);
          setSaved(isSavedRes.data.isSaved);
        }

        // Related songs
        const allRes = await axios.get(`${API}/all`);
        const related = allRes.data
          .filter(s => s._id !== res.data._id && s.genre === res.data.genre)
          .slice(0, 5);
        setRelatedSongs(related);
      } catch (err) {
        setError('Song not found.');
      } finally {
        setLoading(false);
      }
    };
    fetchSong();
  }, [id]);

  // Like toggle
  const handleLike = async () => {
    const user = getUser();
    if (!user) return alert('Please log in to like songs.');
    
    // Optimistic update
    const newLiked = !liked;
    setLiked(newLiked);
    setLikeCount(prev => newLiked ? prev + 1 : prev - 1);

    try {
      const res = await axios.put(`${API}/like/${id}`, { userId: user._id });
      setLiked(res.data.liked);
      setLikeCount(res.data.likes);
    } catch {
      // Revert on failure
      setLiked(!newLiked);
      setLikeCount(prev => newLiked ? prev - 1 : prev + 1);
    }
  };

  // Save toggle
  const handleSave = async () => {
    const user = getUser();
    if (!user) return alert('Please log in to save songs.');

    const newSaved = !saved;
    setSaved(newSaved);

    try {
      const endpoint = newSaved ? 'save' : 'unsave';
      await axios.post(`${API}/${endpoint}/${id}`, { userId: user._id });
      setSaveFeedback(newSaved ? '🎵 Song Saved!' : '🗑 Song Removed');
      setTimeout(() => setSaveFeedback(''), 2500);
    } catch {
      setSaved(!newSaved);
    }
  };

  // Post comment
  const handleComment = async () => {
    const user = getUser();
    if (!user) return alert('Please log in to comment.');
    if (!commentText.trim()) return;
    setCommentPosting(true);
    try {
      const res = await axios.post(`${API}/comment/${id}`, {
        username: user.username,
        text: commentText.trim()
      });
      setComments(res.data.comments);
      setCommentText('');
    } catch { /* silent */ }
    setCommentPosting(false);
  };

  // Share / Copy Link
  const handleShare = async () => {
    const shareData = {
      title: song?.title || 'StoryWeave Lyrics',
      text: `Read "${song?.title}" by ${song?.artistName || song?.author} on StoryWeave!`,
      url: window.location.href
    };
    if (navigator.share && navigator.canShare?.(shareData)) {
      try {
        await navigator.share(shareData);
        setSaveFeedback('🔗 Lyrics shared!');
        setTimeout(() => setSaveFeedback(''), 2500);
      } catch (err) {
        if (err.name !== 'AbortError') {
          navigator.clipboard.writeText(window.location.href);
          setSaveFeedback('📋 Link copied!');
          setTimeout(() => setSaveFeedback(''), 2500);
        }
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
      setSaveFeedback('📋 Link copied!');
      setTimeout(() => setSaveFeedback(''), 2500);
    }
  };

  // Submit contribution
  const handleContribution = async () => {
    const user = getUser();
    if (!user) return alert('Please log in to submit contributions.');
    if (!contributionText.trim()) return;
    try {
      const res = await axios.post(`${API}/contribution/${id}`, {
        author: user.username,
        text: contributionText.trim()
      });
      setContributions(res.data.contributions || []);
      setContributionText('');
    } catch { /* silent */ }
  };

  // Upvote contribution
  const handleUpvote = async (contributionId) => {
    const user = getUser();
    if (!user) return alert('Please log in to upvote contributions.');

    // Optimistic toggle
    const alreadyUpvoted = contributions
      .find(c => (c._id || c.id)?.toString() === contributionId?.toString())
      ?.upvotedBy?.some(uid => uid.toString() === user._id);

    setContributions(prev =>
      [...prev.map(c => {
        if ((c._id || c.id)?.toString() !== contributionId?.toString()) return c;
        const nowUpvoted = !(c.upvotedBy || []).some(uid => uid.toString() === user._id);
        return {
          ...c,
          upvotes: nowUpvoted ? c.upvotes + 1 : Math.max(0, c.upvotes - 1),
          upvotedBy: nowUpvoted
            ? [...(c.upvotedBy || []), user._id]
            : (c.upvotedBy || []).filter(uid => uid.toString() !== user._id)
        };
      })].sort((a, b) => b.upvotes - a.upvotes)
    );

    try {
      const res = await axios.put(
        `${API}/contribution/upvote/${id}/${contributionId}`,
        { userId: user._id }
      );
      setContributions(res.data.contributions || []);
    } catch {
      // Revert on failure
      try {
        const res = await axios.get(`${API}/${id}`);
        setContributions(res.data.contributions || []);
      } catch {}
    }
  };

  if (loading) return (
    <div className={`song-page ${collapsed ? 'song-page-expanded' : ''} skeleton-details`}>
      <div className="song-hero loading-skeleton" style={{ height: '350px', width: '100%', borderRadius: '0 0 24px 24px' }} />
      <div className="song-main-content" style={{ display: 'flex', gap: '24px', padding: '24px' }}>
        <div className="song-content-left" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="song-lyrics-area loading-skeleton" style={{ height: '350px', borderRadius: '16px' }} />
        </div>
        <div className="song-sidebar" style={{ width: '300px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="song-sidebar-card loading-skeleton" style={{ height: '220px', borderRadius: '16px' }} />
        </div>
      </div>
    </div>
  );

  if (error || !song) return (
    <div className="song-page-error">
      <span><Music size={48} /></span>
      <p>{error || 'Song not found'}</p>
      <button onClick={() => navigate('/')}>
        <ArrowLeft size={16} />
        <span>Back to Home</span>
      </button>
    </div>
  );

  return (
    <div className={`song-page ${collapsed ? 'song-page-expanded' : ''}`}>
      {/* Save feedback toast */}
      {saveFeedback && <div className="song-toast">{saveFeedback}</div>}

      {/* ── HERO SECTION ── */}
      <div
        className="song-hero"
        style={{
          backgroundImage: song.coverImage
            ? `url(${optimizeCloudinaryUrl(song.coverImage, 1200)})`
            : 'linear-gradient(135deg, #1a1a2e, #16213e)'
        }}
      >
        <div className="song-hero-overlay" />
        <div className="song-hero-content">
          <div className="song-cover-art">
            {song.coverImage ? (
              <LazyImage src={optimizeCloudinaryUrl(song.coverImage, 800)} alt={song.title} />
            ) : (
              <CoverPlaceholder type="song" genre={song.genre} title={song.title} />
            )}
          </div>
          <div className="song-hero-info">
            <span className="song-genre-badge">{song.genre}</span>
            <h1 className="song-title">{song.title}</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
              <p 
                className="song-artist"
                onClick={() => navigate(song.authorId ? `/author/${song.authorId}` : `/author/${song.artistName || song.author}`)}
                style={{ cursor: 'pointer', textDecoration: 'underline', margin: 0 }}
              >
                by {song.artistName || song.author}
              </p>
              {(!authUser || (song.authorId && authUser._id.toString() !== song.authorId.toString())) && (
                <button
                  onClick={handleFollowToggle}
                  className={`song-author-follow-btn ${isFollowingArtist ? 'following' : ''}`}
                >
                  {isFollowingArtist ? <UserCheck size={13} /> : <UserPlus size={13} />}
                  <span>{isFollowingArtist ? 'Following' : 'Follow'}</span>
                </button>
              )}
            </div>
            <div className="song-meta-row">
              <span><Heart size={13} /> {likeCount.toLocaleString()} likes</span>
              <span><Sparkles size={13} /> {contributions.length} contributions</span>
              <span><MessageSquare size={13} /> {comments.length} comments</span>
              <span><Calendar size={13} /> {new Date(song.createdAt).toLocaleDateString()}</span>
            </div>
            <div className="song-hero-actions">
              <button
                className={`song-action-btn ${liked ? 'song-liked' : ''}`}
                onClick={handleLike}
              >
                <Heart size={15} fill={liked ? 'currentColor' : 'none'} />
                <span>{liked ? 'Liked' : 'Like'}</span>
              </button>
              <button
                className={`song-action-btn ${saved ? 'song-saved' : ''}`}
                onClick={handleSave}
              >
                <Bookmark size={15} fill={saved ? 'currentColor' : 'none'} />
                <span>{saved ? 'Saved' : 'Save'}</span>
              </button>
              <button
                className="song-action-btn"
                onClick={handleShare}
              >
                <Share2 size={15} />
                <span>Share</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── MAIN CONTENT ── */}
      <div className="song-main-content" style={{ paddingBottom: '120px' }}>

        {/* LEFT: Tabs */}
        <div className="song-content-left">

          <div className="song-tabs">
            {['lyrics', 'contributions', 'comments'].map(tab => (
              <button
                key={tab}
                className={`song-tab-btn ${activeTab === tab ? 'song-tab-active' : ''}`}
                onClick={() => setActiveTab(tab)}
              >
                {tab === 'lyrics'
                  ? <><Music size={14} style={{ marginRight: '6px' }} /> Lyrics</>
                  : tab === 'contributions'
                  ? <><Sparkles size={14} style={{ marginRight: '6px' }} /> Contributions ({contributions.length})</>
                  : <><MessageSquare size={14} style={{ marginRight: '6px' }} /> Comments ({comments.length})</>
                }
              </button>
            ))}
          </div>

          {/* Lyrics Tab */}
          {activeTab === 'lyrics' && (
            <div className="song-lyrics-area">
              {song.lyrics ? (
                <pre className="song-lyrics-text">{song.lyrics}</pre>
              ) : (
                <div className="song-empty-tab">
                  <span><Music size={32} /></span>
                  <p>No lyrics available for this song.</p>
                </div>
              )}
            </div>
          )}

          {/* Contributions Tab */}
          {activeTab === 'contributions' && (
            <div className="song-contributions-area">
              <div className="contribution-input-box">
                <textarea
                  className="contribution-textarea"
                  placeholder="Suggest a lyric, verse, or continuation..."
                  value={contributionText}
                  onChange={e => setContributionText(e.target.value)}
                  rows={4}
                />
                <button
                  className="contribution-submit-btn"
                  onClick={handleContribution}
                  disabled={!contributionText.trim()}
                >
                  <Send size={14} />
                  <span>Submit Contribution</span>
                </button>
              </div>

              <div className="contributions-list">
                {contributions.length === 0 ? (
                  <div className="song-empty-tab">
                    <span><Sparkles size={32} /></span>
                    <p>No contributions yet. Be the first to add a verse!</p>
                  </div>
                ) : (
                  contributions.map((item, idx) => {
                    const cid = item._id || item.id;
                    const isTop = idx === 0 && item.upvotes > 0;
                    const user = getUser();
                    const hasUpvoted = user?._id
                      ? (item.upvotedBy || []).some(uid => uid.toString() === user._id)
                      : false;

                    return (
                      <div
                        key={cid}
                        className={`contribution-card ${isTop ? 'top-contribution' : ''}`}
                      >
                        {isTop && (
                          <div className="top-badge">
                            <Award size={11} style={{ marginRight: '4px' }} />
                            <span>Top Contribution</span>
                          </div>
                        )}

                        <div className="contribution-header">
                          <div className="contribution-meta">
                             <span 
                              className="contribution-author"
                              onClick={() => navigate(`/author/${item.author}`)}
                              style={{ cursor: 'pointer', textDecoration: 'underline' }}
                            >
                              @{item.author}
                            </span>
                            <span className="contribution-date">
                              {new Date(item.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          <span className="upvotes-count">{item.upvotes} Upvotes</span>
                        </div>

                        <p className="contribution-text">{item.text}</p>

                        <button
                          className={`upvote-btn ${hasUpvoted ? 'upvoted' : ''}`}
                          onClick={() => handleUpvote(cid)}
                        >
                          <span>👍 {hasUpvoted ? 'Upvoted' : 'Upvote'}</span>
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* Comments Tab */}
          {activeTab === 'comments' && (
            <div className="song-comments-area">
              <div className="comment-input-box">
                <textarea
                  className="comment-textarea"
                  placeholder="Share your thoughts about this song..."
                  value={commentText}
                  onChange={e => setCommentText(e.target.value)}
                  rows={3}
                />
                <button
                  className="comment-post-btn"
                  onClick={handleComment}
                  disabled={commentPosting || !commentText.trim()}
                >
                  <MessageSquare size={14} />
                  <span>{commentPosting ? 'Posting...' : 'Post Comment'}</span>
                </button>
              </div>

              <div className="comments-list">
                {comments.length === 0 ? (
                  <div className="song-empty-tab">
                    <span><MessageSquare size={32} /></span>
                    <p>Be the first to comment!</p>
                  </div>
                ) : (
                  [...comments].reverse().map((c, i) => (
                    <div key={i} className="comment-item">
                      <div className="comment-avatar">
                        {(c.username || 'A')[0].toUpperCase()}
                      </div>
                      <div className="comment-body">
                        <span 
                          className="comment-username"
                          onClick={() => navigate(`/author/${c.username}`)}
                          style={{ cursor: 'pointer', textDecoration: 'underline' }}
                        >
                          {c.username}
                        </span>
                        <p className="comment-text">{c.text}</p>
                        {c.createdAt && (
                          <span className="comment-date">
                            {new Date(c.createdAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT: Related Songs */}
        <aside className="song-sidebar">
          <h3 className="song-sidebar-title">Related Songs</h3>
          {relatedSongs.length === 0 ? (
            <p className="song-sidebar-empty">No related songs found.</p>
          ) : (
            <div className="related-songs-list">
              {relatedSongs.map(rs => (
                <div
                  key={rs._id}
                  className="related-song-card"
                  onClick={() => navigate(`/song/${rs._id}`)}
                >
                  <div className="related-song-cover">
                    {rs.coverImage ? (
                      <LazyImage src={optimizeCloudinaryUrl(rs.coverImage, 200)} alt={rs.title} />
                    ) : (
                      <CoverPlaceholder type="song" genre={rs.genre} title={rs.title} />
                    )}
                  </div>
                  <div className="related-song-info">
                    <p className="related-song-title">{rs.title}</p>
                    <p 
                      className="related-song-artist"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(rs.authorId ? `/author/${rs.authorId}` : `/author/${rs.artistName || rs.author}`);
                      }}
                      style={{ cursor: 'pointer' }}
                    >
                      {rs.artistName || rs.author}
                    </p>
                    <span className="related-song-genre">{rs.genre}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Tags */}
          {song.tags && song.tags.length > 0 && (
            <div className="song-tags-section">
              <h4 className="song-tags-title">Tags</h4>
              <div className="song-tags-list">
                {song.tags.map(tag => (
                  <span key={tag} className="song-tag">#{tag}</span>
                ))}
              </div>
            </div>
          )}
        </aside>
      </div>

      {/* ── SPOTIFY-INSPIRED FLOATING PLAYER BAR ── */}
      <div className="spotify-player-bar">
        <div className="player-song-info">
          <div className="player-cover-container">
            {song.coverImage ? (
              <img src={optimizeCloudinaryUrl(song.coverImage, 100)} alt={song.title} />
            ) : (
              <div className="player-cover-fallback"><Music size={16} /></div>
            )}
          </div>
          <div className="player-meta">
            <span className="player-song-title">{song.title}</span>
            <span className="player-song-artist">{song.artistName || song.author}</span>
          </div>
        </div>

        <div className="player-controls-container">
          <div className="player-control-buttons">
            <button className={`player-icon-btn ${isShuffle ? 'player-active-icon' : ''}`} onClick={handleShuffleToggle} title="Shuffle">
              <Shuffle size={16} />
            </button>
            <button className="player-icon-btn" onClick={handlePrevSong} title="Previous">
              <SkipBack size={18} />
            </button>
            <button className="player-play-btn" onClick={handlePlayPause} title={isPlaying ? 'Pause' : 'Play'}>
              {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" style={{ marginLeft: '2px' }} />}
            </button>
            <button className="player-icon-btn" onClick={handleNextSong} title="Next">
              <SkipForward size={18} />
            </button>
            <button className={`player-icon-btn ${isRepeat ? 'player-active-icon' : ''}`} onClick={handleRepeatToggle} title="Repeat">
              <Repeat size={16} />
            </button>
          </div>
          <div className="player-progress-bar-wrapper">
            <span className="player-time">{formatTime(currentTime)}</span>
            <div className="player-progress-bar-container" onClick={handleProgressClick}>
              <div 
                className="player-progress-bar-fill" 
                style={{ width: `${(currentTime / duration) * 100}%` }}
              />
            </div>
            <span className="player-time">{formatTime(duration)}</span>
          </div>
        </div>

        <div className="player-volume-controls">
          <button className="player-icon-btn" onClick={handleMuteToggle}>
            {isMuted || volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>
          <input 
            type="range" 
            min="0" 
            max="100" 
            value={isMuted ? 0 : volume} 
            onChange={handleVolumeChange} 
            className="player-volume-slider" 
          />
        </div>
      </div>
    </div>
  );
};

export default SongPage;
