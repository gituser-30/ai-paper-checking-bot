import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { ClipboardList, Upload, Loader2, CheckCircle, XCircle, Info, Printer, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Checker = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [papers, setPapers] = useState([]);
  const [selectedPaper, setSelectedPaper] = useState('');
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    const fetchPapers = async () => {
      try {
        const res = await api.get(`/papers/user/${user._id}`);
        setPapers(res.data);
      } catch (err) {
        console.error('Failed to fetch papers');
      }
    };
    if (user) fetchPapers();
  }, [user]);

  const handleEvaluate = async (e) => {
    e.preventDefault();
    if (files.length === 0 || !selectedPaper) return;

    setLoading(true);
    const formData = new FormData();
    files.forEach(file => formData.append('solvedPages', file));
    formData.append('userId', user._id);
    formData.append('paperId', selectedPaper);

    try {
      const res = await api.post('/submissions/evaluate', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setResult(res.data);
    } catch (err) {
      alert('Evaluation failed. Please check if the AI service is online.');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="container mt-4 pb-5">
      <style>{`
        @media print {
          .navbar, .no-print, #three-canvas, .btn-glass { display: none !important; }
          .container { width: 100% !important; max-width: 100% !important; margin: 0 !important; padding: 20px !important; }
          .glass-card { background: none !important; border: none !important; box-shadow: none !important; color: black !important; backdrop-filter: none !important; }
          .gradient-text { -webkit-text-fill-color: black !important; color: black !important; background: none !important; }
          body { background: white !important; }
          .feedback-card { border: 1px solid #ddd !important; margin-bottom: 20px !important; break-inside: avoid; }
          .text-secondary, .text-white { color: #333 !important; }
        }
      `}</style>

      <div className="d-flex justify-content-between align-items-center mb-4 no-print">
        <h1 className="fw-bold gradient-text mb-0">Handwritten Paper Checker</h1>
        {result && (
          <button onClick={handlePrint} className="btn btn-glass d-flex align-items-center">
            <Printer size={18} className="me-2"/> Print Evaluation Report
          </button>
        )}
      </div>

      {!result ? (
        <div className="glass-card p-5 max-w-800 mx-auto no-print">
          <div className="d-flex align-items-center mb-4">
            <ClipboardList className="text-primary me-3" size={32} />
            <h4 className="fw-bold mb-0">Evaluate Submission</h4>
          </div>

          <form onSubmit={handleEvaluate}>
            <div className="mb-4">
              <label className="form-label text-secondary">Select Exam Paper</label>
              <select 
                className="form-select border-secondary"
                value={selectedPaper}
                onChange={(e) => setSelectedPaper(e.target.value)}
                required
              >
                <option value="">Choose from your papers...</option>
                {papers.map(p => (
                  <option key={p._id} value={p._id}>
                    {p.title} ({p.config.totalMarks} Marks)
                  </option>
                ))}
              </select>
            </div>

            <div className="mb-5">
              <label className="form-label text-secondary">Upload Handwritten Sheets</label>
              <div className="border border-secondary border-dashed rounded-4 p-5 text-center bg-glass hover-bg-glass-heavy transition-all">
                <input 
                  type="file" 
                  multiple 
                  className="d-none" 
                  id="sheetInput"
                  onChange={(e) => setFiles(Array.from(e.target.files))}
                  accept="image/*"
                />
                <label htmlFor="sheetInput" className="cursor-pointer w-100 h-100">
                  <Upload size={48} className="text-primary mb-3" />
                  <h5 className="fw-bold">Drop Images or Click to Upload</h5>
                  <p className="text-secondary">{files.length > 0 ? `${files.length} sheets selected` : 'Supports PNG, JPG (Multi-page)'}</p>
                </label>
              </div>
            </div>

            <button disabled={loading || !selectedPaper} className="btn btn-glass w-100 py-3 fs-5">
              {loading ? <><Loader2 size={24} className="spinner-border me-2" style={{border: 'none'}} /> AI Analyzing handwriting...</> : 'Check Paper Now'}
            </button>
          </form>
        </div>
      ) : (
        <div className="animate-slide-up">
          <button className="btn btn-link text-white no-print mb-4 p-0 d-flex align-items-center" onClick={() => setResult(null)}>
            <ArrowLeft size={18} className="me-2"/> Back to Upload
          </button>

          <div className="glass-card p-5 mb-4 border-start border-5 border-primary">
            <div className="row align-items-center">
              <div className="col-md-8">
                <h2 className="fw-bold mb-1">Evaluation Result</h2>
                <p className="text-secondary mb-0">Analyzed {result.solvedImages.length} handwritten pages</p>
              </div>
              <div className="col-md-4 text-end">
                <h1 className="display-4 fw-bold gradient-text mb-0">
                  {result.evaluation.totalScore}/{result.evaluation.maxScore || '50'}
                </h1>
                <p className="text-secondary small text-uppercase tracking-wider">Final Marks Obtained</p>
              </div>
            </div>
          </div>

          <div className="glass-card p-4 mb-4 bg-glass-heavy">
            <h5 className="fw-bold mb-3 d-flex align-items-center">
              <Info size={20} className="me-2 text-primary" /> AI Examiner's Summary
            </h5>
            <p className="mb-0 text-secondary" style={{lineHeight: '1.6'}}>{result.evaluation.overallComment}</p>
          </div>

          <div className="d-flex flex-column gap-4">
            {result.evaluation.feedback.map((f, idx) => (
              <div key={idx} className="glass-card p-4 feedback-card">
                <div className="d-flex justify-content-between align-items-start mb-3">
                  <div>
                    <h6 className="fw-bold mb-1">Question {f.questionIndex + 1}</h6>
                    <span className="small text-secondary text-uppercase">{f.type || 'Subjective'}</span>
                  </div>
                  <div className={`badge ${f.obtainedMarks > 0 ? 'bg-success' : 'bg-danger'} py-2 px-3 fs-6`}>
                    {f.obtainedMarks} Marks
                  </div>
                </div>
                
                <p className="mb-2" style={{color: 'var(--text-primary)'}}>{f.aiFeedback}</p>
                
                <div className="mt-3 p-3 bg-glass rounded-3 border-start border-3 border-primary">
                  <p className="small text-secondary mb-1">Correct Solution Model:</p>
                  <p className="mb-0 small" style={{color: 'var(--text-primary)'}}>{f.correctAnswer}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-5 text-center no-print">
            <button className="btn btn-glass px-5 py-3 rounded-pill" onClick={() => setResult(null)}>Check Another Submission</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Checker;
