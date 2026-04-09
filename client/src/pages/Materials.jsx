import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { Upload, File, Loader2, Trash2, ExternalLink, CheckCircle2, Clock } from 'lucide-react';

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
      alert('Upload failed. Ensure your server and Cloudinary config are correct.');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this material? Generated papers from it will stay, but you won't be able to generate new ones.")) return;
    try {
      await api.delete(`/materials/${id}`);
      setMaterials(materials.filter(m => m._id !== id));
    } catch (err) {
      alert('Delete failed');
    }
  };

  return (
    <div className="container mt-4 pb-5">
      <h1 className="fw-bold gradient-text mb-2">Study Materials</h1>
      <p className="text-secondary mb-5">Upload your textbooks, notes, or PDFs to train the AI Examiner on your syllabus.</p>
      
      <div className="row g-4">
        <div className="col-lg-4">
          <div className="glass-card p-4 h-100">
            <h5 className="fw-bold mb-4 d-flex align-items-center">
              <Upload className="me-2 text-primary" size={20}/> Upload New
            </h5>
            <form onSubmit={handleUpload}>
              <div className="mb-3">
                <label className="form-label text-secondary small text-uppercase fw-bold">Material Title</label>
                <input 
                  type="text" 
                  className="form-control border-secondary py-2" 
                  value={title} 
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Physics Chapter 5"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="form-label text-secondary small text-uppercase fw-bold">File (PDF or Image)</label>
                <div className="border border-secondary border-dashed rounded-4 p-4 text-center bg-glass hover-bg-glass-heavy transition-all">
                  <input 
                    type="file" 
                    className="d-none" 
                    id="fileInput" 
                    onChange={(e) => setFile(e.target.files[0])}
                    accept=".pdf,image/*"
                  />
                  <label htmlFor="fileInput" className="cursor-pointer w-100 h-100">
                    <File size={32} className="text-primary mb-2" />
                    <p className="mb-0 small text-secondary text-truncate">{file ? file.name : 'Drop file here or click'}</p>
                  </label>
                </div>
              </div>
              <button disabled={uploading || !file} className="btn btn-glass w-100 py-3 d-flex align-items-center justify-content-center">
                {uploading ? <Loader2 size={20} className="spinner-border me-2" style={{border: 'none'}} /> : 'Process with AI'}
              </button>
            </form>
          </div>
        </div>

        <div className="col-lg-8">
          <div className="glass-card p-4 h-100">
            <h5 className="fw-bold mb-4">Your Knowledge Library</h5>
            {materials.length === 0 ? (
              <div className="text-center py-5">
                <File size={64} className="text-secondary opacity-25 mb-3" />
                <p className="text-secondary">Your library is empty. Upload a material to start generating papers.</p>
              </div>
            ) : (
              <div className="row g-3">
                {materials.map((m) => (
                  <div key={m._id} className="col-md-6">
                    <div className="p-3 bg-glass rounded-4 border border-glass h-100 hover-scale transition-all">
                      <div className="d-flex align-items-start justify-content-between mb-2">
                        <div className="p-2 bg-glass rounded-3 text-primary">
                          <File size={20} />
                        </div>
                        <div className="d-flex gap-2">
                          <a href={m.fileUrl} target="_blank" rel="noreferrer" className="btn btn-link p-0 text-secondary hover-primary">
                            <ExternalLink size={18} />
                          </a>
                          <button onClick={() => handleDelete(m._id)} className="btn btn-link p-0 text-secondary hover-danger">
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                      <h6 className="fw-bold text-truncate mb-1">{m.title}</h6>
                      <div className="d-flex align-items-center justify-content-between mt-3">
                        <span className="small text-secondary">{m.fileType.toUpperCase()}</span>
                        {m.extractedText ? (
                          <span className="badge bg-success bg-opacity-10 text-success d-flex align-items-center">
                            <CheckCircle2 size={12} className="me-1"/> Ready
                          </span>
                        ) : (
                          <span className="badge bg-warning bg-opacity-10 text-warning d-flex align-items-center">
                            <Clock size={12} className="me-1"/> Processing
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Materials;
