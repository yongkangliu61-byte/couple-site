import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Hearts from './Hearts';
import { getData, isLoggedIn, getCurrentUserEmail, cloudSignOut, isViewingSharedData, setActiveDataOwner, syncFromCloud, applyTheme } from '../data/store';
import './Layout.css';

export default function Layout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const names = getData('coupleNames');
  const userEmail = getCurrentUserEmail();
  const loggedIn = isLoggedIn();
  const [dataKey, setDataKey] = useState(0);

  // Auto-sync from cloud on mount (keeps data fresh across devices)
  useEffect(() => {
    if (!loggedIn) return;
    syncFromCloud().then(() => {
      applyTheme(); // Apply synced theme CSS variables
      setDataKey(k => k + 1); // Force children to re-mount with fresh data
    }).catch(() => {});
  }, [loggedIn]);

  const handleLogout = async () => {
    await cloudSignOut();
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

      <main key={dataKey}>
        {children}
      </main>

      <footer className="footer">
        {isViewingSharedData() && (
          <div style={{
            marginBottom: '0.8rem',
            padding: '0.4rem 1rem',
            background: 'rgba(255,152,0,0.15)',
            borderRadius: '20px',
            display: 'inline-block',
          }}>
            <span style={{ color: '#ff9800', fontSize: '0.82rem' }}>
              🔗 共享模式 · 查看共享账户数据
            </span>
            <button
              onClick={() => { setActiveDataOwner(null); window.location.reload(); }}
              style={{
                background: 'none',
                border: 'none',
                color: '#ff9800',
                cursor: 'pointer',
                fontSize: '0.78rem',
                marginLeft: '0.6rem',
                textDecoration: 'underline',
              }}
            >
              切换回我的
            </button>
          </div>
        )}
        <p>
          Made with <span className="footer-heart">&#10084;</span> for {names.boy} & {names.girl}
        </p>
        <p style={{ marginTop: '0.3rem' }}>Forever & Always</p>
        {loggedIn && (
          <div style={{ marginTop: '0.6rem' }}>
            {userEmail && (
              <span style={{ color: '#bbb', fontSize: '0.78rem', marginRight: '0.8rem' }}>
                {userEmail}
              </span>
            )}
            <button
              onClick={handleLogout}
              style={{
                background: 'none',
                border: 'none',
                color: '#ccc',
                cursor: 'pointer',
                fontSize: '0.8rem',
              }}
            >
              退出登录
            </button>
          </div>
        )}
      </footer>
    </>
  );
}
