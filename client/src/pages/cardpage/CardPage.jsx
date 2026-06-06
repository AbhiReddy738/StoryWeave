import { useParams } from 'react-router-dom';
import {useState, useEffect} from 'react';
import axios from 'axios'; 
import './CardPage.css';

const CardPage = ({ collapsed }) => {
  const { slug } = useParams();

  const storyId = slug
    ? slug.split("-").pop()
    : null;
  const [story, setStory] = useState(null);

  useEffect(() => {

  if(!storyId) return;

  const fetchStory = async () => {

    try {

      const response = await axios.get(
        `http://localhost:5000/api/story/${storyId}`
      );

      setStory(response.data);

    } catch(err) {

      console.error(err);

    }

  };

  fetchStory();

}, [storyId]);

  if (!story) {
    return (
      <div className="loading-story">
        Loading Story...
      </div>
    );
  }

  return (
    <div className="card-page">

      <div
        className={`story-section ${
          collapsed ? 'story-expanded' : ''
        }`}
      >

        <h1 className="story-title">
          {story.title}
        </h1>

        <div className="story-info">

          <span className="genre">
            {story.genre}
          </span>

          <span>
            ❤️ {story.likes} Likes
          </span>

          <span>
            📅 {new Date(story.createdAt).toLocaleDateString()}
          </span>

          <span>
            ✍️ {story.author}
          </span>

        </div>

        <div className="story-content">
          <p>
            {story.content || "No content available"}
          </p>
        </div>

        <div className="action-bar">

          <button>
            ❤️ {story.likes} Likes
          </button>

          <button>
            💬 28 Comments
          </button>

          <button>
            🔖 Save
          </button>

        </div>

        <div className="contributions">

          <h2>
            Contributions
          </h2>

          <div className="comment-box">
            <h4>Rahul Kumar</h4>
            <p>
              Amazing story. The world building is really good and I enjoyed every part.
            </p>
          </div>

          <div className="comment-box">
            <h4>Priya Sharma</h4>
            <p>
              Waiting for the next chapter. The ending created so much suspense.
            </p>
          </div>

          <div className="comment-box">
            <h4>Arjun Reddy</h4>
            <p>
              One of the best fantasy stories I have read recently. Great work.
            </p>
          </div>

        </div>

      </div>

    </div>
  );
};

export default CardPage;