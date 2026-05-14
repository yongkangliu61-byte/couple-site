import { Link, useLocation, useNavigate } from 'react-router-dom';
import Hearts from './Hearts';
import { getData, logout, isLoggedIn } from '../data/store';
import './Layout.css';

export default function Layout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const names = getData('coupleNames');
  const loggedIn = isLoggedIn();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <>
      <Hearts />
      <nav className="nav">
        <Link to="/" className={location.pathname === '/' ? 'nav-active' : ''}>首页</Link>
        <Link to="/gallery" className={location.pathname === '/gallery' ? 'nav-active' : ''}>照片</Link>
        <Link to="/story" className={location.pathname === '/story' ? 'nav-active' : ''}>故事</Link>
        <Link to="/countdown" className={location.pathname === '/countdown' ? 'nav-active' : ''}>纪念日</Link>
        <Link to="/admin" className={location.pathname === '/admin' ? 'nav-active' : ''} style={{ color: 'var(--theme-primary-dark)' }}>管理</Link>
      </nav>

      <main>
        {children}
      </main>

      <footer className="footer">
        <p>
          Made with <span className="footer-heart">&#10084;</span> for {names.boy} & {names.girl}
        </p>
        <p style={{ marginTop: '0.3rem' }}>Forever & Always</p>
        {loggedIn && (
          <button
            onClick={handleLogout}
            style={{
              marginTop: '0.8rem',
              background: 'none',
              border: 'none',
              color: '#ccc',
              cursor: 'pointer',
              fontSize: '0.8rem',
            }}
          >
            退出登录
          </button>
        )}
      </footer>
    </>
  );
}
