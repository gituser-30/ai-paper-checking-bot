import React from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Cpu, Zap } from 'lucide-react';

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

  return (
    <div className="container mt-5 py-5">
      <div className="row align-items-center">
        <div className="col-lg-6 mb-5 mb-lg-0">
          <h1 className="display-2 fw-bold mb-4">
            Next-Gen <br />
            <span className="gradient-text">EvalyzeAI</span>
          </h1>
          <p className="lead mb-5 text-secondary pe-lg-5">
            The ultimate platform for automated paper generation and handwritten answer checking. 
            Powered by Groq's high-speed Llama 3 models.
          </p>
          
          <div className="d-inline-block p-1 bg-white rounded">
            <GoogleLogin
              onSuccess={handleSuccess}
              onError={() => console.log('Login Failed')}
              theme="filled_blue"
            />
          </div>
        </div>
        
        <div className="col-lg-6">
          <div className="row g-4">
            <FeatureCard 
              icon={<Cpu className="text-primary" size={40} />}
              title="Fast Generation"
              desc="Create full MCQ or Theory papers in seconds from any PDF."
            />
            <FeatureCard 
              icon={<ShieldCheck className="text-secondary" size={40} />}
              title="Vision OCR"
              desc="Extract and check handwriting with 99% accuracy."
            />
            <FeatureCard 
              icon={<Zap className="text-warning" size={40} />}
              title="Instant Feedback"
              desc="AI provides detailed explanations for every wrong answer."
            />
          </div>
        </div>
      </div>
    </div>
  );
};

const FeatureCard = ({ icon, title, desc }) => (
  <div className="col-md-6">
    <div className="glass-card p-4 h-100">
      <div className="mb-3">{icon}</div>
      <h4 className="fw-bold">{title}</h4>
      <p className="text-secondary mb-0">{desc}</p>
    </div>
  </div>
);

export default Landing;
