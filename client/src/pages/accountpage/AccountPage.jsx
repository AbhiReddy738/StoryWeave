import { useState } from 'react';
import './AccountPage.css';

const AccountPage = ({ collapsed }) => {

  const [editing, setEditing] = useState(false);

  const [profile, setProfile] = useState({
    name: 'Abhi Reddy',
    author: 'StoryWeave Author',
    interested: 'Fantasy, Mystery, Sci-Fi',
    bio: 'Passionate storyteller who enjoys building fantasy worlds and writing mystery adventures.'
  });

  const [posts, setPosts] = useState([
    {
      id: 1,
      title: 'Lost Kingdom'
    },
    {
      id: 2,
      title: 'Ocean Dreams'
    },
    {
      id: 3,
      title: 'Cyber Dawn'
    },
    {
      id: 4,
      title: 'Shadow Crown'
    }
  ]);

  const handleChange = (e) => {

    setProfile({
      ...profile,
      [e.target.name]: e.target.value
    });

  };

  const handleDelete = (id) => {

    setPosts(
      posts.filter(
        post => post.id !== id
      )
    );

  };

  const handleEditSave = () => {

    if (editing) {
      alert('Profile Saved');
    }

    setEditing(!editing);

  };

  return (

    <div className="account-page">

      <div
        className={`account-container ${
          collapsed ? 'account-expanded' : ''
        }`}
      >

        <div className="profile-card">

          <div className="profile-left">

            <div className="profile-photo">

              <img
                src="https://via.placeholder.com/250"
                alt="Profile"
              />

            </div>

            <button
              className="edit-btn"
              onClick={handleEditSave}
            >
              {editing
                ? 'Save Profile'
                : 'Edit Profile'}
            </button>

          </div>

          <div className="profile-right">

            <input
              className="info-input"
              name="name"
              placeholder="Name"
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
              placeholder="Interested In"
              value={profile.interested}
              onChange={handleChange}
              disabled={!editing}
            />

            <textarea
              className="bio-input"
              name="bio"
              placeholder="Personal Blog"
              value={profile.bio}
              onChange={handleChange}
              disabled={!editing}
            />

          </div>

        </div>

        <h2 className="posts-title">
          Your Posts
        </h2>

        <div className="posts-grid">

          {posts.map((post) => (

            <div
              key={post.id}
              className="post-card"
            >

              <h3>
                {post.title}
              </h3>

              <button
                className="delete-post-btn"
                onClick={() => handleDelete(post.id)}
              >
                Delete Post
              </button>

            </div>

          ))}

        </div>

      </div>

    </div>

  );
};

export default AccountPage;