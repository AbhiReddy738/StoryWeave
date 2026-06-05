import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './HomePage.css';

const HomePage = ({collapsed}) => {

  const navigate = useNavigate();

  const stories = [
    {
      title: "A Tale of Mine",
      genre: "Fiction",
      likes: 123,
      date: "10 Apr 2025",
      summary:
        "This is a short summary of the story. The story follows a young writer who discovers an ancient diary."
    },
    {
      title: "The Silent Forest",
      genre: "Adventure",
      likes: 256,
      date: "22 Mar 2025",
      summary:
        "Deep inside a mysterious forest lies a hidden secret."
    },
    {
      title: "Lost In Time",
      genre: "Sci-Fi",
      likes: 489,
      date: "01 May 2025",
      summary:
        "A scientist accidentally opens a portal to the past."
    },
    {
      title: "Beyond The Horizon",
      genre: "Fantasy",
      likes: 312,
      date: "15 Apr 2025",
      summary:
        "In a magical kingdom, a young warrior begins an impossible quest."
    },
    {
      title: "The Last Letter",
      genre: "Drama",
      likes: 190,
      date: "05 Feb 2025",
      summary:
        "A forgotten letter reveals a decades-old mystery."
    },
    {
      title: "Ocean Of Dreams",
      genre: "Romance",
      likes: 278,
      date: "11 Jan 2025",
      summary:
        "Two strangers meet during a voyage across the sea."
    }
  ];

  return (
    <div className="page-container">

      <main
        className={`main-container ${
          collapsed ? 'main-expanded' : ''
        }`}
      >

        {stories.map((story, index) => (

          <div
            key={index}
            className="card-container"
            onClick={() => navigate('/card')}
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
                📅 {story.date}
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