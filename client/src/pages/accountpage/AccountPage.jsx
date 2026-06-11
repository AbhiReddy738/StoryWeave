import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../../config';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import LazyImage from '../../components/LazyImage';
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
    profileImage: ''
  });

  const [posts, setPosts] = useState([]);
  const [actionFeedback, setActionFeedback] = useState('');
  const [feedbackType, setFeedbackType] = useState('success');

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
          profileImage: user.profileImage || ''
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
          {posts.length === 0 ? (
            <div className="no-posts" style={{ gridColumn: '1/-1', textAlign: 'center', color: 'var(--secondary-text)', marginTop: '20px', fontSize: '16px' }}>
              You haven't posted any {activeGlobalTab === 'stories' ? 'stories' : 'songs'} yet.
            </div>
          ) : (
            posts.map((post) => {
              const isSong = activeGlobalTab === 'songs';
              return (
                <div 
                  key={post._id} 
                  className={`post-card ${isSong ? 'song-thumbnail-card' : 'book-thumbnail-card'}`}
                  onClick={() => navigate(isSong ? `/song/${post._id}` : `/card/${post.slug}-${post._id}`)}
                >
                  <div className="post-card-thumbnail">
                    <LazyImage 
                      src={post.coverImage} 
                      alt={post.title} 
                    />
                  </div>
                  <div className="post-card-details">
                    <div className="story-name" title={post.title}>{post.title}</div>
                    <div className="middle-box">
                      <span className="genre">{post.genre}</span>
                      {isSong && post.artistName && (
                        <span className="song-card-artist" style={{ fontSize: '13px', color: 'var(--secondary-text)', marginRight: '10px' }}>
                          🎤 {post.artistName}
                        </span>
                      )}
                      {post.createdAt && (
                        <span className="posted-on">
                          📅 {new Date(post.createdAt).toLocaleDateString()}
                        </span>
                      )}
                      {post.status === 'draft' && (
                        <span className="status-badge" style={{ background: 'rgba(255, 165, 0, 0.2)', color: 'orange', padding: '2px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold', marginLeft: '10px' }}>
                          📄 Draft
                        </span>
                      )}
                    </div>
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
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default AccountPage;