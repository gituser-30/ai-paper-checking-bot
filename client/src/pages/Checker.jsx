import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import {
  ClipboardList, Upload, Loader2, CheckCircle, XCircle,
  Info, Printer, ArrowLeft, FileText, ImagePlus
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

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

  // -------------------------------------------------------------------------
  // SAVED paper evaluation (existing flow)
  // -------------------------------------------------------------------------
  const handleEvaluateSaved = async (e) => {
    e.preventDefault();
    if (answerFiles.length === 0 || !selectedPaper) return;

    setLoading(true);
    setLoadingStep('Uploading answer sheets & evaluating...');
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
      alert('Evaluation failed. Please check if the AI service is online.');
    } finally {
      setLoading(false);
      setLoadingStep('');
    }
  };

  // -------------------------------------------------------------------------
  // RAW evaluation (new flow — upload question paper + answer sheet together)
  // -------------------------------------------------------------------------
  const handleEvaluateRaw = async (e) => {
    e.preventDefault();
    if (qpFiles.length === 0 || answerFiles.length === 0) return;

    setLoading(true);
    setLoadingStep('Step 1 of 2: Reading question paper...');

    const formData = new FormData();
    qpFiles.forEach(file => formData.append('questionPaperPages', file));
    answerFiles.forEach(file => formData.append('solvedPages', file));
    formData.append('userId', user._id);
    formData.append('totalMarks', totalMarks);

    try {
      // Brief pause so user sees step 1 message
      setTimeout(() => setLoadingStep('Step 2 of 2: AI is evaluating answers...'), 8000);

      const res = await api.post('/submissions/evaluate-raw', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 200000
      });
      setResult({ type: 'raw', data: res.data });
    } catch (err) {
      console.error(err);
      alert('Raw evaluation failed. Please make sure the images are clear and the AI service is running.');
    } finally {
      setLoading(false);
      setLoadingStep('');
    }
  };

  const handlePrint = () => window.print();
  const resetAll = () => {
    setResult(null);
    setAnswerFiles([]);
    setQpFiles([]);
    setSelectedPaper('');
  };

  // -------------------------------------------------------------------------
  // Extract evaluation data from whichever mode was used
  // -------------------------------------------------------------------------
  const getEvaluation = () => {
    if (!result) return null;
    if (result.type === 'saved') return result.data.evaluation;
    if (result.type === 'raw') return result.data.evaluation;
    return null;
  };

  const getSolvedImagesCount = () => {
    if (!result) return 0;
    if (result.type === 'saved') return result.data.solvedImages?.length || 0;
    if (result.type === 'raw') return result.data.submission?.solvedImages?.length || 0;
    return 0;
  };

  const evaluation = getEvaluation();

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
        .mode-tab {
          padding: 10px 24px;
          border-radius: 999px;
          border: 1.5px solid rgba(99,102,241,0.35);
          background: transparent;
          color: var(--text-secondary, #aaa);
          font-weight: 600;
          font-size: 0.9rem;
          cursor: pointer;
          transition: all 0.25s;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .mode-tab.active {
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          color: #fff;
          border-color: transparent;
          box-shadow: 0 4px 14px rgba(99,102,241,0.45);
        }
        .upload-zone {
          border: 2px dashed rgba(99,102,241,0.4);
          border-radius: 16px;
          padding: 32px 20px;
          text-align: center;
          cursor: pointer;
          transition: all 0.2s;
          background: rgba(99,102,241,0.04);
        }
        .upload-zone:hover {
          border-color: #6366f1;
          background: rgba(99,102,241,0.09);
        }
        .upload-zone.has-files {
          border-color: #22c55e;
          background: rgba(34,197,94,0.05);
        }
        .step-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          color: white;
          font-weight: 700;
          font-size: 0.8rem;
          margin-right: 10px;
          flex-shrink: 0;
        }
      `}</style>

      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4 no-print">
        <h1 className="fw-bold gradient-text mb-0">Handwritten Paper Checker</h1>
        {evaluation && (
          <button onClick={handlePrint} className="btn btn-glass d-flex align-items-center">
            <Printer size={18} className="me-2" /> Print Report
          </button>
        )}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* FORM — shown when no result yet                                     */}
      {/* ------------------------------------------------------------------ */}
      {!evaluation ? (
        <div className="glass-card p-5 mx-auto no-print" style={{ maxWidth: '760px' }}>

          {/* Header */}
          <div className="d-flex align-items-center mb-4">
            <ClipboardList className="text-primary me-3" size={32} />
            <div>
              <h4 className="fw-bold mb-0">Evaluate Submission</h4>
              <p className="text-secondary small mb-0">
                Choose how to provide the question paper
              </p>
            </div>
          </div>

          {/* Mode Toggle */}
          <div className="d-flex gap-3 mb-4">
            <button
              type="button"
              className={`mode-tab ${mode === 'saved' ? 'active' : ''}`}
              onClick={() => setMode('saved')}
            >
              <ClipboardList size={16} /> Use Saved Paper
            </button>
            <button
              type="button"
              className={`mode-tab ${mode === 'raw' ? 'active' : ''}`}
              onClick={() => setMode('raw')}
            >
              <ImagePlus size={16} /> Upload Question Paper Now
            </button>
          </div>

          {/* ---- SAVED MODE ---- */}
          {mode === 'saved' && (
            <form onSubmit={handleEvaluateSaved}>
              <div className="mb-4">
                <label className="form-label text-secondary d-flex align-items-center">
                  <span className="step-badge">1</span> Select Exam Paper
                </label>
                <select
                  className="form-select border-secondary"
                  value={selectedPaper}
                  onChange={e => setSelectedPaper(e.target.value)}
                  required
                >
                  <option value="">Choose from your generated papers...</option>
                  {papers.map(p => (
                    <option key={p._id} value={p._id}>
                      {p.title} ({p.config?.totalMarks} Marks)
                    </option>
                  ))}
                </select>
                {papers.length === 0 && (
                  <p className="text-secondary small mt-2">
                    No papers found. <a href="/generate" className="text-primary">Generate one first →</a>
                  </p>
                )}
              </div>

              <div className="mb-5">
                <label className="form-label text-secondary d-flex align-items-center">
                  <span className="step-badge">2</span> Upload Handwritten Answer Sheets
                </label>
                <div className={`upload-zone ${answerFiles.length > 0 ? 'has-files' : ''}`}>
                  <input
                    type="file" multiple className="d-none" id="answerInput"
                    onChange={e => setAnswerFiles(Array.from(e.target.files))}
                    accept="image/*"
                  />
                  <label htmlFor="answerInput" className="cursor-pointer w-100 d-block">
                    {answerFiles.length > 0 ? (
                      <>
                        <CheckCircle size={40} className="text-success mb-2" />
                        <p className="fw-bold mb-0">{answerFiles.length} sheet(s) selected</p>
                        <p className="text-secondary small">Click to change</p>
                      </>
                    ) : (
                      <>
                        <Upload size={40} className="text-primary mb-2" />
                        <p className="fw-bold mb-1">Drop or click to upload answer sheets</p>
                        <p className="text-secondary small">PNG, JPG — up to 5 pages</p>
                      </>
                    )}
                  </label>
                </div>
              </div>

              <button
                disabled={loading || !selectedPaper || answerFiles.length === 0}
                className="btn btn-glass w-100 py-3 fs-5"
              >
                {loading
                  ? <><Loader2 size={20} className="me-2" style={{ animation: 'spin 1s linear infinite' }} />{loadingStep}</>
                  : 'Check Paper Now'}
              </button>
            </form>
          )}

          {/* ---- RAW MODE ---- */}
          {mode === 'raw' && (
            <form onSubmit={handleEvaluateRaw}>

              {/* Total Marks Input */}
              <div className="mb-4">
                <label className="form-label text-secondary d-flex align-items-center">
                  <span className="step-badge">1</span> Total Marks of this Paper
                </label>
                <input
                  type="number"
                  className="form-control border-secondary"
                  min={1} max={1000}
                  value={totalMarks}
                  onChange={e => setTotalMarks(Number(e.target.value))}
                  placeholder="e.g. 100"
                  required
                />
                <p className="text-secondary small mt-1">
                  Used to distribute marks if not printed on the question paper.
                </p>
              </div>

              {/* Question Paper Upload */}
              <div className="mb-4">
                <label className="form-label text-secondary d-flex align-items-center">
                  <span className="step-badge">2</span> Upload Question Paper Images
                </label>
                <div className={`upload-zone ${qpFiles.length > 0 ? 'has-files' : ''}`}>
                  <input
                    type="file" multiple className="d-none" id="qpInput"
                    onChange={e => setQpFiles(Array.from(e.target.files))}
                    accept="image/*"
                  />
                  <label htmlFor="qpInput" className="cursor-pointer w-100 d-block">
                    {qpFiles.length > 0 ? (
                      <>
                        <CheckCircle size={40} className="text-success mb-2" />
                        <p className="fw-bold mb-0">{qpFiles.length} page(s) of question paper selected</p>
                        <p className="text-secondary small">Click to change</p>
                      </>
                    ) : (
                      <>
                        <FileText size={40} className="text-primary mb-2" />
                        <p className="fw-bold mb-1">Drop or click to upload question paper</p>
                        <p className="text-secondary small">Photos of the printed question paper — PNG, JPG</p>
                      </>
                    )}
                  </label>
                </div>
              </div>

              {/* Answer Sheet Upload */}
              <div className="mb-5">
                <label className="form-label text-secondary d-flex align-items-center">
                  <span className="step-badge">3</span> Upload Handwritten Answer Sheets
                </label>
                <div className={`upload-zone ${answerFiles.length > 0 ? 'has-files' : ''}`}>
                  <input
                    type="file" multiple className="d-none" id="answerInputRaw"
                    onChange={e => setAnswerFiles(Array.from(e.target.files))}
                    accept="image/*"
                  />
                  <label htmlFor="answerInputRaw" className="cursor-pointer w-100 d-block">
                    {answerFiles.length > 0 ? (
                      <>
                        <CheckCircle size={40} className="text-success mb-2" />
                        <p className="fw-bold mb-0">{answerFiles.length} sheet(s) selected</p>
                        <p className="text-secondary small">Click to change</p>
                      </>
                    ) : (
                      <>
                        <Upload size={40} className="text-primary mb-2" />
                        <p className="fw-bold mb-1">Drop or click to upload answer sheets</p>
                        <p className="text-secondary small">Photos of the student's handwritten answers</p>
                      </>
                    )}
                  </label>
                </div>
              </div>

              {/* Info banner */}
              <div className="p-3 mb-4 rounded-3 d-flex" style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.3)' }}>
                <Info size={18} className="text-primary me-2 flex-shrink-0 mt-1" />
                <p className="small text-secondary mb-0">
                  <strong>How it works:</strong> The AI will first read your question paper and extract all questions.
                  Then it will OCR your answer sheet and evaluate each answer. This takes ~60–90 seconds.
                </p>
              </div>

              <button
                disabled={loading || qpFiles.length === 0 || answerFiles.length === 0}
                className="btn btn-glass w-100 py-3 fs-5"
              >
                {loading
                  ? <><Loader2 size={20} className="me-2" style={{ animation: 'spin 1s linear infinite' }} />{loadingStep}</>
                  : 'Read Paper & Evaluate Answers'}
              </button>
            </form>
          )}
        </div>
      ) : (
        /* ------------------------------------------------------------------ */
        /* RESULT VIEW                                                          */
        /* ------------------------------------------------------------------ */
        <div className="animate-slide-up">
          <button className="btn btn-link text-white no-print mb-4 p-0 d-flex align-items-center" onClick={resetAll}>
            <ArrowLeft size={18} className="me-2" /> Back to Upload
          </button>

          {/* Score Banner */}
          <div className="glass-card p-5 mb-4 border-start border-5 border-primary">
            <div className="row align-items-center">
              <div className="col-md-8">
                <h2 className="fw-bold mb-1">Evaluation Result</h2>
                <p className="text-secondary mb-0">
                  Analyzed {getSolvedImagesCount()} answer sheet page(s)
                  {result.type === 'raw' && (
                    <span className="badge ms-2 bg-primary-subtle text-primary">Question Paper Uploaded Directly</span>
                  )}
                </p>
              </div>
              <div className="col-md-4 text-end">
                <h1 className="display-4 fw-bold gradient-text mb-0">
                  {evaluation?.totalScore ?? '—'}/{evaluation?.maxScore ?? '—'}
                </h1>
                <p className="text-secondary small text-uppercase">Final Marks Obtained</p>
              </div>
            </div>
          </div>

          {/* Extracted Questions preview (raw mode only) */}
          {result.type === 'raw' && result.data.extractedQuestions?.length > 0 && (
            <div className="glass-card p-4 mb-4">
              <h5 className="fw-bold mb-3 d-flex align-items-center">
                <FileText size={20} className="me-2 text-primary" />
                Questions Extracted from Uploaded Paper ({result.data.extractedQuestions.length})
              </h5>
              <div className="d-flex flex-column gap-2">
                {result.data.extractedQuestions.map((q, i) => (
                  <div key={i} className="p-3 rounded-3" style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)' }}>
                    <div className="d-flex justify-content-between">
                      <span className="fw-semibold small">Q{i + 1}. {q.questionText}</span>
                      <span className="badge bg-secondary ms-2 flex-shrink-0">{q.marks} marks</span>
                    </div>
                    {q.options?.length > 0 && (
                      <div className="mt-1 text-secondary small">{q.options.join('  |  ')}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* AI Summary */}
          <div className="glass-card p-4 mb-4 bg-glass-heavy">
            <h5 className="fw-bold mb-3 d-flex align-items-center">
              <Info size={20} className="me-2 text-primary" /> AI Examiner's Summary
            </h5>
            <p className="mb-0 text-secondary" style={{ lineHeight: '1.6' }}>
              {evaluation?.overallComment || 'No summary available.'}
            </p>
          </div>

          {/* Per-Question Feedback */}
          <div className="d-flex flex-column gap-4">
            {(evaluation?.feedback || []).map((f, idx) => (
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

                {f.studentAnswer && (
                  <div className="mb-2 p-2 rounded-2" style={{ background: 'rgba(255,255,255,0.04)' }}>
                    <p className="small text-secondary mb-0">
                      <strong>Student wrote:</strong> {f.studentAnswer}
                    </p>
                  </div>
                )}

                <p className="mb-2" style={{ color: 'var(--text-primary)' }}>{f.aiFeedback}</p>

                <div className="mt-3 p-3 bg-glass rounded-3 border-start border-3 border-primary">
                  <p className="small text-secondary mb-1">Correct Solution:</p>
                  <p className="mb-0 small" style={{ color: 'var(--text-primary)' }}>{f.correctAnswer}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-5 text-center no-print">
            <button className="btn btn-glass px-5 py-3 rounded-pill" onClick={resetAll}>
              Check Another Submission
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Checker;
