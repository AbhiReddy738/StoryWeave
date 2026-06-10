import { useState, useEffect } from 'react';
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
            <p className="song-artist">by {song.artistName || song.author}</p>
            <div className="song-meta-row">
              <span>❤️ {likeCount.toLocaleString()} likes</span>
              <span>✍️ {contributions.length} contributions</span>
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
              <button
                className="song-action-btn"
                onClick={handleShare}
              >
                🔗 Share
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── MAIN CONTENT ── */}
      <div className="song-main-content">

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
                  ? '🎤 Lyrics'
                  : tab === 'contributions'
                  ? `🎶 Contributions (${contributions.length})`
                  : `💬 Comments (${comments.length})`
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
                  <span>🎤</span>
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
                  🚀 Submit Contribution
                </button>
              </div>

              <div className="contributions-list">
                {contributions.length === 0 ? (
                  <div className="song-empty-tab">
                    <span>📝</span>
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
                          <div className="top-badge">🏆 Top Contribution</div>
                        )}

                        <div className="contribution-header">
                          <div className="contribution-meta">
                            <span className="contribution-author">✍️ {item.author}</span>
                            <span className="contribution-date">
                              {new Date(item.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          <span className="upvotes-count">↑ {item.upvotes} Upvotes</span>
                        </div>

                        <p className="contribution-text">{item.text}</p>

                        <button
                          className={`upvote-btn ${hasUpvoted ? 'upvoted' : ''}`}
                          onClick={() => handleUpvote(cid)}
                        >
                          {hasUpvoted ? '👍 Upvoted' : '👍 Upvote'}
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
                    <p className="related-song-artist">{rs.artistName || rs.author}</p>
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
