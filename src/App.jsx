import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Hero from './components/Hero';
import Gallery from './components/Gallery';
import Timeline from './components/Timeline';
import Countdown from './components/Countdown';
import Login from './components/Login';
import Admin from './components/Admin';
import Layout from './components/Layout';
import { isLoggedIn, applyTheme } from './data/store';
import './App.css';

function ProtectedRoute({ children }) {
  if (!isLoggedIn()) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

function App() {
  useEffect(() => {
    applyTheme();
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<ProtectedRoute><Layout><Hero /></Layout></ProtectedRoute>} />
        <Route path="/gallery" element={<ProtectedRoute><Layout><Gallery /></Layout></ProtectedRoute>} />
        <Route path="/story" element={<ProtectedRoute><Layout><Timeline /></Layout></ProtectedRoute>} />
        <Route path="/countdown" element={<ProtectedRoute><Layout><Countdown /></Layout></ProtectedRoute>} />
        <Route path="/admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
