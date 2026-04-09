import React, { useEffect, useState } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { FileText, Eye, Trash2, Calendar, FileQuestion, ExternalLink, Loader2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

const History = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [papers, setPapers] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchHistory = async () => {
        try {
            const res = await api.get(`/papers/user/${user._id}`);
            setPapers(res.data);
        } catch (err) {
            console.error('History Fetch Error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user) fetchHistory();
    }, [user]);

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this paper?")) return;
        try {
            await api.delete(`/papers/${id}`);
            setPapers(papers.filter(p => p._id !== id));
        } catch (err) {
            alert('Delete failed');
        }
    };

    return (
        <div className="container mt-4 pb-5">
            <h1 className="fw-bold gradient-text mb-4">Paper History</h1>
            <p className="text-secondary mb-5">Access and manage all your previously generated question papers.</p>

            {loading ? (
                <div className="text-center py-5">
                    <Loader2 className="spinner-border text-primary" size={40} style={{border: 'none'}} />
                    <p className="mt-3 text-secondary">Loading history...</p>
                </div>
            ) : papers.length === 0 ? (
                <div className="glass-card p-5 text-center">
                    <FileQuestion size={64} className="text-secondary opacity-25 mb-4" />
                    <h4 className="fw-bold">No Papers Found</h4>
                    <p className="text-secondary mb-4">You haven't generated any papers yet. Start now!</p>
                    <Link to="/generate" className="btn btn-glass px-4">Create First Paper</Link>
                </div>
            ) : (
                <div className="row g-4">
                    {papers.map((paper) => (
                        <div key={paper._id} className="col-md-6 col-lg-4">
                            <div className="glass-card h-100 p-4 d-flex flex-column animate-slide-up">
                                <div className="d-flex align-items-center mb-3">
                                    <div className="p-3 bg-glass rounded-4 me-3 text-primary">
                                        <FileText size={24} />
                                    </div>
                                    <div>
                                        <h5 className="fw-bold mb-0 text-truncate" style={{maxWidth: '180px'}}>{paper.title}</h5>
                                        <div className="d-flex align-items-center text-secondary small">
                                            <Calendar size={12} className="me-1" />
                                            {new Date(paper.createdAt).toLocaleDateString()}
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-auto">
                                    <div className="d-flex justify-content-between mb-3 text-secondary small border-top border-secondary pt-3">
                                        <span>{paper.config.totalMarks} Marks</span>
                                        <span>{paper.questions.length} Questions</span>
                                    </div>
                                    <div className="d-flex gap-2">
                                        <button 
                                            onClick={() => navigate(`/generate?id=${paper._id}`)} 
                                            className="btn btn-glass btn-sm flex-grow-1 d-flex align-items-center justify-content-center"
                                        >
                                            <Eye size={16} className="me-2" /> View
                                        </button>
                                        <button 
                                            onClick={() => handleDelete(paper._id)} 
                                            className="btn btn-outline-danger btn-sm px-3"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default History;
