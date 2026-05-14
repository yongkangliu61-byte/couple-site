import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminPasswordHash } from '../data/config';
import { setLoggedIn, getData, isAccountExists, createAccount } from '../data/store';
import './Login.css';

async function sha256(message) {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

function getValidHash() {
  return localStorage.getItem('couple_passwordHash') || adminPasswordHash;
}

export default function Login() {
  const navigate = useNavigate();
  const [mode, setMode] = useState('login');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const names = getData('coupleNames');

  useEffect(() => {
    if (!isAccountExists()) {
      setMode('register');
    }
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!password.trim()) return;

    setLoading(true);
    setError('');

    try {
      const hash = await sha256(password.trim());
      if (hash === getValidHash()) {
        setLoggedIn();
        navigate('/');
      } else {
        setError('密码错误，请重试');
        setPassword('');
      }
    } catch {
      setError('验证失败，请重试');
    }

    setLoading(false);
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!password.trim()) {
      setError('请输入密码');
      return;
    }
    if (password.length < 6) {
      setError('密码至少需要6位');
      return;
    }
    if (password !== confirmPassword) {
      setError('两次输入的密码不一致');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const hash = await sha256(password.trim());
      createAccount(hash);
      setLoggedIn();
      onLogin();
    } catch {
      setError('创建失败，请重试');
    }

    setLoading(false);
  };

  const switchToLogin = () => {
    setMode('login');
    setPassword('');
    setConfirmPassword('');
    setError('');
  };

  const switchToRegister = () => {
    setMode('register');
    setPassword('');
    setConfirmPassword('');
    setError('');
  };

  const accountExists = isAccountExists();

  return (
    <div className="login-page">
      <div className="login-bg-hearts">
        {Array.from({ length: 12 }, (_, i) => (
          <span
            key={i}
            className="login-floating-heart"
            style={{
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 8}s`,
              animationDuration: `${8 + Math.random() * 12}s`,
              fontSize: `${14 + Math.random() * 20}px`,
              opacity: 0.15 + Math.random() * 0.2,
            }}
          >
            ❤
          </span>
        ))}
      </div>

      <div className="login-card">
        <div className="login-header">
          <div className="login-avatars">
            <span className="login-avatar-icon">👦</span>
            <span className="login-heart-icon">❤</span>
            <span className="login-avatar-icon">👧</span>
          </div>
          <h1 className="login-title">
            {names.boy} & {names.girl}
          </h1>
          <p className="login-subtitle">我们的爱情纪念册</p>
        </div>

        {mode === 'login' ? (
          <>
            <form className="login-form" onSubmit={handleLogin}>
              <div className="login-input-group">
                <span className="login-input-icon">🔒</span>
                <input
                  type="password"
                  className="login-input"
                  placeholder="请输入密码"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(''); }}
                  autoFocus
                />
              </div>
              {error && <p className="login-error">{error}</p>}
              <button type="submit" className="login-btn" disabled={loading}>
                {loading ? '验证中...' : '进入我们的世界'}
              </button>
            </form>
            {!accountExists && (
              <p className="login-switch">
                还没有账户？
                <button onClick={switchToRegister} className="login-switch-btn">创建账户</button>
              </p>
            )}
          </>
        ) : (
          <>
            <form className="login-form" onSubmit={handleRegister}>
              <p className="login-register-hint">首次访问，请设置你的专属密码</p>
              <div className="login-input-group">
                <span className="login-input-icon">🔑</span>
                <input
                  type="password"
                  className="login-input"
                  placeholder="设置密码（至少6位）"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(''); }}
                  autoFocus
                />
              </div>
              <div className="login-input-group">
                <span className="login-input-icon">✓</span>
                <input
                  type="password"
                  className="login-input"
                  placeholder="确认密码"
                  value={confirmPassword}
                  onChange={(e) => { setConfirmPassword(e.target.value); setError(''); }}
                />
              </div>
              {error && <p className="login-error">{error}</p>}
              <button type="submit" className="login-btn" disabled={loading}>
                {loading ? '创建中...' : '创建账户并进入'}
              </button>
            </form>
            {accountExists && (
              <p className="login-switch">
                已有账户？
                <button onClick={switchToLogin} className="login-switch-btn">返回登录</button>
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
