import { useState, useEffect} from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './HomePage.css';

const HomePage = ({collapsed}) => {

  const navigate = useNavigate();
  const [stories, setStories] = useState([]);

  useEffect(() => {
    const fetchStories = async () => {

      try{
        const response = await axios.get('http://localhost:5000/api/story/all');
        setStories(response.data);
        console.log(response.data);
      }
      catch(err){
        console.log(err);
      }
    };
    fetchStories();
  }, []);
  

  return (
    <div className="page-container">

      <main
        className={`main-container ${
          collapsed ? 'main-expanded' : ''
        }`}
      >

        {stories.map((story) => (

          <div
            key={story._id}
            className="card-container"
           onClick={() => navigate(`/card/${story.slug}-${story._id}`)}
          >

            <div className="story-name">
              {story.title}
            </div>

            <div className="middle-box">

              <span
                className="genre"
                onClick={(e) => e.stopPropagation()}
              >
                {story.genre}
              </span>

              <span className="likes">
                ❤️ {story.likes}
              </span>

              <span className="posted-on">
                📅 {new Date(story.createdAt).toLocaleDateString()}
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

      </main>

    </div>
  );
};

export default HomePage;