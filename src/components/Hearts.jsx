import { useEffect, useState } from 'react';
import './Hearts.css';

export default function Hearts() {
  const [hearts, setHearts] = useState([]);

  useEffect(() => {
    const interval = setInterval(() => {
      const id = Date.now();
      const left = Math.random() * 100;
      const size = 10 + Math.random() * 20;
      const duration = 8 + Math.random() * 10;
      const opacity = 0.3 + Math.random() * 0.4;

      setHearts((prev) => {
        const next = [...prev, { id, left, size, duration, opacity }];
        if (next.length > 15) return next.slice(-15);
        return next;
      });
    }, 800);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="hearts-container">
      {hearts.map((h) => (
        <div
          key={h.id}
          className="floating-heart"
          style={{
            left: `${h.left}%`,
            fontSize: `${h.size}px`,
            animationDuration: `${h.duration}s`,
            opacity: h.opacity,
          }}
        >
          ❤
        </div>
      ))}
    </div>
  );
}
