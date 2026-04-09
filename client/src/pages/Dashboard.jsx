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
  BookOpen
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
    { title: 'Total Papers', value: stats.papers, icon: FileText, color: 'text-primary' },
    { title: 'Materials', value: stats.materials, icon: BookOpen, color: 'text-info' },
    { title: 'Evaluations', value: stats.submissions, icon: CheckCircle, color: 'text-success' },
  ];

  return (
    <div className="container mt-4 pb-5">
      <div className="row mb-5 align-items-center">
        <div className="col-md-8">
          <h1 className="fw-bold gradient-text mb-1">Welcome back, {user?.name}!</h1>
          <p className="text-secondary mb-0 text-uppercase tracking-wider small">Your AI Examiner control panel is ready.</p>
        </div>
        <div className="col-md-4 text-md-end mt-3 mt-md-0">
          <Link to="/generate" className="btn btn-glass px-4 py-2 rounded-pill">
            <Plus size={18} className="me-2"/> New Exam Paper
          </Link>
        </div>
      </div>

      <div className="row g-4 mb-5">
        {cards.map((card, i) => (
          <div key={i} className="col-md-4">
            <div className="glass-card p-4 d-flex align-items-center animate-slide-up" style={{animationDelay: `${i * 0.1}s`}}>
              <div className={`p-3 bg-glass rounded-4 me-4 ${card.color}`}>
                <card.icon size={28} />
              </div>
              <div>
                <p className="text-secondary small mb-0">{card.title}</p>
                <h2 className="fw-bold mb-0">{card.value}</h2>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="row g-4">
        {/* Quick Actions / Recent Papers */}
        <div className="col-lg-8">
          <div className="glass-card p-4 h-100">
            <div className="d-flex justify-content-between align-items-center mb-4">
              <h5 className="fw-bold mb-0 d-flex align-items-center">
                <HistoryIcon size={20} className="me-2 text-primary"/> Recent Exam Papers
              </h5>
              <Link to="/history" className="text-primary small text-decoration-none hover-underline">View All</Link>
            </div>
            
            {recentPapers.length === 0 ? (
              <div className="text-center py-5">
                <p className="text-secondary">No papers generated yet.</p>
              </div>
            ) : (
              <div className="list-group list-group-flush bg-transparent">
                {recentPapers.map((paper) => (
                  <div key={paper._id} onClick={() => navigate(`/generate?id=${paper._id}`)} className="list-group-item bg-transparent border-secondary border-opacity-25 py-3 px-0 border-0 border-bottom d-flex align-items-center justify-content-between cursor-pointer hover-bg-glass rounded-3 px-3 transition-all">
                    <div className="d-flex align-items-center">
                      <div className="p-2 bg-glass rounded-3 me-3">
                        <Zap size={18} className="text-warning"/>
                      </div>
                      <div>
                        <h6 className="fw-bold mb-0">{paper.title}</h6>
                        <span className="small text-secondary">{paper.config.totalMarks} Marks • {new Date(paper.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <ChevronRight size={18} className="text-secondary"/>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recent Submissions / Grading */}
        <div className="col-lg-4">
          <div className="glass-card p-4 h-100">
            <h5 className="fw-bold mb-4 d-flex align-items-center">
              <ClipboardCheck size={20} className="me-2 text-success"/> Latest Gradings
            </h5>
            
            {recentSubmissions.length === 0 ? (
              <p className="text-secondary text-center py-4">No submissions checked yet.</p>
            ) : (
              <div className="space-y-3">
                {recentSubmissions.map((sub) => (
                  <div key={sub._id} className="p-3 bg-glass rounded-3 border border-glass">
                    <div className="d-flex justify-content-between align-items-start mb-2">
                       <h6 className="fw-bold mb-0 text-truncate" style={{maxWidth: '150px'}}>{sub.paperId?.title || 'Unknown Paper'}</h6>
                       <span className="badge bg-success bg-opacity-10 text-success">{sub.evaluation.totalScore}m</span>
                    </div>
                    <div className="d-flex align-items-center text-secondary small">
                      <Clock size={12} className="me-1"/> {new Date(sub.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <Link to="/check" className="btn btn-outline-light w-100 mt-4 rounded-pill py-2 small">Check New Paper</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
