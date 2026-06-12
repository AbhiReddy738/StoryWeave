import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_BASE_URL } from '../../config';
import { useAuth } from '../../context/AuthContext.jsx';
import LazyImage from '../../components/LazyImage';
import CoverPlaceholder from '../../components/CoverPlaceholder';
import SkeletonCard from '../../components/SkeletonCard';
import { optimizeCloudinaryUrl } from '../../utils/imageOptimizer';
import ContentCard from '../../components/ContentCard';
import './AuthorProfile.css';

const AuthorProfile = ({ collapsed }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user: authUser, token, login: updateAuthSession } = useAuth();

  // ── States ──────────────────────────────────────────────────────────────────
  const [profile, setProfile] = useState(null);
  const [stories, setStories] = useState([]);
  const [songs, setSongs] = useState([]);
  const [contributions, setContributions] = useState([]);
  
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [loadingContent, setLoadingContent] = useState(true);
  const [activeTab, setActiveTab] = useState('stories'); // 'stories' | 'songs' | 'contributions'
  
  // Follow State
  const [isFollowing, setIsFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  
  // Modals for followers and following list
  const [showFollowersModal, setShowFollowersModal] = useState(false);
  const [showFollowingModal, setShowFollowingModal] = useState(false);
  const [modalUsers, setModalUsers] = useState([]);
  const [loadingModal, setLoadingModal] = useState(false);
  const [myFollowingMap, setMyFollowingMap] = useState({});

  // Edit State
  const [showEditModal, setShowEditModal] = useState(false);
  const [editBio, setEditBio] = useState('');
  const [updatingProfile, setUpdatingProfile] = useState(false);

  // UI Feedback
  const [toastMsg, setToastMsg] = useState('');
  const fileInputRef = useRef(null);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3000);
  };

  // Determine if viewing own profile
  const isOwnProfile = authUser && profile && authUser._id.toString() === profile._id.toString();

  // ── Fetch Profile & Content ────────────────────────────────────────────────
  useEffect(() => {
    if (!id) return;

    const fetchProfileData = async () => {
      setLoadingProfile(true);
      try {
        const res = await axios.get(`${API_BASE_URL}/user/profile/${id}`);
        const data = res.data;
        setProfile(data);
        setFollowersCount(data.followersCount || data.followers?.length || 0);
        setEditBio(data.bio || '');

        if (authUser && data.followers) {
          setIsFollowing(data.followers.some(uid => uid.toString() === authUser._id.toString()));
        } else {
          setIsFollowing(false);
        }
      } catch (err) {
        console.error("Failed to load author profile", err);
      } finally {
        setLoadingProfile(false);
      }
    };

    fetchProfileData();
  }, [id, authUser]);

  // Fetch Tabs Content
  useEffect(() => {
    if (!profile) return;
    
    const fetchContentData = async () => {
      setLoadingContent(true);
      try {
        const [storiesRes, songsRes, contribsRes] = await Promise.all([
          axios.get(`${API_BASE_URL}/user/stories/${profile._id}`),
          axios.get(`${API_BASE_URL}/user/songs/${profile._id}`),
          axios.get(`${API_BASE_URL}/user/contributions/${profile._id}`)
        ]);
        setStories(storiesRes.data || []);
        setSongs(songsRes.data || []);
        setContributions(contribsRes.data || []);
      } catch (err) {
        console.error("Failed to load author content", err);
      } finally {
        setLoadingContent(false);
      }
    };

    fetchContentData();
  }, [profile]);

  // Fetch logged in user's following list to track follow states inside modals
  useEffect(() => {
    if (authUser) {
      axios.get(`${API_BASE_URL}/user/profile/${authUser._id}`)
        .then(res => {
          const followingIds = res.data.following || [];
          const map = {};
          followingIds.forEach(id => {
            map[id.toString()] = true;
          });
          setMyFollowingMap(map);
        })
        .catch(err => console.error("Failed to fetch logged in user following list", err));
    } else {
      setMyFollowingMap({});
    }
  }, [authUser]);

  // ── Follow / Unfollow ──────────────────────────────────────────────────────
  const handleFollowToggle = async () => {
    if (!authUser) {
      alert("Please log in to follow authors.");
      navigate('/login');
      return;
    }

    const originalFollowing = isFollowing;
    const originalCount = followersCount;

    // Optimistic UI updates
    setIsFollowing(!originalFollowing);
    setFollowersCount(prev => originalFollowing ? prev - 1 : prev + 1);
    setMyFollowingMap(prev => ({
      ...prev,
      [profile._id.toString()]: !originalFollowing
    }));

    try {
      const endpoint = originalFollowing ? 'unfollow' : 'follow';
      await axios.post(`${API_BASE_URL}/user/${endpoint}/${profile._id}`);
      
      showToast(originalFollowing ? `Unfollowed ${profile.username}` : `Following ${profile.username}`);
    } catch (err) {
      // Revert on failure
      setIsFollowing(originalFollowing);
      setFollowersCount(originalCount);
      setMyFollowingMap(prev => ({
        ...prev,
        [profile._id.toString()]: originalFollowing
      }));
      showToast("Follow action failed. Please try again.");
    }
  };

  const toggleModalFollow = async (targetId) => {
    if (!authUser) {
      alert("Please log in to follow authors.");
      navigate('/login');
      return;
    }
    const originalStatus = !!myFollowingMap[targetId];
    // Optimistic update
    setMyFollowingMap(prev => ({
      ...prev,
      [targetId]: !originalStatus
    }));

    try {
      const endpoint = originalStatus ? 'unfollow' : 'follow';
      await axios.post(`${API_BASE_URL}/user/${endpoint}/${targetId}`);
      
      // If the targetId is the profile author itself, update the main profile follow state!
      if (profile && targetId === profile._id.toString()) {
        setIsFollowing(!originalStatus);
        setFollowersCount(prev => originalStatus ? prev - 1 : prev + 1);
      }
    } catch (err) {
      // Revert
      setMyFollowingMap(prev => ({
        ...prev,
        [targetId]: originalStatus
      }));
      alert("Action failed, please try again.");
    }
  };

  const openFollowersModal = async () => {
    setShowFollowersModal(true);
    setLoadingModal(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/user/followers/${profile._id}`);
      setModalUsers(res.data || []);
    } catch (err) {
      console.error(err);
      alert("Failed to load followers list.");
    } finally {
      setLoadingModal(false);
    }
  };

  const openFollowingModal = async () => {
    setShowFollowingModal(true);
    setLoadingModal(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/user/following/${profile._id}`);
      setModalUsers(res.data || []);
    } catch (err) {
      console.error(err);
      alert("Failed to load following list.");
    } finally {
      setLoadingModal(false);
    }
  };

  // ── Profile Photo Actions ──────────────────────────────────────────────────
  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("profilePhoto", file);

    setUpdatingProfile(true);
    try {
      const uploadRes = await axios.put(`${API_BASE_URL}/user/upload-photo`, formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      
      const newUrl = uploadRes.data.url;
      setProfile(prev => ({ ...prev, profilePhoto: newUrl }));
      
      // Sync local auth user state if viewing own profile
      if (authUser) {
        const updatedUserObj = { ...authUser, profilePhoto: newUrl, profileImage: newUrl };
        updateAuthSession(token, updatedUserObj);
      }
      
      showToast("Profile photo updated successfully!");
    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.message || "Failed to upload photo.");
    } finally {
      setUpdatingProfile(false);
    }
  };

  const handlePhotoRemove = async () => {
    if (!window.confirm("Are you sure you want to remove your profile photo?")) return;

    setUpdatingProfile(true);
    try {
      const res = await axios.put(`${API_BASE_URL}/user/update-profile`, { profilePhoto: "" });
      setProfile(prev => ({ ...prev, profilePhoto: "" }));

      if (authUser) {
        const updatedUserObj = { ...authUser, profilePhoto: "", profileImage: "" };
        updateAuthSession(token, updatedUserObj);
      }
      
      showToast("Profile photo removed!");
    } catch (err) {
      showToast("Failed to remove profile photo.");
    } finally {
      setUpdatingProfile(false);
    }
  };

  // ── Save Bio ───────────────────────────────────────────────────────────────
  const handleSaveProfileDetails = async () => {
    if (editBio.length > 500) {
      alert("Bio must not exceed 500 characters.");
      return;
    }

    setUpdatingProfile(true);
    try {
      const res = await axios.put(`${API_BASE_URL}/user/update-profile`, { bio: editBio });
      setProfile(prev => ({ ...prev, bio: editBio }));
      
      if (authUser) {
        const updatedUserObj = { ...authUser, bio: editBio };
        updateAuthSession(token, updatedUserObj);
      }

      showToast("Profile bio updated successfully!");
      setShowEditModal(false);
    } catch (err) {
      showToast("Failed to save profile details.");
    } finally {
      setUpdatingProfile(false);
    }
  };

  // ── Loading & Error States ─────────────────────────────────────────────────
  if (loadingProfile) {
    return (
      <div className="author-profile-page">
        <div className={`author-profile-container ${collapsed ? 'author-expanded' : ''}`}>
          <div className="loading-indicator">
            <div className="story-spinner" />
            <p>Loading author profile...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="author-profile-page">
        <div className={`author-profile-container ${collapsed ? 'author-expanded' : ''}`}>
          <div className="story-page-error">
            <span>🕵️</span>
            <p>Author not found.</p>
            <button onClick={() => navigate('/')}>← Go Home</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="author-profile-page">
      <div className={`author-profile-container ${collapsed ? 'author-expanded' : ''}`}>
        
        {toastMsg && <div className="toast-message">{toastMsg}</div>}

        {/* ── HERO BANNER ── */}
        <div className="author-hero">
          <div 
            className="author-hero-bg" 
            style={{ 
              backgroundImage: `url(${profile.profilePhoto || 'https://via.placeholder.com/250'})` 
            }} 
          />
          <div className="author-hero-content">
            <div className="author-photo-wrapper">
              <LazyImage
                src={profile.profilePhoto}
                alt={profile.username}
                fallback="https://via.placeholder.com/250"
              />
            </div>

            <div className="author-details">
              <h1 className="author-username">{profile.username}</h1>
              <p className="author-bio-display">
                {profile.bio ? profile.bio : <span className="author-bio-empty">No bio provided yet.</span>}
              </p>
              
              <div className="author-meta-stats">
                <div 
                  className="author-stat-item" 
                  onClick={openFollowersModal}
                  style={{ cursor: 'pointer' }}
                >
                  👥 <strong>{followersCount}</strong> followers
                </div>
                <div 
                  className="author-stat-item" 
                  onClick={openFollowingModal}
                  style={{ cursor: 'pointer' }}
                >
                  👉 <strong>{profile.followingCount || profile.following?.length || 0}</strong> following
                </div>
                <div className="author-stat-item">📖 <strong>{profile.stats?.totalStories || 0}</strong> stories</div>
                <div className="author-stat-item">🎵 <strong>{profile.stats?.totalSongs || 0}</strong> songs</div>
                <div className="author-stat-item">❤️ <strong>{profile.stats?.totalLikesReceived || 0}</strong> likes</div>
                <div className="author-stat-item">👁️ <strong>{profile.profileViews || profile.totalProfileViews || 0}</strong> views</div>
                {profile.createdAt && (
                  <div className="author-stat-item">
                    📅 Joined <strong>{new Date(profile.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</strong>
                  </div>
                )}
              </div>
            </div>

            <div className="author-actions">
              {isOwnProfile ? (
                <button className="edit-profile-btn" onClick={() => setShowEditModal(true)}>
                  ⚙️ Edit Profile
                </button>
              ) : (
                <button 
                  className={`follow-btn ${isFollowing ? 'following' : 'follow'}`}
                  onClick={handleFollowToggle}
                >
                  {isFollowing ? 'Following' : 'Follow'}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── MAIN CONTENT GRID ── */}
        <div className="profile-main-grid">
          
          {/* Left Side: Tabs & Contents */}
          <div className="profile-content-area">
            <div className="profile-tabs">
              <button 
                className={`profile-tab-btn ${activeTab === 'stories' ? 'active' : ''}`}
                onClick={() => setActiveTab('stories')}
              >
                📖 Stories ({stories.length})
              </button>
              <button 
                className={`profile-tab-btn ${activeTab === 'songs' ? 'active' : ''}`}
                onClick={() => setActiveTab('songs')}
              >
                🎵 Songs ({songs.length})
              </button>
              <button 
                className={`profile-tab-btn ${activeTab === 'contributions' ? 'active' : ''}`}
                onClick={() => setActiveTab('contributions')}
              >
                ✍ Contributions ({contributions.length})
              </button>
            </div>

            {loadingContent ? (
              <div className="profile-cards-grid" style={{ marginTop: '20px', gridColumn: '1/-1' }}>
                <SkeletonCard type={activeTab === 'stories' ? 'story' : 'song'} />
                <SkeletonCard type={activeTab === 'stories' ? 'story' : 'song'} />
                <SkeletonCard type={activeTab === 'stories' ? 'story' : 'song'} />
              </div>
            ) : (
              <div className="profile-tab-results">
                
                {/* Stories Tab */}
                {activeTab === 'stories' && (
                  stories.length > 0 ? (
                    <div className="profile-cards-grid">
                      {stories.map(story => (
                        <ContentCard
                          key={story._id}
                          type="story"
                          title={story.title}
                          author={profile.username}
                          authorId={profile._id}
                          summary={story.summary}
                          coverImage={story.coverImage}
                          genre={story.genre}
                          likes={story.likes}
                          comments={story.comments?.length || 0}
                          date={story.createdAt}
                          slug={story.slug}
                          id={story._id}
                          actionButton={
                            <button 
                              className="card-action-btn"
                              onClick={() => {
                                const targetSlug = story.slug ? `${story.slug}-${story._id}` : story._id;
                                navigate(`/card/${targetSlug}`);
                              }}
                            >
                              Read Story
                            </button>
                          }
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="empty-profile-tab">
                      <span>📚</span>
                      <p>No stories published by this author yet.</p>
                    </div>
                  )
                )}

                {/* Songs Tab */}
                {activeTab === 'songs' && (
                  songs.length > 0 ? (
                    <div className="profile-cards-grid">
                      {songs.map(song => (
                        <ContentCard
                          key={song._id}
                          type="song"
                          title={song.title}
                          author={song.artistName || profile.username}
                          authorId={profile._id}
                          summary={song.summary}
                          coverImage={song.coverImage}
                          genre={song.genre}
                          likes={song.likes}
                          comments={song.contributions?.length || 0}
                          date={song.createdAt}
                          id={song._id}
                          actionButton={
                            <button 
                              className="card-action-btn"
                              onClick={() => navigate(`/song/${song._id}`)}
                            >
                              Open Song
                            </button>
                          }
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="empty-profile-tab">
                      <span>🎵</span>
                      <p>No songs published by this author yet.</p>
                    </div>
                  )
                )}

                {/* Contributions Tab */}
                {activeTab === 'contributions' && (
                  contributions.length > 0 ? (
                    <div className="contributions-list">
                      {contributions.map(contrib => (
                        <div 
                          key={contrib._id}
                          className="contrib-card"
                          onClick={() => navigate(contrib.type === 'story' ? `/card/${contrib.parentSlug}-${contrib.parentId}` : `/song/${contrib.parentId}`)}
                        >
                          <div className="contrib-header">
                            <span className={`contrib-type-badge ${contrib.type}`}>
                              {contrib.type === 'story' ? '📖 Story' : '🎵 Song'}
                            </span>
                            <span className="contrib-upvotes">👍 {contrib.upvotes} Upvotes</span>
                          </div>
                          <p className="contrib-text">"{contrib.text}"</p>
                          <div className="contrib-footer">
                            <span>Continued on: <strong className="contrib-parent-title">{contrib.parentTitle}</strong></span>
                            {contrib.createdAt && (
                              <span className="contrib-date">📅 {new Date(contrib.createdAt).toLocaleDateString()}</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="empty-profile-tab">
                      <span>✍️</span>
                      <p>No contributions submitted by this author yet.</p>
                    </div>
                  )
                )}

              </div>
            )}
          </div>

          {/* Right Side: Similar Authors Sidebar */}
          <aside className="similar-authors-sidebar">
            <h3 className="sidebar-title">👥 Similar Authors</h3>
            
            {profile.similarAuthors && profile.similarAuthors.length > 0 ? (
              <div className="similar-authors-list">
                {profile.similarAuthors.map(author => (
                  <div 
                    key={author._id}
                    className="similar-author-card"
                    onClick={() => navigate(`/author/${author._id}`)}
                  >
                    <div className="similar-author-avatar">
                      <LazyImage
                        src={optimizeCloudinaryUrl(author.profilePhoto || author.profileImage, 150)}
                        alt={author.username}
                        fallback="https://via.placeholder.com/150"
                      />
                    </div>
                    <div className="similar-author-info">
                      <div className="similar-author-name">{author.username}</div>
                      <p className="similar-author-bio">{author.bio || "No bio provided"}</p>
                      <span className="similar-author-followers">👥 {author.followersCount} followers</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="sidebar-card-empty" style={{ fontStyle: 'italic', color: 'var(--secondary-text)' }}>No similar authors found.</p>
            )}
          </aside>

        </div>

      </div>

      {/* ── FOLLOWERS MODAL ── */}
      {showFollowersModal && (
        <div className="follow-modal-overlay" onClick={() => setShowFollowersModal(false)}>
          <div className="follow-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="follow-modal-header">
              <h3>Followers</h3>
              <button className="close-modal-btn" onClick={() => setShowFollowersModal(false)}>✕</button>
            </div>
            <div className="follow-modal-body">
              {loadingModal ? (
                <div className="modal-loading">Loading followers...</div>
              ) : modalUsers.length > 0 ? (
                <div className="modal-users-list">
                  {modalUsers.map(u => (
                    <div key={u._id} className="modal-user-card">
                      <div className="modal-user-avatar" onClick={() => { setShowFollowersModal(false); navigate(`/author/${u._id}`); }}>
                        <img src={u.profilePhoto || u.profileImage || 'https://via.placeholder.com/150'} alt={u.username} />
                      </div>
                      <div className="modal-user-info" onClick={() => { setShowFollowersModal(false); navigate(`/author/${u._id}`); }}>
                        <div className="modal-user-username">{u.username}</div>
                        <div className="modal-user-bio">{u.bio || "No bio yet."}</div>
                      </div>
                      <div className="modal-user-actions">
                        {authUser && authUser._id.toString() !== u._id.toString() && (
                          <button 
                            className={`modal-follow-btn ${myFollowingMap[u._id.toString()] ? 'following' : 'follow'}`}
                            onClick={() => toggleModalFollow(u._id.toString())}
                          >
                            {myFollowingMap[u._id.toString()] ? 'Following' : 'Follow'}
                          </button>
                        )}
                        <button className="modal-visit-btn" onClick={() => { setShowFollowersModal(false); navigate(`/author/${u._id}`); }}>
                          Visit
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="modal-empty-state">No followers yet.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── FOLLOWING MODAL ── */}
      {showFollowingModal && (
        <div className="follow-modal-overlay" onClick={() => setShowFollowingModal(false)}>
          <div className="follow-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="follow-modal-header">
              <h3>Following</h3>
              <button className="close-modal-btn" onClick={() => setShowFollowingModal(false)}>✕</button>
            </div>
            <div className="follow-modal-body">
              {loadingModal ? (
                <div className="modal-loading">Loading following...</div>
              ) : modalUsers.length > 0 ? (
                <div className="modal-users-list">
                  {modalUsers.map(u => (
                    <div key={u._id} className="modal-user-card">
                      <div className="modal-user-avatar" onClick={() => { setShowFollowingModal(false); navigate(`/author/${u._id}`); }}>
                        <img src={u.profilePhoto || u.profileImage || 'https://via.placeholder.com/150'} alt={u.username} />
                      </div>
                      <div className="modal-user-info" onClick={() => { setShowFollowingModal(false); navigate(`/author/${u._id}`); }}>
                        <div className="modal-user-username">{u.username}</div>
                        <div className="modal-user-bio">{u.bio || "No bio yet."}</div>
                      </div>
                      <div className="modal-user-actions">
                        {authUser && authUser._id.toString() !== u._id.toString() && (
                          <button 
                            className={`modal-follow-btn ${myFollowingMap[u._id.toString()] ? 'following' : 'follow'}`}
                            onClick={() => toggleModalFollow(u._id.toString())}
                          >
                            {myFollowingMap[u._id.toString()] ? 'Following' : 'Follow'}
                          </button>
                        )}
                        <button className="modal-visit-btn" onClick={() => { setShowFollowingModal(false); navigate(`/author/${u._id}`); }}>
                          Visit
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="modal-empty-state">Not following anyone yet.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── EDIT PROFILE MODAL ── */}
      {showEditModal && (
        <div className="edit-modal-overlay">
          <div className="edit-modal-content">
            <div className="edit-modal-header">
              <h3>Edit Profile</h3>
              <button className="close-modal-btn" onClick={() => setShowEditModal(false)}>✕</button>
            </div>

            <div className="edit-field">
              <label>Profile Bio</label>
              <textarea 
                className="edit-textarea" 
                placeholder="Fantasy writer, sci-fi lover, and collaborative storyteller."
                value={editBio}
                onChange={(e) => setEditBio(e.target.value)}
                maxLength={500}
              />
              <span style={{ alignSelf: 'flex-end', fontSize: '12px', color: 'var(--secondary-text)' }}>
                {editBio.length} / 500 characters
              </span>
            </div>

            <div className="edit-field">
              <label>Profile Picture</label>
              <div className="photo-edit-options">
                <button className="modal-btn cancel" onClick={triggerFileInput} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  📂 Upload Photo
                </button>
                {profile.profilePhoto && (
                  <button className="modal-btn cancel" onClick={handlePhotoRemove} style={{ color: '#e63946', borderColor: '#e63946' }}>
                    🗑 Remove Current
                  </button>
                )}
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  style={{ display: 'none' }} 
                  onChange={handlePhotoUpload}
                  accept="image/*"
                />
              </div>
            </div>

            <div className="modal-actions">
              <button className="modal-btn cancel" onClick={() => setShowEditModal(false)}>Cancel</button>
              <button 
                className="modal-btn save" 
                onClick={handleSaveProfileDetails}
                disabled={updatingProfile}
              >
                {updatingProfile ? 'Saving...' : 'Save Profile'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default AuthorProfile;
