import React from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Cpu, Zap, ArrowRight, MousePointer2 } from 'lucide-react';
import { motion } from 'framer-motion';

const Landing = () => {
  const { loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  const handleSuccess = async (credentialResponse) => {
    try {
      await loginWithGoogle(credentialResponse.credential);
      navigate('/dashboard');
    } catch (err) {
      alert('Login failed. Please try again.');
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { staggerChildren: 0.2, delayChildren: 0.3 }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { duration: 0.8, ease: [0.25, 1, 0.5, 1] } }
  };

  return (
    <div className="container min-vh-100 d-flex flex-column justify-content-center py-5">
      <motion.div 
        className="row align-items-center"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <div className="col-lg-7 mb-5 mb-lg-0">
          <motion.div variants={itemVariants} className="badge bg-glass text-primary px-3 py-2 rounded-pill mb-4 border border-primary-glow d-inline-flex align-items-center gap-2">
            <Zap size={14} /> <span>v2.0 is now live with Llama 4 Scout</span>
          </motion.div>
          
          <motion.h1 variants={itemVariants} className="display-1 fw-extrabold mb-4 lh-tight">
            The Future of <br />
            <span className="gradient-text">Academic AI</span>
          </motion.h1>
          
          <motion.p variants={itemVariants} className="fs-4 mb-5 text-secondary pe-lg-5 fw-medium">
            EvalyzeAI transforms how educators generate exams and evaluate handwritten submissions. 
            Automate your workflow with 99% accuracy.
          </motion.p>
          
          <motion.div variants={itemVariants} className="d-flex flex-wrap gap-4 align-items-center">
            <div className="d-inline-block p-1 bg-white rounded-4 shadow-lg hover-scale transition-all">
              <GoogleLogin
                onSuccess={handleSuccess}
                onError={() => console.log('Login Failed')}
                theme="filled_blue"
                shape="pill"
              />
            </div>
            
            <button className="btn btn-link text-white text-decoration-none fw-bold d-flex align-items-center gap-2 hover-slide">
              See how it works <ArrowRight size={20} />
            </button>
          </motion.div>
          
          <motion.div variants={itemVariants} className="mt-5 pt-4 d-flex gap-5 opacity-50">
            <div className="d-flex align-items-center gap-2">
              <span className="fs-3 fw-bold">10k+</span>
              <span className="small text-uppercase tracking-wider">Papers<br/>Generated</span>
            </div>
            <div className="d-flex align-items-center gap-2">
              <span className="fs-3 fw-bold">99.8%</span>
              <span className="small text-uppercase tracking-wider">OCR<br/>Accuracy</span>
            </div>
          </motion.div>
        </div>
        
        <div className="col-lg-5">
          <motion.div 
            className="row g-4"
            variants={containerVariants}
          >
            <FeatureCard 
              icon={<Cpu className="text-primary" size={32} />}
              title="Parallel Generation"
              desc="Build high-quality MCQ & Theory papers from 60+ page documents in seconds."
              delay={0.1}
            />
            <FeatureCard 
              icon={<ShieldCheck className="text-secondary" size={32} />}
              title="Verified Vision OCR"
              desc="Our Llama 4 engine reads handwriting that traditional OCR systems fail to decode."
              delay={0.2}
            />
            <FeatureCard 
              icon={<MousePointer2 className="text-accent" size={32} />}
              title="One-Click Evaluation"
              desc="Upload your answer key and student sheets. Get sub-totaled results instantly."
              delay={0.3}
            />
            <FeatureCard 
              icon={<Zap className="text-warning" size={32} />}
              title="Feedback Loop"
              desc="AI provides personalized comments for students based on their handwriting."
              delay={0.4}
            />
          </motion.div>
        </div>
      </motion.div>
      
      {/* Background Decorative Element */}
      <div className="noise-bg" />
    </div>
  );
};

const FeatureCard = ({ icon, title, desc, delay }) => (
  <motion.div 
    className="col-md-6"
    initial={{ scale: 0.9, opacity: 0 }}
    animate={{ scale: 1, opacity: 1 }}
    transition={{ delay, duration: 0.5 }}
    whileHover={{ y: -10, transition: { duration: 0.2 } }}
  >
    <div className="glass-card p-4 h-100 shimmer border-primary-glow">
      <div className="mb-3 p-3 bg-glass rounded-3 d-inline-block">{icon}</div>
      <h5 className="fw-bold mb-2">{title}</h5>
      <p className="text-secondary small mb-0 lh-base">{desc}</p>
    </div>
  </motion.div>
);

export default Landing;
