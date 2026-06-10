import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './SongPage.css';

const API = 'https://storyweave-fxdt.onrender.com/api/song';

const SongPage = ({ collapsed }) => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [song, setSong] = useState(null);
  const [relatedSongs, setRelatedSongs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Player state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [isLooping, setIsLooping] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const audioRef = useRef(null);
  const progressRef = useRef(null);

  // Likes & saves
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [saved, setSaved] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState('');

  // Comments
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [commentPosting, setCommentPosting] = useState(false);

  // Active tab
  const [activeTab, setActiveTab] = useState('lyrics');

  const getUser = () => {
    try { return JSON.parse(localStorage.getItem('user')); } catch { return null; }
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

  // Audio event listeners
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onDurationChange = () => setDuration(audio.duration);
    const onEnded = () => { setIsPlaying(false); setCurrentTime(0); };

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('durationchange', onDurationChange);
    audio.addEventListener('ended', onEnded);
    audio.volume = volume;

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('durationchange', onDurationChange);
      audio.removeEventListener('ended', onEnded);
    };
  }, [song]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) { audio.pause(); } else { audio.play(); }
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (e) => {
    const audio = audioRef.current;
    if (!audio || !duration) return;
    const rect = progressRef.current.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    audio.currentTime = pct * duration;
  };

  const handleVolumeChange = (e) => {
    const v = parseFloat(e.target.value);
    setVolume(v);
    if (audioRef.current) audioRef.current.volume = v;
    setIsMuted(v === 0);
  };

  const toggleMute = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isMuted) { audio.volume = volume || 0.8; setIsMuted(false); }
    else { audio.volume = 0; setIsMuted(true); }
  };

  const skip = (secs) => {
    if (audioRef.current) audioRef.current.currentTime += secs;
  };

  const formatTime = (t) => {
    if (!t || isNaN(t)) return '0:00';
    const m = Math.floor(t / 60);
    const s = Math.floor(t % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const progressPct = duration ? (currentTime / duration) * 100 : 0;

  // Like toggle
  const handleLike = async () => {
    const user = getUser();
    if (!user) return alert('Please log in to like songs.');
    try {
      const res = await axios.put(`${API}/like/${id}`, { userId: user._id });
      setLiked(res.data.liked);
      setLikeCount(res.data.likes);
    } catch { /* silent */ }
  };

  // Save toggle
  const handleSave = async () => {
    const user = getUser();
    if (!user) return alert('Please log in to save songs.');
    try {
      const res = await axios.put(`${API}/save/${id}`, { userId: user._id });
      setSaved(res.data.saved);
      setSaveFeedback(res.data.saved ? '🎵 Song Saved!' : '🗑 Song Removed');
      setTimeout(() => setSaveFeedback(''), 2500);
    } catch { /* silent */ }
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

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  };

  if (loading) return (
    <div className="song-page-loading">
      <div className="song-spinner" />
      <p>Loading song...</p>
    </div>
  );

  if (error || !song) return (
    <div className="song-page-error">
      <span>🎵</span>
      <p>{error || 'Song not found'}</p>
      <button onClick={() => navigate('/')}>← Back to Home</button>
    </div>
  );

  return (
    <div className={`song-page ${collapsed ? 'song-page-expanded' : ''}`}>
      {/* Hidden audio element */}
      {song.audioUrl && (
        <audio
          ref={audioRef}
          src={song.audioUrl}
          loop={isLooping}
          preload="metadata"
        />
      )}

      {/* Save feedback toast */}
      {saveFeedback && <div className="song-toast">{saveFeedback}</div>}

      {/* ── HERO SECTION ── */}
      <div
        className="song-hero"
        style={{
          backgroundImage: song.coverImage
            ? `url(${song.coverImage})`
            : 'linear-gradient(135deg, #1a1a2e, #16213e)'
        }}
      >
        <div className="song-hero-overlay" />
        <div className="song-hero-content">
          <div className="song-cover-art">
            {song.coverImage
              ? <img src={song.coverImage} alt={song.title} />
              : <div className="song-cover-placeholder">🎵</div>
            }
          </div>
          <div className="song-hero-info">
            <span className="song-genre-badge">{song.genre}</span>
            <h1 className="song-title">{song.title}</h1>
            <p className="song-artist">by {song.artist || song.author}</p>
            {song.album && <p className="song-album">📀 {song.album}</p>}
            <div className="song-meta-row">
              <span>🎵 {likeCount.toLocaleString()} likes</span>
              <span>▶ {(song.plays || 0).toLocaleString()} plays</span>
              <span>💬 {comments.length} comments</span>
              <span>📅 {new Date(song.createdAt).toLocaleDateString()}</span>
            </div>
            <div className="song-hero-actions">
              <button
                className={`song-action-btn ${liked ? 'song-liked' : ''}`}
                onClick={handleLike}
              >
                {liked ? '❤️ Liked' : '🤍 Like'}
              </button>
              <button
                className={`song-action-btn ${saved ? 'song-saved' : ''}`}
                onClick={handleSave}
              >
                {saved ? '🔖 Saved' : '📌 Save'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── PLAYER BAR ── */}
      {song.audioUrl && (
        <div className="song-player-bar">
          <div className="player-inner">
            {/* Time */}
            <span className="player-time">{formatTime(currentTime)}</span>

            {/* Progress track */}
            <div
              className="player-progress"
              ref={progressRef}
              onClick={handleSeek}
            >
              <div
                className="player-progress-fill"
                style={{ width: `${progressPct}%` }}
              />
              <div
                className="player-progress-thumb"
                style={{ left: `${progressPct}%` }}
              />
            </div>

            <span className="player-time">{formatTime(duration)}</span>

            {/* Controls */}
            <div className="player-controls">
              <button className="player-ctrl-btn" onClick={() => skip(-10)} title="Back 10s">⏮</button>
              <button className="player-play-btn" onClick={togglePlay}>
                {isPlaying ? '⏸' : '▶'}
              </button>
              <button className="player-ctrl-btn" onClick={() => skip(10)} title="Forward 10s">⏭</button>
              <button
                className={`player-ctrl-btn ${isLooping ? 'active-ctrl' : ''}`}
                onClick={() => setIsLooping(!isLooping)}
                title="Loop"
              >🔁</button>
            </div>

            {/* Volume */}
            <div className="player-volume">
              <button className="player-ctrl-btn" onClick={toggleMute}>
                {isMuted ? '🔇' : volume < 0.4 ? '🔉' : '🔊'}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="volume-slider"
              />
            </div>

            <button className="player-ctrl-btn" onClick={toggleFullscreen} title="Fullscreen">
              {isFullscreen ? '⛶' : '⛶'}
            </button>
          </div>
        </div>
      )}

      {/* ── MAIN CONTENT ── */}
      <div className="song-main-content">

        {/* LEFT: Tabs */}
        <div className="song-content-left">

          <div className="song-tabs">
            {['lyrics', 'comments'].map(tab => (
              <button
                key={tab}
                className={`song-tab-btn ${activeTab === tab ? 'song-tab-active' : ''}`}
                onClick={() => setActiveTab(tab)}
              >
                {tab === 'lyrics' ? '🎤 Lyrics' : `💬 Comments (${comments.length})`}
              </button>
            ))}
          </div>

          {/* Lyrics */}
          {activeTab === 'lyrics' && (
            <div className="song-lyrics-area">
              {song.lyrics ? (
                <pre className="song-lyrics-text">{song.lyrics}</pre>
              ) : (
                <div className="song-empty-tab">
                  <span>🎤</span>
                  <p>No lyrics available for this song.</p>
                </div>
              )}
            </div>
          )}

          {/* Comments */}
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
                  {commentPosting ? 'Posting...' : '💬 Post Comment'}
                </button>
              </div>

              <div className="comments-list">
                {comments.length === 0 ? (
                  <div className="song-empty-tab">
                    <span>💬</span>
                    <p>Be the first to comment!</p>
                  </div>
                ) : (
                  [...comments].reverse().map((c, i) => (
                    <div key={i} className="comment-item">
                      <div className="comment-avatar">
                        {(c.username || 'A')[0].toUpperCase()}
                      </div>
                      <div className="comment-body">
                        <span className="comment-username">{c.username}</span>
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
          <h3 className="song-sidebar-title">🎵 Related Songs</h3>
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
                    {rs.coverImage
                      ? <img src={rs.coverImage} alt={rs.title} />
                      : <div className="related-song-placeholder">🎵</div>
                    }
                  </div>
                  <div className="related-song-info">
                    <p className="related-song-title">{rs.title}</p>
                    <p className="related-song-artist">{rs.artist || rs.author}</p>
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
    </div>
  );
};

export default SongPage;
