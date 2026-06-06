import { useState } from 'react';
import './PostPage.css';

const PostPage = ({ collapsed }) => {

  const [postType, setPostType] = useState('story');

  const [formData, setFormData] = useState({
    title: '',
    author: '',
    genre: '',
    summary: '',
    content: ''
  });

  const handleChange = (e) => {

    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });

  };

  const handleSubmit = (e) => {

    e.preventDefault();

    console.log(postType);
    console.log(formData);

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
            className={
              postType === 'story'
                ? 'active-type'
                : ''
            }
            onClick={() => setPostType('story')}
            type="button"
          >
            Add Story
          </button>

          <button
            className={
              postType === 'music'
                ? 'active-type'
                : ''
            }
            onClick={() => setPostType('music')}
            type="button"
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