import { useParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import axios from 'axios';
import './CardPage.css';
import StoryReader from '../../components/storyreader/StoryReader';

const API = 'https://storyweave-fxdt.onrender.com/api/story';

const CardPage = ({ collapsed }) => {

  const { slug } = useParams();
  const storyId = slug ? slug.split('-').pop() : null;

  // ── Story data ─────────────────────────────────────────────────────────────
  const [story, setStory]           = useState(null);
  const [likes, setLikes]           = useState(0);
  const [isLiked, setIsLiked]       = useState(false);
  const [isSaved, setIsSaved]       = useState(false);

  // ── Comments ───────────────────────────────────────────────────────────────
  const [showComments, setShowComments]   = useState(false);
  const [commentText, setCommentText]     = useState('');
  const [comments, setComments]           = useState([]);

  // ── Contributions ──────────────────────────────────────────────────────────
  const [contributionText, setContributionText] = useState('');
  const [contributions, setContributions]         = useState([]);

  // ── UI ─────────────────────────────────────────────────────────────────────
  const [showFullReader, setShowFullReader] = useState(false);
  const [actionFeedback, setActionFeedback] = useState('');

  // Current logged-in user
  const currentUser = (() => {
    try { return JSON.parse(localStorage.getItem('user')) || null; }
    catch { return null; }
  })();

  const showFeedback = (msg) => {
    setActionFeedback(msg);
    setTimeout(() => setActionFeedback(''), 2500);
  };

  // ── Fetch story ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!storyId) return;

    const fetchStory = async () => {
      try {
        const res = await axios.get(`${API}/${storyId}`);
        const data = res.data;

        setStory(data);
        setLikes(data.likes || 0);
        setComments(data.comments || []);

        // Sort contributions by upvotes desc on load
        const sorted = [...(data.contributions || [])].sort(
          (a, b) => b.upvotes - a.upvotes
        );
        setContributions(sorted);

        // Determine liked/saved state from user data (no extra API call needed)
        if (currentUser?._id) {
          const uid = currentUser._id;
          setIsLiked((data.likedBy || []).some(id => id.toString() === uid));

          const saveRes = await axios.get(`${API}/is-saved/${storyId}/${uid}`);
          setIsSaved(saveRes.data.isSaved);
        }
      } catch (err) {
        // silent — no console noise in production
      }
    };

    fetchStory();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storyId]);

  // ── Like toggle ────────────────────────────────────────────────────────────
  const handleLike = async () => {
    if (!currentUser?._id) {
      showFeedback('Sign in to like stories');
      return;
    }
    // Optimistic update
    const newLiked = !isLiked;
    setIsLiked(newLiked);
    setLikes(prev => newLiked ? prev + 1 : prev - 1);

    try {
      const res = await axios.put(`${API}/like/${story._id}`, {
        userId: currentUser._id
      });
      setLikes(res.data.likes);
      setIsLiked(res.data.liked);
    } catch {
      // Revert on failure
      setIsLiked(!newLiked);
      setLikes(prev => newLiked ? prev - 1 : prev + 1);
    }
  };

  // ── Save toggle ────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!currentUser?._id) {
      showFeedback('Sign in to save stories');
      return;
    }
    const newSaved = !isSaved;
    setIsSaved(newSaved); // optimistic

    try {
      const endpoint = newSaved ? 'save' : 'unsave';
      await axios.post(`${API}/${endpoint}/${story._id}`, {
        userId: currentUser._id
      });
      showFeedback(newSaved ? '🔖 Saved to your library!' : '🔖 Removed from library');
    } catch {
      setIsSaved(!newSaved); // revert
    }
  };

  // ── Comment ────────────────────────────────────────────────────────────────
  const handleComment = async () => {
    if (!commentText.trim()) return;
    const username = currentUser?.username || 'Anonymous';
    try {
      const res = await axios.post(`${API}/comment/${story._id}`, {
        username,
        text: commentText
      });
      setComments(res.data.comments);
      setCommentText('');
    } catch {
      // silent
    }
  };

  // ── Contribution submit ────────────────────────────────────────────────────
  const handleContribution = async () => {
    if (!contributionText.trim()) return;
    const author = currentUser?.username || 'Anonymous';
    try {
      const res = await axios.post(`${API}/contribution/${story._id}`, {
        author,
        text: contributionText
      });
      // Server returns sorted contributions
      setContributions(res.data.contributions || []);
      setContributionText('');
    } catch {
      // silent
    }
  };

  // ── Contribution upvote toggle ─────────────────────────────────────────────
  const handleUpvote = async (contributionId) => {
    if (!currentUser?._id) {
      showFeedback('Sign in to upvote contributions');
      return;
    }

    // Optimistic toggle
    const alreadyUpvoted = contributions
      .find(c => (c._id || c.id)?.toString() === contributionId?.toString())
      ?.upvotedBy?.some(id => id.toString() === currentUser._id);

    setContributions(prev =>
      [...prev.map(c => {
        if ((c._id || c.id)?.toString() !== contributionId?.toString()) return c;
        const nowUpvoted = !(c.upvotedBy || []).some(id => id.toString() === currentUser._id);
        return {
          ...c,
          upvotes: nowUpvoted ? c.upvotes + 1 : Math.max(0, c.upvotes - 1),
          upvotedBy: nowUpvoted
            ? [...(c.upvotedBy || []), currentUser._id]
            : (c.upvotedBy || []).filter(id => id.toString() !== currentUser._id)
        };
      })].sort((a, b) => b.upvotes - a.upvotes)
    );

    try {
      const res = await axios.put(
        `${API}/contribution/upvote/${story._id}/${contributionId}`,
        { userId: currentUser._id }
      );
      // Sync with server's sorted result
      setContributions(res.data.contributions || []);
    } catch {
      // On failure re-fetch to reset state
      try {
        const res = await axios.get(`${API}/${story._id}`);
        const sorted = [...(res.data.contributions || [])].sort(
          (a, b) => b.upvotes - a.upvotes
        );
        setContributions(sorted);
      } catch {
        // silent
      }
    }
  };

  // ── Share / Copy ───────────────────────────────────────────────────────────
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

  // ── Block content renderer (backward-compatible) ───────────────────────────
  const renderContent = (content) => {
    if (!content) return <p>No content available.</p>;
    if (typeof content === 'string') return <p>{content}</p>;
    if (Array.isArray(content)) {
      return content.map((block, idx) => {
        if (block.type === 'image') {
          return (
            <figure key={idx} className="content-image-block">
              <img src={block.value} alt={`Story image ${idx + 1}`} />
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

  // ── Loading ────────────────────────────────────────────────────────────────
  if (!story) {
    return <div className="loading-story">Loading Story...</div>;
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="card-page">
      <div className={`story-section ${collapsed ? 'story-expanded' : ''}`}>

        {/* Cover Image Hero */}
        {story.coverImage && (
          <div
            className="story-cover-hero"
            style={{ backgroundImage: `url(${story.coverImage})` }}
          />
        )}

        <h1 className="story-title">{story.title}</h1>

        {/* Story meta info */}
        <div className="story-info">
          <div className="info-item">
            <span className="info-label">Genre</span>
            <span className="info-value genre">{story.genre}</span>
          </div>
          <div className="info-item">
            <span className="info-label">Author</span>
            <span className="info-value">{story.author}</span>
          </div>
          <div className="info-item">
            <span className="info-label">Published</span>
            <span className="info-value">
              {new Date(story.createdAt).toLocaleDateString()}
            </span>
          </div>
          {story.readingTime && (
            <div className="info-item">
              <span className="info-label">Reading Time</span>
              <span className="info-value">⏱ {story.readingTime} min</span>
            </div>
          )}
        </div>

        {/* Summary */}
        <div className="story-summary">
          <h3>Story Summary</h3>
          <p>{story.summary || 'No summary available.'}</p>
        </div>

        {/* Full story content */}
        <div className="story-content">
          {renderContent(story.content)}
        </div>

        {/* Action bar */}
        <div className="action-bar">
          <button
            onClick={handleLike}
            className={isLiked ? 'action-btn action-btn-active' : 'action-btn'}
            title={isLiked ? 'Unlike story' : 'Like story'}
          >
            {isLiked ? '❤️ Liked' : '❤️ Like'} · {likes}
          </button>

          <button
            className="action-btn"
            onClick={() => setShowComments(!showComments)}
            title="Toggle comments"
          >
            💬 {comments.length} Comments
          </button>

          <button
            onClick={handleSave}
            className={isSaved ? 'action-btn action-btn-active' : 'action-btn'}
            title={isSaved ? 'Unsave story' : 'Save story'}
          >
            {isSaved ? '🔖 Saved' : '🔖 Unsaved'}
          </button>

          <button className="action-btn" onClick={handleShare} title="Share story">
            🔗 Share
          </button>

          <button className="action-btn" onClick={handleCopyLink} title="Copy link">
            📋 Copy Link
          </button>

          <button
            className="action-btn view-full-story-btn"
            onClick={() => setShowFullReader(true)}
            title="Open full reader"
          >
            📖 View Full Story
          </button>
        </div>

        {/* Inline feedback banner */}
        {actionFeedback && (
          <div className="card-page-feedback">{actionFeedback}</div>
        )}

        {/* Tags */}
        {story.tags && story.tags.length > 0 && (
          <div className="story-tags-row">
            {story.tags.map(tag => (
              <span key={tag} className="story-tag-chip">#{tag}</span>
            ))}
          </div>
        )}

        {/* Comments panel */}
        {showComments && (
          <div className="comments-panel">
            <div className="comment-input-box">
              <textarea
                placeholder="Write a comment..."
                value={commentText}
                onChange={e => setCommentText(e.target.value)}
              />
              <button onClick={handleComment}>Post Comment</button>
            </div>

            <div className="comments-list">
              {comments.map((comment, index) => (
                <div key={index} className="comment-box">
                  <h4>{comment.username}</h4>
                  <p>{comment.text}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Author Note */}
        {story.authorNote && (
          <div className="author-note-callout">
            <span className="author-note-label">📝 Author's Note</span>
            <p>{story.authorNote}</p>
          </div>
        )}

        {/* Contributions */}
        <div className="contribution-section">
          <h2 className="contribution-title">Contributions</h2>

          <div className="contribution-input-box">
            <textarea
              placeholder="Write your contribution to continue the story..."
              value={contributionText}
              onChange={e => setContributionText(e.target.value)}
            />
            <button onClick={handleContribution}>Submit Contribution</button>
          </div>

          <div className="contribution-list">
            {contributions.map((item, idx) => {
              const cid = item._id || item.id;
              const isTop = idx === 0 && item.upvotes > 0;
              const hasUpvoted = currentUser?._id
                ? (item.upvotedBy || []).some(id => id.toString() === currentUser._id)
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
                    <h4>{item.author}</h4>
                    <span>↑ {item.upvotes} Upvotes</span>
                  </div>

                  <p>{item.text}</p>

                  <button
                    className={`upvote-btn ${hasUpvoted ? 'upvoted' : ''}`}
                    onClick={() => handleUpvote(cid)}
                    title={hasUpvoted ? 'Remove upvote' : 'Upvote this contribution'}
                  >
                    {hasUpvoted ? '👍 Upvoted' : '👍 Upvote'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>

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