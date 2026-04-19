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
      transition: { staggerChildren: 0.15, delayChildren: 0.2 }
    }
  };

  const itemVariants = {
    hidden: { y: 30, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { duration: 0.7, ease: [0.25, 1, 0.5, 1] } }
  };

  return (
    <div className="container min-vh-100 d-flex flex-column justify-content-center py-5 position-relative z-10">

      {/* Decorative Floating Cosmic Elements */}
      <motion.div className="position-absolute d-none d-lg-block" style={{ top: '10%', right: '5%', zIndex: -1 }} animate={{ rotate: 360, y: [-20, 20, -20] }} transition={{ repeat: Infinity, duration: 20, ease: "linear" }}>
        <div className="rounded-circle" style={{ width: '300px', height: '300px', background: 'radial-gradient(circle, rgba(138,43,226,0.15) 0%, transparent 70%)', filter: 'blur(40px)' }} />
      </motion.div>
      <motion.div className="position-absolute d-none d-lg-block" style={{ bottom: '10%', left: '10%', zIndex: -1 }} animate={{ y: [0, -30, 0] }} transition={{ repeat: Infinity, duration: 15, ease: "easeInOut" }}>
        <div className="rounded-circle" style={{ width: '250px', height: '250px', background: 'radial-gradient(circle, rgba(0,240,255,0.1) 0%, transparent 70%)', filter: 'blur(50px)' }} />
      </motion.div>

      <motion.div
        className="row align-items-center"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <div className="col-lg-7 mb-5 mb-lg-0">
          <motion.div variants={itemVariants} className="d-inline-flex align-items-center gap-2 px-3 py-1 rounded-pill mb-4" style={{ background: 'rgba(0, 240, 255, 0.1)', border: '1px solid rgba(0, 240, 255, 0.3)', boxShadow: '0 0 15px rgba(0, 240, 255, 0.2)' }}>
            <Zap size={16} className="text-info" />
            <span className="text-white small fw-bold text-uppercase tracking-wider">v3.0 Cosmic Engine Live</span>
          </motion.div>

          <motion.h1 variants={itemVariants} className="cosmic-title mb-4 lh-1">
            Master The <br />
            <span className="gradient-text">Academic Galaxy</span>
          </motion.h1>

          <motion.p variants={itemVariants} className="fs-5 mb-5 text-secondary pe-lg-5 fw-light lh-lg" style={{ maxWidth: '600px' }}>
            Elevate your teaching workflow with interstellar AI precision. Automatically generate exams and evaluate hand-written sheets across the cosmos in seconds.
          </motion.p>

          <motion.div variants={itemVariants} className="d-flex flex-wrap gap-4 align-items-center">
            <div className="d-inline-block p-1 rounded-4 position-relative z-20" style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <GoogleLogin
                onSuccess={handleSuccess}
                onError={() => console.log('Login Failed')}
                theme="filled_black"
                shape="pill"
              />
            </div>


          </motion.div>

          <motion.div variants={itemVariants} className="mt-5 pt-4 d-flex gap-5 border-top border-secondary border-opacity-25" style={{ maxWidth: '500px' }}>
            <div className="d-flex flex-column gap-1">
              <span className="fs-2 fw-bold text-white text-shadow-glow">1M+</span>
              <span className="small text-uppercase text-secondary" style={{ letterSpacing: '1px' }}>Sheets Evaluated</span>
            </div>
            <div className="d-flex flex-column gap-1">
              <span className="fs-2 fw-bold text-white text-shadow-glow">99.9%</span>
              <span className="small text-uppercase text-secondary" style={{ letterSpacing: '1px' }}>AI Accuracy</span>
            </div>
          </motion.div>
        </div>

        <div className="col-lg-5">
          <motion.div
            className="row g-4"
            variants={containerVariants}
          >
            <FeatureCard
              icon={<Cpu className="text-white" size={28} />}
              title="Quantum Generation"
              desc="Process massive documents to synthesize high-quality theory papers."
              delay={0.1}
              color="#00f0ff"
            />
            <FeatureCard
              icon={<ShieldCheck className="text-white" size={28} />}
              title="Cosmic Vision OCR"
              desc="The smartest vision models decode human handwriting seamlessly."
              delay={0.2}
              color="#ff007f"
            />
            <FeatureCard
              icon={<MousePointer2 className="text-white" size={28} />}
              title="One-Click Gravity"
              desc="Drop your response sheets. Let our engine calculate the rest automatically."
              delay={0.3}
              color="#8a2be2"
            />
            <FeatureCard
              icon={<Zap className="text-white" size={28} />}
              title="Nebula Feedback"
              desc="Students receive hyper-personalized feedback based on granular assessment."
              delay={0.4}
              color="#ffaa00"
            />
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
};

const FeatureCard = ({ icon, title, desc, delay, color }) => (
  <motion.div
    className="col-md-12 col-xl-6"
    initial={{ scale: 0.9, opacity: 0, y: 20 }}
    animate={{ scale: 1, opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.5, type: "spring", stiffness: 100 }}
    whileHover={{ y: -5, scale: 1.02 }}
  >
    <div className="glass-card p-4 h-100" style={{ borderLeft: `3px solid ${color}` }}>
      <div className="mb-4 d-inline-flex align-items-center justify-content-center rounded-circle" style={{ width: '50px', height: '50px', background: `linear-gradient(135deg, ${color}40, ${color}10)`, boxShadow: `0 0 20px ${color}40` }}>
        {icon}
      </div>
      <h5 className="fw-bold mb-2 text-white" style={{ letterSpacing: '0.5px' }}>{title}</h5>
      <p className="text-secondary small mb-0 lh-lg">{desc}</p>
    </div>
  </motion.div>
);

export default Landing;
