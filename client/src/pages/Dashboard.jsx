import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import {
  FileText, CheckCircle, Clock, Plus, ChevronRight,
  Zap, History as HistoryIcon, ClipboardCheck,
  TrendingUp, BookOpen, ArrowRight, Sparkles, Upload
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ papers: 0, materials: 0, submissions: 0 });
  const [recentPapers, setRecentPapers] = useState([]);
  const [recentSubmissions, setRecentSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [pRes, mRes, sRes] = await Promise.all([
          api.get(`/papers/user/${user._id}`),
          api.get(`/materials/user/${user._id}`),
          api.get(`/submissions/user/${user._id}`)
        ]);
        setStats({
          papers: pRes.data.length,
          materials: mRes.data.length,
          submissions: sRes.data.length
        });
        setRecentPapers(pRes.data.slice(0, 3));
        setRecentSubmissions(sRes.data.slice(0, 3));
      } catch (err) {
        console.error('Dashboard Fetch Error');
      } finally {
        setLoading(false);
      }
    };
    if (user) fetchDashboardData();
  }, [user]);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { duration: 0.5, ease: "easeOut" } }
  };

  const cards = [
    { title: 'Total Papers', value: stats.papers, icon: FileText, color: 'text-primary' },
    { title: 'Study Materials', value: stats.materials, icon: BookOpen, color: 'text-accent' },
    { title: 'AI Evaluated', value: stats.submissions, icon: CheckCircle, color: 'text-secondary' },
  ];

  const quickActions = [
    { title: 'Generate New', desc: 'Create AI paper', icon: Sparkles, path: '/generate', color: 'primary' },
    { title: 'Upload Notes', desc: 'PDF or Images', icon: Upload, path: '/upload', color: 'accent' },
    { title: 'Check History', desc: 'Review grades', icon: HistoryIcon, path: '/history', color: 'secondary' },
  ];

  return (
    <motion.div
      className="container mt-4 pb-5"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Welcome Header */}
      <motion.div className="row mb-5 align-items-center" variants={itemVariants}>
        <div className="col-md-8">
          <div className="d-flex align-items-center gap-2 mb-2">
            <span className="badge bg-primary bg-opacity-10 text-primary border border-primary border-opacity-20 px-3 py-1 rounded-pill small fw-bold">
              EvalyzeAI Workspace v2.0
            </span>
          </div>
          <h1 className="fw-extrabold mb-1 display-5">
            Welcome back, <span className="gradient-text">{user?.name?.split(' ')[0]}</span>
          </h1>
          <p className="text-secondary mb-0 fs-5 opacity-75 fw-medium">
            Ready to scale your teaching with AI today?
          </p>
        </div>
        <div className="col-md-4 text-md-end mt-4 mt-md-0">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/generate')}
            className="btn btn-primary-gradient px-4 py-3 rounded-4 fw-bold d-inline-flex align-items-center gap-2"
          >
            <Plus size={20} /> Create New Exam
          </motion.button>
        </div>
      </motion.div>

      {/* Stats Cards */}
      <div className="row g-4 mb-5">
        {cards.map((card, i) => (
          <motion.div key={i} className="col-md-4" variants={itemVariants}>
            <div className="glass-card p-4 d-flex align-items-center">
              <div className={`p-3 bg-glass rounded-4 me-4 ${card.color} border border-glass shadow-sm`}>
                <card.icon size={28} />
              </div>
              <div>
                <p className="text-secondary small fw-bold text-uppercase tracking-widest mb-1">{card.title}</p>
                <h2 className="fw-extrabold mb-0 display-6">
                  {loading ? '...' : card.value}
                </h2>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="row g-5">
        {/* Recents & Catalog */}
        <div className="col-lg-8">
          <motion.h6 className="text-uppercase tracking-widest text-secondary small fw-bold mb-4" variants={itemVariants}>
            Quick Actions
          </motion.h6>
          <div className="row g-3 mb-5">
            {quickActions.map((action, i) => (
              <motion.div key={i} className="col-md-4" variants={itemVariants}>
                <div
                  onClick={() => navigate(action.path)}
                  className="glass-card p-4 cursor-pointer hover-bg-glass-heavy shimmer group transition-all h-100"
                >
                  <div className={`p-3 bg-${action.color} bg-opacity-10 text-${action.color} rounded-3 mb-3 d-inline-block`}>
                    <action.icon size={22} />
                  </div>
                  <h6 className="fw-bold mb-1 d-flex align-items-center justify-content-between">
                    {action.title} <ArrowRight size={16} className="opacity-0 group-hover-opacity-50 transition-all" />
                  </h6>
                  <p className="text-secondary small mb-0">{action.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>

          <motion.div className="glass-card p-4" variants={itemVariants}>
            <div className="d-flex justify-content-between align-items-center mb-4">
              <h5 className="fw-bold mb-0 d-flex align-items-center gap-2">
                <HistoryIcon size={20} className="text-primary" /> Recent Exams
              </h5>
              <Link to="/history" className="text-primary small text-decoration-none fw-bold">All History →</Link>
            </div>

            {loading ? (
              <div className="py-5 text-center opacity-30"><Sparkles className="animate-spin" /></div>
            ) : recentPapers.length === 0 ? (
              <div className="text-center py-5 opacity-40">
                <FileText size={40} className="mb-3" />
                <p className="fw-medium">No papers generated yet.</p>
              </div>
            ) : (
              <div className="d-flex flex-column gap-3">
                {recentPapers.map((paper) => (
                  <div
                    key={paper._id}
                    onClick={() => navigate(`/generate?id=${paper._id}`)}
                    className="p-3 bg-glass border border-glass rounded-4 d-flex align-items-center justify-content-between cursor-pointer hover-bg-glass-heavy transition-all"
                  >
                    <div className="d-flex align-items-center min-w-0">
                      <div className="p-2 bg-primary bg-opacity-10 rounded-3 me-3 text-primary">
                        <Zap size={18} />
                      </div>
                      <div className="text-truncate">
                        <h6 className="fw-bold mb-0 text-truncate">{paper.title}</h6>
                        <span className="small text-secondary fw-medium">{paper.config.totalMarks} Marks • {new Date(paper.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <ChevronRight size={18} className="text-secondary" />
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </div>

        {/* Evaluation Feed */}
        <div className="col-lg-4">
          <motion.div className="glass-card p-4 h-100" variants={itemVariants}>
            <h5 className="fw-bold mb-4 d-flex align-items-center gap-2">
              <ClipboardCheck size={20} className="text-secondary" /> Latest Evaluations
            </h5>

            {loading ? (
              <div className="py-5 text-center opacity-30"><Sparkles className="animate-spin" /></div>
            ) : recentSubmissions.length === 0 ? (
              <div className="text-center py-5 opacity-30">
                <p className="small fw-medium">No results recorded.</p>
                <button onClick={() => navigate('/check')} className="btn btn-sm btn-glass px-4 mt-2">Start Grading</button>
              </div>
            ) : (
              <div className="d-flex flex-column gap-3">
                {recentSubmissions.map((sub) => (
                  <div key={sub._id} className="p-3 bg-glass rounded-4 border border-glass hover-scale transition-all">
                    <h6 className="fw-bold mb-1 text-truncate">{sub.paperId?.title || 'External Eval'}</h6>
                    <div className="d-flex justify-content-between align-items-center">
                      <span className="small text-secondary fw-semibold">
                        <Clock size={12} className="me-1" /> {new Date(sub.createdAt).toLocaleDateString()}
                      </span>
                      <span className="badge bg-secondary bg-opacity-10 text-secondary border border-secondary border-opacity-20 px-2 py-1">
                        {sub.evaluation.totalScore}/{sub.evaluation.maxScore}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={() => navigate('/check')}
              className="btn btn-glass w-100 mt-4 rounded-4 py-3 fw-bold text-uppercase small tracking-widest"
            >
              Go to Checker
            </button>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
};

export default Dashboard;
