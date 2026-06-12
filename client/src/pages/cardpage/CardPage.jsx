import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_BASE_URL } from '../../config';
import { useAuth } from '../../context/AuthContext.jsx';
import LazyImage from '../../components/LazyImage';
import CoverPlaceholder from '../../components/CoverPlaceholder';
import { optimizeCloudinaryUrl } from '../../utils/imageOptimizer';
import './CardPage.css';
import StoryReader from '../../components/storyreader/StoryReader';

const API = `${API_BASE_URL}/story`;

const CardPage = ({ collapsed }) => {
  const { slug } = useParams();
  const storyId = slug ? slug.split('-').pop() : null;
  const navigate = useNavigate();
  const { user: authUser } = useAuth();

  // ── States ──────────────────────────────────────────────────────────────────
  const [story, setStory] = useState(null);
  const [relatedStories, setRelatedStories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Follow State
  const [isFollowingAuthor, setIsFollowingAuthor] = useState(false);

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

  // Reader Modal
  const [showFullReader, setShowFullReader] = useState(false);

  const getUser = () => {
    try {
      return JSON.parse(localStorage.getItem('user')) || null;
    } catch {
      return null;
    }
  };

  // Follow status check
  useEffect(() => {
    if (!story || !story.authorId || !authUser) return;
    const checkFollowStatus = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/user/follow-status/${story.authorId}`);
        setIsFollowingAuthor(res.data.isFollowing);
      } catch (err) {
        console.error("Failed to fetch follow status", err);
      }
    };
    checkFollowStatus();
  }, [story, authUser]);

  const handleFollowToggle = async () => {
    if (!authUser) {
      alert("Please log in to follow authors.");
      navigate('/login');
      return;
    }
    const targetId = story.authorId;
    if (authUser._id.toString() === targetId.toString()) {
      alert("You cannot follow yourself.");
      return;
    }

    const originalFollowingState = isFollowingAuthor;
    setIsFollowingAuthor(!originalFollowingState);

    try {
      const endpoint = originalFollowingState ? 'unfollow' : 'follow';
      await axios.post(`${API_BASE_URL}/user/${endpoint}/${targetId}`);
    } catch (err) {
      setIsFollowingAuthor(originalFollowingState);
      alert("Follow action failed. Please try again.");
    }
  };

  const showFeedback = (msg) => {
    setSaveFeedback(msg);
    setTimeout(() => setSaveFeedback(''), 2500);
  };

  // ── Fetch data ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!storyId) return;

    const fetchStoryDetails = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await axios.get(`${API}/${storyId}`);
        const data = res.data;
        setStory(data);
        setLikeCount(data.likes || 0);
        setComments(data.comments || []);

        // Sort contributions by upvotes desc on load
        const sorted = [...(data.contributions || [])].sort(
          (a, b) => b.upvotes - a.upvotes
        );
        setContributions(sorted);

        // Check if user already liked/saved
        const currentUser = getUser();
        if (currentUser) {
          const uid = currentUser._id;
          setLiked((data.likedBy || []).some(id => id.toString() === uid));
          const saveRes = await axios.get(`${API}/is-saved/${storyId}/${uid}`);
          setSaved(saveRes.data.isSaved);
        }

        // Fetch Related Stories (same genre OR same tags, excluding current)
        const allRes = await axios.get(`${API}/all`);
        const currentTags = data.tags || [];
        const related = allRes.data
          .filter(s => s._id !== data._id && (
            s.genre?.toLowerCase() === data.genre?.toLowerCase() ||
            (s.tags || []).some(t => currentTags.includes(t))
          ))
          .slice(0, 5);
        setRelatedStories(related);

      } catch (err) {
        setError('Story not found.');
      } finally {
        setLoading(false);
      }
    };

    fetchStoryDetails();
  }, [storyId]);

  // ── Like toggle ────────────────────────────────────────────────────────────
  const handleLike = async () => {
    const user = getUser();
    if (!user) return alert('Please log in to like stories.');

    // Optimistic update
    const newLiked = !liked;
    setLiked(newLiked);
    setLikeCount(prev => newLiked ? prev + 1 : prev - 1);

    try {
      const res = await axios.put(`${API}/like/${story._id}`, { userId: user._id });
      setLiked(res.data.liked);
      setLikeCount(res.data.likes);
    } catch {
      // Revert on failure
      setLiked(!newLiked);
      setLikeCount(prev => newLiked ? prev - 1 : prev + 1);
    }
  };

  // ── Save toggle ────────────────────────────────────────────────────────────
  const handleSave = async () => {
    const user = getUser();
    if (!user) return alert('Please log in to save stories.');

    const newSaved = !saved;
    setSaved(newSaved);

    try {
      const endpoint = newSaved ? 'save' : 'unsave';
      await axios.post(`${API}/${endpoint}/${story._id}`, { userId: user._id });
      showFeedback(newSaved ? '📖 Story Saved!' : '🗑 Story Removed');
    } catch {
      setSaved(!newSaved);
    }
  };

  // ── Share & Copy ───────────────────────────────────────────────────────────
  const handleShare = async () => {
    const shareData = {
      title: story?.title || 'StoryWeave Story',
      text: `Read "${story?.title}" by ${story?.author} on StoryWeave!`,
      url: window.location.href
    };
    if (navigator.share && navigator.canShare?.(shareData)) {
      try {
        await navigator.share(shareData);
        showFeedback('🔗 Story shared!');
      } catch (err) {
        if (err.name !== 'AbortError') {
          navigator.clipboard.writeText(window.location.href);
          showFeedback('📋 Link copied!');
        }
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
      showFeedback('📋 Link copied!');
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    showFeedback('📋 Link copied!');
  };

  // ── Comment ────────────────────────────────────────────────────────────────
  const handleComment = async () => {
    const user = getUser();
    if (!user) return alert('Please log in to comment.');
    if (!commentText.trim()) return;

    setCommentPosting(true);
    try {
      const res = await axios.post(`${API}/comment/${story._id}`, {
        username: user.username,
        text: commentText.trim()
      });
      setComments(res.data.comments || []);
      setCommentText('');
    } catch { /* silent */ }
    setCommentPosting(false);
  };

  // ── Delete Comment ─────────────────────────────────────────────────────────
  const handleDeleteComment = async (commentId) => {
    try {
      const res = await axios.delete(`${API}/comment/${story._id}/${commentId}`);
      setComments(res.data.comments || []);
      showFeedback('💬 Comment deleted!');
    } catch {
      showFeedback('Failed to delete comment.');
    }
  };

  // ── Contribution submit ────────────────────────────────────────────────────
  const handleContribution = async () => {
    const user = getUser();
    if (!user) return alert('Please log in to submit contributions.');
    if (!contributionText.trim()) return;

    try {
      const res = await axios.post(`${API}/contribution/${story._id}`, {
        author: user.username,
        text: contributionText.trim()
      });
      setContributions(res.data.contributions || []);
      setContributionText('');
    } catch { /* silent */ }
  };

  // ── Contribution upvote toggle ─────────────────────────────────────────────
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
        `${API}/contribution/upvote/${story._id}/${contributionId}`,
        { userId: user._id }
      );
      setContributions(res.data.contributions || []);
    } catch {
      // Revert on failure
      try {
        const res = await axios.get(`${API}/${story._id}`);
        const sorted = [...(res.data.contributions || [])].sort(
          (a, b) => b.upvotes - a.upvotes
        );
        setContributions(sorted);
      } catch {}
    }
  };

  // ── Block content renderer (backward-compatible) ───────────────────────────
  const renderContent = (content) => {
    if (!content) return <p>No content available.</p>;
    if (typeof content === 'string') {
      return content.split(/\r?\n\r?\n/).map((para, i) => (
        <p key={i} className="content-text-block">{para}</p>
      ));
    }
    if (Array.isArray(content)) {
      return content.map((block, idx) => {
        if (block.type === 'image') {
          return (
            <figure key={idx} className="content-image-block">
              <LazyImage src={block.value} alt={`Story image ${idx + 1}`} />
            </figure>
          );
        }
        return (
          <div
            key={idx}
            className="content-text-block"
            dangerouslySetInnerHTML={{ __html: block.value || '' }}
          />
        );
      });
    }
    return <p>No content available.</p>;
  };

  // Helper to calculate total word count
  const getWordCount = () => {
    if (!story?.content) return 0;
    if (typeof story.content === 'string') {
      return story.content.trim().split(/\s+/).filter(Boolean).length;
    }
    if (Array.isArray(story.content)) {
      const text = story.content
        .filter(b => b.type === 'text')
        .map(b => b.value || '')
        .join(' ')
        .replace(/<[^>]*>/g, ' '); // strip any HTML tags from editor
      return text.trim().split(/\s+/).filter(Boolean).length;
    }
    return 0;
  };

  const currentUser = getUser();

  if (loading) return (
    <div className={`card-page ${collapsed ? 'card-page-expanded' : ''} skeleton-details`}>
      <div className="story-hero loading-skeleton" style={{ height: '350px', width: '100%', borderRadius: '0 0 24px 24px' }} />
      <div className="story-main-content" style={{ display: 'flex', gap: '24px', padding: '24px' }}>
        <div className="story-content-left" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="story-content-card loading-skeleton" style={{ height: '300px', borderRadius: '16px' }} />
          <div className="story-comments-card loading-skeleton" style={{ height: '200px', borderRadius: '16px' }} />
        </div>
        <div className="story-sidebar" style={{ width: '300px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="story-sidebar-card loading-skeleton" style={{ height: '220px', borderRadius: '16px' }} />
          <div className="story-sidebar-card loading-skeleton" style={{ height: '140px', borderRadius: '16px' }} />
        </div>
      </div>
    </div>
  );

  if (error || !story) return (
    <div className="story-page-error">
      <span>📖</span>
      <p>{error || 'Story not found'}</p>
      <button onClick={() => navigate('/')}>← Back to Home</button>
    </div>
  );

  return (
    <div className={`card-page ${collapsed ? 'card-page-expanded' : ''}`}>
      {/* Save feedback toast */}
      {saveFeedback && <div className="story-toast">{saveFeedback}</div>}

      {/* ── HERO SECTION ── */}
      <div
        className="story-hero"
        style={{
          backgroundImage: story.coverImage
            ? `url(${optimizeCloudinaryUrl(story.coverImage, 1200)})`
            : 'linear-gradient(135deg, #1a1a2e, #16213e)'
        }}
      >
        <div className="story-hero-overlay" />
        <div className="story-hero-content">
          <div className="story-cover-art">
            {story.coverImage ? (
              <LazyImage src={optimizeCloudinaryUrl(story.coverImage, 800)} alt={story.title} />
            ) : (
              <CoverPlaceholder type="story" genre={story.genre} title={story.title} />
            )}
          </div>
          <div className="story-hero-info">
            <span className="story-genre-badge">{story.genre}</span>
            <h1 className="story-title-text">{story.title}</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
              <p 
                className="story-author-text"
                onClick={() => navigate(story.authorId ? `/author/${story.authorId}` : `/author/${story.author}`)}
                style={{ cursor: 'pointer', textDecoration: 'underline', margin: 0 }}
              >
                by {story.author}
              </p>
              {(!authUser || (story.authorId && authUser._id.toString() !== story.authorId.toString())) && (
                <button
                  onClick={handleFollowToggle}
                  style={{
                    padding: '4px 12px',
                    fontSize: '12px',
                    borderRadius: '15px',
                    border: isFollowingAuthor ? '1px solid rgba(255,255,255,0.4)' : 'none',
                    background: isFollowingAuthor ? 'transparent' : 'var(--accent-gradient)',
                    color: isFollowingAuthor ? '#fff' : 'var(--accent-text)',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  {isFollowingAuthor ? 'Following' : 'Follow'}
                </button>
              )}
            </div>
            <div className="story-meta-row">
              <span>❤️ {likeCount.toLocaleString()} likes</span>
              <span>⏱ {story.readingTime || 1} min read</span>
              <span>📝 {getWordCount().toLocaleString()} words</span>
              <span>✍️ {contributions.length} contributions</span>
              <span>💬 {comments.length} comments</span>
              <span>📅 {new Date(story.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── ACTION BUTTONS ── */}
      <div className="story-action-bar-container">
        <div className="story-action-bar">
          <button
            className={`story-action-btn ${liked ? 'story-liked' : ''}`}
            onClick={handleLike}
          >
            {liked ? '❤️ Liked' : '🤍 Like'}
          </button>
          <button
            className={`story-action-btn ${saved ? 'story-saved' : ''}`}
            onClick={handleSave}
          >
            {saved ? '🔖 Saved' : '📌 Save'}
          </button>
          <button className="story-action-btn" onClick={handleShare}>
            🔗 Share
          </button>
          <button className="story-action-btn" onClick={handleCopyLink}>
            📋 Copy Link
          </button>
          <button
            className="story-action-btn story-view-reader"
            onClick={() => setShowFullReader(true)}
          >
            📖 View Full Story
          </button>
        </div>
      </div>

      {/* ── MAIN CONTENT GRID ── */}
      <div className="story-main-content">
        
        {/* LEFT COLUMN: Story Reading, Contributions & Comments */}
        <div className="story-content-left">
          
          {/* Story Reading Area */}
          <div className="story-content-card">
            <h3 className="story-section-title">📖 Story Content</h3>
            <div className="story-text-body">
              {renderContent(story.content)}
            </div>
          </div>

          {/* Contributions section */}
          <div className="story-contributions-card">
            <h3 className="story-section-title">🎶 Contributions ({contributions.length})</h3>

            <div className="contribution-input-box">
              <textarea
                className="contribution-textarea"
                placeholder="Write your contribution to continue the story..."
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
                  <p>No contributions yet. Be the first to continue the story!</p>
                </div>
              ) : (
                contributions.map((item, idx) => {
                  const cid = item._id || item.id;
                  const isTop = idx === 0 && item.upvotes > 0;
                  const hasUpvoted = currentUser?._id
                    ? (item.upvotedBy || []).some(uid => uid.toString() === currentUser._id)
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
                          <span 
                            className="contribution-author"
                            onClick={() => navigate(`/author/${item.author}`)}
                            style={{ cursor: 'pointer', textDecoration: 'underline' }}
                          >
                            ✍️ {item.author}
                          </span>
                          {item.createdAt && (
                            <span className="contribution-date">
                              {new Date(item.createdAt).toLocaleDateString()}
                            </span>
                          )}
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

          {/* Comments section */}
          <div className="story-comments-card">
            <h3 className="story-section-title">💬 Comments ({comments.length})</h3>

            <div className="comment-input-box">
              <textarea
                className="comment-textarea"
                placeholder="Share your thoughts about this story..."
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
                    {currentUser && c.username === currentUser.username && (
                      <button
                        className="comment-delete-btn"
                        onClick={() => handleDeleteComment(c._id)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#e63946',
                          fontSize: '12px',
                          cursor: 'pointer',
                          marginLeft: 'auto',
                          fontWeight: '600',
                          padding: '4px 8px'
                        }}
                      >
                        Delete
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: Sidebar Cards */}
        <aside className="story-sidebar">
          
          {/* Story Information Card */}
          <div className="story-sidebar-card">
            <h4 className="sidebar-card-title">ℹ️ Story Information</h4>
            <div className="sidebar-info-list">
              <div className="sidebar-info-item">
                <span>Genre:</span>
                <strong>{story.genre}</strong>
              </div>
              <div className="sidebar-info-item" style={{ alignItems: 'center' }}>
                <span>Author:</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <strong 
                    onClick={() => navigate(story.authorId ? `/author/${story.authorId}` : `/author/${story.author}`)}
                    style={{ cursor: 'pointer', textDecoration: 'underline' }}
                  >
                    {story.author}
                  </strong>
                  {(!authUser || (story.authorId && authUser._id.toString() !== story.authorId.toString())) && (
                    <button
                      onClick={handleFollowToggle}
                      style={{
                        padding: '2px 8px',
                        fontSize: '11px',
                        borderRadius: '10px',
                        border: isFollowingAuthor ? '1px solid var(--border-color)' : 'none',
                        background: isFollowingAuthor ? 'transparent' : 'var(--accent-gradient)',
                        color: isFollowingAuthor ? 'var(--text-color)' : 'var(--accent-text)',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      {isFollowingAuthor ? 'Following' : 'Follow'}
                    </button>
                  )}
                </div>
              </div>
              <div className="sidebar-info-item">
                <span>Published:</span>
                <strong>{new Date(story.createdAt).toLocaleDateString()}</strong>
              </div>
              <div className="sidebar-info-item">
                <span>Reading Time:</span>
                <strong>{story.readingTime || 1} min</strong>
              </div>
              <div className="sidebar-info-item">
                <span>Word Count:</span>
                <strong>{getWordCount().toLocaleString()} words</strong>
              </div>
              <div className="sidebar-info-item">
                <span>Likes:</span>
                <strong>{likeCount}</strong>
              </div>
              <div className="sidebar-info-item">
                <span>Comments:</span>
                <strong>{comments.length}</strong>
              </div>
              <div className="sidebar-info-item">
                <span>Contributions:</span>
                <strong>{contributions.length}</strong>
              </div>
            </div>
          </div>

          {/* Story Summary Card */}
          <div className="story-sidebar-card">
            <h4 className="sidebar-card-title">📝 Summary</h4>
            <p className="sidebar-card-text">{story.summary || 'No summary available.'}</p>
          </div>

          {/* Author Note Card */}
          {story.authorNote && (
            <div className="story-sidebar-card">
              <h4 className="sidebar-card-title">✍️ Author Note</h4>
              <p className="sidebar-card-text">{story.authorNote}</p>
            </div>
          )}

          {/* Tags Card */}
          {story.tags && story.tags.length > 0 && (
            <div className="story-sidebar-card">
              <h4 className="sidebar-card-title">🏷️ Tags</h4>
              <div className="sidebar-tags-list">
                {story.tags.map(tag => (
                  <span key={tag} className="sidebar-tag">#{tag}</span>
                ))}
              </div>
            </div>
          )}

          {/* Related Stories Card */}
          <div className="story-sidebar-card">
            <h4 className="sidebar-card-title">📖 Related Stories</h4>
            {relatedStories.length === 0 ? (
              <p className="sidebar-card-empty">No related stories found.</p>
            ) : (
              <div className="related-stories-list">
                {relatedStories.map(rs => (
                  <div
                    key={rs._id}
                    className="related-story-card"
                    onClick={() => navigate(`/card/${rs.slug}-${rs._id}`)}
                  >
                    <div className="related-story-cover">
                      {rs.coverImage ? (
                        <LazyImage src={optimizeCloudinaryUrl(rs.coverImage, 200)} alt={rs.title} />
                      ) : (
                        <CoverPlaceholder type="story" genre={rs.genre} title={rs.title} />
                      )}
                    </div>
                    <div className="related-story-info">
                      <p className="related-story-title">{rs.title}</p>
                      <p 
                        className="related-story-author"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(rs.authorId ? `/author/${rs.authorId}` : `/author/${rs.author}`);
                        }}
                        style={{ cursor: 'pointer' }}
                      >
                        {rs.author}
                      </p>
                      <span className="related-song-genre">{rs.genre}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </aside>

      </div>

      {/* Full Screen Reader Modal */}
      {showFullReader && (
        <StoryReader
          story={story}
          onClose={() => setShowFullReader(false)}
        />
      )}
    </div>
  );
};

export default CardPage;