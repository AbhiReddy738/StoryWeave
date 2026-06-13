import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_BASE_URL } from '../../config';
import { useAuth } from '../../context/AuthContext.jsx';
import LazyImage from '../../components/LazyImage';
import CoverPlaceholder from '../../components/CoverPlaceholder';
import { optimizeCloudinaryUrl } from '../../utils/imageOptimizer';
import {
  UserCheck,
  UserPlus,
  Heart,
  Clock,
  BookOpenCheck,
  Sparkles,
  MessageSquare,
  Calendar,
  Bookmark,
  Share2,
  Copy,
  BookOpen,
  Send,
  Award,
  Trash2,
  ArrowLeft,
  Users
} from 'lucide-react';
import './CardPage.css';
import StoryReader from '../../components/storyreader/StoryReader';

const API = `${API_BASE_URL}/story`;

const CardPage = ({ collapsed }) => {
  const { slug } = useParams();
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

  // Contributions System States
  const [contributions, setContributions] = useState([]);
  const [contributionText, setContributionText] = useState('');
  const [showContributeModal, setShowContributeModal] = useState(false);
  const [contribPreviewMode, setContribPreviewMode] = useState(false);
  const [contribPosting, setContribPosting] = useState(false);

  // Modals Detail States
  const [selectedContribution, setSelectedContribution] = useState(null);
  const [selectedContributor, setSelectedContributor] = useState(null);

  // Accept Modal States
  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [acceptingContrib, setAcceptingContrib] = useState(null);
  const [appendChecked, setAppendChecked] = useState(true);
  const [acceptingLoading, setAcceptingLoading] = useState(false);

  // Story Editing States
  const [showEditModal, setShowEditModal] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editGenre, setEditGenre] = useState('');
  const [editSummary, setEditSummary] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editTags, setEditTags] = useState('');
  const [editCoverImage, setEditCoverImage] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  // Reader Modal
  const [showFullReader, setShowFullReader] = useState(false);

  const getUser = () => {
    try {
      return JSON.parse(localStorage.getItem('user')) || null;
    } catch {
      return null;
    }
  };

  const currentUser = authUser || getUser();

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
    if (!slug) return;

    const fetchStoryDetails = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await axios.get(`${API}/${slug}`);
        const data = res.data;
        setStory(data);
        setLikeCount(data.likes || 0);
        setComments(data.comments || []);

        const actualStoryId = data._id;

        // Load new Contribution System contributions (independent query)
        try {
          const contribsRes = await axios.get(`${API_BASE_URL}/stories/${actualStoryId}/contributions`);
          setContributions(contribsRes.data || []);
        } catch (contribErr) {
          console.warn("[DEBUG - CLIENT] Failed to load contributions:", contribErr.message);
        }

        // Check if user already liked/saved (independent query)
        if (currentUser) {
          const uid = currentUser._id;
          setLiked((data.likedBy || []).some(id => id.toString() === uid));
          try {
            const saveRes = await axios.get(`${API}/is-saved/${actualStoryId}/${uid}`);
            setSaved(saveRes.data.isSaved);
          } catch (saveErr) {
            console.warn("[DEBUG - CLIENT] Failed to check saved state:", saveErr.message);
          }
        }

        // Fetch Related Stories (independent query)
        try {
          const allRes = await axios.get(`${API}/all`);
          const currentTags = data.tags || [];
          const related = allRes.data
            .filter(s => s._id !== data._id && (
              s.genre?.toLowerCase() === data.genre?.toLowerCase() ||
              (s.tags || []).some(t => currentTags.includes(t))
            ))
            .slice(0, 5);
          setRelatedStories(related);
        } catch (relatedErr) {
          console.warn("[DEBUG - CLIENT] Failed to load related stories:", relatedErr.message);
        }

      } catch (err) {
        console.error("[DEBUG - CLIENT] Failed to load story details:", err);
        setError('Story not found.');
      } finally {
        setLoading(false);
      }
    };

    fetchStoryDetails();
  }, [slug]);

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

  // ── Submit Contribution continuation ───────────────────────────────────────
  const handleContributionSubmit = async () => {
    const user = getUser();
    if (!user) return alert('Please log in to submit contributions.');
    if (!contributionText.trim()) return;

    setContribPosting(true);
    try {
      await axios.post(`${API_BASE_URL}/stories/${story._id}/contribute`, {
        text: contributionText.trim(),
        contributedText: contributionText.trim()
      });
      
      // Reload contributions list
      const res = await axios.get(`${API_BASE_URL}/stories/${story._id}/contributions`);
      setContributions(res.data || []);
      
      setContributionText('');
      setShowContributeModal(false);
      showFeedback('✨ Continuation idea submitted!');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to submit contribution.');
    } finally {
      setContribPosting(false);
    }
  };

  // ── Toggle Upvote Contribution ─────────────────────────────────────────────
  const handleUpvote = async (contributionId) => {
    const user = getUser();
    if (!user) return alert('Please log in to upvote contributions.');

    try {
      const res = await axios.put(`${API}/${story._id}/contribution/${contributionId}/upvote`);
      if (res.data.success) {
        setContributions(prev => prev.map(c => {
          if (c._id === contributionId) {
            return {
              ...c,
              upvotes: res.data.upvotes,
              upvotedBy: res.data.upvotedBy
            };
          }
          return c;
        }).sort((a, b) => {
          if (a.accepted && !b.accepted) return -1;
          if (!a.accepted && b.accepted) return 1;
          if (b.upvotes !== a.upvotes) return b.upvotes - a.upvotes;
          return new Date(b.createdAt) - new Date(a.createdAt);
        }));
        showFeedback('👍 Upvote updated!');
      }
    } catch (err) {
      console.error("Upvote failed:", err);
      showFeedback('Failed to update upvote.');
    }
  };

  const openAcceptModal = (contribution) => {
    setAcceptingContrib(contribution);
    setAppendChecked(true);
    setShowAcceptModal(true);
  };

  const handleConfirmAccept = async () => {
    if (!acceptingContrib) return;
    setAcceptingLoading(true);
    try {
      const cid = acceptingContrib._id || acceptingContrib.id;
      const res = await axios.post(`${API}/${story._id}/contribution/${cid}/accept`, {
        append: appendChecked
      });
      if (res.data.success) {
        setStory(res.data.story);
        // Refresh contributions list
        const contribsRes = await axios.get(`${API_BASE_URL}/stories/${story._id}/contributions`);
        setContributions(contribsRes.data || []);
        showFeedback('🎉 Contribution added to story!');
        setShowAcceptModal(false);
        setAcceptingContrib(null);
      }
    } catch (err) {
      console.error("Accept failed:", err);
      alert(err.response?.data?.message || 'Failed to accept contribution.');
    } finally {
      setAcceptingLoading(false);
    }
  };

  // ── Moderate status (Accept/Reject) ────────────────────────────────────────
  const handleModerateContribution = async (contribId, status) => {
    try {
      await axios.put(`${API_BASE_URL}/stories/${story._id}/contributions/${contribId}/status`, { status });
      const res = await axios.get(`${API_BASE_URL}/stories/${story._id}/contributions`);
      setContributions(res.data || []);
      showFeedback(`Contribution ${status}!`);
    } catch (err) {
      alert('Moderation failed.');
    }
  };

  // ── Merge continuation into story text ─────────────────────────────────────
  const handleMergeContribution = async (contribId) => {
    try {
      const res = await axios.post(`${API_BASE_URL}/stories/${story._id}/contributions/${contribId}/merge`);
      setStory(res.data.story);
      const listRes = await axios.get(`${API_BASE_URL}/stories/${story._id}/contributions`);
      setContributions(listRes.data || []);
      showFeedback('🎉 Continuation merged into story!');
    } catch (err) {
      alert('Merging failed.');
    }
  };

  // ── Edit story ─────────────────────────────────────────────────────────────
  const openEditModal = () => {
    setEditTitle(story.title || '');
    setEditGenre(story.genre || '');
    setEditSummary(story.summary || '');
    
    if (typeof story.content === 'string') {
      setEditContent(story.content);
    } else if (Array.isArray(story.content)) {
      const text = story.content
        .filter(b => b.type === 'text')
        .map(b => b.value || '')
        .join('\n\n')
        .replace(/<p>/g, '')
        .replace(/<\/p>/g, '')
        .replace(/<br\s*\/?>/g, '\n');
      setEditContent(text);
    } else {
      setEditContent('');
    }
    setEditTags(story.tags?.join(', ') || '');
    setEditCoverImage(story.coverImage || '');
    setShowEditModal(true);
  };

  const handleSaveStoryEdits = async () => {
    if (!editTitle.trim()) return alert("Title is required");
    setSavingEdit(true);
    try {
      const payload = {
        title: editTitle.trim(),
        genre: editGenre.trim(),
        summary: editSummary.trim(),
        content: editContent,
        tags: editTags.split(',').map(t => t.trim()).filter(Boolean),
        coverImage: editCoverImage.trim()
      };
      
      const res = await axios.put(`${API_BASE_URL}/stories/${story._id}`, payload);
      setStory(res.data.story || res.data);
      setShowEditModal(false);
      showFeedback('✏️ Story updated successfully!');
    } catch (err) {
      alert("Failed to save edits.");
    } finally {
      setSavingEdit(false);
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

  const isAuthor = story?.authorId && authUser && story.authorId.toString() === authUser._id.toString();

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
      <span><BookOpen size={48} /></span>
      <p>{error || 'Story not found'}</p>
      <button onClick={() => navigate('/')}>
        <ArrowLeft size={16} />
        <span>Back to Home</span>
      </button>
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
                  className={`story-author-follow-btn ${isFollowingAuthor ? 'following' : ''}`}
                >
                  {isFollowingAuthor ? <UserCheck size={13} /> : <UserPlus size={13} />}
                  <span>{isFollowingAuthor ? 'Following' : 'Follow'}</span>
                </button>
              )}
            </div>
            
            {/* Created By & Contributor Credits Permanent Credits */}
            <div className="contributors-credit-line" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', fontSize: '13px', color: 'var(--secondary-text)', marginTop: '4px', alignItems: 'center' }}>
              <span>Created By: <strong>{story.author}</strong></span>
              {story.contributors && story.contributors.length > 0 && (
                <>
                  <span style={{ margin: '0 4px' }}>|</span>
                  <span>Contributors:</span>
                  {Array.from(new Set(story.contributors.map(c => c.contributorName))).map((name, i, arr) => (
                    <strong key={name} style={{ color: 'var(--accent-color)' }}>
                      {name}{i < arr.length - 1 ? ',' : ''}
                    </strong>
                  ))}
                </>
              )}
            </div>

            <div className="story-meta-row" style={{ marginTop: '12px' }}>
              <span><Heart size={13} /> {likeCount.toLocaleString()} likes</span>
              <span><Clock size={13} /> {story.readingTime || 1} min read</span>
              <span><BookOpenCheck size={13} /> {getWordCount().toLocaleString()} words</span>
              <span><Sparkles size={13} /> {contributions.length} contributions</span>
              <span><MessageSquare size={13} /> {comments.length} comments</span>
              <span><Calendar size={13} /> {new Date(story.createdAt).toLocaleDateString()}</span>
            </div>

            {/* Pending Contributions Count Alert for Story Owner */}
            {isAuthor && contributions.filter(c => c.status === 'pending').length > 0 && (
              <div 
                className="pending-contributions-alert" 
                onClick={() => {
                  const el = document.querySelector('.story-contributions-card');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: 'rgba(251, 191, 36, 0.15)',
                  color: '#fbbf24',
                  padding: '8px 16px',
                  borderRadius: '20px',
                  fontSize: '13px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  border: '1px solid #fbbf24',
                  marginTop: '12px'
                }}
              >
                ⚠️ Pending Contributions ({contributions.filter(c => c.status === 'pending').length})
              </div>
            )}
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
            <Heart size={15} fill={liked ? 'currentColor' : 'none'} />
            <span>{liked ? 'Liked' : 'Like'}</span>
          </button>
          <button
            className={`story-action-btn ${saved ? 'story-saved' : ''}`}
            onClick={handleSave}
          >
            <Bookmark size={15} fill={saved ? 'currentColor' : 'none'} />
            <span>{saved ? 'Saved' : 'Save'}</span>
          </button>
          <button className="story-action-btn" onClick={handleShare}>
            <Share2 size={15} />
            <span>Share</span>
          </button>
          <button className="story-action-btn" onClick={handleCopyLink}>
            <Copy size={15} />
            <span>Copy Link</span>
          </button>
          <button
            className="story-action-btn story-view-reader"
            onClick={() => setShowFullReader(true)}
          >
            <BookOpen size={15} />
            <span>View Full Story</span>
          </button>

          {/* Continue This Story Button */}
          {authUser && story.authorId && authUser._id.toString() !== story.authorId.toString() && (
            <button
              className="story-action-btn story-view-reader"
              onClick={() => setShowContributeModal(true)}
              style={{ background: 'var(--accent-gradient)', color: 'var(--accent-text)', border: 'none' }}
            >
              <Sparkles size={15} />
              <span>Continue This Story</span>
            </button>
          )}

          {/* Edit Story Button for Owner */}
          {isAuthor && (
            <button
              className="story-action-btn story-view-reader"
              onClick={openEditModal}
              style={{ background: 'var(--accent-gradient)', color: 'var(--accent-text)', border: 'none' }}
            >
              <span>✏️ Edit Story</span>
            </button>
          )}
        </div>
      </div>

      {/* ── MAIN CONTENT GRID ── */}
      <div className="story-main-content">
        
        {/* LEFT COLUMN: Story Reading, Contributions & Comments */}
        <div className="story-content-left">
          
          {/* Story Reading Area */}
          <div className="story-content-card">
            <h3 className="story-section-title">
              <BookOpen size={18} className="section-title-icon" />
              <span>Story Content</span>
            </h3>
            <div className="story-text-body">
              {renderContent(story.content)}
            </div>
          </div>

          {/* Inline Contribution Form */}
          <div className="story-content-card inline-contribution-section" style={{ background: 'var(--card-color)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '24px', marginBottom: '24px' }}>
            <h3 className="story-section-title" style={{ marginBottom: '16px' }}>
              <Sparkles size={18} className="section-title-icon" />
              <span>Continue This Story</span>
            </h3>
            
            {currentUser ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <textarea
                  className="comment-textarea"
                  value={contributionText}
                  onChange={(e) => setContributionText(e.target.value)}
                  placeholder="Write your continuation of the story..."
                  rows={4}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '8px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-color)',
                    resize: 'vertical',
                    fontSize: '14px',
                    fontFamily: 'inherit'
                  }}
                />
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                  <button
                    className="modal-btn cancel"
                    onClick={() => setContributionText('')}
                    style={{ padding: '8px 20px', fontSize: '13px' }}
                  >
                    Clear
                  </button>
                  <button
                    className="modal-btn save"
                    onClick={handleContributionSubmit}
                    disabled={contribPosting || !contributionText.trim()}
                    style={{ padding: '8px 20px', fontSize: '13px' }}
                  >
                    {contribPosting ? 'Submitting...' : 'Submit Contribution'}
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px dashed var(--border-color)' }}>
                <p style={{ color: 'var(--secondary-text)', margin: '0 0 12px 0', fontSize: '14px' }}>Want to contribute your continuation idea for this story?</p>
                <button
                  className="modal-btn save"
                  onClick={() => navigate('/login')}
                  style={{ padding: '8px 20px', fontSize: '13px' }}
                >
                  Login to contribute
                </button>
              </div>
            )}
          </div>

          {/* Contributions Section */}
          <div className="story-contributions-card">
            <h3 className="story-section-title">
              <Sparkles size={18} className="section-title-icon" />
              <span>Community Contributions ({contributions.length})</span>
            </h3>

            <div className="contributions-list" style={{ marginTop: '20px' }}>
              {contributions.length === 0 ? (
                <div className="song-empty-tab">
                  <span><Sparkles size={32} /></span>
                  <p>No continuation submissions yet. Be the first to continue the story!</p>
                </div>
              ) : (
                contributions.map((item, idx) => {
                  const cid = item._id || item.id;
                  const isTop = item.accepted || item.status === 'accepted';
                  const hasUpvoted = currentUser?._id
                    ? (item.upvotedBy || []).some(uid => uid.toString() === currentUser._id.toString())
                    : false;

                  return (
                    <div
                      key={cid}
                      className={`contribution-card ${isTop ? 'top-contribution' : ''}`}
                      style={{
                        background: 'var(--card-color)',
                        border: isTop ? '2px solid #d4af37' : '1px solid var(--border-color)',
                        borderRadius: '16px',
                        padding: '20px',
                        marginBottom: '16px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px',
                        boxShadow: isTop ? '0 0 10px rgba(212, 175, 55, 0.15)' : 'none'
                      }}
                    >
                      <div className="contribution-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div className="contribution-meta" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div className="contrib-user-avatar" style={{ width: '36px', height: '36px', borderRadius: '50%', overflow: 'hidden' }}>
                            <img src={item.contributorProfileImage || 'https://via.placeholder.com/150'} alt={item.contributorName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span 
                              className="contribution-author"
                              onClick={() => navigate(item.contributorId ? `/author/${item.contributorId}` : `/author/${item.contributorName}`)}
                              style={{ cursor: 'pointer', textDecoration: 'underline', fontWeight: 'bold', fontSize: '14px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                            >
                              {item.contributorName}
                              {isTop && <span className="contributed-badge" style={{ color: '#fbbf24', fontWeight: 'bold', fontSize: '12px' }}>🏆 Contributed</span>}
                            </span>
                            <span className="contribution-date" style={{ fontSize: '11px', color: 'var(--secondary-text)' }}>
                              {new Date(item.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        
                        <div className="contrib-badges-row" style={{ display: 'flex', gap: '8px' }}>
                          {isTop && (
                            <span className="status-badge" style={{ background: 'rgba(74, 222, 128, 0.15)', color: '#4ade80', fontSize: '11px', padding: '4px 10px', borderRadius: '12px', fontWeight: 'bold', border: '1px solid #4ade80' }}>
                              ✓ Added To Story
                            </span>
                          )}
                          {item.mergedIntoStory && (
                            <span className="status-badge" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', fontSize: '11px', padding: '4px 10px', borderRadius: '12px', fontWeight: 'bold' }}>
                              Merged Into Story
                            </span>
                          )}
                          {!isTop && item.status === 'pending' && (
                            <span className="status-badge" style={{ background: 'rgba(251, 191, 36, 0.15)', color: '#fbbf24', fontSize: '11px', padding: '4px 10px', borderRadius: '12px', fontWeight: 'bold' }}>
                              Pending
                            </span>
                          )}
                          {!isTop && item.status === 'rejected' && (
                            <span className="status-badge" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', fontSize: '11px', padding: '4px 10px', borderRadius: '12px', fontWeight: 'bold' }}>
                              Rejected
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="contributed-continuation-header" style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--accent-color)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        &ldquo;Contributed Continuation&rdquo;
                      </div>

                      <p className="contribution-text" style={{ fontSize: '14px', lineHeight: '1.6', color: 'var(--text-color)', margin: 0 }}>
                        {item.contributedText.length > 250 ? item.contributedText.slice(0, 250) + '...' : item.contributedText}
                      </p>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', flexWrap: 'wrap', gap: '10px' }}>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <button 
                            className="modal-btn cancel" 
                            onClick={() => setSelectedContribution(item)}
                            style={{ padding: '6px 14px', fontSize: '12px', borderRadius: '16px' }}
                          >
                            View Full
                          </button>
                          
                          <span className="upvotes-count" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: 'var(--secondary-text)', marginLeft: '12px', marginRight: '6px' }}>
                            👍 {item.upvotes || 0}
                          </span>
                          <button
                            className={`upvote-btn ${hasUpvoted ? 'upvoted' : ''}`}
                            onClick={() => handleUpvote(cid)}
                            style={{
                              background: hasUpvoted ? 'rgba(74, 222, 128, 0.15)' : 'rgba(255,255,255,0.05)',
                              color: hasUpvoted ? '#4ade80' : 'var(--text-color)',
                              border: hasUpvoted ? '1px solid #4ade80' : '1px solid var(--border-color)',
                              padding: '6px 14px',
                              fontSize: '12px',
                              borderRadius: '16px',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px'
                            }}
                          >
                            <span>{hasUpvoted ? 'Upvoted' : 'Upvote'}</span>
                          </button>
                        </div>

                        {/* Story Author Moderation Panel */}
                        {isAuthor && (
                          <div style={{ display: 'flex', gap: '8px' }}>
                            {!item.accepted && item.status !== 'rejected' && (
                              <>
                                <button 
                                  className="modal-btn" 
                                  onClick={() => openAcceptModal(item)}
                                  style={{ background: 'rgba(74, 222, 128, 0.2)', color: '#4ade80', border: '1px solid #4ade80', padding: '6px 14px', fontSize: '12px', borderRadius: '16px' }}
                                >
                                  ➕ Add To Story
                                </button>
                                <button 
                                  className="modal-btn" 
                                  onClick={() => handleModerateContribution(cid, 'rejected')}
                                  style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', border: '1px solid #ef4444', padding: '6px 14px', fontSize: '12px', borderRadius: '16px' }}
                                >
                                  Reject
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Story Contributors Section */}
          {story.contributors && story.contributors.length > 0 && (
            <div className="story-contributions-card">
              <h3 className="story-section-title">
                <Users size={18} className="section-title-icon" />
                <span>Story Contributors ({Array.from(new Set(story.contributors.map(c => c.contributorId?.toString()))).length})</span>
              </h3>
              <div className="contributors-list-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px', marginTop: '16px' }}>
                {story.contributors.map((c, idx) => {
                  const acceptedCount = story.contributors.filter(tc => tc.contributorId?.toString() === c.contributorId?.toString()).length;

                  return (
                    <div 
                      key={idx} 
                      className="contributor-profile-card" 
                      style={{ background: 'var(--card-color)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', textAlign: 'center' }}
                    >
                      <div className="contributor-avatar-large" style={{ width: '56px', height: '56px', borderRadius: '50%', overflow: 'hidden', border: '2px solid var(--accent-color)' }}>
                        <img src={c.profilePhoto || 'https://via.placeholder.com/150'} alt={c.contributorName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                      <div className="contributor-info-block">
                        <div className="contributor-name-text" style={{ fontWeight: 'bold', fontSize: '14px' }}>{c.contributorName}</div>
                        <div className="contributor-count-badge" style={{ fontSize: '12px', color: 'var(--accent-color)', marginTop: '4px' }}>🏆 {acceptedCount} accepted continuation(s)</div>
                        {c.mergedAt && <div className="contributor-date-text" style={{ fontSize: '11px', color: 'var(--secondary-text)', marginTop: '2px' }}>Merged: {new Date(c.mergedAt).toLocaleDateString()}</div>}
                      </div>
                      <button 
                        className="modal-btn cancel" 
                        onClick={() => setSelectedContributor(c)}
                        style={{ padding: '6px 14px', fontSize: '12px', borderRadius: '16px', width: '100%' }}
                      >
                        View Contribution
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Comments section */}
          <div className="story-comments-card">
            <h3 className="story-section-title">
              <MessageSquare size={18} className="section-title-icon" />
              <span>Comments ({comments.length})</span>
            </h3>

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
                    {currentUser && c.username === currentUser.username && (
                      <button
                        className="comment-delete-btn"
                        onClick={() => handleDeleteComment(c._id)}
                        title="Delete Comment"
                      >
                        <Trash2 size={14} />
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
            <h4 className="sidebar-card-title">Story Information</h4>
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
                      className={`story-author-follow-btn-mini ${isFollowingAuthor ? 'following' : ''}`}
                    >
                      {isFollowingAuthor ? <UserCheck size={11} /> : <UserPlus size={11} />}
                      <span>{isFollowingAuthor ? 'Following' : 'Follow'}</span>
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
              {(() => {
                const acceptedContributors = contributions
                  .filter(c => c.accepted)
                  .map(c => ({
                    id: c.contributorId || c.authorId,
                    name: c.contributorName || c.author
                  }));
                const uniqueContributors = [];
                const seenNames = new Set();
                acceptedContributors.forEach(c => {
                  if (c.name && !seenNames.has(c.name)) {
                    seenNames.add(c.name);
                    uniqueContributors.push(c);
                  }
                });

                if (uniqueContributors.length === 0) return null;

                return (
                  <div className="sidebar-info-item" style={{ flexDirection: 'column', alignItems: 'flex-start', borderTop: '1px solid var(--border-color)', paddingTop: '12px', marginTop: '12px', gap: '8px', width: '100%' }}>
                    <span style={{ fontSize: '12px', color: 'var(--secondary-text)', fontWeight: 'bold' }}>Contributors:</span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', width: '100%' }}>
                      {uniqueContributors.map((c, index) => (
                        <span 
                          key={index}
                          onClick={() => navigate(c.id ? `/author/${c.id}` : `/author/${c.name}`)}
                          style={{
                            cursor: 'pointer',
                            fontSize: '11px',
                            fontWeight: 'bold',
                            color: '#fbbf24',
                            background: 'rgba(212, 175, 55, 0.1)',
                            border: '1px solid #d4af37',
                            padding: '3px 8px',
                            borderRadius: '12px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          🏆 {c.name}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Story Summary Card */}
          <div className="story-sidebar-card">
            <h4 className="sidebar-card-title">Summary</h4>
            <p className="sidebar-card-text">{story.summary || 'No summary available.'}</p>
          </div>

          {/* Author Note Card */}
          {story.authorNote && (
            <div className="story-sidebar-card">
              <h4 className="sidebar-card-title">Author Note</h4>
              <p className="sidebar-card-text">{story.authorNote}</p>
            </div>
          )}

          {/* Tags Card */}
          {story.tags && story.tags.length > 0 && (
            <div className="story-sidebar-card">
              <h4 className="sidebar-card-title">Tags</h4>
              <div className="sidebar-tags-list">
                {story.tags.map(tag => (
                  <span key={tag} className="sidebar-tag">#{tag}</span>
                ))}
              </div>
            </div>
          )}

          {/* Related Stories Card */}
          <div className="story-sidebar-card">
            <h4 className="sidebar-card-title">Related Stories</h4>
            {relatedStories.length === 0 ? (
              <p className="sidebar-card-empty">No related stories found.</p>
            ) : (
              <div className="related-stories-list">
                {relatedStories.map(rs => (
                  <div
                    key={rs._id}
                    className="related-story-card"
                    onClick={() => navigate(`/card/${rs.slug || rs._id}`)}
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

      {/* ── WRITE CONTRIBUTION MODAL ── */}
      {showContributeModal && (
        <div className="edit-modal-overlay" onClick={() => setShowContributeModal(false)}>
          <div className="edit-modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '650px' }}>
            <div className="edit-modal-header">
              <h3>Continue the Story: &ldquo;{story.title}&rdquo;</h3>
              <button className="close-modal-btn" onClick={() => setShowContributeModal(false)}>✕</button>
            </div>
            
            <div style={{ display: 'flex', gap: '12px', marginBottom: '10px' }}>
              <button 
                className={`modal-btn ${!contribPreviewMode ? 'save' : 'cancel'}`} 
                onClick={() => setContribPreviewMode(false)}
                style={{ padding: '6px 16px', fontSize: '13px', borderRadius: '16px' }}
              >
                Editor
              </button>
              <button 
                className={`modal-btn ${contribPreviewMode ? 'save' : 'cancel'}`} 
                onClick={() => setContribPreviewMode(true)}
                style={{ padding: '6px 16px', fontSize: '13px', borderRadius: '16px' }}
              >
                Preview
              </button>
            </div>

            {contribPreviewMode ? (
              <div style={{ background: 'var(--input-bg)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '16px', minHeight: '220px', maxHeight: '400px', overflowY: 'auto', fontStyle: 'italic' }}>
                {contributionText.trim() ? (
                  contributionText.split('\n').map((p, idx) => <p key={idx} style={{ marginBottom: '12px', lineHeight: '1.6' }}>{p}</p>)
                ) : (
                  <span style={{ color: 'var(--secondary-text)' }}>Write something in the editor to preview it.</span>
                )}
              </div>
            ) : (
              <div className="edit-field">
                <label>Write Continuation</label>
                <textarea
                  className="edit-textarea"
                  placeholder="Continue the narrative from where the author left off. Introduce new elements or conclude chapters..."
                  value={contributionText}
                  onChange={e => setContributionText(e.target.value)}
                  style={{ minHeight: '220px' }}
                />
              </div>
            )}

            <div className="modal-actions">
              <button className="modal-btn cancel" onClick={() => setShowContributeModal(false)}>Cancel</button>
              <button 
                className="modal-btn save" 
                onClick={handleContributionSubmit}
                disabled={contribPosting || !contributionText.trim()}
              >
                {contribPosting ? 'Submitting...' : 'Submit Continuation'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── EDIT STORY MODAL ── */}
      {showEditModal && (
        <div className="edit-modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="edit-modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '750px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="edit-modal-header">
              <h3>Edit Story: &ldquo;{story.title}&rdquo;</h3>
              <button className="close-modal-btn" onClick={() => setShowEditModal(false)}>✕</button>
            </div>
            
            <div className="edit-field">
              <label>Title</label>
              <input 
                className="edit-input-text" 
                value={editTitle} 
                onChange={e => setEditTitle(e.target.value)} 
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="edit-field">
                <label>Genre</label>
                <input 
                  className="edit-input-text" 
                  value={editGenre} 
                  onChange={e => setEditGenre(e.target.value)} 
                />
              </div>
              <div className="edit-field">
                <label>Tags (comma separated)</label>
                <input 
                  className="edit-input-text" 
                  value={editTags} 
                  onChange={e => setEditTags(e.target.value)} 
                />
              </div>
            </div>

            <div className="edit-field">
              <label>Cover Image URL</label>
              <input 
                className="edit-input-text" 
                value={editCoverImage} 
                onChange={e => setEditCoverImage(e.target.value)} 
              />
            </div>

            <div className="edit-field">
              <label>Description / Summary</label>
              <textarea 
                className="edit-textarea" 
                value={editSummary} 
                onChange={e => setEditSummary(e.target.value)} 
                style={{ minHeight: '80px' }}
              />
            </div>

            <div className="edit-field">
              <label>Story Content</label>
              <textarea 
                className="edit-textarea" 
                value={editContent} 
                onChange={e => setEditContent(e.target.value)} 
                style={{ minHeight: '220px' }}
              />
            </div>

            <div className="modal-actions">
              <button className="modal-btn cancel" onClick={() => setShowEditModal(false)}>Cancel</button>
              <button 
                className="modal-btn save" 
                onClick={handleSaveStoryEdits}
                disabled={savingEdit}
              >
                {savingEdit ? 'Saving...' : 'Save Edits'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── VIEW FULL CONTRIBUTION MODAL ── */}
      {selectedContribution && (
        <div className="edit-modal-overlay" onClick={() => setSelectedContribution(null)}>
          <div className="edit-modal-content" onClick={e => e.stopPropagation()}>
            <div className="edit-modal-header">
              <h3>Continuation by @{selectedContribution.contributorName}</h3>
              <button className="close-modal-btn" onClick={() => setSelectedContribution(null)}>✕</button>
            </div>
            
            <div style={{ margin: '10px 0', display: 'flex', gap: '8px' }}>
              <span className="status-badge" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-color)', fontSize: '12px', padding: '4px 10px', borderRadius: '12px' }}>
                Status: {selectedContribution.status}
              </span>
              {selectedContribution.mergedIntoStory && (
                <span className="status-badge" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', fontSize: '12px', padding: '4px 10px', borderRadius: '12px' }}>
                  Merged into main story
                </span>
              )}
            </div>

            <div style={{ background: 'var(--input-bg)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '20px', maxHeight: '400px', overflowY: 'auto', fontStyle: 'italic', lineHeight: '1.6' }}>
              {selectedContribution.contributedText.split('\n').map((p, i) => (
                <p key={i} style={{ marginBottom: '12px' }}>{p}</p>
              ))}
            </div>

            <div className="modal-actions">
              <button className="modal-btn cancel" onClick={() => setSelectedContribution(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* ── VIEW CONTRIBUTOR CONTRIBUTION MODAL ── */}
      {selectedContributor && (
        <div className="edit-modal-overlay" onClick={() => setSelectedContributor(null)}>
          <div className="edit-modal-content" onClick={e => e.stopPropagation()}>
            <div className="edit-modal-header">
              <h3>Merged Credit to @{selectedContributor.contributorName}</h3>
              <button className="close-modal-btn" onClick={() => setSelectedContributor(null)}>✕</button>
            </div>
            
            <div style={{ fontSize: '13px', color: 'var(--secondary-text)', marginBottom: '12px' }}>
              Merged at {new Date(selectedContributor.mergedAt).toLocaleString()}
            </div>

            <div style={{ background: 'var(--input-bg)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '20px', maxHeight: '400px', overflowY: 'auto', fontStyle: 'italic', lineHeight: '1.6' }}>
              {selectedContributor.contributedText.split('\n').map((p, i) => (
                <p key={i} style={{ marginBottom: '12px' }}>{p}</p>
              ))}
            </div>

            <div className="modal-actions">
              <button className="modal-btn cancel" onClick={() => setSelectedContributor(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* ── ACCEPT CONTRIBUTION CONFIRMATION MODAL ── */}
      {showAcceptModal && acceptingContrib && (
        <div className="edit-modal-overlay" onClick={() => { if (!acceptingLoading) setShowAcceptModal(false); }}>
          <div className="edit-modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className="edit-modal-header">
              <h3>Add Contribution To Story?</h3>
              <button className="close-modal-btn" onClick={() => { if (!acceptingLoading) setShowAcceptModal(false); }} disabled={acceptingLoading}>✕</button>
            </div>
            
            <div style={{ margin: '15px 0' }}>
              <p style={{ color: 'var(--secondary-text)', fontSize: '14px', marginBottom: '12px' }}>
                You are adding <strong>@{acceptingContrib.contributorName}</strong>'s continuation to your story.
              </p>
              
              <div style={{ background: 'var(--input-bg)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '12px', maxHeight: '150px', overflowY: 'auto', fontSize: '13px', fontStyle: 'italic', color: 'var(--text-color)', marginBottom: '16px' }}>
                "{acceptingContrib.contributedText}"
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '14px', userSelect: 'none' }}>
                <input 
                  type="checkbox" 
                  checked={appendChecked} 
                  onChange={(e) => setAppendChecked(e.target.checked)}
                  style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                />
                <span>Append contribution text to story content</span>
              </label>
            </div>

            <div className="modal-actions" style={{ marginTop: '20px' }}>
              <button 
                className="modal-btn cancel" 
                onClick={() => setShowAcceptModal(false)}
                disabled={acceptingLoading}
              >
                Cancel
              </button>
              <button 
                className="modal-btn save" 
                onClick={handleConfirmAccept}
                disabled={acceptingLoading}
              >
                {acceptingLoading ? 'Adding...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

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