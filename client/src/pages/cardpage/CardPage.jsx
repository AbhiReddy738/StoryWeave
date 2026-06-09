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

  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {

    if (!storyId) return;

    const fetchStory = async () => {

      try {

        const response = await axios.get(
          `https://storyweave-fxdt.onrender.com/api/story/${storyId}`
        );

        setStory(response.data);

        setComments(
          response.data.comments || []
        );

        setContributions(
          response.data.contributions || []
        );

        setLikes(response.data.likes);

        const userStr = localStorage.getItem('user');
        if (userStr) {
          const userObj = JSON.parse(userStr);
          const saveResponse = await axios.get(
            `https://storyweave-fxdt.onrender.com/api/story/is-saved/${storyId}/${userObj._id}`
          );
          setIsSaved(saveResponse.data.isSaved);
        }

      } catch (err) {

        console.error(err);

      }

    };

    fetchStory();

  }, [storyId]);

  const handleSave = async () => {
    const userStr = localStorage.getItem('user');
    if (!userStr) {
      alert("Please login to save stories");
      return;
    }
    const userObj = JSON.parse(userStr);
    const userId = userObj._id;

    try {
      if (isSaved) {
        await axios.post(`https://storyweave-fxdt.onrender.com/api/story/unsave/${story._id}`, { userId });
        setIsSaved(false);
      } else {
        await axios.post(`https://storyweave-fxdt.onrender.com/api/story/save/${story._id}`, { userId });
        setIsSaved(true);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleLike = async () => {

    try{

      const response = await axios.put(
        `https://storyweave-fxdt.onrender.com/api/story/like/${story._id}`
      );

      setLikes(response.data.likes);

    }
    catch(err){

      console.log(err);

    }

  };
  const handleComment = async () => {

    if(!commentText.trim()) return;

    try{

      const response = await axios.post(

        `https://storyweave-fxdt.onrender.com/api/story/comment/${story._id}`,

        {
          username:"Abhi",
          text:commentText
        }

      );

      setComments(
        response.data.comments
      );

      setCommentText('');

    }
    catch(err){

      console.log(err);

    }

  };

  const handleContribution = async () => {

    if(!contributionText.trim()) return;

    try{

      const response = await axios.post(

        `https://storyweave-fxdt.onrender.com/api/story/contribution/${story._id}`,

        {
          author:"Abhi",
          text:contributionText
        }

      );

      setContributions(
        response.data.contributions
      );

      setContributionText('');

    }
    catch(err){

      console.log(err);

    }

  };

  const handleUpvote = async (id) => {

    try{

      const response = await axios.put(

        `https://storyweave-fxdt.onrender.com/api/story/contribution/upvote/${story._id}/${id}`

      );

      setContributions(
        response.data.contributions
      );

    }
    catch(err){

      console.log(err);

    }

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

          <button onClick={handleSave}>
            {isSaved ? "🔖 Saved" : "🔖 Save"}
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
                      {comment.username}
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
                  key={item._id || item.id}
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
                        item._id
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