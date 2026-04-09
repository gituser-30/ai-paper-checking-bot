import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
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

// const Navbar = () => {
//   const { theme, toggleTheme } = useTheme();
//   const { user, logout } = useAuth();

//   return (
//     <nav className="navbar navbar-expand-lg glass-card m-3 px-4 py-2 sticky-top">
//       <div className="container-fluid">
//         <Link className="navbar-brand fw-bold gradient-text fs-3" to="/">AI Examiner</Link>
//         <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
//           <span className="navbar-toggler-icon text-white"></span>
//         </button>
//         <div className="collapse navbar-collapse" id="navbarNav">
//           <ul className="navbar-nav ms-auto align-items-center">
//             {user ? (
//               <>
//                 <li className="nav-item">
//                   <Link className="nav-link mx-2 text-white" to="/dashboard"><LayoutDashboard size={18} className="me-1" /> Dashboard</Link>
//                 </li>
//                 <li className="nav-item">
//                   <Link className="nav-link mx-2 text-white" to="/upload"><FileUp size={18} className="me-1" /> Materials</Link>
//                 </li>
//                 <li className="nav-item">
//                   <Link className="nav-link mx-2 text-white" to="/generate"><ClipboardCheck size={18} className="me-1" /> Generate</Link>
//                 </li>
//                 <li className="nav-item">
//                   <Link className="nav-link mx-2 text-white" to="/check"><CheckSquare size={18} className="me-1" /> Checker</Link>
//                 </li>
//                 <li className="nav-item">
//                   <Link className="nav-link mx-2 text-white" to="/history"><HistoryIcon size={18} className="me-1" /> History</Link>
//                 </li>
//                 <li className="nav-item ms-3">
//                   <div className="d-flex align-items-center bg-glass p-2 rounded-pill">
//                     <img 
//                       src={user.profilePicture || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=6366f1&color=fff`} 
//                       alt={user.name} 
//                       className="rounded-circle me-2 shadow-sm" 
//                       style={{ width: '30px', height: '30px', objectFit: 'cover' }}
//                       onError={(e) => { e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=6366f1&color=fff` }}
//                     />
//                     <button onClick={logout} className="btn btn-link text-danger p-0 border-0 ms-1" title="Logout"><LogOut size={18} /></button>
//                   </div>
//                 </li>
//               </>
//             ) : (
//               <li className="nav-item">
//                 <span className="nav-link text-secondary">Login to get started</span>
//               </li>
//             )}
//             <li className="nav-item ms-3">
//               <button onClick={toggleTheme} className="btn btn-link text-white border-0 p-2">
//                 {theme === 'dark' ? <Sun size={24} /> : <Moon size={24} />}
//               </button>
//             </li>
//           </ul>
//         </div>
//       </div>
//     </nav>
//   );
// };

const Navbar = () => {
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();

  return (
    <nav className="navbar navbar-expand-lg glass-navbar px-4 py-2 sticky-top">
      <div className="container-fluid">

        {/* Logo */}
        <Link className="navbar-brand fw-bold fs-3 gradient-text" to="/">
          AI Examiner
        </Link>

        {/* Toggle */}
        <button
          className="navbar-toggler border-0"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#navbarNav"
        >
          <span className="navbar-toggler-icon"></span>
        </button>

        {/* Menu */}
        <div className="collapse navbar-collapse" id="navbarNav">
          <ul className="navbar-nav ms-auto align-items-center gap-2">

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
                    <Link className="nav-link nav-hover" to={item.to}>
                      {item.icon}
                      <span className="ms-2">{item.label}</span>
                    </Link>
                  </li>
                ))}

                {/* Profile */}
                <li className="nav-item ms-3">
                  <div className="profile-pill d-flex align-items-center">

                    <img
                      src={
                        user.profilePicture ||
                        `https://ui-avatars.com/api/?name=${encodeURIComponent(
                          user.name
                        )}&background=6366f1&color=fff`
                      }
                      alt={user.name}
                      className="profile-img"
                      onError={(e) => {
                        e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                          user.name
                        )}&background=6366f1&color=fff`;
                      }}
                    />

                    {/* <span className="text-white small fw-semibold ms-2">
                      {user.name.split(" ")[0]}
                    </span> */}

                    <span className="text-white small fw-semibold ms-2">
                      {user?.name ? user.name.split(" ")[0] : "User"}
                    </span>

                    <button
                      onClick={logout}
                      className="logout-btn ms-2"
                      title="Logout"
                    >
                      <LogOut size={18} />
                    </button>
                  </div>
                </li>
              </>
            ) : (
              <li className="nav-item">
                <span className="nav-link text-secondary">
                  Login to get started
                </span>
              </li>
            )}

            {/* Theme Toggle */}
            <li className="nav-item ms-3">
              <button onClick={toggleTheme} className="theme-btn">
                {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
              </button>
            </li>

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

const App = () => {
  return (
    <Router>
      <ThreeBackground />
      <Navbar />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
        <Route path="/upload" element={<PrivateRoute><Materials /></PrivateRoute>} />
        <Route path="/generate" element={<PrivateRoute><Generate /></PrivateRoute>} />
        <Route path="/history" element={<PrivateRoute><History /></PrivateRoute>} />
        <Route path="/check" element={<PrivateRoute><Checker /></PrivateRoute>} />
      </Routes>
    </Router>
  );
};

export default App;
