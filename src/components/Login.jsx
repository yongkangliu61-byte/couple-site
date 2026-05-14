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
  const [selectedAccount, setSelectedAccount] = useState('');
  const [accountName, setAccountName] = useState('');
  const [boyName, setBoyName] = useState('');
  const [girlName, setGirlName] = useState('');
  const [startDate, setStartDate] = useState('2024-01-01');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // 页面显示的情侣名字：登录模式用选中账户的，注册模式用当前输入的，选择模式不显示
  const displayNames = mode === 'login' && selectedAccount
    ? (getAccountInfo(selectedAccount).coupleNames)
    : mode === 'register'
    ? { boy: boyName || '?', girl: girlName || '?' }
    : getData('coupleNames');

  useEffect(() => {
    const list = getAccounts();
    setAccounts(list);
    if (list.length === 0) {
      setMode('register');
    }
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
    const list = getAccounts();
    setAccounts(list);
    setSelectedAccount('');
    setMode('select');
    clearFields();
  };

  const selectAccount = (name) => {
    setSelectedAccount(name);
    setMode('login');
    setError('');
  };

  const goRegister = () => {
    setMode('register');
    clearFields();
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!password.trim()) return;
    setLoading(true);
    setError('');
    try {
      const hash = await sha256(password.trim());
      if (verifyPassword(selectedAccount, hash)) {
        loginToAccount(selectedAccount);
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
        {/* ===== 选择账户 ===== */}
        {mode === 'select' && (
          <>
            <div className="login-header">
              <div className="login-avatars">
                <span className="login-avatar-icon">💕</span>
              </div>
              <h1 className="login-title">选择账户</h1>
              <p className="login-subtitle">选择你的账户进入爱情纪念册</p>
            </div>
            <div className="login-account-list">
              {accounts.map((name) => {
                const info = getAccountInfo(name);
                return (
                  <button
                    key={name}
                    className="login-account-card"
                    onClick={() => selectAccount(name)}
                  >
                    <span className="login-account-name">{name}</span>
                    <span className="login-account-couple">
                      {info.coupleNames.boy} & {info.coupleNames.girl}
                    </span>
                  </button>
                );
              })}
              <button className="login-account-card login-account-new" onClick={goRegister}>
                <span className="login-account-new-icon">+</span>
                <span className="login-account-new-text">创建新账户</span>
              </button>
            </div>
          </>
        )}

        {/* ===== 登录 ===== */}
        {mode === 'login' && (
          <>
            <div className="login-header">
              <div className="login-avatars">
                <span className="login-avatar-icon">👦</span>
                <span className="login-heart-icon">❤</span>
                <span className="login-avatar-icon">👧</span>
              </div>
              <h1 className="login-title">
                {displayNames.boy} & {displayNames.girl}
              </h1>
              <p className="login-subtitle login-account-badge">{selectedAccount}</p>
            </div>
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
            <p className="login-switch">
              <button onClick={goSelect} className="login-switch-btn">← 切换账户</button>
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
              <p className="login-subtitle">
                {accountExists ? '创建属于你们的专属账户' : '首次访问，创建专属账户'}
              </p>
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
            {accountExists && (
              <p className="login-switch">
                <button onClick={goSelect} className="login-switch-btn">← 返回选择账户</button>
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
