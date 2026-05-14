import { useState, useEffect, useCallback } from 'react';
import { getData, saveData } from '../data/store';
import { isLoggedIn } from '../data/store';
import './Countdown.css';

const ICON_OPTIONS = ['💕', '🎂', '🌹', '💌', '🎄', '🎁', '✨', '💝', '💑', '🎬', '✈️', '🍳', '🎵', '🌟', '💍', '🏠', '🐱', '🎮', '📸', '🌈'];

function getNextDate(dateStr) {
  const now = new Date();
  const [month, day] = dateStr.split('-').map(Number);
  let next = new Date(now.getFullYear(), month - 1, day);

  if (next <= now) {
    next = new Date(now.getFullYear() + 1, month - 1, day);
  }

  return next;
}

function calcDaysRemaining(target) {
  const now = new Date();
  const diff = target - now;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export default function Countdown() {
  const [anniversaries, setAnniversaries] = useState(() => getData('anniversaries'));
  const [countdowns, setCountdowns] = useState([]);
  const [editingAnniversary, setEditingAnniversary] = useState(null);
  const loggedIn = isLoggedIn();

  const refresh = useCallback(() => {
    setAnniversaries(getData('anniversaries'));
  }, []);

  useEffect(() => {
    const update = () => {
      const items = anniversaries.map((a) => {
        const nextDate = getNextDate(a.date);
        const days = calcDaysRemaining(nextDate);
        return {
          ...a,
          nextDate,
          days,
        };
      });
      items.sort((a, b) => a.days - b.days);
      setCountdowns(items);
    };

    update();
    const timer = setInterval(update, 60000);
    return () => clearInterval(timer);
  }, [anniversaries]);

  const formatDate = (date) => {
    return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
  };

  const handleAdd = () => {
    setEditingAnniversary({ name: '', date: '', type: 'anniversary', icon: '💕' });
  };

  const handleSave = () => {
    if (!editingAnniversary) return;
    let list;
    if (editingAnniversary.index !== undefined) {
      list = [...anniversaries];
      list[editingAnniversary.index] = { ...editingAnniversary };
    } else {
      list = [...anniversaries, { ...editingAnniversary }];
    }
    saveData('anniversaries', list);
    setEditingAnniversary(null);
    refresh();
  };

  const handleDelete = (index) => {
    if (!confirm('确定删除这个纪念日？')) return;
    const list = anniversaries.filter((_, i) => i !== index);
    saveData('anniversaries', list);
    refresh();
  };

  return (
    <section className="countdown-section">
      <h2 className="section-title">纪念日倒计时</h2>
      <p className="section-desc">期待每一个特别的日子</p>

      <div className="countdown-grid">
        {countdowns.map((item, index) => (
          <div
            key={index}
            className={`countdown-card ${index === 0 ? 'countdown-next' : ''}`}
          >
            {index === 0 && <span className="countdown-badge">即将到来</span>}
            {loggedIn && (
              <div className="countdown-card-admin">
                <button className="countdown-edit-btn" onClick={() => {
                  const realIndex = anniversaries.findIndex(
                    (a) => a.name === item.name && a.date === item.date
                  );
                  setEditingAnniversary({ ...item, index: realIndex });
                }} title="编辑">✎</button>
                <button className="countdown-delete-btn" onClick={() => {
                  const realIndex = anniversaries.findIndex(
                    (a) => a.name === item.name && a.date === item.date
                  );
                  handleDelete(realIndex);
                }} title="删除">×</button>
              </div>
            )}
            <span className="countdown-icon">{item.icon}</span>
            <h3 className="countdown-name">{item.name}</h3>
            <div className="countdown-days">
              <span className="countdown-number">{item.days}</span>
              <span className="countdown-unit">天</span>
            </div>
            <p className="countdown-date">{formatDate(item.nextDate)}</p>
          </div>
        ))}
        {loggedIn && (
          <div className="countdown-card countdown-card-add" onClick={handleAdd}>
            <span className="countdown-add-icon">+</span>
            <h3 className="countdown-name">添加纪念日</h3>
            <div className="countdown-days">
              <span className="countdown-number">...</span>
              <span className="countdown-unit">天</span>
            </div>
            <p className="countdown-date">记录更多特别的日子</p>
          </div>
        )}
      </div>

      {/* Edit anniversary modal */}
      {editingAnniversary && (
        <div className="admin-modal-overlay" onClick={() => setEditingAnniversary(null)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <h3>{editingAnniversary.index !== undefined ? '编辑纪念日' : '添加纪念日'}</h3>
            <label>名称</label>
            <input value={editingAnniversary.name} onChange={(e) => setEditingAnniversary({ ...editingAnniversary, name: e.target.value })} autoFocus />
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
              <button className="admin-btn admin-btn-primary" onClick={handleSave}>保存</button>
              <button className="admin-btn" onClick={() => setEditingAnniversary(null)}>取消</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
