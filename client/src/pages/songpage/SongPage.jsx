import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_BASE_URL } from '../../config';
import { useAuth } from '../../context/AuthContext.jsx';
import LazyImage from '../../components/LazyImage';
import CoverPlaceholder from '../../components/CoverPlaceholder';
import { optimizeCloudinaryUrl } from '../../utils/imageOptimizer';
import {
  Heart,
  Bookmark,
  Share2,
  MessageSquare,
  Sparkles,
  Calendar,
  ArrowLeft,
  Music,
  Send,
  Award,
  Trash2,
  Users,
  Edit3,
  X,
  Eye,
  UserPlus,
  UserCheck
} from 'lucide-react';
import './SongPage.css';

const API = `${API_BASE_URL}/song`;

const SongPage = ({ collapsed }) => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user: authUser } = useAuth();

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

  // Contributions System States
  const [contributions, setContributions] = useState([]);
  const [contributionText, setContributionText] = useState('');
  const [contribPosting, setContribPosting] = useState(false);

  // Modals Detail States
  const [selectedContribution, setSelectedContribution] = useState(null);
  const [selectedContributor, setSelectedContributor] = useState(null);

  // Accept Modal States
  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [acceptingContrib, setAcceptingContrib] = useState(null);
  const [appendChecked, setAppendChecked] = useState(true);
  const [acceptingLoading, setAcceptingLoading] = useState(false);

  // Song Editing States
  const [showEditModal, setShowEditModal] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editArtistName, setEditArtistName] = useState('');
  const [editGenre, setEditGenre] = useState('');
  const [editSummary, setEditSummary] = useState('');
  const [editLyrics, setEditLyrics] = useState('');
  const [editTags, setEditTags] = useState('');
  const [editCoverImage, setEditCoverImage] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  // Active tab
  const [activeTab, setActiveTab] = useState('lyrics');

  const getUser = () => {
    try { return JSON.parse(localStorage.getItem('user')); } catch { return null; }
  };

  const currentUser = authUser || getUser();

  // Follow status check
  useEffect(() => {
    if (!song?.authorId || !authUser) return;
    const checkFollowStatus = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/user/follow-status/${song.authorId}`);
        setIsFollowingArtist(res.data.isFollowing);
      } catch (err) {
        console.error("Failed to fetch follow status", err);
      }
    };
    checkFollowStatus();
  }, [song?.authorId, authUser]);

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

  const showFeedback = (msg) => {
    setSaveFeedback(msg);
    setTimeout(() => setSaveFeedback(''), 2500);
  };

  // Fetch song
  useEffect(() => {
    if (!slug) return;
    const fetchSong = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await axios.get(`${API}/${slug}`);
        const data = res.data;
        setSong(data);
        setLikeCount(data.likes || 0);
        setComments(data.comments || []);
        
        const actualSongId = data._id;

        // Load new Contribution System contributions (independent query)
        try {
          const contribsRes = await axios.get(`${API}/${actualSongId}/contributions`);
          setContributions(contribsRes.data || []);
        } catch (contribErr) {
          console.warn("[DEBUG - CLIENT] Failed to load contributions:", contribErr.message);
        }

        // Check if user already liked/saved
        if (currentUser) {
          const uid = currentUser._id;
          setLiked((data.likedBy || []).some(id => id.toString() === uid));
          try {
            const saveRes = await axios.get(`${API}/is-saved/${actualSongId}/${uid}`);
            setSaved(saveRes.data.isSaved);
          } catch (saveErr) {
            console.warn("[DEBUG - CLIENT] Failed to check saved state:", saveErr.message);
          }
        }

        // Related songs
        try {
          const allRes = await axios.get(`${API}/all`);
          const currentTags = data.tags || [];
          const related = allRes.data
            .filter(s => s._id !== data._id && (
              s.genre?.toLowerCase() === data.genre?.toLowerCase() ||
              (s.tags || []).some(t => currentTags.includes(t))
            ))
            .slice(0, 5);
          setRelatedSongs(related);
        } catch (relatedErr) {
          console.warn("[DEBUG - CLIENT] Failed to load related songs:", relatedErr.message);
        }
      } catch (err) {
        console.error("[DEBUG - CLIENT] Failed to load song details:", err);
        setError('Song not found.');
      } finally {
        setLoading(false);
      }
    };
    fetchSong();
  }, [slug]);

  // Like toggle
  const handleLike = async () => {
    if (!currentUser) return alert('Please log in to like songs.');
    
    // Optimistic update
    const newLiked = !liked;
    setLiked(newLiked);
    setLikeCount(prev => newLiked ? prev + 1 : prev - 1);

    try {
      const res = await axios.put(`${API}/like/${song._id}`, { userId: currentUser._id });
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
    if (!currentUser) return alert('Please log in to save songs.');

    const newSaved = !saved;
    setSaved(newSaved);

    try {
      const endpoint = newSaved ? 'save' : 'unsave';
      await axios.post(`${API}/${endpoint}/${song._id}`, { userId: currentUser._id });
      showFeedback(newSaved ? '🎵 Lyrics Saved!' : '🗑 Lyrics Removed');
    } catch {
      setSaved(!newSaved);
    }
  };

  // Post comment
  const handleComment = async () => {
    if (!currentUser) return alert('Please log in to comment.');
    if (!commentText.trim()) return;
    setCommentPosting(true);
    try {
      const res = await axios.post(`${API}/comment/${song._id}`, {
        username: currentUser.username,
        text: commentText.trim()
      });
      setComments(res.data.comments || []);
      setCommentText('');
    } catch { /* silent */ }
    setCommentPosting(false);
  };

  // Delete Comment
  const handleDeleteComment = async (commentId) => {
    try {
      const res = await axios.delete(`${API}/comment/${song._id}/${commentId}`);
      setComments(res.data.comments || []);
      showFeedback('💬 Comment deleted!');
    } catch {
      showFeedback('Failed to delete comment.');
    }
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
        showFeedback('🔗 Lyrics shared!');
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

  // Submit contribution
  const handleContributionSubmit = async () => {
    if (!currentUser) return alert('Please log in to submit contributions.');
    if (!contributionText.trim()) return;
    setContribPosting(true);
    try {
      await axios.post(`${API}/${song._id}/contribute`, {
        text: contributionText.trim(),
        contributedText: contributionText.trim()
      });
      
      // Reload contributions list
      const res = await axios.get(`${API}/${song._id}/contributions`);
      setContributions(res.data || []);
      
      setContributionText('');
      showFeedback('✨ Lyric verse contribution submitted!');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to submit contribution.');
    } finally {
      setContribPosting(false);
    }
  };

  // Upvote contribution
  const handleUpvote = async (contributionId) => {
    if (!currentUser) return alert('Please log in to upvote contributions.');

    try {
      const res = await axios.put(`${API}/contribution/upvote/${song._id}/${contributionId}`);
      setContributions(prev => prev.map(c => {
        if (c._id === contributionId) {
          return {
            ...c,
            upvotes: res.data.contributions.find(x => x._id === contributionId)?.upvotes || c.upvotes + 1,
            upvotedBy: res.data.contributions.find(x => x._id === contributionId)?.upvotedBy || []
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
      const res = await axios.post(`${API}/${song._id}/contribution/${cid}/accept`, {
        append: appendChecked
      });
      if (res.data.success) {
        setSong(res.data.song);
        // Refresh contributions list
        const contribsRes = await axios.get(`${API}/${song._id}/contributions`);
        setContributions(contribsRes.data || []);
        showFeedback('🎉 Contribution merged to lyrics!');
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

  const handleModerateContribution = async (contribId, status) => {
    try {
      await axios.put(`${API}/${song._id}/contributions/${contribId}/status`, { status });
      const res = await axios.get(`${API}/${song._id}/contributions`);
      setContributions(res.data || []);
      showFeedback(`Contribution ${status}!`);
    } catch (err) {
      alert('Moderation failed.');
    }
  };

  // Edit Song Modals
  const openEditModal = () => {
    setEditTitle(song.title || '');
    setEditArtistName(song.artistName || '');
    setEditGenre(song.genre || '');
    setEditSummary(song.summary || '');
    setEditLyrics(song.lyrics || '');
    setEditTags(song.tags?.join(', ') || '');
    setEditCoverImage(song.coverImage || '');
    setShowEditModal(true);
  };

  const handleSaveSongEdits = async () => {
    if (!editTitle.trim()) return alert("Title is required");
    setSavingEdit(true);
    try {
      const payload = {
        title: editTitle.trim(),
        artistName: editArtistName.trim(),
        genre: editGenre.trim(),
        summary: editSummary.trim(),
        lyrics: editLyrics,
        tags: editTags.split(',').map(t => t.trim()).filter(Boolean),
        coverImage: editCoverImage.trim()
      };
      
      const res = await axios.put(`${API}/${song._id}`, payload);
      setSong(res.data.song || res.data);
      setShowEditModal(false);
      showFeedback('✏️ Lyrics updated successfully!');
    } catch (err) {
      alert("Failed to save edits.");
    } finally {
      setSavingEdit(false);
    }
  };

  const getContributorsList = () => {
    if (!song?.contributors) return [];
    const counts = {};
    song.contributors.forEach(c => {
      const name = c.contributorName || "Unknown";
      if (!counts[name]) {
        counts[name] = {
          name,
          profilePhoto: c.profilePhoto || "",
          count: 0
        };
      }
      counts[name].count += 1;
    });
    return Object.values(counts);
  };

  const isAuthor = song?.authorId && currentUser && song.authorId.toString() === currentUser._id.toString();

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
              {(!currentUser || (song.authorId && currentUser._id.toString() !== song.authorId.toString())) && (
                <button
                  onClick={handleFollowToggle}
                  className={`song-author-follow-btn ${isFollowingArtist ? 'following' : ''}`}
                >
                  {isFollowingArtist ? <UserCheck size={13} /> : <UserPlus size={13} />}
                  <span>{isFollowingArtist ? 'Following' : 'Follow'}</span>
                </button>
              )}
            </div>

            {/* Created By & Contributor Credits */}
            <div className="contributors-credit-line" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', fontSize: '13px', color: '#ccc', marginTop: '4px', alignItems: 'center' }}>
              <span>Created By: <strong>{song.author}</strong></span>
              {song.contributors && song.contributors.length > 0 && (
                <>
                  <span style={{ margin: '0 4px', color: '#777' }}>|</span>
                  <span>Contributors:</span>
                  {Array.from(new Set(song.contributors.map(c => c.contributorName))).map((name, i, arr) => (
                    <strong key={name} style={{ color: 'var(--accent-color)' }}>
                      {name}{i < arr.length - 1 ? ',' : ''}
                    </strong>
                  ))}
                </>
              )}
            </div>

            <div className="song-meta-row" style={{ marginTop: '12px' }}>
              <span><Heart size={13} /> {likeCount.toLocaleString()} likes</span>
              <span><Sparkles size={13} /> {contributions.length} contributions</span>
              <span><MessageSquare size={13} /> {comments.length} comments</span>
              {song.views !== undefined && (
                <span><Eye size={13} /> {song.views.toLocaleString()} views</span>
              )}
              <span><Calendar size={13} /> {new Date(song.createdAt).toLocaleDateString()}</span>
            </div>

            {/* Pending Contributions Alert for Owner */}
            {isAuthor && contributions.filter(c => c.status === 'pending').length > 0 && (
              <div 
                className="pending-contributions-alert" 
                onClick={() => setActiveTab('contributions')}
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
      <div className="song-action-bar-container" style={{ background: 'var(--card-color)', borderBottom: '1px solid var(--border-color)', padding: '12px 48px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', maxWidth: '1400px', margin: '0 auto' }}>
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
          <button className="song-action-btn" onClick={handleShare}>
            <Share2 size={15} />
            <span>Share</span>
          </button>
          <button className="song-action-btn" onClick={handleCopyLink}>
            <span>📋 Copy Link</span>
          </button>

          {/* Edit Song Button for Owner */}
          {isAuthor && (
            <button
              className="song-action-btn"
              onClick={openEditModal}
              style={{ background: 'var(--accent-gradient)', color: 'var(--accent-text)', border: 'none', marginLeft: 'auto' }}
            >
              <span>✏️ Edit Lyrics</span>
            </button>
          )}
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
              {/* Submission Form */}
              {currentUser && !isAuthor ? (
                <div className="contribution-input-box">
                  <h4 style={{ margin: '0 0 8px 0', fontSize: '15px' }}>Suggest a lyric, verse, or continuation</h4>
                  <textarea
                    className="contribution-textarea"
                    placeholder="Write your contribution here..."
                    value={contributionText}
                    onChange={e => setContributionText(e.target.value)}
                    rows={4}
                  />
                  <button
                    className="contribution-submit-btn"
                    onClick={handleContributionSubmit}
                    disabled={contribPosting || !contributionText.trim()}
                  >
                    <Send size={14} />
                    <span>{contribPosting ? 'Submitting...' : 'Submit Contribution'}</span>
                  </button>
                </div>
              ) : !currentUser ? (
                <div style={{ textAlign: 'center', padding: '24px', background: 'var(--card-color)', borderRadius: '16px', border: '1px dashed var(--border-color)' }}>
                  <p style={{ color: 'var(--secondary-text)', margin: '0 0 12px 0' }}>Want to suggest additions to these lyrics?</p>
                  <button className="song-action-btn" onClick={() => navigate('/login')} style={{ margin: '0 auto' }}>
                    Login to contribute
                  </button>
                </div>
              ) : null}

              {/* Contributions List */}
              <div className="contributions-list">
                {contributions.length === 0 ? (
                  <div className="song-empty-tab">
                    <span><Sparkles size={32} /></span>
                    <p>No contributions yet. Be the first to add a verse!</p>
                  </div>
                ) : (
                  contributions.map((item, idx) => {
                    const cid = item._id || item.id;
                    const isAccepted = item.accepted || item.status === 'accepted';
                    const hasUpvoted = currentUser?._id
                      ? (item.upvotedBy || []).some(uid => uid.toString() === currentUser._id.toString())
                      : false;

                    return (
                      <div
                        key={cid}
                        className={`contribution-card ${isAccepted ? 'top-contribution' : ''}`}
                      >
                        {isAccepted && (
                          <div className="top-badge">
                            <Award size={11} style={{ marginRight: '4px' }} />
                            <span>Accepted Verse</span>
                          </div>
                        )}

                        <div className="contribution-header">
                          <div className="contribution-meta">
                            <span 
                              className="contribution-author"
                              onClick={() => navigate(`/author/${item.contributorId || item.author}`)}
                              style={{ cursor: 'pointer', textDecoration: 'underline' }}
                            >
                              @{item.author}
                            </span>
                            <span className="contribution-date">
                              {new Date(item.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span className={`status-badge badge-${item.status}`}>
                              {item.status}
                            </span>
                            <span className="upvotes-count">{item.upvotes} Upvotes</span>
                          </div>
                        </div>

                        <p className="contribution-text">{item.text}</p>

                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginTop: '10px' }}>
                          <button
                            className={`upvote-btn ${hasUpvoted ? 'upvoted' : ''}`}
                            onClick={() => handleUpvote(cid)}
                          >
                            <span>👍 {hasUpvoted ? 'Upvoted' : 'Upvote'}</span>
                          </button>

                          {isAuthor && item.status === 'pending' && (
                            <div className="owner-moderation-actions" style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
                              <button
                                className="moderate-btn reject"
                                onClick={() => handleModerateContribution(cid, 'rejected')}
                              >
                                Reject
                              </button>
                              <button
                                className="moderate-btn accept"
                                onClick={() => openAcceptModal(item)}
                              >
                                Accept & Merge
                              </button>
                            </div>
                          )}
                        </div>
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
                  [...comments].reverse().map((c, i) => {
                    const isCommentOwner = currentUser && (c.username === currentUser.username);
                    const canDelete = isCommentOwner || isAuthor;

                    return (
                      <div key={i} className="comment-item">
                        <div className="comment-avatar">
                          {(c.username || 'A')[0].toUpperCase()}
                        </div>
                        <div className="comment-body">
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span 
                              className="comment-username"
                              onClick={() => navigate(`/author/${c.username}`)}
                              style={{ cursor: 'pointer', textDecoration: 'underline' }}
                            >
                              {c.username}
                            </span>
                            {canDelete && (
                              <button 
                                onClick={() => handleDeleteComment(c._id)} 
                                style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}
                                title="Delete comment"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                          <p className="comment-text">{c.text}</p>
                          {c.createdAt && (
                            <span className="comment-date">
                              {new Date(c.createdAt).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT: Related Songs & Contributors */}
        <aside className="song-sidebar">
          {/* Contributors Section */}
          {getContributorsList().length > 0 && (
            <div className="contributors-card">
              <h4 className="song-sidebar-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Users size={16} />
                <span>Lyrics Contributors</span>
              </h4>
              <div className="contributors-list-sidebar">
                {getContributorsList().map((contrib, i) => (
                  <div key={i} className="contributor-sidebar-item">
                    <div className="contributor-avatar-sidebar">
                      {contrib.profilePhoto ? (
                        <img src={optimizeCloudinaryUrl(contrib.profilePhoto, 50)} alt={contrib.name} />
                      ) : (
                        contrib.name[0].toUpperCase()
                      )}
                    </div>
                    <div className="contributor-info-sidebar">
                      <span className="contributor-name-sidebar" onClick={() => navigate(`/author/${contrib.name}`)} style={{ cursor: 'pointer', textDecoration: 'underline' }}>
                        @{contrib.name}
                      </span>
                      <span className="contributor-count-sidebar">
                        {contrib.count} accepted verse{contrib.count > 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Related Songs */}
          <div className="contributors-card">
            <h3 className="song-sidebar-title">Related Songs</h3>
            {relatedSongs.length === 0 ? (
              <p className="song-sidebar-empty">No related songs found.</p>
            ) : (
              <div className="related-songs-list">
                {relatedSongs.map(rs => (
                  <div
                    key={rs._id}
                    className="related-song-card"
                    onClick={() => navigate(`/lyrics/${rs.slug || rs._id}`)}
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
          </div>

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

      {/* ── ACCEPT MODAL ── */}
      {showAcceptModal && acceptingContrib && (
        <div className="glass-modal-overlay">
          <div className="glass-modal-content">
            <div className="glass-modal-header">
              <h3 className="glass-modal-title">Accept & Merge Contribution</h3>
              <button className="glass-modal-close-btn" onClick={() => setShowAcceptModal(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="glass-modal-body">
              <p style={{ fontSize: '14px', lineHeight: '1.5', color: 'var(--secondary-text)' }}>
                You are about to accept the contribution from <strong>@{acceptingContrib.author}</strong>.
              </p>
              
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '14px', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '14px', fontStyle: 'italic', whiteSpace: 'pre-wrap', maxHeight: '150px', overflowY: 'auto' }}>
                {acceptingContrib.text}
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px', marginTop: '8px' }}>
                <input
                  type="checkbox"
                  checked={appendChecked}
                  onChange={e => setAppendChecked(e.target.checked)}
                  style={{ width: '16px', height: '16px', accentColor: 'var(--accent-color)' }}
                />
                <span>Append this text directly to the end of the lyrics?</span>
              </label>
            </div>
            <div className="glass-modal-footer">
              <button 
                className="moderate-btn reject" 
                onClick={() => setShowAcceptModal(false)}
                style={{ padding: '8px 18px' }}
              >
                Cancel
              </button>
              <button 
                className="moderate-btn accept" 
                onClick={handleConfirmAccept}
                disabled={acceptingLoading}
                style={{ padding: '8px 18px', background: '#10b981', color: '#fff' }}
              >
                {acceptingLoading ? 'Accepting...' : 'Accept & Merge'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── EDIT LYRICS MODAL ── */}
      {showEditModal && (
        <div className="glass-modal-overlay">
          <div className="glass-modal-content" style={{ maxWidth: '650px' }}>
            <div className="glass-modal-header">
              <h3 className="glass-modal-title">Edit Song Details & Lyrics</h3>
              <button className="glass-modal-close-btn" onClick={() => setShowEditModal(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="glass-modal-body" style={{ maxHeight: '70vh', overflowY: 'auto', paddingRight: '6px' }}>
              <div className="glass-modal-field">
                <label>Song Title</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={e => setEditTitle(e.target.value)}
                  placeholder="Enter song title..."
                />
              </div>

              <div className="glass-modal-field">
                <label>Artist Name</label>
                <input
                  type="text"
                  value={editArtistName}
                  onChange={e => setEditArtistName(e.target.value)}
                  placeholder="Enter artist name..."
                />
              </div>

              <div className="glass-modal-field">
                <label>Genre</label>
                <select value={editGenre} onChange={e => setEditGenre(e.target.value)}>
                  <option value="">Select Genre</option>
                  <option value="Pop">Pop</option>
                  <option value="Rock">Rock</option>
                  <option value="Hip Hop">Hip Hop</option>
                  <option value="R&B">R&B</option>
                  <option value="Country">Country</option>
                  <option value="Jazz">Jazz</option>
                  <option value="Classical">Classical</option>
                  <option value="Electronic">Electronic</option>
                  <option value="Folk">Folk</option>
                  <option value="Indie">Indie</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="glass-modal-field">
                <label>Short Summary / Hook</label>
                <input
                  type="text"
                  value={editSummary}
                  onChange={e => setEditSummary(e.target.value)}
                  placeholder="Short description of the song..."
                />
              </div>

              <div className="glass-modal-field">
                <label>Lyrics</label>
                <textarea
                  value={editLyrics}
                  onChange={e => setEditLyrics(e.target.value)}
                  placeholder="Write the lyrics here..."
                  rows={8}
                  style={{ fontFamily: 'Georgia, serif', lineHeight: '1.6' }}
                />
              </div>

              <div className="glass-modal-field">
                <label>Tags (Comma separated)</label>
                <input
                  type="text"
                  value={editTags}
                  onChange={e => setEditTags(e.target.value)}
                  placeholder="tag1, tag2, tag3"
                />
              </div>

              <div className="glass-modal-field">
                <label>Cover Image URL</label>
                <input
                  type="text"
                  value={editCoverImage}
                  onChange={e => setEditCoverImage(e.target.value)}
                  placeholder="Image URL..."
                />
              </div>
            </div>
            <div className="glass-modal-footer">
              <button 
                className="moderate-btn reject" 
                onClick={() => setShowEditModal(false)}
                style={{ padding: '8px 18px' }}
              >
                Cancel
              </button>
              <button 
                className="moderate-btn accept" 
                onClick={handleSaveSongEdits}
                disabled={savingEdit}
                style={{ padding: '8px 18px', background: 'var(--accent-color)', color: 'var(--accent-text)' }}
              >
                {savingEdit ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SongPage;
