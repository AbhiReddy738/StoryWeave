import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './TrendingPage.css';

const TrendingPage = ({ collapsed }) => {

  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('stories');

  const [stories, setStories] = useState([]);

  useEffect(() => {

    const fetchStories = async () => {

      try {

        const response = await axios.get(
          'http://localhost:5000/api/story/all'
        );

        const sortedStories =
          response.data.sort(
            (a, b) => b.likes - a.likes
          );

        setStories(sortedStories);

      } catch (err) {

        console.log(err);

      }

    };

    fetchStories();

  }, []);

  return (

    <div className="trending-page">

      <div
        className={`trending-container ${
          collapsed ? 'trending-expanded' : ''
        }`}
      >

        <h1 className="trending-title">
          Trending
        </h1>

        <div className="tab-box">

          <button
            className={
              activeTab === 'stories'
                ? 'tab-btn active-tab'
                : 'tab-btn'
            }
            onClick={() => setActiveTab('stories')}
          >
            Stories
          </button>

          <button
            className={
              activeTab === 'lyrics'
                ? 'tab-btn active-tab'
                : 'tab-btn'
            }
            onClick={() => setActiveTab('lyrics')}
          >
            Lyrics
          </button>

        </div>

        {activeTab === 'stories' && (

          <div className="cards-grid">

            {stories.map((story) => (

              <div
                key={story._id}
                className="card-container"
                onClick={() =>
                  navigate(
                    `/card/${story.slug}-${story._id}`
                  )
                }
              >

                <div className="story-name">
                  {story.title}
                </div>

                <div className="middle-box">

                  <span className="genre">
                    {story.genre}
                  </span>

                  <span className="likes">
                    ❤️ {story.likes}
                  </span>

                  <span className="posted-on">
                    📅 {
                      new Date(
                        story.createdAt
                      ).toLocaleDateString()
                    }
                  </span>

                </div>

                <div className="summary">

                  <p className="summary-heading">
                    Summary
                  </p>

                  <p className="summary-lines">
                    {story.summary}
                  </p>

                </div>

              </div>

            ))}

          </div>

        )}

        {activeTab === 'lyrics' && (

          <div className="empty-box">
            No Lyrics Available Yet
          </div>

        )}

      </div>

    </div>

  );
};

export default TrendingPage;