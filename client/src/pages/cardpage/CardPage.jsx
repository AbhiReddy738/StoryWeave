import './CardPage.css';

const CardPage = ({ collapsed }) => {

  return (
    <div className="card-page">

      <div
        className={`story-section ${
          collapsed ? 'story-expanded' : ''
        }`}
      >

        <h1 className="story-title">
          The Forgotten Kingdom
        </h1>

        <div className="story-info">

          <span className="genre">
            Fantasy
          </span>

          <span>
            ❤️ 124 Likes
          </span>

          <span>
            📅 10 Apr 2025
          </span>

          <span>
            ✍️ Abhi Reddy
          </span>

        </div>

        <div className="story-content">

          <p>
            Long ago beyond the mountains there existed a forgotten kingdom hidden from the world.
            The people lived peacefully until darkness began spreading through the land.
          </p>

          <p>
            A young warrior discovered an ancient map leading to a powerful relic.
            Legends said whoever possessed the relic could restore balance and save the kingdom.
          </p>

          <p>
            Together with a group of loyal companions, he embarked on a dangerous journey filled with mysteries, battles and magical creatures.
          </p>

          <p>
            What they found at the end of the journey changed their lives forever and revealed secrets buried for centuries.
          </p>

        </div>

        <div className="action-bar">

          <button>
            ❤️ 124 Likes
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