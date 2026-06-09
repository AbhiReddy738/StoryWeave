import { useParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import axios from 'axios';
import './CardPage.css';

const CardPage = ({ collapsed }) => {

  const { slug } = useParams();

  const storyId = slug
    ? slug.split("-").pop()
    : null;

  const [story, setStory] = useState(null);

  const [likes, setLikes] = useState(0);

  const [showComments, setShowComments] = useState(false);

  const [commentText, setCommentText] = useState('');

  const [comments, setComments] = useState([
    {
      name: 'Rahul Kumar',
      text: 'Amazing story. The world building is really good and I enjoyed every part.'
    },
    {
      name: 'Priya Sharma',
      text: 'Waiting for the next chapter. The ending created so much suspense.'
    },
    {
      name: 'Arjun Reddy',
      text: 'One of the best fantasy stories I have read recently. Great work.'
    }
  ]);

  const [contributionText, setContributionText] = useState('');

  const [contributions, setContributions] = useState([
    {
      id: 1,
      author: 'Rahul Kumar',
      text: 'The hero should discover an ancient map hidden beneath the castle.',
      upvotes: 18
    },
    {
      id: 2,
      author: 'Priya Sharma',
      text: 'Adding a mysterious mentor character would make the story more exciting.',
      upvotes: 25
    }
  ]);

  useEffect(() => {

    if (!storyId) return;

    const fetchStory = async () => {

      try {

        const response = await axios.get(
          `http://localhost:5000/api/story/${storyId}`
        );

        setStory(response.data);

        setLikes(response.data.likes);

      } catch (err) {

        console.error(err);

      }

    };

    fetchStory();

  }, [storyId]);

  const handleLike = () => {

    setLikes(prev => prev + 1);

  };

  const handleComment = () => {

    if (!commentText.trim()) return;

    setComments([
      ...comments,
      {
        name: 'You',
        text: commentText
      }
    ]);

    setCommentText('');

  };

  const handleContribution = () => {

    if (!contributionText.trim()) return;

    setContributions([
      {
        id: Date.now(),
        author: 'You',
        text: contributionText,
        upvotes: 0
      },
      ...contributions
    ]);

    setContributionText('');

  };

  const handleUpvote = (id) => {

    setContributions(

      contributions.map((item) =>

        item.id === id
          ? {
              ...item,
              upvotes: item.upvotes + 1
            }
          : item

      )

    );

  };

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
            ❤️ {likes} Likes
          </span>

          <span>
            📅 {new Date(
              story.createdAt
            ).toLocaleDateString()}
          </span>

          <span>
            ✍️ {story.author}
          </span>

        </div>

        <div className="story-content">

          <p>
            {story.content || 'No content available'}
          </p>

        </div>

        <div className="action-bar">

          <button
            onClick={handleLike}
          >
            ❤️ {likes} Likes
          </button>

          <button
            onClick={() =>
              setShowComments(
                !showComments
              )
            }
          >
            💬 {comments.length} Comments
          </button>

          <button>
            🔖 Save
          </button>

        </div>

        {showComments && (

          <div className="comments-panel">

            <div className="comment-input-box">

              <textarea
                placeholder="Write a comment..."
                value={commentText}
                onChange={(e) =>
                  setCommentText(
                    e.target.value
                  )
                }
              />

              <button
                onClick={
                  handleComment
                }
              >
                Post Comment
              </button>

            </div>

            <div className="comments-list">

              {comments.map(
                (
                  comment,
                  index
                ) => (

                  <div
                    key={index}
                    className="comment-box"
                  >

                    <h4>
                      {comment.name}
                    </h4>

                    <p>
                      {comment.text}
                    </p>

                  </div>

                )
              )}

            </div>

          </div>

        )}

        <div className="contribution-section">

          <h2 className="contribution-title">
            Contributions
          </h2>

          <div className="contribution-input-box">

            <textarea
              placeholder="Write your contribution to continue the story..."
              value={contributionText}
              onChange={(e) =>
                setContributionText(
                  e.target.value
                )
              }
            />

            <button
              onClick={
                handleContribution
              }
            >
              Submit Contribution
            </button>

          </div>

          <div className="contribution-list">

            {contributions.map(
              (item) => (

                <div
                  key={item.id}
                  className="contribution-card"
                >

                  <div className="contribution-header">

                    <h4>
                      {item.author}
                    </h4>

                    <span>
                      ↑ {item.upvotes} Upvotes
                    </span>

                  </div>

                  <p>
                    {item.text}
                  </p>

                  <button
                    className="upvote-btn"
                    onClick={() =>
                      handleUpvote(
                        item.id
                      )
                    }
                  >
                    👍 Upvote
                  </button>

                </div>

              )
            )}

          </div>

        </div>

      </div>

    </div>

  );

};

export default CardPage;