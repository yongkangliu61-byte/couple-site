import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  initAuth, setCurrentUser, getData, isLoggedIn,
  useInviteCode, joinSharedAccount,
  getLegacyAccounts, getLegacyAccountInfo, getLegacyAccountData,
} from '../data/store';
import { signUp, signIn, isCloudEnabled, resetPassword } from '../data/supabase';
import { saveData } from '../data/store';
import './Login.css';

export default function Login() {
  const navigate = useNavigate();
  const [mode, setMode] = useState('loading'); // loading | select | login | register | invite
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [boyName, setBoyName] = useState('');
  const [girlName, setGirlName] = useState('');
  const [startDate, setStartDate] = useState('2024-01-01');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [legacyAccounts, setLegacyAccounts] = useState([]);
  const [migratingAccount, setMigratingAccount] = useState(null);
  const [pendingInviteTarget, setPendingInviteTarget] = useState(null); // userId to join after registration

  // Check existing session on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const restored = await initAuth();
        if (restored && isLoggedIn()) {
          navigate('/', { replace: true });
          return;
        }
        // Also check legacy session
        const sessionId = sessionStorage.getItem('couple_user_id');
        if (sessionId && isLoggedIn()) {
          navigate('/', { replace: true });
          return;
        }
      } catch {
        // Ignore auth init errors
      }
      // Check legacy accounts
      const legacies = getLegacyAccounts();
      setLegacyAccounts(legacies);
      setMode('select');
    };
    checkAuth();
  }, [navigate]);

  const clearFields = () => {
    setPassword('');
    setConfirmPassword('');
    setError('');
    setEmail('');
    setBoyName('');
    setGirlName('');
    setStartDate('2024-01-01');
  };

  const [resetMode, setResetMode] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    if (!email.trim()) { setError('请输入邮箱地址'); return; }

    setLoading(true);
    setError('');

    const result = await resetPassword(email.trim());
    setLoading(false);

    if (result.error) {
      setError(result.error);
    } else {
      setResetSent(true);
      setError('');
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email.trim()) { setError('请输入邮箱'); return; }
    if (!password.trim()) { setError('请输入密码'); return; }

    setLoading(true);
    setError('');

    const result = await signIn(email.trim(), password);
    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    setCurrentUser(result.userId, email.trim());
    navigate('/', { replace: true });
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!email.trim()) { setError('请输入邮箱'); return; }
    if (!boyName.trim()) { setError('请输入男生名字'); return; }
    if (!girlName.trim()) { setError('请输入女生名字'); return; }
    if (!password.trim()) { setError('请输入密码'); return; }
    if (password.length < 6) { setError('密码至少需要6位'); return; }
    if (password !== confirmPassword) { setError('两次输入的密码不一致'); return; }

    setLoading(true);
    setError('');

    const coupleNames = { boy: boyName.trim(), girl: girlName.trim() };
    const result = await signUp(email.trim(), password, coupleNames, startDate);

    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    // Save data locally as well
    setCurrentUser(result.userId, email.trim());
    saveData('coupleNames', coupleNames);
    saveData('startDate', startDate);

    // If migrating from legacy account
    if (migratingAccount) {
      const legacyData = getLegacyAccountData(migratingAccount);
      for (const [key, value] of Object.entries(legacyData)) {
        saveData(key, value);
      }
    }

    // If registering via invite code, auto-join the shared account
    if (pendingInviteTarget) {
      const inviteCodeUsed = inviteCode.trim().toUpperCase();
      if (inviteCodeUsed) {
        await joinSharedAccount(inviteCodeUsed);
        // Sync owner's data from cloud
        const { syncFromCloud } = await import('../data/store');
        await syncFromCloud();
      }
    }

    navigate('/', { replace: true });
  };

  const handleUseInviteCode = async () => {
    const code = inviteCode.trim().toUpperCase();
    if (!code) { setError('请输入邀请码'); return; }

    setLoading(true);
    setError('');

    const targetUserId = await useInviteCode(code);
    setLoading(false);

    if (!targetUserId) {
      setError('无效的邀请码');
      return;
    }

    // If already logged in, join directly
    if (isLoggedIn()) {
      setLoading(true);
      const result = await joinSharedAccount(code);
      if (result && !result.error) {
        // Sync owner's data from cloud
        const { syncFromCloud } = await import('../data/store');
        await syncFromCloud();
        setLoading(false);
        if (result.alreadyMember) {
          setError('已经在此共享账户中，正在跳转...');
        } else {
          setError('成功加入共享账户！');
        }
        setTimeout(() => navigate('/', { replace: true }), 800);
      } else {
        setLoading(false);
        setError(result?.error || '加入失败，请重试');
      }
      return;
    }

    // Not logged in - store target and prompt registration
    setPendingInviteTarget(targetUserId);
    setMode('register');
    setError('请注册账户，完成后将自动加入共享');
  };

  const handleLegacyLogin = (accountName) => {
    // Legacy login: use session-only auth, then offer migration
    sessionStorage.setItem('couple_user_id', 'legacy_' + accountName);
    sessionStorage.setItem('couple_user_email', accountName);
    sessionStorage.setItem('couple_auth', '1');
    navigate('/', { replace: true });
  };

  // Display names for preview
  const displayNames = mode === 'register'
    ? { boy: boyName || '?', girl: girlName || '?' }
    : getData('coupleNames');

  if (mode === 'loading') {
    return (
      <div className="login-page">
        <div className="login-card" style={{ textAlign: 'center', color: '#fff' }}>
          <p>加载中...</p>
        </div>
      </div>
    );
  }

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
              <p className="login-subtitle">属于你们的专属空间</p>
            </div>

            <div className="login-entry-options">
              {/* 登录 */}
              <div className="login-entry-section">
                <p className="login-entry-label">已有账户</p>
                <button className="login-entry-btn" onClick={() => { setMode('login'); clearFields(); }}>
                  <span className="login-entry-btn-icon">🔑</span>
                  <span>邮箱登录</span>
                </button>
              </div>

              {/* 注册 */}
              <div className="login-entry-section">
                <button className="login-entry-btn login-entry-btn-new" onClick={() => { setMode('register'); clearFields(); setMigratingAccount(null); }}>
                  <span className="login-entry-btn-icon">+</span>
                  <span>创建新账户</span>
                </button>
              </div>

              {/* 邀请码 */}
              <div className="login-entry-section">
                <p className="login-entry-label">邀请加入</p>
                <button className="login-entry-btn login-entry-btn-new" onClick={() => setMode('invite')}>
                  <span className="login-entry-btn-icon">🎫</span>
                  <span>使用邀请码</span>
                </button>
              </div>

              {/* 旧账户迁移 */}
              {legacyAccounts.length > 0 && (
                <div className="login-entry-section">
                  <p className="login-entry-label">本地旧账户（迁移到云端）</p>
                  <div className="login-account-list">
                    {legacyAccounts.map((name) => {
                      const info = getLegacyAccountInfo(name);
                      return (
                        <button
                          key={name}
                          className="login-account-card"
                          onClick={() => {
                            setMigratingAccount(name);
                            setBoyName(info.coupleNames.boy);
                            setGirlName(info.coupleNames.girl);
                            setStartDate(info.startDate);
                            setMode('register');
                          }}
                        >
                          <span className="login-account-name">{name}</span>
                          <span className="login-account-couple">
                            {info.coupleNames.boy} & {info.coupleNames.girl} — 点击迁移
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* ===== 邀请码 ===== */}
        {mode === 'invite' && (
          <>
            <div className="login-header">
              <div className="login-avatars">
                <span className="login-avatar-icon">🎫</span>
              </div>
              <h1 className="login-title">使用邀请码</h1>
              <p className="login-subtitle">输入对方分享的邀请码</p>
            </div>

            <form className="login-form" onSubmit={(e) => { e.preventDefault(); handleUseInviteCode(); }}>
              <div className="login-input-group">
                <span className="login-input-icon">🎫</span>
                <input
                  className="login-input"
                  placeholder="输入8位邀请码"
                  value={inviteCode}
                  onChange={(e) => { setInviteCode(e.target.value.toUpperCase()); setError(''); }}
                  maxLength={8}
                  autoFocus
                />
              </div>
              {error && <p className="login-error">{error}</p>}
              <button type="submit" className="login-btn" disabled={loading}>
                {loading ? '验证中...' : '验证邀请码'}
              </button>
            </form>
            <p className="login-switch">
              <button onClick={() => { setMode('select'); setError(''); }} className="login-switch-btn">← 返回</button>
            </p>
          </>
        )}

        {/* ===== 登录 ===== */}
        {mode === 'login' && (
          <>
            <div className="login-header">
              <div className="login-avatars">
                <span className="login-avatar-icon">🔐</span>
              </div>
              <h1 className="login-title">登录</h1>
            </div>

            {resetMode ? (
              <>
                <form className="login-form" onSubmit={handleForgotPassword}>
                  <div className="login-input-group">
                    <span className="login-input-icon">📧</span>
                    <input
                      type="email"
                      className="login-input"
                      placeholder="输入注册邮箱"
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); setError(''); }}
                      autoFocus
                    />
                  </div>
                  {error && <p className="login-error">{error}</p>}
                  {resetSent && (
                    <p className="login-error" style={{ color: '#43a047' }}>
                      密码重置链接已发送到您的邮箱，请查收邮件
                    </p>
                  )}
                  <button type="submit" className="login-btn" disabled={loading}>
                    {loading ? '发送中...' : '发送重置链接'}
                  </button>
                </form>
                <p className="login-switch">
                  <button onClick={() => { setResetMode(false); setResetSent(false); setError(''); }} className="login-switch-btn">← 返回登录</button>
                </p>
              </>
            ) : (
              <>
                <form className="login-form" onSubmit={handleLogin}>
                  <div className="login-input-group">
                    <span className="login-input-icon">📧</span>
                    <input
                      type="email"
                      className="login-input"
                      placeholder="邮箱"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
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
                    {loading ? '登录中...' : '登录'}
                  </button>
                </form>
                <p className="login-switch">
                  <button onClick={() => { setMode('select'); clearFields(); }} className="login-switch-btn">← 返回</button>
                  <button onClick={() => { setResetMode(true); setResetSent(false); setError(''); }} className="login-switch-btn" style={{ marginLeft: '0.5rem' }}>忘记密码</button>
                  <button onClick={() => { setMode('register'); clearFields(); setMigratingAccount(null); }} className="login-switch-btn" style={{ marginLeft: '0.5rem' }}>注册</button>
                </p>
              </>
            )}
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
                {migratingAccount ? `从"${migratingAccount}"迁移数据` : '创建属于你们的专属账户'}
              </p>
            </div>
            <form className="login-form" onSubmit={handleRegister}>
              <div className="login-input-group">
                <span className="login-input-icon">📧</span>
                <input
                  type="email"
                  className="login-input"
                  placeholder="邮箱（用于登录）"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(''); }}
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
                {loading ? '注册中...' : migratingAccount ? '迁移并注册' : '创建账户并进入'}
              </button>
            </form>
            <p className="login-switch">
              <button onClick={() => { setMode('select'); clearFields(); }} className="login-switch-btn">← 返回</button>
              <button onClick={() => { setMode('login'); clearFields(); }} className="login-switch-btn" style={{ marginLeft: '1rem' }}>已有账户？登录</button>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
