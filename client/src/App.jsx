import React, { useState } from 'react';
import { HashRouter as Router, Routes, Route, Link, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import ThreeBackground from './components/ThreeBackground';
import { useTheme } from './context/ThemeContext';
import { useAuth } from './context/AuthContext';
import { Sun, Moon, LayoutDashboard, FileUp, ClipboardCheck, History as HistoryIcon, LogOut, User as UserIcon, CheckSquare } from 'lucide-react';
import './App.css';
import Landing from './pages/Landing';
import Dashboard from './pages/Dashboard';
import Materials from './pages/Materials';
import Generate from './pages/Generate';
import History from './pages/History';
import Checker from './pages/Checker';

const Navbar = () => {
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const [isNavOpen, setIsNavOpen] = useState(false);

  const closeNav = () => setIsNavOpen(false);

  return (
    <nav className="navbar navbar-expand-lg glass-navbar px-4 py-3 sticky-top z-50">
      <div className="container-fluid">
        {/* Logo */}
        <Link className="navbar-brand cosmic-title fs-4 gradient-text text-decoration-none" to="/" onClick={closeNav}>
          EvalyzeAI
        </Link>

        {/* Toggle */}
        <button
          className="navbar-toggler border-0 neon-border d-lg-none p-2 rounded text-white"
          type="button"
          onClick={() => setIsNavOpen(!isNavOpen)}
        >
          <span className="navbar-toggler-icon" style={{filter: 'invert(1)'}}></span>
        </button>

        {/* Menu */}
        <div className={`collapse navbar-collapse ${isNavOpen ? 'show' : ''} mt-3 mt-lg-0`} id="navbarNav">
          <ul className="navbar-nav ms-auto align-items-center gap-3">
            {user ? (
              <>
                {[
                  { to: "/dashboard", label: "Dashboard", icon: <LayoutDashboard size={18} /> },
                  { to: "/upload", label: "Materials", icon: <FileUp size={18} /> },
                  { to: "/generate", label: "Generate", icon: <ClipboardCheck size={18} /> },
                  { to: "/check", label: "Checker", icon: <CheckSquare size={18} /> },
                  { to: "/history", label: "History", icon: <HistoryIcon size={18} /> },
                ].map((item, index) => (
                  <li key={index} className="nav-item">
                    <Link className="nav-link nav-hover d-flex align-items-center text-decoration-none" to={item.to} onClick={closeNav}>
                      {item.icon}
                      <span className="ms-2">{item.label}</span>
                    </Link>
                  </li>
                ))}

                {/* Profile */}
                <li className="nav-item ms-lg-3 mt-3 mt-lg-0">
                  <div className="glass-card d-flex align-items-center px-3 py-2 rounded-pill" style={{backdropFilter: 'blur(5px)'}}>
                    <img
                      src={
                        user.profilePicture ||
                        `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=8a2be2&color=fff`
                      }
                      alt={user.name}
                      style={{ width: '30px', height: '30px', borderRadius: '50%', border: '2px solid var(--secondary)' }}
                      onError={(e) => {
                        e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=8a2be2&color=fff`;
                      }}
                    />
                    <span className="text-white small fw-bold ms-2 me-3">
                      {user?.name ? user.name.split(" ")[0] : "User"}
                    </span>
                    <button
                      onClick={logout}
                      className="btn p-0 text-danger"
                      title="Logout"
                      style={{ transition: 'transform 0.3s' }}
                      onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.2)'}
                      onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                    >
                      <LogOut size={18} />
                    </button>
                  </div>
                </li>
              </>
            ) : (
              <li className="nav-item mt-3 mt-lg-0">
                <span className="nav-link text-white opacity-50">
                   Join the galaxy
                </span>
              </li>
            )}
          </ul>
        </div>
      </div>
    </nav>
  );
};

const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  return user ? children : <Navigate to="/" />;
};

// Animated route transitions
const pageVariants = {
  initial: { opacity: 0, y: 20 },
  in: { opacity: 1, y: 0 },
  out: { opacity: 0, y: -20 }
};

const pageTransition = {
  type: "tween",
  ease: "anticipate",
  duration: 0.5
};

const AnimatedRoutes = () => {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<motion.div initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition}><Landing /></motion.div>} />
        <Route path="/dashboard" element={<PrivateRoute><motion.div initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition}><Dashboard /></motion.div></PrivateRoute>} />
        <Route path="/upload" element={<PrivateRoute><motion.div initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition}><Materials /></motion.div></PrivateRoute>} />
        <Route path="/generate" element={<PrivateRoute><motion.div initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition}><Generate /></motion.div></PrivateRoute>} />
        <Route path="/history" element={<PrivateRoute><motion.div initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition}><History /></motion.div></PrivateRoute>} />
        <Route path="/check" element={<PrivateRoute><motion.div initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition}><Checker /></motion.div></PrivateRoute>} />
      </Routes>
    </AnimatePresence>
  );
};

const App = () => {
  return (
    <Router>
      <ThreeBackground />
      <Navbar />
      <AnimatedRoutes />
    </Router>
  );
};

export default App;
