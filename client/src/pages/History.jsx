import React, { useEffect, useState } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { FileText, Eye, Trash2, Calendar, FileQuestion, Sparkles, Loader2, ChevronRight, Zap } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

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
        if (!window.confirm("Archiving this paper will remove it from your dashboard. Proceed?")) return;
        try {
            await api.delete(`/papers/${id}`);
            setPapers(papers.filter(p => p._id !== id));
        } catch (err) {
            alert('Delete failed');
        }
    };

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
    };

    const itemVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: { y: 0, opacity: 1, transition: { duration: 0.4 } }
    };

    return (
        <motion.div
            className="container mt-4 pb-5"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
        >
            <motion.div variants={itemVariants} className="mb-5">
                <h1 className="fw-900 cosmic-title mb-2" style={{ fontSize: '3rem' }}>Paper Archive</h1>
                <p className="text-secondary fw-medium opacity-80">Track and manage your generated history with industrial-grade AI synthesis.</p>
            </motion.div>

            {loading ? (
                <div className="text-center py-5 my-5">
                    <Loader2 className="animate-spin text-primary mb-3 mx-auto" size={48} />
                    <p className="fw-bold text-secondary text-uppercase tracking-widest small">Synchronizing...</p>
                </div>
            ) : papers.length === 0 ? (
                <motion.div variants={itemVariants} className="glass-card p-5 text-center shadow-2xl">
                    <div className="p-4 bg-glass rounded-circle mb-4 d-inline-block border border-glass">
                        <FileQuestion size={48} className="text-secondary opacity-30" />
                    </div>
                    <h3 className="fw-900 mb-2">No Records Detected</h3>
                    <p className="text-secondary mb-4 fs-5 opacity-70">Your academic archive is currently pristine. Create your first exam to begin.</p>
                    <button onClick={() => navigate('/generate')} className="glow-btn px-5 py-3">
                        Generate New Paper
                    </button>
                </motion.div>
            ) : (
                <div className="row g-4">
                    <AnimatePresence>
                        {papers.map((paper, i) => (
                            <motion.div
                                key={paper._id}
                                className="col-md-6 col-lg-4"
                                variants={itemVariants}
                                exit={{ opacity: 0, scale: 0.9 }}
                                whileHover={{ y: -8, transition: { duration: 0.2 } }}
                            >
                                <div className="glass-card h-100 p-4 border-primary-glow border-opacity-10 shadow-xl group d-flex flex-column">
                                    <div className="d-flex align-items-start justify-content-between mb-4">
                                        <div className="p-3 bg-primary bg-opacity-10 text-primary rounded-4">
                                            <Zap size={24} />
                                        </div>
                                        <button
                                            onClick={() => handleDelete(paper._id)}
                                            className="btn btn-glass p-2 rounded-circle hover-danger opacity-0 group-hover-opacity-100 transition-all"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>

                                    <div className="mb-4">
                                        <h5 className="fw-900 mb-1 text-truncate pe-3">{paper.title}</h5>
                                        <div className="d-flex align-items-center gap-2 text-secondary small fw-bold uppercase tracking-tighter opacity-70">
                                            <Calendar size={12} />
                                            {new Date(paper.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                        </div>
                                    </div>

                                    <div className="mt-auto">
                                        <div className="d-flex flex-wrap gap-2 mb-4">
                                            <span className="badge bg-glass text-primary border border-primary border-opacity-20 px-2 py-1 uppercase">{paper.config?.totalMarks || 0} Marks</span>
                                            <span className="badge bg-glass text-secondary border border-glass px-2 py-1 uppercase">{paper.questions?.length || 0} Items</span>
                                        </div>
                                        <div className="d-flex gap-2">
                                            <button
                                                onClick={() => navigate(`/generate?id=${paper._id}`)}
                                                className="glow-btn w-100 py-3 d-flex align-items-center justify-content-center gap-2 group"
                                            >
                                                View Artifact <ChevronRight size={16} className="group-hover-translate-x" />
                                            </button>
                                            <button onClick={() => handleDelete(paper._id)}
                                                className="glow-btn btn-secondary-glow w-100 py-3 d-flex align-items-center justify-content-center gap-2">
                                                delete <Trash2 size={16} /></button>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            )}

            <div className="noise-bg opacity-10" />
        </motion.div>
    );
};

export default History;
