import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './PostPage.css';

const PostPage = ({ collapsed }) => {

  const [postType, setPostType] = useState('story');

  const [formData, setFormData] = useState({
    title: '',
    genre: '',
    summary: '',
    content: '',
    author: '',
    likes: 0
  });

  useEffect(() => {
    const loggedInUser = localStorage.getItem("user") ? JSON.parse(localStorage.getItem("user")) : null;
    if (loggedInUser) {
      setFormData(prev => ({
        ...prev,
        author: loggedInUser.username || ''
      }));
    }
  }, []);

  const navigate = useNavigate();

  const handleChange = (e) => {

    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });

  };

  const handleSubmit = async (e) => {

    e.preventDefault();

    if (
      !formData.title ||
      !formData.author ||
      !formData.genre ||
      !formData.summary ||
      !formData.content
    ) {

      alert('Please fill all fields');
      return;

    }

    try {
      const loggedInUser = localStorage.getItem("user") ? JSON.parse(localStorage.getItem("user")) : null;
      const authorId = loggedInUser ? loggedInUser._id : null;

      await axios.post(
        'http://localhost:5000/api/story/create',
        {
          ...formData,
          authorId
        }
      );

      setFormData({
        title: '',
        genre: '',
        summary: '',
        content: '',
        author: '',
        likes: 0
      });

      alert('Story Posted Successfully');

      navigate('/');

    }
    catch (err) {

      console.log(err);

      alert('Failed To Post Story');

    }

  };

  return (
    <div className="post-page">

      <div
        className={`post-container ${
          collapsed ? 'post-expanded' : ''
        }`}
      >

        <h1 className="post-heading">
          Create New Post
        </h1>

        <div className="post-type-box">

          <button
            type="button"
            className={
              postType === 'story'
                ? 'active-type'
                : ''
            }
            onClick={() => setPostType('story')}
          >
            Add Story
          </button>

          <button
            type="button"
            className={
              postType === 'music'
                ? 'active-type'
                : ''
            }
            onClick={() => setPostType('music')}
          >
            Add Music
          </button>

        </div>

        <form
          className="post-form"
          onSubmit={handleSubmit}
        >

          <input
            type="text"
            name="title"
            placeholder="Title"
            value={formData.title}
            onChange={handleChange}
          />

          <div className="double-input">

            <input
              type="text"
              name="author"
              placeholder="Author"
              value={formData.author}
              onChange={handleChange}
            />

            <input
              type="text"
              name="genre"
              placeholder="Genre"
              value={formData.genre}
              onChange={handleChange}
            />

          </div>

          <textarea
            name="summary"
            placeholder="Summary"
            rows="4"
            value={formData.summary}
            onChange={handleChange}
          />

          <textarea
            className="story-box"
            name="content"
            placeholder={
              postType === 'story'
                ? 'Write your story...'
                : 'Write lyrics...'
            }
            value={formData.content}
            onChange={handleChange}
          />

          <button
            type="submit"
            className="publish-btn"
          >
            Publish
          </button>

        </form>

      </div>

    </div>
  );
};

export default PostPage;