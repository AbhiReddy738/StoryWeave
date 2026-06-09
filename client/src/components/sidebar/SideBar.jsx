import { useNavigate } from 'react-router-dom';
import './SideBar.css';

const Sidebar = ({ collapsed, setCollapsed }) => {

  const navigate = useNavigate();

  return (
    <aside
      className={`side-bar ${
        collapsed ? 'collapsed' : ''
      }`}
    >

      <button
        className="menu-btn"
        onClick={() => setCollapsed(!collapsed)}
      >
        ☰
      </button>

      <button
        className="sidebar-btn"
        onClick={() => navigate('/')}
      >
        <span className="icon">🏠</span>

        {!collapsed && (
          <span className="btn-text">
            Home
          </span>
        )}
      </button>

      <button
        className="sidebar-btn"
        onClick={() => navigate('/trending')}
      >
        <span className="icon">🔥</span>

        {!collapsed && (
          <span className="btn-text">
            Trending
          </span>
        )}
      </button>

      <button
        className="sidebar-btn"
        onClick={() => navigate('/post')}
      >
        <span className="icon">➕</span>

        {!collapsed && (
          <span className="btn-text">
            Post
          </span>
        )}
      </button>

      <button
        className="sidebar-btn"
        onClick={() => navigate('/saved')}
      >
        <span className="icon">🔖</span>

        {!collapsed && (
          <span className="btn-text">
            Saved
          </span>
        )}
      </button>

      <button
        className="sidebar-btn"
        onClick={() => navigate('/settings')}
      >
        <span className="icon">⚙️</span>

        {!collapsed && (
          <span className="btn-text">
            Settings
          </span>
        )}
      </button>

    </aside>
  );
};

export default Sidebar;