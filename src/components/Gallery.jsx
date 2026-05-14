import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { getData, saveData, getEffectiveUserId } from '../data/store';
import { isLoggedIn } from '../data/store';
import { readFileAsBase64, createThumbnail } from '../utils/helpers';
import { uploadFile, deleteFile } from '../data/supabase';
import './Gallery.css';

const INITIAL_SHOW = 6;

export default function Gallery() {
  const [selected, setSelected] = useState(null);
  const [currentAlbum, setCurrentAlbum] = useState(null);
  const [showAll, setShowAll] = useState(false);
  const [galleryPhotos, setGalleryPhotos] = useState(() => getData('galleryPhotos'));
  const [albumMeta, setAlbumMeta] = useState(() => getData('albumMeta'));
  const photosRef = useRef(galleryPhotos);
  photosRef.current = galleryPhotos;
  const loggedIn = isLoggedIn();

  // Edit states
  const [showCreateAlbum, setShowCreateAlbum] = useState(false);
  const [newAlbumName, setNewAlbumName] = useState('');
  const [newAlbumDesc, setNewAlbumDesc] = useState('');
  const [editingPhoto, setEditingPhoto] = useState(null);
  const [batchImporting, setBatchImporting] = useState(null);

  const refresh = useCallback(() => {
    setGalleryPhotos(getData('galleryPhotos'));
    setAlbumMeta(getData('albumMeta'));
  }, []);

  const albums = useMemo(() => {
    const map = {};
    for (const photo of galleryPhotos) {
      const name = photo.album || '默认相册';
      if (!map[name]) map[name] = [];
      map[name].push(photo);
    }
    for (const name of Object.keys(albumMeta)) {
      if (!map[name]) map[name] = [];
    }
    return Object.entries(map).map(([name, photos]) => {
      const meta = albumMeta[name] || {};
      return {
        name,
        description: meta.description || '',
        cover: meta.cover || photos[0]?.thumb || photos[0]?.src || '',
        count: photos.length,
        photos,
      };
    });
  }, [galleryPhotos, albumMeta]);

  const albumPhotos = currentAlbum
    ? albums.find((a) => a.name === currentAlbum)?.photos || []
    : [];

  const visiblePhotos = showAll ? albumPhotos : albumPhotos.slice(0, INITIAL_SHOW);
  const hasMore = albumPhotos.length > INITIAL_SHOW;

  const open = useCallback((photo) => setSelected(photo), []);
  const close = useCallback(() => setSelected(null), []);

  const openAlbum = (name) => {
    setCurrentAlbum(name);
    setShowAll(false);
  };

  const backToAlbums = () => {
    setCurrentAlbum(null);
    setShowAll(false);
  };

  // Handlers
  const handleCreateAlbum = () => {
    const name = newAlbumName.trim();
    if (!name) return;
    const updatedMeta = { ...albumMeta, [name]: { description: newAlbumDesc.trim(), cover: '' } };
    saveData('albumMeta', updatedMeta);
    setAlbumMeta(updatedMeta);
    setShowCreateAlbum(false);
    setNewAlbumName('');
    setNewAlbumDesc('');
    openAlbum(name);
  };

  const handleAddPhoto = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        const base64 = await readFileAsBase64(file);
        const thumb = await createThumbnail(base64);
        const userId = getEffectiveUserId();
        // Try cloud upload first
        let src = base64;
        try {
          const url = await uploadFile(userId, file.name, base64);
          if (url) src = url;
        } catch {}
        const maxId = galleryPhotos.reduce((max, p) => Math.max(max, p.id || 0), 0);
        const newPhoto = {
          id: maxId + 1,
          src,
          thumb,
          caption: file.name.replace(/\.[^.]+$/, ''),
          note: '',
          album: currentAlbum,
        };
        const updated = [...galleryPhotos, newPhoto];
        saveData('galleryPhotos', updated);
        refresh();
      } catch {
        // skip
      }
    };
    input.click();
  };

  const handleBatchImport = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const total = files.length;
    setBatchImporting({ current: 0, total });

    let maxId = galleryPhotos.reduce((max, p) => Math.max(max, p.id || 0), 0);
    let completed = 0;

    const results = await Promise.allSettled(
      Array.from(files).map(async (file) => {
        try {
          const base64 = await readFileAsBase64(file);
          const thumb = await createThumbnail(base64);
          const userId = getEffectiveUserId();
          let src = base64;
          try {
            const url = await uploadFile(userId, file.name, base64);
            if (url) src = url;
          } catch {}
          completed++;
          setBatchImporting({ current: completed, total });
          return { src, thumb, caption: file.name.replace(/\.[^.]+$/, ''), note: '', album: currentAlbum };
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

    if (newPhotos.length > 0) {
      saveData('galleryPhotos', [...galleryPhotos, ...newPhotos]);
    }
    setBatchImporting(null);
    e.target.value = '';
    refresh();
  };

  const handleDeletePhoto = (photo) => {
    if (!confirm('确定删除这张照片？')) return;
    // Try to delete from cloud storage if it's a Supabase URL
    if (photo.src && photo.src.includes('supabase.co')) {
      const userId = getEffectiveUserId();
      deleteFile(userId, photo.src);
    }
    const updated = galleryPhotos.filter((p) => p.id !== photo.id);
    saveData('galleryPhotos', updated);
    refresh();
  };

  const savePhoto = () => {
    if (!editingPhoto) return;
    const idx = galleryPhotos.findIndex((p) => p.id === editingPhoto.id);
    const updated = [...galleryPhotos];
    if (idx >= 0) {
      updated[idx] = { ...editingPhoto };
    }
    saveData('galleryPhotos', updated);
    setEditingPhoto(null);
    refresh();
  };

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') {
        if (editingPhoto) { setEditingPhoto(null); return; }
        if (showCreateAlbum) { setShowCreateAlbum(false); return; }
        if (selected) { close(); return; }
        if (currentAlbum) { backToAlbums(); return; }
      }
      if (!selected) return;
      const list = photosRef.current;
      const idx = list.findIndex((p) => p.id === selected.id);
      if (e.key === 'ArrowRight' && idx < list.length - 1) {
        setSelected(list[idx + 1]);
      }
      if (e.key === 'ArrowLeft' && idx > 0) {
        setSelected(list[idx - 1]);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [selected, close, currentAlbum, editingPhoto, showCreateAlbum]);

  useEffect(() => {
    document.body.style.overflow = selected || editingPhoto || showCreateAlbum ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [selected, editingPhoto, showCreateAlbum]);

  return (
    <section className="gallery-section">
      {currentAlbum ? (
        <>
          <div className="gallery-detail-header">
            <button className="gallery-back-btn" onClick={backToAlbums}>← 返回相册列表</button>
            <h2 className="section-title">{currentAlbum}</h2>
            <p className="gallery-album-desc">
              {albumMeta[currentAlbum]?.description || ''}
            </p>
            {loggedIn && (
              <div className="gallery-edit-actions">
                <button className="gallery-action-btn" onClick={handleAddPhoto}>+ 添加照片</button>
                <label className="gallery-action-btn">
                  批量导入
                  <input type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={handleBatchImport} />
                </label>
              </div>
            )}
          </div>

          {batchImporting && (
            <div className="gallery-batch-progress">
              <div className="gallery-batch-progress-bar">
                <div className="gallery-batch-progress-fill" style={{ width: `${(batchImporting.current / batchImporting.total) * 100}%` }} />
              </div>
              <span className="gallery-batch-progress-text">正在导入... {batchImporting.current}/{batchImporting.total}</span>
            </div>
          )}

          <div className="gallery-grid">
            {visiblePhotos.map((photo) => (
              <div key={photo.id} className="gallery-item" onClick={() => open(photo)}>
                <img src={photo.thumb || photo.src} alt={photo.caption} loading="lazy" />
                <div className="gallery-item-overlay">
                  <span className="gallery-item-caption">{photo.caption}</span>
                </div>
                {loggedIn && (
                  <div className="gallery-item-admin">
                    <button className="gallery-item-edit" onClick={(e) => { e.stopPropagation(); setEditingPhoto(photo); }} title="编辑">✎</button>
                    <button className="gallery-item-delete" onClick={(e) => { e.stopPropagation(); handleDeletePhoto(photo); }} title="删除">×</button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {hasMore && (
            <div className="gallery-toggle-wrap">
              <button className="gallery-toggle-btn" onClick={() => setShowAll(!showAll)}>
                {showAll ? '收起照片 ↑' : `查看更多照片 (+${albumPhotos.length - INITIAL_SHOW})`}
              </button>
            </div>
          )}

          {albumPhotos.length === 0 && (
            <p className="gallery-empty">这个相册还没有照片</p>
          )}
        </>
      ) : (
        <>
          <h2 className="section-title">我们的照片</h2>
          <p className="section-desc">每一张照片，都是最美的回忆</p>

          <div className="album-grid">
            {albums.map((album) => (
              <div
                key={album.name}
                className="album-card"
                onClick={() => openAlbum(album.name)}
              >
                <div className="album-cover">
                  {album.cover ? (
                    <img src={album.cover} alt={album.name} />
                  ) : (
                    <div className="album-cover-placeholder">📷</div>
                  )}
                  <div className="album-cover-overlay">
                    <span className="album-enter">查看相册</span>
                  </div>
                </div>
                <div className="album-info">
                  <h3 className="album-name">{album.name}</h3>
                  <span className="album-count">{album.count} 张照片</span>
                  {album.description && (
                    <p className="album-desc">{album.description}</p>
                  )}
                </div>
              </div>
            ))}
            {loggedIn && (
              <div className="album-card album-card-add" onClick={() => setShowCreateAlbum(true)}>
                <div className="album-cover album-cover-add">
                  <span className="album-cover-add-icon">+</span>
                </div>
                <div className="album-info">
                  <h3 className="album-name">创建新相册</h3>
                  <span className="album-count">添加更多回忆</span>
                </div>
              </div>
            )}
            {albums.length === 0 && !loggedIn && (
              <p className="gallery-empty">还没有相册，去管理页面创建一个吧</p>
            )}
          </div>
        </>
      )}

      {/* Lightbox */}
      {selected && (
        <div className="lightbox" onClick={close}>
          <button className="lightbox-close" onClick={close}>✕</button>
          <button
            className="lightbox-nav lightbox-prev"
            onClick={(e) => {
              e.stopPropagation();
              const idx = galleryPhotos.findIndex((p) => p.id === selected.id);
              if (idx > 0) setSelected(galleryPhotos[idx - 1]);
            }}
          >‹</button>
          <img src={selected.src} alt={selected.caption} className="lightbox-image" onClick={(e) => e.stopPropagation()} />
          <button
            className="lightbox-nav lightbox-next"
            onClick={(e) => {
              e.stopPropagation();
              const idx = galleryPhotos.findIndex((p) => p.id === selected.id);
              if (idx < galleryPhotos.length - 1) setSelected(galleryPhotos[idx + 1]);
            }}
          >›</button>
          <div className="lightbox-info">
            <p className="lightbox-caption">{selected.caption}</p>
            {selected.note && <p className="lightbox-note">{selected.note}</p>}
          </div>
        </div>
      )}

      {/* Create album modal */}
      {showCreateAlbum && (
        <div className="admin-modal-overlay" onClick={() => setShowCreateAlbum(false)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <h3>创建新相册</h3>
            <label>相册名称</label>
            <input value={newAlbumName} onChange={(e) => setNewAlbumName(e.target.value)} placeholder="输入相册名称" autoFocus />
            <label>相册描述（可选）</label>
            <input value={newAlbumDesc} onChange={(e) => setNewAlbumDesc(e.target.value)} placeholder="简短描述这个相册" />
            <div className="admin-modal-actions">
              <button className="admin-btn admin-btn-primary" onClick={handleCreateAlbum}>创建</button>
              <button className="admin-btn" onClick={() => setShowCreateAlbum(false)}>取消</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit photo modal */}
      {editingPhoto && (
        <div className="admin-modal-overlay" onClick={() => setEditingPhoto(null)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <h3>编辑照片</h3>
            <label>描述文字</label>
            <input value={editingPhoto.caption || ''} onChange={(e) => setEditingPhoto({ ...editingPhoto, caption: e.target.value })} />
            <label>备注（可选）</label>
            <textarea rows="3" value={editingPhoto.note || ''} onChange={(e) => setEditingPhoto({ ...editingPhoto, note: e.target.value })} placeholder="写下关于这张照片的故事..." />
            <label>所属相册</label>
            <select
              value={editingPhoto.album || '默认相册'}
              onChange={(e) => setEditingPhoto({ ...editingPhoto, album: e.target.value })}
              style={{ width: '100%', padding: '0.6rem 0.8rem', border: '1px solid #e0e0e0', borderRadius: '8px', fontSize: '0.95rem', outline: 'none' }}
            >
              {albums.map((a) => (
                <option key={a.name} value={a.name}>{a.name}</option>
              ))}
            </select>
            {editingPhoto.src && (
              <div className="admin-photo-preview">
                <img src={editingPhoto.src} alt="预览" />
              </div>
            )}
            <div className="admin-modal-actions">
              <button className="admin-btn admin-btn-primary" onClick={savePhoto}>保存</button>
              <button className="admin-btn" onClick={() => setEditingPhoto(null)}>取消</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
