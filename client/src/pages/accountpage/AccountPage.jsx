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
      title: 'Lost Kingdom',
      genre: 'Fantasy',
      likes: 245,
      summary: 'A hidden kingdom awaits discovery.'
    },
    {
      id: 2,
      title: 'Ocean Dreams',
      genre: 'Romance',
      likes: 156,
      summary: 'Two strangers meet during a voyage.'
    },
    {
      id: 3,
      title: 'Cyber Dawn',
      genre: 'Sci-Fi',
      likes: 301,
      summary: 'Artificial intelligence takes control.'
    },
    {
      id: 4,
      title: 'Shadow Crown',
      genre: 'Fantasy',
      likes: 198,
      summary: 'A prince discovers a dangerous secret.'
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
              value={profile.name}
              onChange={handleChange}
              disabled={!editing}
            />

            <input
              className="info-input"
              name="author"
              value={profile.author}
              onChange={handleChange}
              disabled={!editing}
            />

            <input
              className="info-input"
              name="interested"
              value={profile.interested}
              onChange={handleChange}
              disabled={!editing}
            />

            <textarea
              className="bio-input"
              name="bio"
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

              <div className="story-name">
                {post.title}
              </div>

              <div className="middle-box">

                <span className="genre">
                  {post.genre}
                </span>

                <span className="likes">
                  ❤️ {post.likes}
                </span>

              </div>

              <div className="summary">

                <p className="summary-heading">
                  Summary
                </p>

                <p className="summary-lines">
                  {post.summary}
                </p>

              </div>

              <button
                className="delete-icon-btn"
                onClick={() => handleDelete(post.id)}
              >
                Delete
              </button>

            </div>

          ))}

        </div>

      </div>

    </div>

  );
};

export default AccountPage;