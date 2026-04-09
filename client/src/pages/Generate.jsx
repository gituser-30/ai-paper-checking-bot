import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { Settings, Sparkles, Loader2, ListChecks, FileText, Printer, CheckCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';

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

        // Fetch materials anyway for the dropdown/config step
        const matRes = await api.get(`/materials/user/${user._id}`);
        const processed = matRes.data.filter(m => m.extractedText);
        setMaterials(processed);

        // If paperId present, fetch the paper and jump to FINAL view
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
    
    // Combine text from all selected materials
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
      alert('Generation failed');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateMarks = (index, val) => {
    const updatedQuestions = [...paper.questions];
    updatedQuestions[index].marks = parseInt(val) || 0;
    setPaper({ ...paper, questions: updatedQuestions });
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

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="container mt-4 pb-5">
      {/* Hide navbar/bg on print */}
      <style>{`
        @media print {
          .navbar, .btn-glass, .no-print, #three-canvas { display: none !important; }
          .container { width: 100% !important; max-width: 100% !important; margin: 0 !important; padding: 20px !important; }
          .glass-card { background: none !important; border: none !important; box-shadow: none !important; color: black !important; backdrop-filter: none !important; }
          .gradient-text, .text-white, .text-secondary { -webkit-text-fill-color: black !important; color: black !important; }
          body { background: white !important; }
        }
      `}</style>

      <div className="d-flex align-items-center justify-content-between mb-4 no-print">
        <h1 className="fw-bold gradient-text mb-0">Paper Workshop</h1>
        <div className="d-flex gap-2">
          <div className={`step-dot ${step === 'CONFIG' ? 'active' : ''}`} />
          <div className={`step-dot ${step === 'MARKING' ? 'active' : ''}`} />
          <div className={`step-dot ${step === 'FINAL' ? 'active' : ''}`} />
        </div>
      </div>

      {loading && !paper && (
        <div className="d-flex flex-column align-items-center justify-content-center py-5 my-5">
          <Loader2 className="spinner-border text-primary mb-3" size={48} style={{ border: 'none' }} />
          <p className="text-secondary fw-bold">Waking up the AI Examiner...</p>
        </div>
      )}

      {step === 'CONFIG' && !loading && (
        <div className="glass-card p-5 max-w-800 mx-auto no-print">
          <h4 className="fw-bold mb-4 d-flex align-items-center"><Settings className="me-2 text-primary" /> Configure Requirements</h4>
          <div className="mb-4">
            <label className="form-label text-secondary small fw-bold text-uppercase">Select Study Materials (Multi-select)</label>
            <div className="bg-glass rounded-4 p-3 border border-secondary border-opacity-25" style={{maxHeight: '200px', overflowY: 'auto'}}>
              {materials.length === 0 ? (
                <p className="small text-secondary mb-0">No processed materials found. Upload some first!</p>
              ) : (
                materials.map(m => (
                  <div key={m._id} className="form-check mb-2">
                    <input 
                      className="form-check-input" 
                      type="checkbox" 
                      id={m._id}
                      checked={selectedMaterials.includes(m._id)}
                      onChange={(e) => {
                        if (e.target.checked) setSelectedMaterials([...selectedMaterials, m._id]);
                        else setSelectedMaterials(selectedMaterials.filter(id => id !== m._id));
                      }}
                    />
                    <label className="form-check-label small cursor-pointer" htmlFor={m._id}>
                      {m.title} <span className="opacity-50">• {m.fileType.toUpperCase()}</span>
                    </label>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="row g-3 mb-4">
            <div className="col-md-6">
              <label className="form-label text-secondary">MCQ Count</label>
              <input type="number" className="form-control border-secondary" value={config.mcqCount} onChange={e => setConfig({ ...config, mcqCount: e.target.value })} />
            </div>
            <div className="col-md-6">
              <label className="form-label text-secondary">Theory Count</label>
              <input type="number" className="form-control border-secondary" value={config.theoryCount} onChange={e => setConfig({ ...config, theoryCount: e.target.value })} />
            </div>
          </div>

          <div className="mb-5">
            <label className="form-label text-secondary">Total Paper Marks</label>
            <input type="number" className="form-control border-secondary fs-4 fw-bold" value={config.totalMarks} onChange={e => setConfig({ ...config, totalMarks: e.target.value })} />
          </div>

          <button disabled={loading || selectedMaterials.length === 0} onClick={handleGenerate} className="btn btn-glass w-100 py-3 d-flex align-items-center justify-content-center">
            {loading ? <Loader2 className="spinner-border me-2" style={{ border: 'none' }} /> : <><Sparkles size={20} className="me-2" /> Generate Draft Questions from {selectedMaterials.length} files</>}
          </button>
        </div>
      )}

      {step === 'MARKING' && (
        <div className="glass-card p-5 no-print animate-slide-up">
          <div className="d-flex justify-content-between align-items-center mb-4 border-bottom border-secondary pb-3">
            <h4 className="fw-bold mb-0"><ListChecks className="me-2 text-primary" /> Assign Marks to Questions</h4>
            <div className="text-end">
              <p className="mb-0 text-secondary">Total Progress: <span className={paper.questions.reduce((a, q) => a + (q.marks || 0), 0) == config.totalMarks ? "text-success" : "text-danger"}>{paper.questions.reduce((a, q) => a + (q.marks || 0), 0)}</span> / {config.totalMarks}</p>
            </div>
          </div>

          {paper.questions.map((q, i) => (
            <div key={i} className="mb-4 p-3 bg-glass rounded-3 d-flex align-items-center gap-3">
              <span className="badge bg-glass-heavy text-white fs-6">{i + 1}</span>
              <div className="flex-grow-1">
                <p className="mb-1">{q.questionText}</p>
                <span className="small text-secondary">{q.questionType.toUpperCase()}</span>
              </div>
              <div style={{ width: '100px' }}>
                <input
                  type="number"
                  className="form-control border-secondary"
                  placeholder="Marks"
                  value={q.marks || ''}
                  onChange={(e) => handleUpdateMarks(i, e.target.value)}
                />
              </div>
            </div>
          ))}

          <div className="d-flex gap-3 mt-5">
            <button className="btn btn-outline-secondary px-4 py-2" onClick={() => setStep('CONFIG')}>Back</button>
            <button onClick={finalizePaper} className="btn btn-glass flex-grow-1 py-3 d-flex align-items-center justify-content-center">
              {loading ? <Loader2 className="spinner-border me-2" style={{ border: 'none' }} /> : <><CheckCircle size={20} className="me-2" /> Finalize & Save Paper</>}
            </button>
          </div>
        </div>
      )}

      {step === 'FINAL' && (
        <div className="animate-slide-up">
          <div className="no-print d-flex justify-content-between align-items-center mb-5">
            <div className="btn-group bg-glass p-1 rounded-3">
              <button onClick={() => setViewMode('QUESTION_PAPER')} className={`btn btn-sm ${viewMode === 'QUESTION_PAPER' ? 'btn-primary' : 'border-0'}`} style={{ color: viewMode === 'QUESTION_PAPER' ? 'white' : 'var(--text-primary)' }}>Question Paper</button>
              <button onClick={() => setViewMode('ANSWER_KEY')} className={`btn btn-sm ${viewMode === 'ANSWER_KEY' ? 'btn-primary' : 'border-0'}`} style={{ color: viewMode === 'ANSWER_KEY' ? 'white' : 'var(--text-primary)' }}>Answer Key</button>
            </div>
            <div className="d-flex gap-2">
              <button onClick={handlePrint} className="btn btn-glass d-flex align-items-center"><Printer size={18} className="me-2" /> Print / Save PDF</button>
              <button onClick={() => navigate('/dashboard')} className="btn btn-outline-light">Home</button>
            </div>
          </div>

          <div className="glass-card p-5" id="printable-paper">
            <div className="text-center mb-5 border-bottom border-3 border-dark pb-4">
              <h1 className="fw-bold text-uppercase">{viewMode === 'QUESTION_PAPER' ? 'Question Paper' : 'Official Answer Key'}</h1>
              <p className="mb-0 fs-5">{paper.title}</p>
              <div className="d-flex justify-content-between mt-4 text-uppercase fw-bold small">
                <span>Time: As Per Guidelines</span>
                <span>Total Marks: {paper.config.totalMarks}</span>
              </div>
            </div>

            {paper.questions.map((q, i) => (
              <div key={i} className="mb-5">
                <div className="d-flex justify-content-between mb-3">
                  <div className="d-flex">
                    <span className="fw-bold me-2">Q{i + 1}.</span>
                    <span>{q.questionText}</span>
                  </div>
                  <span className="fw-bold">[{q.marks}m]</span>
                </div>

                {q.questionType === 'mcq' && (
                  <div className="row g-2 ms-4">
                    {q.options.map((opt, idx) => (
                      <div key={idx} className="col-6 mb-1">{String.fromCharCode(65 + idx)}) {opt}</div>
                    ))}
                  </div>
                )}

                {viewMode === 'ANSWER_KEY' && (
                  <div className="mt-3 p-3 border border-dark rounded bg-light text-dark">
                    <span className="fw-bold me-2">
                      {q.questionType === 'mcq' ? 'Correct Answer:' : 'Model Answer (Professor Logic):'}
                    </span> 
                    <div className={q.questionType === 'theory' ? 'mt-2 border-top border-secondary border-opacity-25 pt-2' : 'd-inline'}>
                      {q.correctAnswer}
                    </div>
                  </div>
                )}
              </div>
            ))}

            <div className="text-center mt-5 pt-5 opacity-50 border-top border-dark small">
              Paper Generated by AI Examiner Integration System
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Generate;
