import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getData, saveData, resetData, resetAllData, isCustomized, getTheme, saveTheme, resetTheme, themePresets, applyTheme, generateThemeFromColor, getCurrentUserId, getCurrentUserEmail, getEffectiveUserId, getActiveDataOwner, setActiveDataOwner, isViewingSharedData, generateInviteCode, getAccountInviteCodes, deleteInviteCode, getSharedMembers, getSharedAccounts, leaveSharedAccount, removeSharedMember, syncToCloud, syncFromCloud, checkCloudConnection } from '../data/store';
import { readFileAsBase64, createThumbnail } from '../utils/helpers';
import { uploadFile, deleteFile } from '../data/supabase';
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
    setTimeout(() => setMessage(''), 3000);
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
    const photo = photos[index];
    // Clean up from cloud storage if it's a Supabase URL
    if (photo && photo.src && photo.src.includes('supabase.co')) {
      const userId = getEffectiveUserId();
      deleteFile(userId, photo.src);
    }
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

  const uploadPhotoFile = async (file) => {
    // Read as base64 for thumbnail and fallback
    const base64 = await readFileAsBase64(file);
    const thumb = await createThumbnail(base64);

    const userId = getEffectiveUserId();

    // Try uploading to Supabase Storage
    try {
      const url = await uploadFile(userId, file.name, base64);
      if (url) {
        return { src: url, thumb, uploaded: true };
      }
    } catch {
      // Upload failed, use base64 as fallback
    }
    return { src: base64, thumb, uploaded: false };
  };

  const handleBatchImport = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const album = managingAlbum || albumNames[0] || '默认相册';
    const total = files.length;

    setBatchImporting({ current: 0, total });

    let maxId = photos.reduce((max, p) => Math.max(max, p.id || 0), 0);
    let completed = 0;
    let cloudCount = 0;

    const results = await Promise.allSettled(
      Array.from(files).map(async (file) => {
        try {
          const { src, thumb, uploaded } = await uploadPhotoFile(file);
          if (uploaded) cloudCount++;
          completed++;
          setBatchImporting({ current: completed, total });
          return { src, thumb, caption: file.name.replace(/\.[^.]+$/, ''), note: '', album };
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
    const cloudMsg = cloudCount > 0 ? `（${cloudCount} 张上传到云端）` : '';
    if (failed > 0) {
      showMsg(`导入完成：成功 ${newPhotos.length} 张${cloudMsg}，失败 ${failed} 张`);
    } else {
      showMsg(`成功导入 ${newPhotos.length} 张照片到"${album}"${cloudMsg}`);
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

  // Data export
  const handleExportData = () => {
    const account = getCurrentUserEmail() || getCurrentUserId();
    const exportData = {
      accountName: account,
      exportedAt: new Date().toISOString(),
      version: '1.0',
      data: {
        coupleNames: getData('coupleNames'),
        startDate: getData('startDate'),
        anniversaries: getData('anniversaries'),
        timelineEvents: getData('timelineEvents'),
        galleryPhotos: getData('galleryPhotos'),
        albumMeta: getData('albumMeta'),
      },
      theme: getTheme(),
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `couple-backup-${account}-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showMsg('数据已导出');
  };

  // Data import
  const handleImportData = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const text = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('读取失败'));
        reader.readAsText(file);
      });

      const imported = JSON.parse(text);

      if (!imported.data || !imported.version) {
        showMsg('无效的备份文件格式');
        return;
      }

      if (!confirm(
        `确定要导入此备份数据吗？\n\n` +
        `备份时间：${imported.exportedAt || '未知'}\n` +
        `账户：${imported.accountName || '未知'}\n\n` +
        `当前数据将被覆盖，此操作不可撤销。`
      )) {
        e.target.value = '';
        return;
      }

      const d = imported.data;
      if (d.coupleNames) saveData('coupleNames', d.coupleNames);
      if (d.startDate) saveData('startDate', d.startDate);
      if (d.anniversaries) saveData('anniversaries', d.anniversaries);
      if (d.timelineEvents) saveData('timelineEvents', d.timelineEvents);
      if (d.galleryPhotos) saveData('galleryPhotos', d.galleryPhotos);
      if (d.albumMeta) saveData('albumMeta', d.albumMeta);
      if (imported.theme) {
        saveTheme(imported.theme);
        setCurrentTheme(imported.theme);
        applyTheme();
      }

      // Refresh all states
      setData(getData('anniversaries'));
      setPhotos(getData('galleryPhotos'));
      setTimeline(getData('timelineEvents'));
      setNames(getData('coupleNames'));
      setStartDt(getData('startDate'));
      setAlbumMeta(getData('albumMeta'));

      showMsg('数据导入成功！');
    } catch (err) {
      showMsg('导入失败：' + (err.message || '文件格式错误'));
    }

    e.target.value = '';
  };

  // Invite codes
  const [inviteCodes, setInviteCodes] = useState([]);
  const [sharedMembers, setSharedMembers] = useState([]);
  const [sharedAccounts, setSharedAccounts] = useState([]);

  useEffect(() => {
    (async () => {
      const codes = await getAccountInviteCodes();
      setInviteCodes(codes);
    })();
  }, []);

  useEffect(() => {
    (async () => {
      if (activeTab === 'settings') {
        const members = await getSharedMembers();
        setSharedMembers(members);
        const accounts = await getSharedAccounts();
        setSharedAccounts(accounts);
      }
    })();
  }, [activeTab]);

  const loadSharedData = async () => {
    const members = await getSharedMembers();
    setSharedMembers(members);
    const accounts = await getSharedAccounts();
    setSharedAccounts(accounts);
  };

  const loadInviteCodes = async () => {
    const codes = await getAccountInviteCodes();
    setInviteCodes(codes);
  };

  const handleGenerateInvite = async () => {
    const code = await generateInviteCode();
    if (code) {
      await loadInviteCodes();
      showMsg(`邀请码已生成：${code}`);
    }
  };

  const handleDeleteInvite = async (code) => {
    if (confirm(`确定删除邀请码 ${code}？删除后将无法使用。`)) {
      await deleteInviteCode(code);
      await loadInviteCodes();
      showMsg('邀请码已删除');
    }
  };

  const handleCopyInvite = (code) => {
    navigator.clipboard.writeText(code).then(() => {
      showMsg('邀请码已复制到剪贴板');
    }).catch(() => {
      showMsg('复制失败，请手动复制：' + code);
    });
  };

  // Cloud sync
  const [cloudStatus, setCloudStatus] = useState(null);
  const [syncing, setSyncing] = useState(false);

  const checkCloud = async () => {
    const status = await checkCloudConnection();
    setCloudStatus(status);
    if (status.connected && status.hasData) {
      showMsg('云端连接正常，已有数据');
    } else if (status.connected) {
      showMsg('云端连接正常，暂无数据');
    } else {
      showMsg(status.message || '云端未连接');
    }
  };

  const handleSyncToCloud = async () => {
    setSyncing(true);
    const result = await syncToCloud();
    setSyncing(false);
    if (result.success) {
      showMsg(`已上传 ${result.uploaded} 项数据到云端`);
    } else {
      showMsg(result.message || '同步失败');
    }
  };

  const handleSyncFromCloud = async () => {
    if (!confirm('从云端拉取数据将覆盖本地数据，确定继续？')) return;
    setSyncing(true);
    const result = await syncFromCloud();
    setSyncing(false);
    if (result.success) {
      // Refresh all local state
      setData(getData('anniversaries'));
      setPhotos(getData('galleryPhotos'));
      setTimeline(getData('timelineEvents'));
      setNames(getData('coupleNames'));
      setStartDt(getData('startDate'));
      setAlbumMeta(getData('albumMeta'));
      const theme = getTheme();
      setCurrentTheme(theme);
      applyTheme();
      showMsg(`已从云端同步 ${result.imported} 项数据`);
    } else {
      showMsg(result.message || '同步失败');
    }
  };

  return (
    <div className="admin-page">
      <div className="admin-header">
        <button className="admin-back" onClick={() => navigate('/')}>← 返回网站</button>
        <h2 className="admin-title">内容管理</h2>
      </div>

      {isViewingSharedData() && (
        <div className="admin-shared-banner">
          <span>🔗 正在查看共享账户的数据</span>
          <button onClick={() => { setActiveDataOwner(null); window.location.reload(); }}>
            切换回我的账户
          </button>
        </div>
      )}

      {sharedAccounts.length > 0 && !isViewingSharedData() && (
        <div className="admin-shared-banner" style={{ background: '#e8f5e9', border: '1px solid #a5d6a7' }}>
          <span>👥 你已加入 {sharedAccounts.length} 个共享账户</span>
        </div>
      )}

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

            <div className="admin-form-group">
              <h3>云端同步</h3>
              <p style={{ fontSize: '0.85rem', color: '#999', marginBottom: '0.8rem' }}>
                将数据同步到 Supabase 云端存储，实现多设备共享数据。
                {cloudStatus && (
                  <span style={{ color: cloudStatus.connected ? '#43a047' : '#e53935', marginLeft: '0.5rem' }}>
                    {cloudStatus.connected ? '● 已连接' : '○ 未连接'}
                  </span>
                )}
              </p>
              <div style={{ display: 'flex', gap: '0.8rem', flexWrap: 'wrap' }}>
                <button className="admin-btn" onClick={checkCloud}>
                  检查连接
                </button>
                <button className="admin-btn admin-btn-primary" onClick={handleSyncToCloud} disabled={syncing}>
                  {syncing ? '同步中...' : '↑ 上传到云端'}
                </button>
                <button className="admin-btn" onClick={handleSyncFromCloud} disabled={syncing}>
                  ↓ 从云端拉取
                </button>
              </div>
            </div>

            <div className="admin-form-group">
              <h3>数据备份</h3>
              <p style={{ fontSize: '0.85rem', color: '#999', marginBottom: '0.8rem' }}>
                导出所有数据为JSON文件，可用于备份或迁移到其他设备。导入将覆盖当前数据。
              </p>
              <div style={{ display: 'flex', gap: '0.8rem', flexWrap: 'wrap' }}>
                <button className="admin-btn admin-btn-primary" onClick={handleExportData}>
                  ↓ 导出数据
                </button>
                <label className="admin-btn admin-btn-primary" style={{ cursor: 'pointer' }}>
                  ↑ 导入数据
                  <input
                    type="file"
                    accept=".json"
                    style={{ display: 'none' }}
                    onChange={handleImportData}
                  />
                </label>
              </div>
            </div>

            <div className="admin-form-group">
              <h3>邀请码共享</h3>
              <p style={{ fontSize: '0.85rem', color: '#999', marginBottom: '0.8rem' }}>
                生成邀请码，让对方在登录页面输入邀请码即可加入你的账户，一起维护属于你们的回忆。
              </p>
              <button className="admin-btn admin-btn-primary" onClick={handleGenerateInvite}>
                + 生成邀请码
              </button>

              {inviteCodes.length > 0 && (
                <div className="admin-list" style={{ marginTop: '1rem' }}>
                  {inviteCodes.map((entry) => (
                    <div key={entry.code} className="admin-item">
                      <div className="admin-item-info" style={{ fontFamily: 'monospace', letterSpacing: '0.05em' }}>
                        <strong>{entry.code}</strong>
                        <span className="admin-item-date">
                          创建于 {new Date(entry.createdAt).toLocaleDateString('zh-CN')}
                        </span>
                      </div>
                      <div className="admin-item-actions">
                        <button onClick={() => handleCopyInvite(entry.code)}>复制</button>
                        <button className="danger" onClick={() => handleDeleteInvite(entry.code)}>删除</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="admin-form-group">
              <h3>共享成员管理</h3>
              <p style={{ fontSize: '0.85rem', color: '#999', marginBottom: '0.8rem' }}>
                管理可访问此账户数据的共享成员，或切换到已加入的共享账户。
              </p>

              {/* Shared accounts the user has joined */}
              {sharedAccounts.length > 0 && (
                <div style={{ marginBottom: '1.2rem' }}>
                  <h4 style={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}>我加入的共享账户</h4>
                  {sharedAccounts.map((acc) => (
                    <div key={acc.owner_id} className="admin-item" style={{ marginBottom: '0.4rem' }}>
                      <div className="admin-item-info">
                        <span className="admin-item-icon">👤</span>
                        <div>
                          <strong style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{acc.owner_id}</strong>
                          <span className="admin-item-date">
                            加入于 {new Date(acc.created_at).toLocaleDateString('zh-CN')}
                          </span>
                        </div>
                      </div>
                      <div className="admin-item-actions">
                        <button onClick={async () => {
                          setActiveDataOwner(acc.owner_id);
                          const result = await syncFromCloud();
                          showMsg(result.success ? `已切换到共享账户，同步了 ${result.imported} 项数据` : '已切换到共享账户');
                          setTimeout(() => window.location.reload(), 800);
                        }}>
                          查看数据
                        </button>
                        <button className="danger" onClick={async () => {
                          if (confirm('确定离开此共享账户？')) {
                            await leaveSharedAccount(acc.owner_id);
                            await loadSharedData();
                            showMsg('已离开共享账户');
                          }
                        }}>
                          离开
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Members of current account (only shown to owner, not shared viewers) */}
              {!isViewingSharedData() && (
                <>
                  <h4 style={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}>此账户的共享成员</h4>
                  {sharedMembers.length === 0 && (
                    <p style={{ fontSize: '0.85rem', color: '#999' }}>暂无共享成员，生成邀请码让对方加入</p>
                  )}
                  {sharedMembers.map((member) => (
                    <div key={member.member_id} className="admin-item" style={{ marginBottom: '0.4rem' }}>
                      <div className="admin-item-info">
                        <span className="admin-item-icon">👤</span>
                        <div>
                          <strong style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{member.member_id}</strong>
                          <span className="admin-item-date">
                            加入于 {new Date(member.created_at).toLocaleDateString('zh-CN')}
                          </span>
                        </div>
                      </div>
                      <div className="admin-item-actions">
                        <button className="danger" onClick={async () => {
                          if (confirm('确定移除此共享成员？')) {
                            await removeSharedMember(member.member_id);
                            await loadSharedData();
                            showMsg('已移除共享成员');
                          }
                        }}>
                          移除
                        </button>
                      </div>
                    </div>
                  ))}
                </>
              )}
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
                      const userId = getEffectiveUserId();
                      const url = await uploadFile(userId, file.name, base64);
                      if (url) {
                        setEditingPhoto({ ...editingPhoto, src: url, thumb: url });
                        showMsg('照片已上传到云端');
                      } else {
                        setEditingPhoto({ ...editingPhoto, src: base64, thumb: base64 });
                      }
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
                      const userId = getEffectiveUserId();
                      const url = await uploadFile(userId, file.name, base64);
                      if (url) {
                        setEditingTimeline({ ...editingTimeline, image: url });
                      } else {
                        setEditingTimeline({ ...editingTimeline, image: base64 });
                      }
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
