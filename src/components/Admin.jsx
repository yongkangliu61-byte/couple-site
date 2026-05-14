import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getData, saveData, resetData, resetAllData, isCustomized, getTheme, saveTheme, resetTheme, themePresets, applyTheme, generateThemeFromColor } from '../data/store';
import { readFileAsBase64, createThumbnail, sha256 } from '../utils/helpers';
import './Admin.css';

const TABS = [
  { key: 'anniversaries', label: '纪念日' },
  { key: 'photos', label: '照片' },
  { key: 'timeline', label: '时间线' },
  { key: 'settings', label: '设置' },
];

const ICON_OPTIONS = ['💕', '🎂', '🌹', '💌', '🎄', '🎁', '✨', '💝', '💑', '🎬', '✈️', '🍳', '🎵', '🌟', '💍', '🏠', '🐱', '🎮', '📸', '🌈'];

export default function Admin() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('anniversaries');
  const [data, setData] = useState(() => getData('anniversaries'));
  const [photos, setPhotos] = useState(() => getData('galleryPhotos'));
  const [timeline, setTimeline] = useState(() => getData('timelineEvents'));
  const [names, setNames] = useState(() => getData('coupleNames'));
  const [startDt, setStartDt] = useState(() => getData('startDate'));
  const [message, setMessage] = useState('');

  const [editingAnniversary, setEditingAnniversary] = useState(null);
  const [editingPhoto, setEditingPhoto] = useState(null);
  const [editingTimeline, setEditingTimeline] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [newAlbumName, setNewAlbumName] = useState('');
  const [newAlbumDesc, setNewAlbumDesc] = useState('');
  const [managingAlbum, setManagingAlbum] = useState(null);
  const [batchImporting, setBatchImporting] = useState(null);
  const [albumMeta, setAlbumMeta] = useState(() => getData('albumMeta'));
  const [currentTheme, setCurrentTheme] = useState(() => getTheme());
  const [customColor, setCustomColor] = useState('#ec407a');

  const albumNames = [...new Set([...photos.map((p) => p.album || '默认相册'), ...Object.keys(albumMeta)])];

  const adminAlbums = (() => {
    const map = {};
    for (const photo of photos) {
      const name = photo.album || '默认相册';
      if (!map[name]) map[name] = [];
      map[name].push(photo);
    }
    for (const name of Object.keys(albumMeta)) {
      if (!map[name]) map[name] = [];
    }
    return Object.entries(map).map(([name, albumPhotos]) => {
      const meta = albumMeta[name] || {};
      return {
        name,
        description: meta.description || '',
        cover: meta.cover || albumPhotos[0]?.thumb || albumPhotos[0]?.src || '',
        count: albumPhotos.length,
      };
    });
  })();

  useEffect(() => {
    setData(getData('anniversaries'));
    setPhotos(getData('galleryPhotos'));
    setTimeline(getData('timelineEvents'));
    setNames(getData('coupleNames'));
    setStartDt(getData('startDate'));
    setAlbumMeta(getData('albumMeta'));
  }, [activeTab]);

  const showMsg = (msg) => {
    setMessage(msg);
    setTimeout(() => setMessage(''), 2000);
  };

  // Anniversaries
  const saveAnniversaries = (list) => {
    saveData('anniversaries', list);
    setData(list);
    showMsg('纪念日已保存');
  };

  const addAnniversary = () => {
    setEditingAnniversary({ name: '', date: '', type: 'anniversary', icon: '💕' });
  };

  const saveAnniversary = (item) => {
    let list;
    if (editingAnniversary.index !== undefined) {
      list = [...data];
      list[editingAnniversary.index] = { ...item };
    } else {
      list = [...data, { ...item }];
    }
    saveAnniversaries(list);
    setEditingAnniversary(null);
  };

  const deleteAnniversary = (index) => {
    const list = data.filter((_, i) => i !== index);
    saveAnniversaries(list);
  };

  // Photos
  const savePhotos = (list) => {
    saveData('galleryPhotos', list);
    setPhotos(list);
    showMsg('照片已保存');
  };

  const addPhoto = () => {
    setEditingPhoto({ src: '', thumb: '', caption: '', note: '', album: albumNames[0] || '默认相册' });
  };

  const savePhoto = (item) => {
    let list;
    if (editingPhoto.index !== undefined) {
      list = [...photos];
      list[editingPhoto.index] = { ...item, id: list[editingPhoto.index].id };
    } else {
      const maxId = photos.reduce((max, p) => Math.max(max, p.id || 0), 0);
      list = [...photos, { ...item, id: maxId + 1 }];
    }
    savePhotos(list);
    setEditingPhoto(null);
  };

  const deletePhoto = (index) => {
    const list = photos.filter((_, i) => i !== index);
    savePhotos(list);
  };

  const handleCreateAlbum = () => {
    const name = newAlbumName.trim();
    if (!name) return;
    if (albumNames.includes(name)) {
      showMsg('该相册已存在');
      return;
    }
    const updatedMeta = { ...albumMeta, [name]: { description: newAlbumDesc.trim(), cover: '' } };
    saveData('albumMeta', updatedMeta);
    setAlbumMeta(updatedMeta);
    setNewAlbumName('');
    setNewAlbumDesc('');
    showMsg(`相册"${name}"已创建`);
  };

  const handleDeleteAlbum = (name) => {
    if (name === '默认相册') {
      showMsg('不能删除默认相册');
      return;
    }
    const list = photos.map((p) => {
      if ((p.album || '默认相册') === name) {
        return { ...p, album: '默认相册' };
      }
      return p;
    });
    savePhotos(list);
    const updatedMeta = { ...albumMeta };
    delete updatedMeta[name];
    saveData('albumMeta', updatedMeta);
    setAlbumMeta(updatedMeta);
    showMsg(`相册"${name}"已删除`);
  };

  const handleBatchImport = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const album = managingAlbum || albumNames[0] || '默认相册';
    const total = files.length;

    setBatchImporting({ current: 0, total });

    let maxId = photos.reduce((max, p) => Math.max(max, p.id || 0), 0);
    let completed = 0;

    const results = await Promise.allSettled(
      Array.from(files).map(async (file) => {
        try {
          const base64 = await readFileAsBase64(file);
          const thumb = await createThumbnail(base64);
          completed++;
          setBatchImporting({ current: completed, total });
          return { src: base64, thumb, caption: file.name.replace(/\.[^.]+$/, ''), note: '', album };
        } catch (err) {
          completed++;
          setBatchImporting({ current: completed, total });
          throw err;
        }
      })
    );

    const newPhotos = [];
    for (const r of results) {
      if (r.status === 'fulfilled') {
        maxId++;
        newPhotos.push({ id: maxId, ...r.value });
      }
    }

    const failed = total - newPhotos.length;

    if (newPhotos.length > 0) {
      savePhotos([...photos, ...newPhotos]);
    }

    setBatchImporting(null);
    if (failed > 0) {
      showMsg(`导入完成：成功 ${newPhotos.length} 张，失败 ${failed} 张`);
    } else {
      showMsg(`成功导入 ${newPhotos.length} 张照片到"${album}"`);
    }
    e.target.value = '';
  };

  // Timeline
  const saveTimeline = (list) => {
    saveData('timelineEvents', list);
    setTimeline(list);
    showMsg('时间线已保存');
  };

  const addTimelineEvent = () => {
    setEditingTimeline({ date: '', title: '', description: '', icon: '✨', image: '', video: '' });
  };

  const saveTimelineEvent = (item) => {
    let list;
    if (editingTimeline.index !== undefined) {
      list = [...timeline];
      list[editingTimeline.index] = { ...item };
    } else {
      list = [...timeline, { ...item }];
    }
    saveTimeline(list);
    setEditingTimeline(null);
  };

  const deleteTimelineEvent = (index) => {
    const list = timeline.filter((_, i) => i !== index);
    saveTimeline(list);
  };

  // Settings
  const saveSettings = () => {
    saveData('coupleNames', names);
    saveData('startDate', startDt);
    showMsg('设置已保存');
  };

  const handlePasswordChange = async () => {
    if (!newPassword.trim()) {
      showMsg('请输入新密码');
      return;
    }
    if (newPassword.length < 6) {
      showMsg('密码至少需要6位');
      return;
    }
    if (newPassword !== confirmPassword) {
      showMsg('两次输入的密码不一致');
      return;
    }
    const hash = await sha256(newPassword.trim());
    localStorage.setItem('couple_passwordHash', hash);
    setNewPassword('');
    setConfirmPassword('');
    showMsg('密码已更新');
  };

  const handleResetTab = () => {
    if (activeTab === 'anniversaries') { resetData('anniversaries'); setData(getData('anniversaries')); }
    if (activeTab === 'photos') { resetData('galleryPhotos'); setPhotos(getData('galleryPhotos')); }
    if (activeTab === 'timeline') { resetData('timelineEvents'); setTimeline(getData('timelineEvents')); }
    if (activeTab === 'settings') { resetData('coupleNames'); resetData('startDate'); setNames(getData('coupleNames')); setStartDt(getData('startDate')); }
    showMsg('已恢复默认');
  };

  // Theme handlers
  const handleSelectPreset = (name) => {
    const theme = { type: 'preset', name, colors: themePresets[name] };
    saveTheme(theme);
    setCurrentTheme(theme);
    applyTheme();
    showMsg(`主题已切换为"${themePresets[name].label}"`);
  };

  const handleCustomColor = (hex) => {
    setCustomColor(hex);
    const colors = generateThemeFromColor(hex);
    const theme = { type: 'custom', name: 'custom', colors };
    saveTheme(theme);
    setCurrentTheme(theme);
    applyTheme();
    showMsg('自定义主题已应用');
  };

  return (
    <div className="admin-page">
      <div className="admin-header">
        <button className="admin-back" onClick={() => navigate('/')}>← 返回网站</button>
        <h2 className="admin-title">内容管理</h2>
      </div>

      <div className="admin-tabs">
        {TABS.map((tab) => {
          const customized = tab.key === 'anniversaries' ? isCustomized('anniversaries')
            : tab.key === 'photos' ? isCustomized('galleryPhotos')
            : tab.key === 'timeline' ? isCustomized('timelineEvents')
            : isCustomized('coupleNames') || isCustomized('startDate');
          return (
            <button
              key={tab.key}
              className={`admin-tab ${activeTab === tab.key ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
              {customized && <span className="admin-tab-dot" />}
            </button>
          );
        })}
      </div>

      {message && <div className="admin-toast">{message}</div>}

      <div className="admin-content">
        {/* ========== 纪念日管理 ========== */}
        {activeTab === 'anniversaries' && (
          <div className="admin-section">
            <div className="admin-actions">
              <button className="admin-btn admin-btn-primary" onClick={addAnniversary}>+ 添加纪念日</button>
              <button className="admin-btn admin-btn-reset" onClick={handleResetTab}>恢复默认</button>
            </div>

            <div className="admin-list">
              {data.map((item, i) => (
                <div key={i} className="admin-item">
                  <div className="admin-item-info">
                    <span className="admin-item-icon">{item.icon}</span>
                    <div>
                      <strong>{item.name}</strong>
                      <span className="admin-item-date">每年 {item.date}</span>
                    </div>
                  </div>
                  <div className="admin-item-actions">
                    <button onClick={() => setEditingAnniversary({ ...item, index: i })}>编辑</button>
                    <button className="danger" onClick={() => deleteAnniversary(i)}>删除</button>
                  </div>
                </div>
              ))}
              {data.length === 0 && <p className="admin-empty">暂无纪念日，点击添加</p>}
            </div>
          </div>
        )}

        {/* ========== 照片管理 ========== */}
        {activeTab === 'photos' && (
          <div className="admin-section">
            {managingAlbum ? (
              <>
                <div className="admin-album-detail-header">
                  <button className="gallery-back-btn" onClick={() => setManagingAlbum(null)}>← 返回相册列表</button>
                  <h3 className="admin-album-detail-title">{managingAlbum}</h3>
                </div>

                <div className="admin-album-meta-edit">
                  <input
                    value={albumMeta[managingAlbum]?.description || ''}
                    onChange={(e) => {
                      const updated = { ...albumMeta, [managingAlbum]: { ...albumMeta[managingAlbum], description: e.target.value, cover: albumMeta[managingAlbum]?.cover || '' } };
                      saveData('albumMeta', updated);
                      setAlbumMeta(updated);
                    }}
                    placeholder="添加相册描述..."
                  />
                </div>

                <div className="admin-actions">
                  <button className="admin-btn admin-btn-primary" onClick={() => {
                    setEditingPhoto({ src: '', thumb: '', caption: '', note: '', album: managingAlbum });
                  }}>+ 添加照片</button>
                  <label className="admin-btn admin-btn-primary admin-batch-btn">
                    批量导入
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      style={{ display: 'none' }}
                      onChange={handleBatchImport}
                    />
                  </label>
                  {managingAlbum !== '默认相册' && (
                    <button className="admin-btn admin-btn-reset" onClick={() => {
                      if (confirm(`确定删除相册"${managingAlbum}"？照片将移入默认相册。`)) {
                        handleDeleteAlbum(managingAlbum);
                        setManagingAlbum(null);
                      }
                    }} style={{ color: '#e53935', borderColor: '#ffcdd2' }}>删除此相册</button>
                  )}
                </div>

                {batchImporting && (
                  <div className="admin-batch-progress">
                    <div className="admin-batch-progress-bar">
                      <div
                        className="admin-batch-progress-fill"
                        style={{ width: `${(batchImporting.current / batchImporting.total) * 100}%` }}
                      />
                    </div>
                    <span className="admin-batch-progress-text">
                      正在导入... {batchImporting.current}/{batchImporting.total}
                    </span>
                  </div>
                )}

                <div className="admin-photo-grid">
                  {photos.filter(p => (p.album || '默认相册') === managingAlbum).map((item) => {
                    const realIndex = photos.findIndex(p => p.id === item.id);
                    return (
                      <div key={item.id} className="admin-photo-card">
                        <img src={item.thumb || item.src} alt={item.caption} />
                        <div className="admin-photo-info">
                          <span>{item.caption}</span>
                          <div className="admin-item-actions">
                            <button onClick={() => setEditingPhoto({ ...item, index: realIndex })}>编辑</button>
                            <button className="danger" onClick={() => deletePhoto(realIndex)}>删除</button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {photos.filter(p => (p.album || '默认相册') === managingAlbum).length === 0 && (
                    <p className="admin-empty">此相册还没有照片，点击上方按钮添加</p>
                  )}
                </div>
              </>
            ) : (
              <>
                <div className="admin-actions">
                  <button className="admin-btn admin-btn-reset" onClick={handleResetTab}>恢复默认</button>
                </div>

                <div className="admin-album-create-section">
                  <h4>创建新相册</h4>
                  <div className="admin-album-create-row">
                    <input
                      value={newAlbumName}
                      onChange={(e) => setNewAlbumName(e.target.value)}
                      placeholder="相册名称"
                    />
                    <input
                      value={newAlbumDesc}
                      onChange={(e) => setNewAlbumDesc(e.target.value)}
                      placeholder="相册描述（可选）"
                    />
                    <button className="admin-btn admin-btn-primary" onClick={handleCreateAlbum}>创建</button>
                  </div>
                </div>

                <div className="admin-album-grid">
                  {adminAlbums.length === 0 && (
                    <p className="admin-empty">还没有相册，创建一个吧</p>
                  )}
                  {adminAlbums.map((album) => (
                    <div
                      key={album.name}
                      className="admin-album-card"
                      onClick={() => setManagingAlbum(album.name)}
                    >
                      <div className="admin-album-cover">
                        {album.cover ? (
                          <img src={album.cover} alt={album.name} />
                        ) : (
                          <div className="admin-album-cover-placeholder">📷</div>
                        )}
                        <div className="admin-album-cover-overlay">
                          <span>管理相册</span>
                        </div>
                      </div>
                      <div className="admin-album-info">
                        <h4 className="admin-album-name">{album.name}</h4>
                        <span className="admin-album-count">{album.count} 张照片</span>
                        {album.description && <p className="admin-album-desc">{album.description}</p>}
                      </div>
                      {album.name !== '默认相册' && (
                        <button
                          className="admin-album-card-delete"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm(`确定删除相册"${album.name}"？照片将移入默认相册。`)) {
                              handleDeleteAlbum(album.name);
                            }
                          }}
                          title="删除相册"
                        >×</button>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* ========== 时间线管理 ========== */}
        {activeTab === 'timeline' && (
          <div className="admin-section">
            <div className="admin-actions">
              <button className="admin-btn admin-btn-primary" onClick={addTimelineEvent}>+ 添加事件</button>
              <button className="admin-btn admin-btn-reset" onClick={handleResetTab}>恢复默认</button>
            </div>

            <div className="admin-list">
              {timeline.map((item, i) => (
                <div key={i} className="admin-item">
                  <div className="admin-item-info">
                    <span className="admin-item-icon">{item.icon}</span>
                    <div>
                      <strong>{item.title}</strong>
                      <span className="admin-item-date">{item.date}</span>
                      <span className="admin-item-desc">{item.description}</span>
                    </div>
                  </div>
                  <div className="admin-item-actions">
                    <button onClick={() => setEditingTimeline({ ...item, index: i })}>编辑</button>
                    <button className="danger" onClick={() => deleteTimelineEvent(i)}>删除</button>
                  </div>
                </div>
              ))}
              {timeline.length === 0 && <p className="admin-empty">暂无事件，点击添加</p>}
            </div>
          </div>
        )}

        {/* ========== 设置 ========== */}
        {activeTab === 'settings' && (
          <div className="admin-section">
            <div className="admin-form-group">
              <h3>基本信息</h3>
              <label>男生名字</label>
              <input value={names.boy} onChange={(e) => setNames({ ...names, boy: e.target.value })} />
              <label>女生名字</label>
              <input value={names.girl} onChange={(e) => setNames({ ...names, girl: e.target.value })} />
              <label>恋爱起始日期</label>
              <input type="date" value={startDt} onChange={(e) => setStartDt(e.target.value)} />
              <button className="admin-btn admin-btn-primary" onClick={saveSettings}>保存设置</button>
            </div>

            <div className="admin-form-group">
              <h3>修改密码</h3>
              <label>新密码（至少6位）</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="输入新密码"
              />
              <label>确认新密码</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="再次输入新密码"
              />
              <button className="admin-btn admin-btn-primary" onClick={handlePasswordChange}>更新密码</button>
            </div>

            <div className="admin-form-group">
              <h3>主题颜色</h3>
              <div className="admin-theme-presets">
                {Object.entries(themePresets).map(([key, preset]) => (
                  <button
                    key={key}
                    className={`admin-theme-swatch ${currentTheme.type === 'preset' && currentTheme.name === key ? 'active' : ''}`}
                    onClick={() => handleSelectPreset(key)}
                    title={preset.label}
                  >
                    <span className="admin-theme-dot" style={{ background: preset.primary }} />
                    <span className="admin-theme-label">{preset.label}</span>
                  </button>
                ))}
              </div>
              <label style={{ marginTop: '1rem' }}>自定义颜色</label>
              <div className="admin-theme-custom">
                <input
                  type="color"
                  value={customColor}
                  onChange={(e) => handleCustomColor(e.target.value)}
                  className="admin-theme-picker"
                />
                <span className="admin-theme-custom-hex">{customColor}</span>
              </div>
              <button
                className="admin-btn admin-btn-reset"
                onClick={() => {
                  resetTheme();
                  const theme = getTheme();
                  setCurrentTheme(theme);
                  setCustomColor('#ec407a');
                  applyTheme();
                  showMsg('主题已恢复默认');
                }}
                style={{ marginTop: '0.8rem' }}
              >
                恢复默认主题
              </button>
            </div>

            <div className="admin-form-group admin-danger-zone">
              <h3>危险操作</h3>
              <p>恢复所有内容为默认值，此操作不可撤销。</p>
              <button className="admin-btn admin-btn-reset" onClick={() => { resetAllData(); showMsg('已全部恢复默认'); }}>恢复全部默认设置</button>
            </div>
          </div>
        )}
      </div>

      {/* ===== 编辑弹窗：纪念日 ===== */}
      {editingAnniversary && (
        <div className="admin-modal-overlay" onClick={() => setEditingAnniversary(null)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <h3>{editingAnniversary.index !== undefined ? '编辑纪念日' : '添加纪念日'}</h3>
            <label>名称</label>
            <input value={editingAnniversary.name} onChange={(e) => setEditingAnniversary({ ...editingAnniversary, name: e.target.value })} />
            <label>日期（月-日）</label>
            <input value={editingAnniversary.date} onChange={(e) => setEditingAnniversary({ ...editingAnniversary, date: e.target.value })} placeholder="01-01" />
            <label>图标</label>
            <div className="admin-icon-picker">
              {ICON_OPTIONS.map((icon) => (
                <button
                  key={icon}
                  className={`admin-icon-btn ${editingAnniversary.icon === icon ? 'selected' : ''}`}
                  onClick={() => setEditingAnniversary({ ...editingAnniversary, icon })}
                >
                  {icon}
                </button>
              ))}
            </div>
            <div className="admin-modal-actions">
              <button className="admin-btn admin-btn-primary" onClick={() => saveAnniversary(editingAnniversary)}>保存</button>
              <button className="admin-btn" onClick={() => setEditingAnniversary(null)}>取消</button>
            </div>
          </div>
        </div>
      )}

      {/* ===== 编辑弹窗：照片 ===== */}
      {editingPhoto && (
        <div className="admin-modal-overlay" onClick={() => setEditingPhoto(null)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <h3>{editingPhoto.index !== undefined ? '编辑照片' : '添加照片'}</h3>
            <label>图片URL</label>
            <input value={editingPhoto.src} onChange={(e) => setEditingPhoto({ ...editingPhoto, src: e.target.value, thumb: e.target.value || editingPhoto.thumb })} placeholder="https://example.com/photo.jpg" />
            <div className="admin-file-upload">
              <span className="admin-file-or">或</span>
              <label className="admin-file-btn">
                从本地选择图片
                <input
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={async (e) => {
                    const file = e.target.files[0];
                    if (!file) return;
                    try {
                      const base64 = await readFileAsBase64(file);
                      setEditingPhoto({ ...editingPhoto, src: base64, thumb: base64 });
                    } catch {
                      showMsg('读取文件失败');
                    }
                  }}
                />
              </label>
            </div>
            <label>缩略图URL（可选，不填则使用原图）</label>
            <input value={editingPhoto.thumb} onChange={(e) => setEditingPhoto({ ...editingPhoto, thumb: e.target.value })} placeholder="留空则使用原图" />
            <label>描述文字</label>
            <input value={editingPhoto.caption} onChange={(e) => setEditingPhoto({ ...editingPhoto, caption: e.target.value })} />
            <label>所属相册</label>
            <select
              value={editingPhoto.album || '默认相册'}
              onChange={(e) => setEditingPhoto({ ...editingPhoto, album: e.target.value })}
              style={{
                width: '100%', padding: '0.6rem 0.8rem', border: '1px solid #e0e0e0',
                borderRadius: '8px', fontSize: '0.95rem', outline: 'none', background: '#fff',
              }}
            >
              {albumNames.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
              <option value="__new__">+ 新建相册...</option>
            </select>
            {editingPhoto.album === '__new__' && (
              <input
                value=""
                onChange={(e) => setEditingPhoto({ ...editingPhoto, album: e.target.value })}
                placeholder="输入新相册名称"
                style={{ marginTop: '0.5rem' }}
                autoFocus
              />
            )}
            <label>备注（可选，支持换行）</label>
            <textarea rows="3" value={editingPhoto.note || ''} onChange={(e) => setEditingPhoto({ ...editingPhoto, note: e.target.value })} placeholder="写下关于这张照片的故事..." />
            {editingPhoto.src && (
              <div className="admin-photo-preview">
                <img src={editingPhoto.src} alt="预览" onError={(e) => { e.target.style.display = 'none'; }} />
              </div>
            )}
            <div className="admin-modal-actions">
              <button className="admin-btn admin-btn-primary" onClick={() => savePhoto(editingPhoto)}>保存</button>
              <button className="admin-btn" onClick={() => setEditingPhoto(null)}>取消</button>
            </div>
          </div>
        </div>
      )}

      {/* ===== 编辑弹窗：时间线 ===== */}
      {editingTimeline && (
        <div className="admin-modal-overlay" onClick={() => setEditingTimeline(null)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <h3>{editingTimeline.index !== undefined ? '编辑事件' : '添加事件'}</h3>
            <label>日期</label>
            <input type="date" value={editingTimeline.date} onChange={(e) => setEditingTimeline({ ...editingTimeline, date: e.target.value })} />
            <label>标题</label>
            <input value={editingTimeline.title} onChange={(e) => setEditingTimeline({ ...editingTimeline, title: e.target.value })} />
            <label>描述</label>
            <textarea rows="3" value={editingTimeline.description} onChange={(e) => setEditingTimeline({ ...editingTimeline, description: e.target.value })} />
            <label>图片URL（可选）</label>
            <input value={editingTimeline.image || ''} onChange={(e) => setEditingTimeline({ ...editingTimeline, image: e.target.value })} placeholder="https://example.com/photo.jpg" />
            <div className="admin-file-upload">
              <span className="admin-file-or">或</span>
              <label className="admin-file-btn">
                从本地选择图片
                <input
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={async (e) => {
                    const file = e.target.files[0];
                    if (!file) return;
                    try {
                      const base64 = await readFileAsBase64(file);
                      setEditingTimeline({ ...editingTimeline, image: base64 });
                    } catch {
                      showMsg('读取文件失败');
                    }
                  }}
                />
              </label>
            </div>
            {editingTimeline.image && (
              <div className="admin-photo-preview">
                <img src={editingTimeline.image} alt="预览" onError={(e) => { e.target.style.display = 'none'; }} />
              </div>
            )}
            <label>视频URL（可选，建议30秒内短视频）</label>
            <input value={editingTimeline.video || ''} onChange={(e) => setEditingTimeline({ ...editingTimeline, video: e.target.value })} placeholder="https://example.com/video.mp4" />
            <div className="admin-file-upload">
              <span className="admin-file-or">或</span>
              <label className="admin-file-btn">
                从本地选择视频
                <input
                  type="file"
                  accept="video/*"
                  style={{ display: 'none' }}
                  onChange={async (e) => {
                    const file = e.target.files[0];
                    if (!file) return;
                    if (file.size > 30 * 1024 * 1024) {
                      alert('视频文件建议不超过30MB，请选择更短的视频或使用URL链接');
                      return;
                    }
                    try {
                      const base64 = await readFileAsBase64(file);
                      setEditingTimeline({ ...editingTimeline, video: base64 });
                    } catch {}
                  }}
                />
              </label>
            </div>
            <span className="admin-field-hint">本地视频会转为Base64存储，建议短视频（&lt;30MB）</span>
            {editingTimeline.video && editingTimeline.video.startsWith('data:') && (
              <div className="admin-photo-preview">
                <video src={editingTimeline.video} controls style={{ width: '100%', maxHeight: '200px', borderRadius: '8px' }} />
              </div>
            )}
            <label>图标</label>
            <div className="admin-icon-picker">
              {ICON_OPTIONS.map((icon) => (
                <button
                  key={icon}
                  className={`admin-icon-btn ${editingTimeline.icon === icon ? 'selected' : ''}`}
                  onClick={() => setEditingTimeline({ ...editingTimeline, icon })}
                >
                  {icon}
                </button>
              ))}
            </div>
            <div className="admin-modal-actions">
              <button className="admin-btn admin-btn-primary" onClick={() => saveTimelineEvent(editingTimeline)}>保存</button>
              <button className="admin-btn" onClick={() => setEditingTimeline(null)}>取消</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
