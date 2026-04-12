import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { Upload, File, Loader2, Trash2, ExternalLink, CheckCircle2, Clock, Sparkles, BookOpen } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Materials = () => {
  const { user } = useAuth();
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState('');
  const [materials, setMaterials] = useState([]);
  const [uploading, setUploading] = useState(false);

  const fetchMaterials = async () => {
    try {
      const res = await api.get(`/materials/user/${user._id}`);
      setMaterials(res.data);
    } catch (err) {
      console.error('Fetch Error');
    }
  };

  useEffect(() => {
    if (user) fetchMaterials();
  }, [user]);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file || !title) return;
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', title);
    formData.append('userId', user._id);
    try {
      await api.post('/materials/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setTitle('');
      setFile(null);
      fetchMaterials();
    } catch (err) {
      alert('Upload failed. Ensure Cloudinary config is correct.');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this material?")) return;
    try {
      await api.delete(`/materials/${id}`);
      setMaterials(materials.filter(m => m._id !== id));
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
    visible: { y: 0, opacity: 1 }
  };

  return (
    <motion.div 
      className="container mt-4 pb-5"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <motion.div variants={itemVariants} className="mb-5">
        <h1 className="fw-900 gradient-text mb-2">Knowledge Library</h1>
        <p className="text-secondary fw-medium opacity-80">Upload source materials to train EvalyzeAI on your specific curriculum.</p>
      </motion.div>
      
      <div className="row g-5">
        <motion.div className="col-lg-4" variants={itemVariants}>
          <div className="glass-card p-4 h-100 border-primary-glow border-opacity-20 shadow-xl">
            <h5 className="fw-bold mb-4 d-flex align-items-center gap-2">
              <Upload className="text-primary" size={20}/> <span>Import Source</span>
            </h5>
            <form onSubmit={handleUpload}>
              <div className="mb-4">
                <label className="form-label text-secondary small text-uppercase fw-black letter-spacing-1 mb-2">Internal Title</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={title} 
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Quantum Physics Ch.1"
                  required
                />
              </div>
              <div className="mb-5">
                <label className="form-label text-secondary small text-uppercase fw-black letter-spacing-1 mb-2">File (PDF or Scan)</label>
                <div className={`upload-zone py-5 ${file ? 'bg-primary-glow border-primary' : ''}`}>
                  <input 
                    type="file" 
                    className="d-none" 
                    id="fileInput" 
                    onChange={(e) => setFile(e.target.files[0])}
                    accept=".pdf,image/*"
                  />
                  <label htmlFor="fileInput" className="cursor-pointer w-100 d-block">
                    {file ? (
                      <>
                        <CheckCircle2 size={32} className="text-white mb-2" />
                        <p className="small fw-bold mb-0 text-white text-truncate px-3">{file.name}</p>
                      </>
                    ) : (
                      <>
                        <File size={32} className="text-primary mb-2 opacity-50" />
                        <p className="small text-secondary fw-bold mb-0">Select PDF / Images</p>
                      </>
                    )}
                  </label>
                </div>
              </div>
              <button disabled={uploading || !file} className="btn btn-primary-gradient w-100 py-3 rounded-4 fw-bold text-uppercase small tracking-widest">
                {uploading ? <Loader2 size={20} className="animate-spin me-2" /> : 'Process Assets'}
              </button>
            </form>
          </div>
        </motion.div>

        <motion.div className="col-lg-8" variants={itemVariants}>
          <div className="glass-card p-4 h-100">
            <div className="d-flex justify-content-between align-items-center mb-5">
               <h5 className="fw-bold mb-0 d-flex align-items-center gap-2">
                 <BookOpen size={20} className="text-primary" /> Curated Assets
               </h5>
               <span className="badge bg-glass text-secondary uppercase px-2 py-1 small fw-black tracking-widest">{materials.length} Items</span>
            </div>

            <AnimatePresence>
              {materials.length === 0 ? (
                <div className="text-center py-5 opacity-30">
                  <Sparkles size={56} className="mb-3 mx-auto" />
                  <p className="fw-bold">Your library is currently empty.</p>
                </div>
              ) : (
                <div className="row g-3">
                  {materials.map((m, i) => (
                    <motion.div 
                      key={m._id} 
                      className="col-md-6"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ delay: i * 0.05 }}
                    >
                      <div className="p-4 bg-glass rounded-4 border border-glass h-100 hover-bg-glass-heavy transition-all group relative">
                        <div className="d-flex align-items-start justify-content-between mb-3">
                          <div className={`p-2 rounded-3 ${m.extractedText ? 'bg-primary bg-opacity-10 text-primary' : 'bg-glass-heavy text-secondary opacity-40'}`}>
                            <File size={22} />
                          </div>
                          <div className="d-flex gap-1">
                            <a href={m.fileUrl} target="_blank" rel="noreferrer" className="btn btn-glass p-2 rounded-circle hover-primary">
                              <ExternalLink size={16} />
                            </a>
                            <button onClick={() => handleDelete(m._id)} className="btn btn-glass p-2 rounded-circle hover-danger">
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                        <h6 className="fw-bold text-truncate mb-2 pr-5">{m.title}</h6>
                        <div className="d-flex align-items-center justify-content-between mt-4">
                          <span className="x-small text-secondary fw-black uppercase tracking-widest opacity-60">{m.fileType}</span>
                          {m.extractedText ? (
                            <div className="d-flex align-items-center gap-1 text-success">
                              <CheckCircle2 size={14} /> <span className="x-small fw-black uppercase tracking-widest">Indexed</span>
                            </div>
                          ) : (
                            <div className="d-flex align-items-center gap-1 text-warning animate-pulse">
                              <Clock size={14} /> <span className="x-small fw-black uppercase tracking-widest">Analyzing</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default Materials;
