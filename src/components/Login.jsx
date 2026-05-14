import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getAccounts, getAccountInfo, verifyPassword, createNewAccount,
  loginToAccount, isAccountExists, getData,
} from '../data/store';
import { sha256 } from '../utils/helpers';
import './Login.css';

export default function Login() {
  const navigate = useNavigate();
  const [mode, setMode] = useState('select'); // 'select' | 'login' | 'register'
  const [accounts, setAccounts] = useState([]);
  const [accountName, setAccountName] = useState('');
  const [boyName, setBoyName] = useState('');
  const [girlName, setGirlName] = useState('');
  const [startDate, setStartDate] = useState('2024-01-01');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // 登录页面动态显示情侣名字
  const loginInfo = (accountName && accounts.includes(accountName))
    ? getAccountInfo(accountName)
    : null;
  const displayNames = mode === 'login'
    ? (loginInfo ? loginInfo.coupleNames : { boy: '?', girl: '?' })
    : mode === 'register'
    ? { boy: boyName || '?', girl: girlName || '?' }
    : getData('coupleNames');

  useEffect(() => {
    setAccounts(getAccounts());
  }, []);

  const clearFields = () => {
    setPassword('');
    setConfirmPassword('');
    setError('');
    setAccountName('');
    setBoyName('');
    setGirlName('');
    setStartDate('2024-01-01');
  };

  const goSelect = () => {
    setAccounts(getAccounts());
    setMode('select');
    clearFields();
  };

  const goLogin = (name) => {
    setAccountName(name || '');
    setMode('login');
    setError('');
    setPassword('');
  };

  const goRegister = () => {
    setMode('register');
    clearFields();
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!accountName.trim()) { setError('请输入账户名'); return; }
    if (!password.trim()) { setError('请输入密码'); return; }

    const name = accountName.trim();
    if (!accounts.includes(name)) {
      setError('账户不存在，请检查账户名或创建新账户');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const hash = await sha256(password.trim());
      if (verifyPassword(name, hash)) {
        loginToAccount(name);
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
    if (!accountName.trim()) { setError('请输入账户名'); return; }
    if (!boyName.trim()) { setError('请输入男生名字'); return; }
    if (!girlName.trim()) { setError('请输入女生名字'); return; }
    if (!password.trim()) { setError('请输入密码'); return; }
    if (password.length < 6) { setError('密码至少需要6位'); return; }
    if (password !== confirmPassword) { setError('两次输入的密码不一致'); return; }

    setLoading(true);
    setError('');
    try {
      const hash = await sha256(password.trim());
      const ok = createNewAccount(
        accountName.trim(),
        hash,
        { boy: boyName.trim(), girl: girlName.trim() },
        startDate,
      );
      if (!ok) {
        setError('账户名已存在，请换一个');
        setLoading(false);
        return;
      }
      navigate('/');
    } catch {
      setError('创建失败，请重试');
    }
    setLoading(false);
  };

  const accountExists = accounts.length > 0;

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
          >❤</span>
        ))}
      </div>

      <div className="login-card">
        {/* ===== 选择入口 ===== */}
        {mode === 'select' && (
          <>
            <div className="login-header">
              <div className="login-avatars">
                <span className="login-avatar-icon">💕</span>
              </div>
              <h1 className="login-title">爱情纪念册</h1>
              <p className="login-subtitle">选择一种方式进入</p>
            </div>

            <div className="login-entry-options">
              {/* 已有本地账户 */}
              {accountExists && (
                <div className="login-entry-section">
                  <p className="login-entry-label">已有账户</p>
                  <div className="login-account-list">
                    {accounts.map((name) => {
                      const info = getAccountInfo(name);
                      return (
                        <button
                          key={name}
                          className="login-account-card"
                          onClick={() => goLogin(name)}
                        >
                          <span className="login-account-name">{name}</span>
                          <span className="login-account-couple">
                            {info.coupleNames.boy} & {info.coupleNames.girl}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 登录已有账户 */}
              <div className="login-entry-section">
                <p className="login-entry-label">
                  {accountExists ? '其他方式' : '欢迎回来'}
                </p>
                <button className="login-entry-btn" onClick={() => goLogin('')}>
                  <span className="login-entry-btn-icon">🔑</span>
                  <span>登录已有账户</span>
                </button>
              </div>

              {/* 创建新账户 */}
              <div className="login-entry-section">
                <p className="login-entry-label">
                  {accountExists ? '或者' : '首次使用'}
                </p>
                <button className="login-entry-btn login-entry-btn-new" onClick={goRegister}>
                  <span className="login-entry-btn-icon">+</span>
                  <span>创建新账户</span>
                </button>
              </div>
            </div>
          </>
        )}

        {/* ===== 登录 ===== */}
        {mode === 'login' && (
          <>
            <div className="login-header">
              {loginInfo ? (
                <div className="login-avatars">
                  <span className="login-avatar-icon">👦</span>
                  <span className="login-heart-icon">❤</span>
                  <span className="login-avatar-icon">👧</span>
                </div>
              ) : (
                <div className="login-avatars">
                  <span className="login-avatar-icon">🔐</span>
                </div>
              )}
              <h1 className="login-title">
                {loginInfo ? `${displayNames.boy} & ${displayNames.girl}` : '登录账户'}
              </h1>
            </div>

            <form className="login-form" onSubmit={handleLogin}>
              <div className="login-input-group">
                <span className="login-input-icon">👤</span>
                <input
                  className="login-input"
                  placeholder="账户名"
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="login-input-group">
                <span className="login-input-icon">🔒</span>
                <input
                  type="password"
                  className="login-input"
                  placeholder="密码"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(''); }}
                />
              </div>
              {error && <p className="login-error">{error}</p>}
              <button type="submit" className="login-btn" disabled={loading}>
                {loading ? '验证中...' : '登录'}
              </button>
            </form>
            <p className="login-switch">
              <button onClick={goSelect} className="login-switch-btn">← 返回</button>
            </p>
          </>
        )}

        {/* ===== 注册 ===== */}
        {mode === 'register' && (
          <>
            <div className="login-header">
              {boyName && girlName ? (
                <div className="login-avatars">
                  <span className="login-avatar-icon">👦</span>
                  <span className="login-heart-icon">❤</span>
                  <span className="login-avatar-icon">👧</span>
                </div>
              ) : (
                <div className="login-avatars">
                  <span className="login-avatar-icon">💝</span>
                </div>
              )}
              <h1 className="login-title">
                {displayNames.boy} & {displayNames.girl}
              </h1>
              <p className="login-subtitle">创建属于你们的专属账户</p>
            </div>
            <form className="login-form" onSubmit={handleRegister}>
              <div className="login-input-group">
                <span className="login-input-icon">👤</span>
                <input
                  className="login-input"
                  placeholder="账户名（唯一标识）"
                  value={accountName}
                  onChange={(e) => { setAccountName(e.target.value); setError(''); }}
                  autoFocus
                />
              </div>
              <div className="login-input-row">
                <div className="login-input-group login-input-half">
                  <span className="login-input-icon">👦</span>
                  <input
                    className="login-input"
                    placeholder="男生名字"
                    value={boyName}
                    onChange={(e) => setBoyName(e.target.value)}
                  />
                </div>
                <div className="login-input-group login-input-half">
                  <span className="login-input-icon">👧</span>
                  <input
                    className="login-input"
                    placeholder="女生名字"
                    value={girlName}
                    onChange={(e) => setGirlName(e.target.value)}
                  />
                </div>
              </div>
              <div className="login-input-group">
                <span className="login-input-icon">📅</span>
                <input
                  type="date"
                  className="login-input"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="login-input-group">
                <span className="login-input-icon">🔑</span>
                <input
                  type="password"
                  className="login-input"
                  placeholder="设置密码（至少6位）"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(''); }}
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
            <p className="login-switch">
              <button onClick={goSelect} className="login-switch-btn">← 返回</button>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
