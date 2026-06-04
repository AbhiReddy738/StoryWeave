// import React from 'react'
import './HomePage.css'

const HomePage = () => {
  return (
    <div className="page-container">

      {/* Sidebar */}

      <div className="side-bar">

        <button className="sidebar-btn">
          🏠 Home
        </button>

        <button className="sidebar-btn">
          🔥 Trending
        </button>

        <button className="sidebar-btn">
          🔖 Saved
        </button>

        <button className="sidebar-btn">
          ⚙️ Settings
        </button>

      </div>

      {/* Main Content */}

      <div className="main-container">

        {/* Card 1 */}

        <div className="card-container">

          <div className="story-name">
            A Tale of Mine
          </div>

          <div className="middle-box">
            <span className="genre">Fiction</span>
            <span className="likes">❤️ 123</span>
            <span className="posted-on">📅 10 Apr 2025</span>
          </div>

          <div className="summary">

            <p className="summary-heading">
              Summary
            </p>

            <p className="summary-lines">
              This is a short summary of the story.
              The story follows a young writer who
              discovers an ancient diary. As he explores
              its secrets, his life changes forever.
            </p>

          </div>

        </div>

        {/* Card 2 */}

        <div className="card-container">

          <div className="story-name">
            The Silent Forest
          </div>

          <div className="middle-box">
            <span className="genre">Adventure</span>
            <span className="likes">❤️ 256</span>
            <span className="posted-on">📅 22 Mar 2025</span>
          </div>

          <div className="summary">

            <p className="summary-heading">
              Summary
            </p>

            <p className="summary-lines">
              Deep inside a mysterious forest lies a
              hidden secret. A group of explorers set
              out on a journey that will test their
              courage and friendship.
            </p>

          </div>

        </div>

        {/* Card 3 */}

        <div className="card-container">

          <div className="story-name">
            Lost In Time
          </div>

          <div className="middle-box">
            <span className="genre">Sci-Fi</span>
            <span className="likes">❤️ 489</span>
            <span className="posted-on">📅 01 May 2025</span>
          </div>

          <div className="summary">

            <p className="summary-heading">
              Summary
            </p>

            <p className="summary-lines">
              A scientist accidentally opens a portal
              to the past. What begins as an experiment
              soon turns into a race against time to
              save the future.
            </p>

          </div>

        </div>

        {/* Card 4 */}

        <div className="card-container">

          <div className="story-name">
            Beyond The Horizon
          </div>

          <div className="middle-box">
            <span className="genre">Fantasy</span>
            <span className="likes">❤️ 312</span>
            <span className="posted-on">📅 15 Apr 2025</span>
          </div>

          <div className="summary">

            <p className="summary-heading">
              Summary
            </p>

            <p className="summary-lines">
              In a magical kingdom, a young warrior
              must embark on an impossible quest to
              recover a legendary artifact before
              darkness consumes the world.
            </p>

          </div>

        </div>

        {/* Card 5 */}

        <div className="card-container">

          <div className="story-name">
            The Last Letter
          </div>

          <div className="middle-box">
            <span className="genre">Drama</span>
            <span className="likes">❤️ 190</span>
            <span className="posted-on">📅 05 Feb 2025</span>
          </div>

          <div className="summary">

            <p className="summary-heading">
              Summary
            </p>

            <p className="summary-lines">
              A forgotten letter found in an attic
              reveals a decades-old mystery and changes
              the lives of an entire family forever.
            </p>

          </div>

        </div>

        {/* Card 6 */}

        <div className="card-container">

          <div className="story-name">
            Ocean Of Dreams
          </div>

          <div className="middle-box">
            <span className="genre">Romance</span>
            <span className="likes">❤️ 278</span>
            <span className="posted-on">📅 11 Jan 2025</span>
          </div>

          <div className="summary">

            <p className="summary-heading">
              Summary
            </p>

            <p className="summary-lines">
              Two strangers meet during a voyage across
              the sea. Their unexpected connection leads
              them on a beautiful journey of love and
              self-discovery.
            </p>

          </div>

        </div>

      </div>

    </div>
  )
}

export default HomePage