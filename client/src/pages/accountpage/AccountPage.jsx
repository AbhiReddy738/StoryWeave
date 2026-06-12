import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../../config';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import LazyImage from '../../components/LazyImage';
import CoverPlaceholder from '../../components/CoverPlaceholder';
import SkeletonCard from '../../components/SkeletonCard';
import { optimizeCloudinaryUrl } from '../../utils/imageOptimizer';
import ContentCard from '../../components/ContentCard';
import './AccountPage.css';

const AccountPage = ({ collapsed, activeGlobalTab, setActiveGlobalTab }) => {
  const { user: authUser, token, login: updateAuthSession } = useAuth();
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [userId, setUserId] = useState(null);
  
  const [profile, setProfile] = useState({
    name: '',
    author: '',
    interested: '',
    bio: '',
    profileImage: '',
    followersCount: 0,
    followingCount: 0
  });

  const [posts, setPosts] = useState([]);
  const [actionFeedback, setActionFeedback] = useState('');
  const [feedbackType, setFeedbackType] = useState('success');

  // Modals States
  const [showFollowersModal, setShowFollowersModal] = useState(false);
  const [showFollowingModal, setShowFollowingModal] = useState(false);
  const [followersList, setFollowersList] = useState([]);
  const [followingList, setFollowingList] = useState([]);
  const [loadingList, setLoadingList] = useState(false);

  const showFeedback = (msg, type = 'success') => {
    setActionFeedback(msg);
    setFeedbackType(type);
    setTimeout(() => setActionFeedback(''), 3000);
  };
  
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (authUser && authUser._id) {
      setUserId(authUser._id);
    } else {
      setError("Please log in to access your account.");
      setLoading(false);
    }
  }, [authUser]);

  useEffect(() => {
    if (!userId) return;

    const fetchData = async () => {
      setLoading(true);
      setError('');
      try {
        const profileRes = await axios.get(`${API_BASE_URL}/user/${userId}`);
        const user = profileRes.data;
        setProfile({
          name: user.username || '',
          author: user.authorName || '',
          interested: user.interests || '',
          bio: user.bio || '',
          profileImage: user.profileImage || '',
          followersCount: user.followersCount || 0,
          followingCount: user.followingCount || 0
        });

        if (activeGlobalTab === 'songs') {
          const postsRes = await axios.get(`${API_BASE_URL}/user/songs/${userId}`);
          setPosts(postsRes.data);
        } else {
          const postsRes = await axios.get(`${API_BASE_URL}/user/posts/${userId}`);
          setPosts(postsRes.data);
        }
      } catch (err) {
        console.error(err);
        setError('Failed to load profile data. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [userId, activeGlobalTab]);

  const fetchFollowers = async () => {
    if (!userId) return;
    setLoadingList(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/user/followers/${userId}`);
      setFollowersList(res.data || []);
    } catch (err) {
      console.error("Failed to fetch followers", err);
      showFeedback("Failed to load followers.", "error");
    } finally {
      setLoadingList(false);
    }
  };

  const fetchFollowing = async () => {
    if (!userId) return;
    setLoadingList(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/user/following/${userId}`);
      setFollowingList(res.data || []);
    } catch (err) {
      console.error("Failed to fetch following", err);
      showFeedback("Failed to load following list.", "error");
    } finally {
      setLoadingList(false);
    }
  };

  const handleOpenFollowers = () => {
    setShowFollowersModal(true);
    fetchFollowers();
  };

  const handleOpenFollowing = () => {
    setShowFollowingModal(true);
    fetchFollowing();
  };

  const handleModalFollowToggle = async (targetUser) => {
    if (!authUser) return;
    const isCurrentlyFollowing = targetUser.followers?.some(
      (uid) => uid.toString() === authUser._id.toString()
    );

    const endpoint = isCurrentlyFollowing ? 'unfollow' : 'follow';
    
    // Optimistically update lists
    const updater = (list) =>
      list.map((u) => {
        if (u._id.toString() !== targetUser._id.toString()) return u;
        const newFollowers = isCurrentlyFollowing
          ? (u.followers || []).filter((uid) => uid.toString() !== authUser._id.toString())
          : [...(u.followers || []), authUser._id];
        return { ...u, followers: newFollowers };
      });

    setFollowersList((prev) => updater(prev));
    setFollowingList((prev) => updater(prev));
    
    // Update dashboard count
    setProfile((prev) => ({
      ...prev,
      followingCount: isCurrentlyFollowing
        ? Math.max(0, prev.followingCount - 1)
        : prev.followingCount + 1,
    }));

    try {
      await axios.post(`${API_BASE_URL}/user/${endpoint}/${targetUser._id}`);
      showFeedback(
        isCurrentlyFollowing
          ? `Unfollowed ${targetUser.username}`
          : `Following ${targetUser.username}`,
        'success'
      );
    } catch (err) {
      console.error(err);
      showFeedback("Follow action failed. Please try again.", "error");
      // Revert on error
      const revertUpdater = (list) =>
        list.map((u) => {
          if (u._id.toString() !== targetUser._id.toString()) return u;
          const newFollowers = isCurrentlyFollowing
            ? [...(u.followers || []), authUser._id]
            : (u.followers || []).filter((uid) => uid.toString() !== authUser._id.toString());
          return { ...u, followers: newFollowers };
        });
      setFollowersList((prev) => revertUpdater(prev));
      setFollowingList((prev) => revertUpdater(prev));
      setProfile((prev) => ({
        ...prev,
        followingCount: isCurrentlyFollowing
          ? prev.followingCount + 1
          : Math.max(0, prev.followingCount - 1),
      }));
    }
  };

  const handleChange = (e) => {
    setProfile({
      ...profile,
      [e.target.name]: e.target.value
    });
  };

  const handleEditSave = async () => {
    if (editing) {
      try {
        setLoading(true);
        const res = await axios.put(`${API_BASE_URL}/user/update/${userId}`, {
          username: profile.name,
          authorName: profile.author,
          interests: profile.interested,
          bio: profile.bio,
          profileImage: profile.profileImage
        });
        
        // Sync with Auth Context
        updateAuthSession(token, res.data.user);

        showFeedback(res.data.message || 'Profile Saved', 'success');
      } catch (err) {
        showFeedback('Failed to save profile. Please try again.', 'error');
      } finally {
        setLoading(false);
      }
    }
    setEditing(!editing);
  };

  const handleDelete = async (id) => {
    const isSong = activeGlobalTab === 'songs';
    if (!window.confirm(`Are you sure you want to delete this ${isSong ? 'song' : 'story'}?`)) {
      return;
    }
    try {
      if (isSong) {
        await axios.delete(`${API_BASE_URL}/song/${id}`);
        showFeedback("Song Deleted Successfully", 'success');
      } else {
        await axios.delete(`${API_BASE_URL}/story/delete/${id}`);
        showFeedback("Story Deleted Successfully", 'success');
      }
      setPosts(posts.filter(post => post._id !== id));
    } catch (err) {
      showFeedback(`Failed to delete ${isSong ? 'song' : 'story'}.`, 'error');
    }
  };

  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("profileImage", file);

    try {
      setLoading(true);
      const uploadRes = await axios.post(`${API_BASE_URL}/user/upload`, formData, {
        headers: {
          "Content-Type": "multipart/form-data"
        }
      });
      setProfile(prev => ({
        ...prev,
        profileImage: uploadRes.data.url
      }));
      showFeedback("Photo uploaded successfully. Click 'Save Profile' to save changes.", 'success');
    } catch (err) {
      showFeedback("Failed to upload image.", 'error');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !userId) {
    return (
      <div className="account-page">
        <div className={`account-container ${collapsed ? 'account-expanded' : ''}`}>
          <div className="loading-state" style={{ color: 'var(--text-color)', textAlign: 'center', marginTop: '50px', fontSize: '18px' }}>
            Loading user profile...
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="account-page">
        <div className={`account-container ${collapsed ? 'account-expanded' : ''}`}>
          <div className="error-card" style={{ textAlign: 'center', marginTop: '50px' }}>
            <p className="error-message" style={{ color: 'red', fontSize: '18px' }}>{error}</p>
            {!userId && (
              <button className="edit-btn" onClick={() => navigate('/login')} style={{ marginTop: '15px' }}>
                Go to Login
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  const renderFollowModal = (title, list, isOpen, onClose) => {
    if (!isOpen) return null;
    return (
      <div className="account-modal-overlay" onClick={onClose}>
        <div className="account-modal-content" onClick={(e) => e.stopPropagation()}>
          <div className="account-modal-header">
            <h3>{title}</h3>
            <button className="account-modal-close" onClick={onClose}>✕</button>
          </div>
          
          <div className="account-modal-body">
            {loadingList ? (
              <div className="account-modal-loading">
                <div className="story-spinner" />
                <p>Loading list...</p>
              </div>
            ) : list.length === 0 ? (
              <div className="account-modal-empty">
                <span>👥</span>
                <p>No users found.</p>
              </div>
            ) : (
              <div className="account-modal-list">
                {list.map((u) => {
                  const isFollowingUser = u.followers?.some(
                    (uid) => uid.toString() === authUser._id.toString()
                  ) || false;
                  
                  return (
                    <div key={u._id} className="account-modal-item">
                      <div 
                        className="account-modal-user-photo" 
                        onClick={() => { onClose(); navigate(`/author/${u._id}`); }}
                      >
                        <LazyImage
                          src={u.profilePhoto || u.profileImage}
                          alt={u.username}
                          fallback="https://via.placeholder.com/150"
                        />
                      </div>
                      <div className="account-modal-user-info">
                        <div 
                          className="account-modal-username" 
                          onClick={() => { onClose(); navigate(`/author/${u._id}`); }}
                        >
                          {u.username}
                        </div>
                        <p className="account-modal-user-bio">{u.bio || "No bio available"}</p>
                      </div>
                      <div className="account-modal-user-actions">
                        <button 
                          className="account-modal-visit-btn"
                          onClick={() => { onClose(); navigate(`/author/${u._id}`); }}
                        >
                          Visit
                        </button>
                        {u._id.toString() !== authUser._id.toString() && (
                          <button 
                            className={`account-modal-follow-btn ${isFollowingUser ? 'following' : 'follow'}`}
                            onClick={() => handleModalFollowToggle(u)}
                          >
                            {isFollowingUser ? 'Following' : 'Follow'}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="account-page">
      <div className={`account-container ${collapsed ? 'account-expanded' : ''}`}>
        
        {loading && (
          <div className="loading-overlay" style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: 'rgba(0,0,0,0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            zIndex: 9999,
            fontSize: '20px'
          }}>
            Updating profile...
          </div>
        )}

        {actionFeedback && (
          <div className={`account-feedback-banner ${feedbackType}`}>
            {actionFeedback}
          </div>
        )}

        <div className="profile-card">
          <div className="profile-left">
            <div className="profile-photo">
              <LazyImage
                src={profile.profileImage}
                alt="Profile"
                fallback="https://via.placeholder.com/250"
              />
            </div>
            
            {editing && (
              <>
                <button className="change-photo-btn" onClick={triggerFileInput}>
                  Change Photo
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  style={{ display: 'none' }}
                  onChange={handleFileChange}
                  accept="image/*"
                />
              </>
            )}

            <button
              className="edit-btn"
              onClick={handleEditSave}
            >
              {editing ? 'Save Profile' : 'Edit Profile'}
            </button>

            <button
              className="edit-btn"
              onClick={() => navigate(`/author/${userId}`)}
              style={{ marginTop: '10px', background: 'var(--accent-gradient)', color: 'var(--accent-text)', border: 'none' }}
            >
              👤 View Public Profile
            </button>
          </div>

          <div className="profile-right">
            <input
              className="info-input"
              name="name"
              placeholder="Username"
              value={profile.name}
              onChange={handleChange}
              disabled={!editing}
            />

            <input
              className="info-input"
              name="author"
              placeholder="Author Name"
              value={profile.author}
              onChange={handleChange}
              disabled={!editing}
            />

            <input
              className="info-input"
              name="interested"
              placeholder="Interests (e.g. Fantasy, Sci-Fi)"
              value={profile.interested}
              onChange={handleChange}
              disabled={!editing}
            />

            <textarea
              className="bio-input"
              name="bio"
              placeholder="Tell us about yourself..."
              value={profile.bio}
              onChange={handleChange}
              disabled={!editing}
            />

            <div className="account-follow-stats">
              <div className="account-stat-box" onClick={handleOpenFollowers}>
                <span className="stat-count">{profile.followersCount || 0}</span>
                <span className="stat-label">Followers</span>
              </div>
              <div className="account-stat-box" onClick={handleOpenFollowing}>
                <span className="stat-count">{profile.followingCount || 0}</span>
                <span className="stat-label">Following</span>
              </div>
            </div>
          </div>
        </div>

        <div className="home-tabs" style={{ marginBottom: '24px' }}>
          <button
            className={`tab-btn ${activeGlobalTab === 'stories' ? 'active-tab' : ''}`}
            onClick={() => setActiveGlobalTab('stories')}
          >
            📖 Stories
          </button>
          <button
            className={`tab-btn ${activeGlobalTab === 'songs' ? 'active-tab' : ''}`}
            onClick={() => setActiveGlobalTab('songs')}
          >
            🎵 Songs
          </button>
        </div>

        <h2 className="posts-title">Your Posts</h2>

        <div className="posts-grid">
          {loading && posts.length === 0 ? (
            <>
              <SkeletonCard type={activeGlobalTab === 'songs' ? 'song' : 'story'} />
              <SkeletonCard type={activeGlobalTab === 'songs' ? 'song' : 'story'} />
              <SkeletonCard type={activeGlobalTab === 'songs' ? 'song' : 'story'} />
            </>
          ) : posts.length === 0 ? (
            <div className="no-posts" style={{ gridColumn: '1/-1', textAlign: 'center', color: 'var(--secondary-text)', marginTop: '20px', fontSize: '16px' }}>
              You haven't posted any {activeGlobalTab === 'stories' ? 'stories' : 'songs'} yet.
            </div>
          ) : (
            posts.map((post) => {
              const isSong = activeGlobalTab === 'songs';
              return (
                <ContentCard
                  key={post._id}
                  type={isSong ? 'song' : 'story'}
                  title={post.title}
                  author={isSong ? (post.artistName || profile.author || authUser.username) : (profile.author || authUser.username)}
                  authorId={userId}
                  summary={post.summary}
                  coverImage={post.coverImage}
                  genre={post.genre}
                  likes={post.likes || 0}
                  comments={isSong ? (post.contributions?.length || 0) : (post.comments?.length || 0)}
                  date={post.createdAt}
                  slug={post.slug}
                  id={post._id}
                  actionButton={
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      {post.status === 'draft' && (
                        <span className="status-badge" style={{ background: 'rgba(255, 165, 0, 0.2)', color: 'orange', padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' }}>
                          Draft
                        </span>
                      )}
                      <button
                        className="delete-icon-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(post._id);
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  }
                />
              );
            })
          )}
        </div>

        {renderFollowModal("Followers", followersList, showFollowersModal, () => setShowFollowersModal(false))}
        {renderFollowModal("Following", followingList, showFollowingModal, () => setShowFollowingModal(false))}
      </div>
    </div>
  );
};

export default AccountPage;