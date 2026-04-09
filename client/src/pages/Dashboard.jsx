import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { 
  FileText, 
  CheckCircle, 
  Clock, 
  Plus, 
  ChevronRight, 
  Zap, 
  History as HistoryIcon, 
  ClipboardCheck,
  TrendingUp,
  BookOpen,
  ArrowRight,
  Sparkles,
  Upload
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    papers: 0,
    materials: 0,
    submissions: 0
  });
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

  const cards = [
    { title: 'Total Papers', value: stats.papers, icon: FileText, color: 'text-primary', border: 'neon-border-primary' },
    { title: 'Study Materials', value: stats.materials, icon: BookOpen, color: 'text-info', border: '' },
    { title: 'AI Evaluated', value: stats.submissions, icon: CheckCircle, color: 'text-success', border: '' },
  ];

  const quickActions = [
    { title: 'Generate New', desc: 'Create AI paper', icon: Sparkles, path: '/generate', color: 'bg-primary' },
    { title: 'Upload Notes', desc: 'PDF or Images', icon: Upload, path: '/materials', color: 'bg-info' },
    { title: 'Check History', desc: 'Review grades', icon: HistoryIcon, path: '/history', color: 'bg-secondary' },
  ];

  return (
    <div className="container mt-4 pb-5">
      <div className="row mb-5 align-items-center animate-slide-up">
        <div className="col-md-8">
          <div className="d-flex align-items-center mb-2">
            <span className="badge bg-primary bg-opacity-10 text-primary border border-primary border-opacity-25 px-3 py-2 rounded-pill small fw-bold mb-2">PROFESSOR DASHBOARD v2.0</span>
          </div>
          <h1 className="fw-bold mb-1 display-5">
            <span className="text-white">Welcome back, </span>
            <span className="gradient-text">{user?.name}</span>
          </h1>
          <p className="text-secondary mb-0 fs-5 opacity-75">Your AI-powered instructional control panel.</p>
        </div>
        <div className="col-md-4 text-md-end mt-4 mt-md-0">
          <Link to="/generate" className="btn btn-glass px-5 py-3 rounded-pill shadow-lg animate-float">
            <Plus size={20} className="me-2"/> Create Fresh Paper
          </Link>
        </div>
      </div>

      <div className="row g-4 mb-5">
        {cards.map((card, i) => (
          <div key={i} className="col-md-4">
            <div className={`glass-card p-4 d-flex align-items-center animate-slide-up ${card.border}`} style={{animationDelay: `${i * 0.1}s`}}>
              <div className={`p-4 bg-glass rounded-circle me-4 ${card.color} border border-glass`}>
                <card.icon size={32} />
              </div>
              <div>
                <p className="text-secondary small fw-bold text-uppercase tracking-wider mb-1">{card.title}</p>
                <h2 className="fw-bold mb-0 display-6 d-flex align-items-baseline">
                  {stats.papers === 0 && loading ? '...' : card.value}
                  <TrendingUp size={16} className="ms-2 text-success opacity-50" />
                </h2>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions Grid */}
      <h5 className="fw-bold mb-4 text-secondary small text-uppercase tracking-widest animate-slide-up" style={{animationDelay: '0.3s'}}>Quick Actions</h5>
      <div className="row g-4 mb-5 animate-slide-up" style={{animationDelay: '0.4s'}}>
        {quickActions.map((action, i) => (
          <div key={i} className="col-md-4">
            <div onClick={() => navigate(action.path)} className="glass-card p-4 cursor-pointer hover-bg-glass border-0 border-start border-4 border-opacity-50 shimmer h-100" style={{ borderColor: `var(--${action.color.split('-')[1]})` }}>
              <div className="d-flex justify-content-between align-items-start">
                <div className={`p-3 ${action.color} bg-opacity-20 rounded-3 mb-3`}>
                  <action.icon size={24} className={action.color.replace('bg', 'text')} />
                </div>
                <ArrowRight size={20} className="text-secondary opacity-25" />
              </div>
              <h5 className="fw-bold mb-1">{action.title}</h5>
              <p className="text-secondary small mb-0">{action.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="row g-5 animate-slide-up" style={{animationDelay: '0.5s'}}>
        {/* Recent Papers */}
        <div className="col-lg-7">
          <div className="glass-card p-4 h-100 border-0">
            <div className="d-flex justify-content-between align-items-center mb-5">
              <h5 className="fw-bold mb-0 d-flex align-items-center">
                <HistoryIcon size={22} className="me-2 text-primary"/> Recent Activity
              </h5>
              <Link to="/history" className="text-primary small text-decoration-none fw-bold hover-scale">View History <ChevronRight size={14}/></Link>
            </div>
            
            {recentPapers.length === 0 ? (
              <div className="text-center py-5 opacity-50">
                <FileText size={48} className="mb-3" />
                <p>No papers in your catalog yet.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {recentPapers.map((paper) => (
                  <div key={paper._id} onClick={() => navigate(`/generate?id=${paper._id}`)} className="p-3 bg-glass border border-glass rounded-4 d-flex align-items-center justify-content-between cursor-pointer hover-bg-glass transition-all mb-3">
                    <div className="d-flex align-items-center min-w-0">
                      <div className="p-2 bg-warning bg-opacity-10 rounded-3 me-3 flex-shrink-0">
                        <Zap size={20} className="text-warning"/>
                      </div>
                      <div className="text-truncate">
                        <h6 className="fw-bold mb-0 text-truncate">{paper.title}</h6>
                        <div className="d-flex align-items-center gap-3">
                          <span className="small text-secondary">{paper.config.totalMarks} Marks</span>
                          <span className="small text-secondary opacity-50">•</span>
                          <span className="small text-secondary">{new Date(paper.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                    <div className="btn btn-sm btn-glass rounded-circle p-2 ms-3">
                      <ChevronRight size={16}/>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Latest Results */}
        <div className="col-lg-5">
          <div className="glass-card p-4 h-100 border-0">
            <h5 className="fw-bold mb-5 d-flex align-items-center">
              <ClipboardCheck size={22} className="me-2 text-success"/> Graduation Insights
            </h5>
            
            {recentSubmissions.length === 0 ? (
              <p className="text-secondary text-center py-4 opacity-50">Monitoring for activity...</p>
            ) : (
              <div className="space-y-4">
                {recentSubmissions.map((sub) => (
                  <div key={sub._id} className="p-4 bg-glass rounded-4 border border-glass mb-3 hover-scale transition-all">
                    <div className="d-flex justify-content-between align-items-start mb-3">
                       <h6 className="fw-bold mb-0 text-truncate" style={{maxWidth: '200px'}}>{sub.paperId?.title || 'System Paper'}</h6>
                       <div className="px-3 py-1 bg-success bg-opacity-10 text-success rounded-pill small fst-italic">
                         {sub.evaluation.totalScore} / {sub.paperId?.config?.totalMarks || 100} m
                       </div>
                    </div>
                    <div className="d-flex align-items-center text-secondary small">
                      <Clock size={14} className="me-2"/> {new Date(sub.createdAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <button onClick={() => navigate('/check')} className="btn btn-glass w-100 mt-4 rounded-pill py-3 fw-bold text-uppercase small tracking-widest border-info border-opacity-25">
               Start Evaluation Phase
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
