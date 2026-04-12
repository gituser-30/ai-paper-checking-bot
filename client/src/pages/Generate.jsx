import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { 
  Settings, Sparkles, Loader2, ListChecks, FileText, 
  Printer, CheckCircle, ChevronLeft, ChevronRight, Zap, Info
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

const Generate = () => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [step, setStep] = useState('CONFIG'); // CONFIG, MARKING, FINAL
  const [materials, setMaterials] = useState([]);
  const [selectedMaterials, setSelectedMaterials] = useState([]);
  const [loading, setLoading] = useState(false);
  const [paper, setPaper] = useState(null);
  const [viewMode, setViewMode] = useState('QUESTION_PAPER'); // QUESTION_PAPER, ANSWER_KEY

  const [config, setConfig] = useState({
    pattern: 'mixed',
    difficulty: 'intermediate',
    totalMarks: 50,
    mcqCount: 5,
    theoryCount: 5
  });

  useEffect(() => {
    const initPage = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams(location.search);
        const paperId = params.get('id');
        const matId = params.get('materialId');
        if (matId) setSelectedMaterials([matId]);

        const matRes = await api.get(`/materials/user/${user._id}`);
        const processed = matRes.data.filter(m => m.extractedText);
        setMaterials(processed);

        if (paperId) {
          const paperRes = await api.get(`/papers/${paperId}`);
          setPaper(paperRes.data);
          setStep('FINAL');
        }
      } catch (err) {
        console.error('Initialization Error', err);
      } finally {
        setLoading(false);
      }
    };
    if (user) initPage();
  }, [user, location.search]);

  const handleGenerate = async () => {
    if (selectedMaterials.length === 0) return;
    setLoading(true);

    const selectedData = materials.filter(m => selectedMaterials.includes(m._id));
    const combinedText = selectedData.map(m => m.extractedText).join("\n\n---\n\n");

    try {
      const res = await api.post('/papers/generate', {
        userId: user._id,
        materialIds: selectedMaterials,
        materialText: combinedText,
        config
      });
      setPaper(res.data);
      setStep('MARKING');
    } catch (err) {
      alert('Generation failed. The document might be too large or the AI service timed out.');
    } finally {
      setLoading(false);
    }
  };

  const finalizePaper = async () => {
    const sum = paper.questions.reduce((acc, q) => acc + (q.marks || 0), 0);
    if (sum !== parseInt(config.totalMarks)) {
      alert(`The sum of marks (${sum}) must equal the total marks (${config.totalMarks})!`);
      return;
    }
    setLoading(true);
    try {
      await api.post(`/papers/${paper._id}`, { questions: paper.questions });
      setStep('FINAL');
    } catch (err) {
      alert('Failed to finalize paper');
    } finally {
      setLoading(false);
    }
  };

  const variants = {
    initial: { opacity: 0, x: 20 },
    enter: { opacity: 1, x: 0, transition: { duration: 0.5, ease: "easeOut" } },
    exit: { opacity: 0, x: -20, transition: { duration: 0.3 } }
  };

  const isLargeDocument = materials
    .filter(m => selectedMaterials.includes(m._id))
    .some(m => m.extractedText?.length > 40000);

  return (
    <div className="container mt-4 pb-5">
      <style>{`
        @media print {
          .navbar, .btn-glass, .no-print, #three-canvas, .noise-bg { display: none !important; }
          .container { width: 100% !important; max-width: 100% !important; margin: 0 !important; padding: 20px !important; }
          .glass-card { background: none !important; border: none !important; box-shadow: none !important; color: black !important; backdrop-filter: none !important; }
          .gradient-text, .text-white, .text-secondary { -webkit-text-fill-color: black !important; color: black !important; }
          body { background: white !important; }
        }
      `}</style>

      {/* Progress Header */}
      <div className="d-flex align-items-center justify-content-between mb-5 no-print">
        <div>
          <h1 className="fw-extrabold gradient-text mb-1">Paper Workshop</h1>
          <p className="text-secondary small fw-bold text-uppercase tracking-widest">
            {step === 'CONFIG' ? 'Step 1: Configuration' : step === 'MARKING' ? 'Step 2: Marking Scheme' : 'Step 3: Export & Print'}
          </p>
        </div>
        <div className="d-flex gap-3">
          {['CONFIG', 'MARKING', 'FINAL'].map((s, i) => (
            <div 
              key={s} 
              className={`rounded-circle d-flex align-items-center justify-content-center fw-bold transition-all ${
                step === s ? 'bg-primary text-white scale-125' : 'bg-glass text-secondary'
              }`}
              style={{ width: '32px', height: '32px', fontSize: '12px', border: '1px solid var(--border-glass)' }}
            >
              {i + 1}
            </div>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {loading && !paper ? (
          <motion.div 
            key="loader"
            className="d-flex flex-column align-items-center justify-content-center py-5 my-5"
            variants={variants} initial="initial" animate="enter" exit="exit"
          >
            <div className="p-4 bg-glass rounded-circle pulse-primary mb-4 border border-glass">
              <Sparkles className="text-primary" size={48} />
            </div>
            <h4 className="fw-bold mb-2">Analyzing Material...</h4>
            <p className="text-secondary text-center px-4 max-w-400">
              Our AI is synthesizing questions and model answers based on your selected materials. 
              {isLargeDocument && " This is a large document, scaling processing..."}
            </p>
            <div className="w-100 max-w-400 mt-4 bg-glass rounded-pill overflow-hidden border border-glass" style={{ height: '8px' }}>
              <motion.div 
                className="h-100 bg-primary-gradient"
                initial={{ width: "0%" }}
                animate={{ width: "100%" }}
                transition={{ duration: 15, ease: "linear" }}
              />
            </div>
          </motion.div>
        ) : step === 'CONFIG' ? (
          <motion.div 
            key="config"
            variants={variants} initial="initial" animate="enter" exit="exit"
            className="glass-card p-5 max-w-800 mx-auto no-print shadow-2xl"
          >
            <h4 className="fw-extrabold mb-4 d-flex align-items-center gap-2">
              <Settings className="text-primary" /> Setup Requirements
            </h4>

            {isLargeDocument && (
              <div className="p-3 bg-primary bg-opacity-10 border border-primary border-opacity-20 rounded-4 mb-4 d-flex gap-3">
                <Zap className="text-primary flex-shrink-0" size={20} />
                <p className="small text-secondary mb-0">
                  <strong>Scale Detected:</strong> One or more selected files are extensive. We've enabled **Parallel Processing** to keep generation fast.
                </p>
              </div>
            )}

            <div className="mb-4">
              <label className="form-label text-secondary small fw-bold text-uppercase tracking-wider">Target Source Materials</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                {materials.length === 0 ? (
                  <div className="col-span-2 p-4 text-center border border-dashed border-glass rounded-4 opacity-40">
                    <p className="small mb-0">No materials ready. Upload a PDF first.</p>
                  </div>
                ) : (
                  materials.map(m => (
                    <div 
                      key={m._id} 
                      onClick={() => {
                        if (selectedMaterials.includes(m._id)) setSelectedMaterials(selectedMaterials.filter(id => id !== m._id));
                        else setSelectedMaterials([...selectedMaterials, m._id]);
                      }}
                      className={`p-3 rounded-4 cursor-pointer border transition-all d-flex align-items-center gap-3 ${
                        selectedMaterials.includes(m._id) ? 'bg-primary bg-opacity-10 border-primary' : 'bg-glass border-glass'
                      }`}
                    >
                      <div className={`p-2 rounded-3 ${selectedMaterials.includes(m._id) ? 'bg-primary text-white' : 'bg-glass-heavy text-secondary'}`}>
                        <FileText size={16} />
                      </div>
                      <div className="text-truncate">
                        <p className="small fw-bold mb-0 text-truncate">{m.title}</p>
                        <p className="xs text-secondary mb-0 uppercase">{m.fileType}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="row g-4 mb-4">
              <div className="col-md-6">
                <label className="form-label text-secondary small fw-bold uppercase">MCQ Quantity</label>
                <input type="number" className="form-control" value={config.mcqCount} onChange={e => setConfig({ ...config, mcqCount: e.target.value })} />
              </div>
              <div className="col-md-6">
                <label className="form-label text-secondary small fw-bold uppercase">Theory Quantity</label>
                <input type="number" className="form-control" value={config.theoryCount} onChange={e => setConfig({ ...config, theoryCount: e.target.value })} />
              </div>
            </div>

            <div className="mb-5">
              <label className="form-label text-secondary small fw-bold uppercase">Total Exam Marks</label>
              <div className="input-group">
                <span className="input-group-text bg-glass border-glass text-secondary">Σ</span>
                <input type="number" className="form-control fs-4 fw-bold" value={config.totalMarks} onChange={e => setConfig({ ...config, totalMarks: e.target.value })} />
              </div>
            </div>

            <button 
              disabled={loading || selectedMaterials.length === 0} 
              onClick={handleGenerate} 
              className="btn btn-primary-gradient w-100 py-3 rounded-4 text-uppercase tracking-widest fw-bold"
            >
              <Sparkles size={20} className="me-2" /> Start AI Generation
            </button>
          </motion.div>
        ) : step === 'MARKING' ? (
          <motion.div 
            key="marking"
            variants={variants} initial="initial" animate="enter" exit="exit"
            className="glass-card p-5 no-print"
          >
            <div className="d-flex justify-content-between align-items-center mb-5 border-bottom border-glass pb-4">
              <h4 className="fw-extrabold mb-0 d-flex align-items-center gap-2">
                <ListChecks className="text-primary" /> Mark Allocation
              </h4>
              <div className="px-4 py-2 bg-glass rounded-pill border border-glass">
                <span className="text-secondary small fw-bold me-2 uppercase">Progress:</span>
                <span className={`fw-bold ${paper.questions.reduce((a, q) => a + (q.marks || 0), 0) == config.totalMarks ? "text-success" : "text-primary"}`}>
                  {paper.questions.reduce((a, q) => a + (q.marks || 0), 0)}
                </span>
                <span className="text-secondary fw-bold ms-1">/ {config.totalMarks}</span>
              </div>
            </div>

            <div className="d-flex flex-column gap-3">
              {paper.questions.map((q, i) => (
                <motion.div 
                  key={i} 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.05 }}
                  className="p-3 bg-glass rounded-4 d-flex align-items-center gap-4 hover-bg-glass-heavy transition-all border border-glass"
                >
                  <div className="fs-5 fw-extrabold text-secondary opacity-30 px-2" style={{ width: '40px' }}>{String(i + 1).padStart(2, '0')}</div>
                  <div className="flex-grow-1 min-w-0">
                    <p className="mb-1 fw-medium text-truncate-2" style={{ fontSize: '0.95rem' }}>{q.questionText}</p>
                    <span className="badge bg-glass text-secondary font-monospace tracking-tighter uppercase p-1 px-2">{q.questionType}</span>
                  </div>
                  <div style={{ width: '90px' }}>
                    <input
                      type="number"
                      className="form-control text-center py-2 fw-bold"
                      placeholder="Marks"
                      value={q.marks || ''}
                      onChange={(e) => {
                        const updatedQuestions = [...paper.questions];
                        updatedQuestions[i].marks = parseInt(e.target.value) || 0;
                        setPaper({ ...paper, questions: updatedQuestions });
                      }}
                    />
                  </div>
                </motion.div>
              ))}
            </div>

            <div className="d-flex gap-3 mt-5">
              <button className="btn btn-glass px-4" onClick={() => setStep('CONFIG')}>Back</button>
              <button onClick={finalizePaper} className="btn btn-primary-gradient flex-grow-1 py-3 rounded-4 fw-bold text-uppercase tracking-wider">
                <CheckCircle size={20} className="me-2" /> Finalize Exam Paper
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="final"
            variants={variants} initial="initial" animate="enter" exit="exit"
          >
            <div className="no-print d-flex flex-wrap gap-3 justify-content-between align-items-center mb-5">
              <div className="d-flex bg-glass p-1 rounded-pill border border-glass">
                <button 
                  onClick={() => setViewMode('QUESTION_PAPER')} 
                  className={`btn btn-sm px-4 rounded-pill transition-all ${viewMode === 'QUESTION_PAPER' ? 'btn-primary-gradient shadow-sm' : 'border-0 text-secondary'}`}
                >
                  Question Paper
                </button>
                <button 
                  onClick={() => setViewMode('ANSWER_KEY')} 
                  className={`btn btn-sm px-4 rounded-pill transition-all ${viewMode === 'ANSWER_KEY' ? 'btn-primary-gradient shadow-sm' : 'border-0 text-secondary'}`}
                >
                  Answer Key
                </button>
              </div>
              <div className="d-flex gap-2">
                <button onClick={handlePrint} className="btn btn-primary shadow-lg px-4 d-flex align-items-center gap-2 rounded-4">
                  <Printer size={18} /> Print & Save PDF
                </button>
                <button onClick={() => navigate('/dashboard')} className="btn btn-glass px-4 rounded-4">Exit</button>
              </div>
            </div>

            <div className="glass-card p-5 mb-5 shadow-2xl" id="printable-paper" style={{ background: 'white', color: '#000' }}>
              <div className="text-center mb-5 border-bottom border-4 border-dark pb-5">
                <div className="d-flex align-items-center justify-content-center gap-2 mb-2 opacity-10">
                  <Sparkles size={20} strokeWidth={3} />
                  <span className="small fw-extrabold tracking-tighter uppercase">Generated by EvalyzeAI</span>
                </div>
                <h1 className="fw-900 text-uppercase tracking-tighter mb-2" style={{ fontSize: '3rem' }}>
                  {viewMode === 'QUESTION_PAPER' ? 'Question Paper' : 'Answer Key'}
                </h1>
                <p className="mb-0 fs-3 fw-medium">{paper.title}</p>
                <div className="d-flex justify-content-between mt-5 text-uppercase fw-extrabold" style={{ letterSpacing: '2px' }}>
                  <span>Code: {paper._id.slice(-6).toUpperCase()}</span>
                  <span>Max Marks: {paper.config.totalMarks}</span>
                </div>
              </div>

              <div className="d-flex flex-column gap-5">
                {paper.questions.map((q, i) => (
                  <div key={i} className="position-relative">
                    <div className="d-flex justify-content-between align-items-start mb-3">
                      <div className="d-flex gap-3">
                        <span className="fw-900 fs-4 text-dark opacity-40">Q{i + 1}</span>
                        <span className="fs-5 fw-medium pt-1 pe-5">{q.questionText}</span>
                      </div>
                      <span className="fw-900 border border-dark border-3 rounded-3 px-3 py-1 mt-1">[{q.marks}]</span>
                    </div>

                    {q.questionType === 'mcq' && (
                      <div className="row g-4 ms-5 mt-2">
                        {q.options.map((opt, idx) => (
                          <div key={idx} className="col-md-6 mb-2 fs-5">
                            <span className="fw-black me-2 opacity-50">{String.fromCharCode(65 + idx)})</span> 
                            {opt}
                          </div>
                        ))}
                      </div>
                    )}

                    {viewMode === 'ANSWER_KEY' && (
                      <div className="mt-4 ms-5 border-start border-4 border-primary bg-primary bg-opacity-5 p-4 rounded-end-4 shadow-sm">
                        <div className="d-flex align-items-center gap-2 mb-2">
                          <Info size={16} className="text-primary" />
                          <span className="small fw-black text-uppercase text-primary letter-spacing-1">
                            {q.questionType === 'mcq' ? 'AI Solution Path' : 'Structure Rubric'}
                          </span>
                        </div>
                        <p className="mb-0 fs-5 lh-lg text-dark fw-medium">
                          {q.correctAnswer}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="text-center mt-5 pt-5 opacity-40 border-top border-dark border-opacity-10 small fw-bold text-uppercase italic">
                Securely synthesised using high-speed Llama 4 Scout LLM Core • Verify against curriculum.
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Generate;
