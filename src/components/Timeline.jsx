import { useState, useCallback } from 'react';
import { getData, saveData } from '../data/store';
import { isLoggedIn } from '../data/store';
import { readFileAsBase64 } from '../utils/helpers';
import './Timeline.css';

const ICON_OPTIONS = ['✨', '🎬', '💝', '💑', '🌹', '✈️', '🍳', '🎵', '🌟', '💍', '🏠', '🐱', '🎮', '📸', '🌈', '🎄', '🎁', '💕', '🎂', '💌'];

export default function Timeline() {
  const [events, setEvents] = useState(() => getData('timelineEvents'));
  const [lightboxImage, setLightboxImage] = useState(null);
  const [editingEvent, setEditingEvent] = useState(null);
  const loggedIn = isLoggedIn();

  const refresh = useCallback(() => {
    setEvents(getData('timelineEvents'));
  }, []);

  const handleAdd = () => {
    setEditingEvent({ date: '', title: '', description: '', icon: '✨', image: '', video: '' });
  };

  const handleSave = () => {
    if (!editingEvent) return;
    let list;
    if (editingEvent.index !== undefined) {
      list = [...events];
      list[editingEvent.index] = { ...editingEvent };
    } else {
      list = [...events, { ...editingEvent }];
    }
    saveData('timelineEvents', list);
    setEditingEvent(null);
    refresh();
  };

  const handleDelete = (index) => {
    if (!confirm('确定删除这个事件？')) return;
    const list = events.filter((_, i) => i !== index);
    saveData('timelineEvents', list);
    refresh();
  };

  return (
    <section className="timeline-section">
      <h2 className="section-title">我们的故事</h2>
      <p className="section-desc">从相遇到相爱，每一个瞬间都值得珍藏</p>

      <div className="timeline">
        <div className="timeline-line" />
        {events.map((event, index) => (
          <div
            key={index}
            className={`timeline-event ${index % 2 === 0 ? 'left' : 'right'}`}
          >
            <div className="timeline-dot">
              <span className="timeline-icon">{event.icon}</span>
            </div>
            <div className="timeline-card">
              <span className="timeline-date">{event.date}</span>
              <h3 className="timeline-title">{event.title}</h3>
              <p className="timeline-desc">{event.description}</p>
              {event.image && (
                <div className="timeline-media">
                  <img
                    src={event.image}
                    alt={event.title}
                    className="timeline-image"
                    onClick={() => setLightboxImage(event.image)}
                    loading="lazy"
                  />
                </div>
              )}
              {event.video && (
                <div className="timeline-media">
                  <video
                    src={event.video}
                    controls
                    preload="metadata"
                    className="timeline-video"
                  >
                    您的浏览器不支持视频播放
                  </video>
                </div>
              )}
              {loggedIn && (
                <div className="timeline-card-actions">
                  <button className="timeline-edit-btn" onClick={() => setEditingEvent({ ...event, index })}>✎ 编辑</button>
                  <button className="timeline-delete-btn" onClick={() => handleDelete(index)}>× 删除</button>
                </div>
              )}
            </div>
          </div>
        ))}
        <div className="timeline-end">
          <span className="timeline-end-icon">💗</span>
          <p>故事未完待续...</p>
          {loggedIn && (
            <button className="timeline-add-btn" onClick={handleAdd}>+ 添加故事</button>
          )}
        </div>
      </div>

      {lightboxImage && (
        <div className="timeline-lightbox" onClick={() => setLightboxImage(null)}>
          <button className="timeline-lightbox-close" onClick={() => setLightboxImage(null)}>✕</button>
          <img src={lightboxImage} alt="" onClick={(e) => e.stopPropagation()} />
        </div>
      )}

      {/* Edit event modal */}
      {editingEvent && (
        <div className="admin-modal-overlay" onClick={() => setEditingEvent(null)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <h3>{editingEvent.index !== undefined ? '编辑故事' : '添加故事'}</h3>
            <label>日期</label>
            <input type="date" value={editingEvent.date} onChange={(e) => setEditingEvent({ ...editingEvent, date: e.target.value })} />
            <label>标题</label>
            <input value={editingEvent.title} onChange={(e) => setEditingEvent({ ...editingEvent, title: e.target.value })} />
            <label>描述</label>
            <textarea rows="3" value={editingEvent.description} onChange={(e) => setEditingEvent({ ...editingEvent, description: e.target.value })} />
            <label>图片URL（可选）</label>
            <input value={editingEvent.image || ''} onChange={(e) => setEditingEvent({ ...editingEvent, image: e.target.value })} placeholder="https://example.com/photo.jpg" />
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
                      setEditingEvent({ ...editingEvent, image: base64 });
                    } catch {}
                  }}
                />
              </label>
            </div>
            {editingEvent.image && (
              <div className="admin-photo-preview">
                <img src={editingEvent.image} alt="预览" onError={(e) => { e.target.style.display = 'none'; }} />
              </div>
            )}
            <label>视频URL（可选，建议30秒内）</label>
            <input value={editingEvent.video || ''} onChange={(e) => setEditingEvent({ ...editingEvent, video: e.target.value })} placeholder="https://example.com/video.mp4" />
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
                      setEditingEvent({ ...editingEvent, video: base64 });
                    } catch {}
                  }}
                />
              </label>
            </div>
            <span className="admin-field-hint">本地视频会转为Base64存储，建议短视频（&lt;30MB）</span>
            {editingEvent.video && editingEvent.video.startsWith('data:') && (
              <div className="admin-photo-preview">
                <video src={editingEvent.video} controls style={{ width: '100%', maxHeight: '200px', borderRadius: '8px' }} />
              </div>
            )}
            <label>图标</label>
            <div className="admin-icon-picker">
              {ICON_OPTIONS.map((icon) => (
                <button
                  key={icon}
                  className={`admin-icon-btn ${editingEvent.icon === icon ? 'selected' : ''}`}
                  onClick={() => setEditingEvent({ ...editingEvent, icon })}
                >
                  {icon}
                </button>
              ))}
            </div>
            <div className="admin-modal-actions">
              <button className="admin-btn admin-btn-primary" onClick={handleSave}>保存</button>
              <button className="admin-btn" onClick={() => setEditingEvent(null)}>取消</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
