import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './HomePage.css';

const HomePage = ({
  collapsed,
  searchTerm
}) => {

  const navigate = useNavigate();

  const [stories, setStories] = useState([]);
  const [activeTab, setActiveTab] = useState('stories');

  const filteredStories = stories.filter(
    (story) =>
      story.title?.toLowerCase()
        .includes(
          searchTerm.toLowerCase()
        ) ||

      story.author?.toLowerCase()
        .includes(
          searchTerm.toLowerCase()
        ) ||

      story.genre?.toLowerCase()
        .includes(
          searchTerm.toLowerCase()
        )
  );

  useEffect(() => {

    const fetchStories = async () => {

      try {

        const response = await axios.get(
          'https://storyweave-fxdt.onrender.com/api/story/all'
        );

        setStories(response.data);

      } catch (err) {

        console.log(err);

      }

    };

    fetchStories();

  }, []);

  return (

    <div className="page-container">

      <main
        className={`main-container ${
          collapsed
            ? 'main-expanded'
            : ''
        }`}
      >

        <div className="home-tabs">

          <button
            className={
              activeTab === 'stories'
                ? 'tab-btn active-tab'
                : 'tab-btn'
            }
            onClick={() =>
              setActiveTab('stories')
            }
          >
            Stories
          </button>

          <button
            className={
              activeTab === 'songs'
                ? 'tab-btn active-tab'
                : 'tab-btn'
            }
            onClick={() =>
              setActiveTab('songs')
            }
          >
            Songs
          </button>

        </div>

        {activeTab === 'stories' &&
         filteredStories.length === 0 && (

          <div className="empty-songs">
            🔍 No Stories Found
          </div>

        )}

        {activeTab === 'stories' &&

          filteredStories.map((story) => (

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

                <span
                  className="genre"
                  onClick={(e) =>
                    e.stopPropagation()
                  }
                >
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

          ))
        }

        {activeTab === 'songs' && (

          <div className="empty-songs">
            🎵 No Songs Available Yet
          </div>

        )}

      </main>

    </div>

  );
};

export default HomePage;