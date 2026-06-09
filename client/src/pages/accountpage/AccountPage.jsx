import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './AccountPage.css';

const AccountPage = ({ collapsed }) => {
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
  
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (!userStr) {
      setError("Please log in to access your account.");
      setLoading(false);
      return;
    }
    try {
      const userObj = JSON.parse(userStr);
      if (userObj && userObj._id) {
        setUserId(userObj._id);
      } else {
        setError("Invalid user session. Please log in again.");
        setLoading(false);
      }
    } catch (e) {
      setError("Failed to parse user session. Please log in again.");
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!userId) return;

    const fetchData = async () => {
      setLoading(true);
      setError('');
      try {
        const profileRes = await axios.get(`http://localhost:5000/api/user/${userId}`);
        const user = profileRes.data;
        setProfile({
          name: user.username || '',
          author: user.authorName || '',
          interested: user.interests || '',
          bio: user.bio || '',
          profileImage: user.profileImage || ''
        });

        const postsRes = await axios.get(`http://localhost:5000/api/user/posts/${userId}`);
        setPosts(postsRes.data);
      } catch (err) {
        console.error(err);
        setError('Failed to load profile data. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [userId]);

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
        const res = await axios.put(`http://localhost:5000/api/user/update/${userId}`, {
          username: profile.name,
          authorName: profile.author,
          interests: profile.interested,
          bio: profile.bio,
          profileImage: profile.profileImage
        });
        
        // Update localStorage user if username changed
        const userStr = localStorage.getItem("user");
        if (userStr) {
          const userObj = JSON.parse(userStr);
          userObj.username = profile.name;
          localStorage.setItem("user", JSON.stringify(userObj));
        }

        alert(res.data.message || 'Profile Saved');
      } catch (err) {
        console.error(err);
        alert('Failed to save profile. Please try again.');
      } finally {
        setLoading(false);
      }
    }
    setEditing(!editing);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this story?")) {
      return;
    }
    try {
      await axios.delete(`http://localhost:5000/api/story/delete/${id}`);
      setPosts(posts.filter(post => post._id !== id));
      alert("Story Deleted Successfully");
    } catch (err) {
      console.error(err);
      alert("Failed to delete story.");
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
      const uploadRes = await axios.post("http://localhost:5000/api/user/upload", formData, {
        headers: {
          "Content-Type": "multipart/form-data"
        }
      });
      setProfile(prev => ({
        ...prev,
        profileImage: uploadRes.data.url
      }));
      alert("Photo uploaded successfully. Click 'Save Profile' to save changes.");
    } catch (err) {
      console.error(err);
      alert("Failed to upload image.");
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

        <div className="profile-card">
          <div className="profile-left">
            <div className="profile-photo">
              <img
                src={profile.profileImage || "https://via.placeholder.com/250"}
                alt="Profile"
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

        <h2 className="posts-title">Your Posts</h2>

        <div className="posts-grid">
          {posts.length === 0 ? (
            <div className="no-posts" style={{ gridColumn: '1/-1', textAlign: 'center', color: 'var(--secondary-text)', marginTop: '20px', fontSize: '16px' }}>
              You haven't posted any stories yet.
            </div>
          ) : (
            posts.map((post) => (
              <div key={post._id} className="post-card">
                <div className="story-name">{post.title}</div>

                <div className="middle-box">
                  <span className="genre">{post.genre}</span>
                  <span className="likes">❤️ {post.likes}</span>
                  {post.createdAt && (
                    <span className="posted-on" style={{ color: 'var(--secondary-text)', fontSize: '13px', marginLeft: 'auto' }}>
                      {new Date(post.createdAt).toLocaleDateString()}
                    </span>
                  )}
                </div>

                <div className="summary">
                  <p className="summary-heading">Summary</p>
                  <p className="summary-lines">{post.summary}</p>
                </div>

                <button
                  className="delete-icon-btn"
                  onClick={() => handleDelete(post._id)}
                >
                  Delete
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default AccountPage;