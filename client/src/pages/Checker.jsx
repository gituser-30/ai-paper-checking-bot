import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import {
  ClipboardList, Upload, Loader2, CheckCircle, XCircle,
  Info, Printer, ArrowLeft, FileText, ImagePlus, Sparkles, Zap, Award
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

const Checker = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Mode: 'saved' = pick from saved papers | 'raw' = upload question paper directly
  const [mode, setMode] = useState('saved');

  // Saved paper mode
  const [papers, setPapers] = useState([]);
  const [selectedPaper, setSelectedPaper] = useState('');

  // Raw mode
  const [qpFiles, setQpFiles] = useState([]);    // question paper images
  const [totalMarks, setTotalMarks] = useState(100);

  // Shared
  const [answerFiles, setAnswerFiles] = useState([]);   // answer sheet images
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState('');
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

  const handleEvaluateSaved = async (e) => {
    e.preventDefault();
    if (answerFiles.length === 0 || !selectedPaper) return;
    setLoading(true);
    setLoadingStep('Uploading sheets & decoding handwriting...');
    const formData = new FormData();
    answerFiles.forEach(file => formData.append('solvedPages', file));
    formData.append('userId', user._id);
    formData.append('paperId', selectedPaper);
    try {
      const res = await api.post('/submissions/evaluate', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setResult({ type: 'saved', data: res.data });
    } catch (err) {
      alert('Evaluation failed. Please check your internet or AI service status.');
    } finally {
      setLoading(false);
      setLoadingStep('');
    }
  };

  const handleEvaluateRaw = async (e) => {
    e.preventDefault();
    if (qpFiles.length === 0 || answerFiles.length === 0) return;
    setLoading(true);
    setLoadingStep('Step 1: Analyzing Question Paper...');
    const formData = new FormData();
    qpFiles.forEach(file => formData.append('questionPaperPages', file));
    answerFiles.forEach(file => formData.append('solvedPages', file));
    formData.append('userId', user._id);
    formData.append('totalMarks', totalMarks);
    try {
      setTimeout(() => setLoadingStep('Step 2: Cross-referencing Answers...'), 6000);
      const res = await api.post('/submissions/evaluate-raw', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 200000
      });
      setResult({ type: 'raw', data: res.data });
    } catch (err) {
      alert('Raw evaluation failed. Ensure images are high quality.');
    } finally {
      setLoading(false);
      setLoadingStep('');
    }
  };

  const resetAll = () => {
    setResult(null);
    setAnswerFiles([]);
    setQpFiles([]);
    setSelectedPaper('');
  };

  const evaluation = result?.type === 'saved' ? result.data.evaluation : result?.data?.evaluation;

  const variants = {
    initial: { opacity: 0, scale: 0.98 },
    enter: { opacity: 1, scale: 1, transition: { duration: 0.4, ease: "easeOut" } },
    exit: { opacity: 0, scale: 0.98, transition: { duration: 0.2 } }
  };

  return (
    <div className="container mt-4 pb-5">
      <style>{`
        @media print {
          .navbar, .no-print, #three-canvas, .btn-glass, .noise-bg { display: none !important; }
          .container { width: 100% !important; max-width: 100% !important; margin: 0 !important; padding: 20px !important; }
          .glass-card { background: none !important; border: none !important; box-shadow: none !important; color: black !important; backdrop-filter: none !important; }
          .gradient-text { -webkit-text-fill-color: black !important; color: black !important; background: none !important; }
          body { background: white !important; }
          .feedback-card { border: 1px solid #ddd !important; margin-bottom: 20px !important; break-inside: avoid; }
          .text-secondary, .text-white { color: #333 !important; }
        }
      `}</style>

      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-5 no-print">
        <div>
          <h1 className="fw-extrabold gradient-text mb-1">Handwritten Checker</h1>
          <p className="text-secondary small fw-bold text-uppercase tracking-widest">
            Vision OCR based Grading Engine
          </p>
        </div>
        {evaluation && (
          <button onClick={() => window.print()} className="btn btn-primary-gradient px-4 py-2 rounded-4 fw-bold">
            <Printer size={18} className="me-2" /> Export Report
          </button>
        )}
      </div>

      <AnimatePresence mode="wait">
        {!evaluation ? (
          <motion.div 
            key="form"
            variants={variants} initial="initial" animate="enter" exit="exit"
            className="glass-card p-5 mx-auto no-print shadow-2xl" 
            style={{ maxWidth: '720px' }}
          >
            {loading ? (
              <div className="text-center py-5">
                <div className="p-4 bg-glass rounded-circle pulse-primary mb-4 d-inline-block border border-glass">
                  <Sparkles className="text-primary" size={48} />
                </div>
                <h4 className="fw-extrabold mb-1">{loadingStep}</h4>
                <p className="text-secondary opacity-60">Scanning with Llama 4 Vision engine...</p>
              </div>
            ) : (
              <>
                <div className="d-flex align-items-center gap-3 mb-5">
                   <div className="p-3 bg-primary bg-opacity-10 rounded-4 text-primary"><ClipboardList /></div>
                   <h4 className="fw-extrabold mb-0">Evaluate Submission</h4>
                </div>

                {/* Sub-toggle */}
                <div className="d-flex bg-glass p-1 rounded-pill border border-glass mb-5" style={{ width: 'fit-content' }}>
                  <button onClick={() => setMode('saved')} className={`btn btn-sm px-4 rounded-pill transition-all fw-bold ${mode === 'saved' ? 'btn-primary shadow-sm' : 'border-0 text-secondary'}`}>Use Saved Paper</button>
                  <button onClick={() => setMode('raw')} className={`btn btn-sm px-4 rounded-pill transition-all fw-bold ${mode === 'raw' ? 'btn-primary shadow-sm' : 'border-0 text-secondary'}`}>Raw Upload</button>
                </div>

                {mode === 'saved' ? (
                  <form onSubmit={handleEvaluateSaved}>
                    <div className="mb-4">
                      <label className="text-secondary small fw-bold uppercase mb-2">1. Choose Exam Paper</label>
                      <select className="form-select fs-5" value={selectedPaper} onChange={e => setSelectedPaper(e.target.value)} required>
                        <option value="">Choose a paper...</option>
                        {papers.map(p => <option key={p._id} value={p._id}>{p.title} ({p.config?.totalMarks}m)</option>)}
                      </select>
                    </div>
                    <div className="mb-5">
                       <label className="text-secondary small fw-bold uppercase mb-2">2. Handwritten Answer Sheets</label>
                       <div className={`upload-zone ${answerFiles.length > 0 ? 'bg-primary-glow border-primary' : ''}`}>
                         <input type="file" multiple className="d-none" id="ansInp" onChange={e => setAnswerFiles(Array.from(e.target.files))} accept="image/*" />
                         <label htmlFor="ansInp" className="w-100 cursor-pointer">
                            <Upload className={`mb-3 ${answerFiles.length > 0 ? 'text-white' : 'text-primary'}`} size={40} />
                            <h6 className="fw-bold">{answerFiles.length > 0 ? `${answerFiles.length} Sheets Ready` : 'Drop Handwritten Images'}</h6>
                            <p className="text-secondary xs mb-0">Up to 10 pages per submission</p>
                         </label>
                       </div>
                    </div>
                    <button disabled={!selectedPaper || answerFiles.length === 0} className="btn btn-primary-gradient w-100 py-3 rounded-4 fw-bold">Evaluate Submission</button>
                  </form>
                ) : (
                  <form onSubmit={handleEvaluateRaw}>
                    <div className="row g-4 mb-4">
                      <div className="col-md-5">
                        <label className="text-secondary small fw-bold uppercase mb-2">Total Max Marks</label>
                        <input type="number" className="form-control" value={totalMarks} onChange={e => setTotalMarks(e.target.value)} required />
                      </div>
                      <div className="col-md-7">
                         <label className="text-secondary small fw-bold uppercase mb-2">Question Paper (Image)</label>
                         <div className={`upload-zone py-3 ${qpFiles.length > 0 ? 'bg-primary-glow border-primary' : ''}`}>
                           <input type="file" multiple className="d-none" id="qpInp" onChange={e => setQpFiles(Array.from(e.target.files))} accept="image/*" />
                           <label htmlFor="qpInp" className="cursor-pointer">
                             <FileText size={24} className="mb-1 text-primary" />
                             <p className="small fw-bold mb-0">{qpFiles.length > 0 ? `${qpFiles.length} Pg Loaded` : 'Upload Questions'}</p>
                           </label>
                         </div>
                      </div>
                    </div>
                    <div className="mb-5">
                       <label className="text-secondary small fw-bold uppercase mb-2">Handwritten Answer Sheets</label>
                       <div className="upload-zone">
                         <input type="file" multiple className="d-none" id="ansInpRaw" onChange={e => setAnswerFiles(Array.from(e.target.files))} accept="image/*" />
                         <label htmlFor="ansInpRaw" className="w-100 cursor-pointer">
                            <Upload className="mb-2 text-primary" size={32} />
                            <h6 className="fw-bold">Upload Student's Scans</h6>
                         </label>
                       </div>
                    </div>
                    <button disabled={qpFiles.length === 0 || answerFiles.length === 0} className="btn btn-primary-gradient w-100 py-3 rounded-4 fw-bold">Analyze & Grade Everything</button>
                    <p className="text-center text-secondary x-small mt-3 opacity-60">Uses Vision-to-Critique logic (Approx 90s)</p>
                  </form>
                )}
              </>
            )}
          </motion.div>
        ) : (
          <motion.div 
            key="results"
            variants={variants} initial="initial" animate="enter" exit="exit"
          >
            <button className="btn btn-link text-white no-print mb-4 p-0 d-flex align-items-center gap-2 hover-slide" onClick={resetAll}>
              <ArrowLeft size={18} /> Back to Workshop
            </button>

            {/* Score Banner */}
            <div className="glass-card mb-5 overflow-visible">
              <div className="bg-primary bg-opacity-10 p-5 rounded-4 border-start border-5 border-primary">
                <div className="row align-items-center">
                  <div className="col-md-8">
                    <span className="badge bg-primary rounded-pill mb-2 px-3 py-1 fw-black small uppercase letter-spacing-1">Handwriting Verified</span>
                    <h2 className="fw-900 mb-1 display-5">Evaluation Results</h2>
                    <p className="text-secondary mb-0 fw-medium opacity-70">
                      Cross-referenced {result.type === 'raw' ? 'raw questions' : 'saved paper'} via Vision OCR.
                    </p>
                  </div>
                  <div className="col-md-4 text-md-end mt-4 mt-md-0">
                    <div className="score-badge d-inline-block text-center p-4 bg-primary rounded-4 shadow-2xl neon-glow">
                      <h1 className="display-3 fw-900 mb-0 text-white">{evaluation.totalScore}</h1>
                      <div className="d-flex align-items-center justify-content-center gap-2 mt-n1 border-top border-white border-opacity-30 pt-1">
                         <span className="small opacity-80 uppercase fw-black tracking-widest text-white">/{evaluation.maxScore} Marks</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* AI Global Commentary */}
            <div className="glass-card p-4 mb-5 border-primary-glow border-opacity-10 bg-glass-heavy">
               <h6 className="fw-black text-primary uppercase letter-spacing-1 mb-3 d-flex align-items-center gap-2">
                 <Award size={18} /> Global EvalyzeAI Feedback
               </h6>
               <p className="mb-0 fs-5 fw-medium text-secondary lh-lg italic">"{evaluation.overallComment}"</p>
            </div>

            {/* Per Question Staggered List */}
            <div className="d-flex flex-column gap-4 mb-5">
              {evaluation.feedback.map((f, i) => (
                <motion.div 
                  key={i} 
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.2 + (i * 0.1) }}
                  className="glass-card p-5 feedback-card relative group"
                >
                  <div className="d-flex justify-content-between align-items-start mb-4">
                    <div>
                      <h5 className="fw-900 mb-1">Question {f.questionIndex + 1}</h5>
                      <div className="d-flex gap-2">
                        <span className="badge bg-glass text-secondary uppercase px-2 py-1 small fw-black letter-spacing-1">{f.isCorrect ? 'Accurate' : 'Partial/Incorrect'}</span>
                        <span className="badge bg-glass border border-glass text-white px-2 py-1 small fw-black">{f.obtainedMarks} Marks Awarded</span>
                      </div>
                    </div>
                    <div className={`p-3 rounded-circle border-4 ${f.obtainedMarks > 0 ? 'border-success text-success bg-success' : 'border-danger text-danger bg-danger'} bg-opacity-5`}>
                        {f.obtainedMarks > 0 ? <CheckCircle size={24} /> : <XCircle size={24} />}
                    </div>
                  </div>

                  <div className="bg-glass-heavy p-4 rounded-4 mb-4 border border-glass opacity-80 italic">
                    <span className="text-secondary small uppercase fw-black mb-1 block">OCR Interpretation:</span>
                    <p className="mb-0 fw-medium">"{f.studentAnswer || 'Inconclusive or blank handwriting.'}"</p>
                  </div>

                  <p className="fs-5 text-secondary fw-medium mb-4">{f.aiFeedback}</p>

                  <div className="p-4 bg-primary bg-opacity-5 rounded-4 border-start border-4 border-primary">
                    <span className="small uppercase fw-black text-primary tracking-widest block mb-1">Rubric Guide</span>
                    <p className="mb-0 small fw-bold opacity-60">{f.correctAnswer}</p>
                  </div>
                </motion.div>
              ))}
            </div>

            <div className="text-center py-5 no-print">
               <button className="btn btn-glass px-5 py-3 rounded-pill fw-bold uppercase tracking-widest shadow-xl" onClick={resetAll}>
                 Grade Another Submission
               </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Checker;
