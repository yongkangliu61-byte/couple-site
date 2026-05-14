import { useState, useEffect } from 'react';
import { getData } from '../data/store';
import './Hero.css';

function calcDuration(from) {
  const now = new Date();
  const start = new Date(from);
  let years = now.getFullYear() - start.getFullYear();
  let months = now.getMonth() - start.getMonth();
  let days = now.getDate() - start.getDate();
  let hours = now.getHours() - start.getHours();
  let minutes = now.getMinutes() - start.getMinutes();
  let seconds = now.getSeconds() - start.getSeconds();

  if (seconds < 0) {
    seconds += 60;
    minutes--;
  }
  if (minutes < 0) {
    minutes += 60;
    hours--;
  }
  if (hours < 0) {
    hours += 24;
    days--;
  }
  if (days < 0) {
    const prevMonth = new Date(now.getFullYear(), now.getMonth(), 0);
    days += prevMonth.getDate();
    months--;
  }
  if (months < 0) {
    months += 12;
    years--;
  }

  const totalDays = Math.floor((now - start) / (1000 * 60 * 60 * 24));

  return { years, months, days, hours, minutes, seconds, totalDays };
}

export default function Hero() {
  const startDate = getData('startDate');
  const coupleNames = getData('coupleNames');
  const [duration, setDuration] = useState(() => calcDuration(startDate));

  useEffect(() => {
    const timer = setInterval(() => {
      setDuration(calcDuration(startDate));
    }, 1000);
    return () => clearInterval(timer);
  }, [startDate]);

  return (
    <section className="hero">
      <div className="hero-overlay" />
      <div className="hero-content">
        <div className="hero-hearts-deco">
          <span className="deco-heart deco-left">❤</span>
          <span className="deco-heart deco-right">❤</span>
        </div>
        <h1 className="hero-title">
          <span className="name-boy">{coupleNames.boy}</span>
          <span className="hero-and">&</span>
          <span className="name-girl">{coupleNames.girl}</span>
        </h1>
        <p className="hero-subtitle">永远在一起</p>
        <div className="timer-card">
          <div className="timer-label">我们已经在一起</div>
          <div className="timer-total-days">
            <span className="total-days-number">{duration.totalDays}</span>
            <span className="total-days-unit">天</span>
          </div>
          <div className="timer-detail">
            <div className="timer-item">
              <span className="timer-value">{String(duration.years).padStart(2, '0')}</span>
              <span className="timer-unit">年</span>
            </div>
            <span className="timer-sep">:</span>
            <div className="timer-item">
              <span className="timer-value">{String(duration.months).padStart(2, '0')}</span>
              <span className="timer-unit">月</span>
            </div>
            <span className="timer-sep">:</span>
            <div className="timer-item">
              <span className="timer-value">{String(duration.days).padStart(2, '0')}</span>
              <span className="timer-unit">天</span>
            </div>
            <span className="timer-sep">:</span>
            <div className="timer-item">
              <span className="timer-value">{String(duration.hours).padStart(2, '0')}</span>
              <span className="timer-unit">时</span>
            </div>
            <span className="timer-sep">:</span>
            <div className="timer-item">
              <span className="timer-value">{String(duration.minutes).padStart(2, '0')}</span>
              <span className="timer-unit">分</span>
            </div>
            <span className="timer-sep">:</span>
            <div className="timer-item">
              <span className="timer-value">{String(duration.seconds).padStart(2, '0')}</span>
              <span className="timer-unit">秒</span>
            </div>
          </div>
        </div>
        <div className="scroll-hint">
          <span>往下滑动，看我们的故事</span>
          <div className="scroll-arrow">↓</div>
        </div>
      </div>
    </section>
  );
}
