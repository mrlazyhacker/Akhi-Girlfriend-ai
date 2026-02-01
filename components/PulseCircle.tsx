
import React, { useEffect, useRef } from 'react';

interface PulseCircleProps {
  isActive: boolean;
  analyser: AnalyserNode | null;
  userAnalyser: AnalyserNode | null;
}

const PulseCircle: React.FC<PulseCircleProps> = ({ isActive, analyser, userAnalyser }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bufferLength = 64;
    const dataArray = new Uint8Array(bufferLength);
    const userDataArray = new Uint8Array(bufferLength);

    let animationId: number;

    const draw = () => {
      animationId = requestAnimationFrame(draw);
      if (analyser) analyser.getByteFrequencyData(dataArray);
      if (userAnalyser) userAnalyser.getByteFrequencyData(userDataArray);

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const baseRadius = 100;

      // Akhi's Voice Glow (High resolution frequency bars)
      if (isActive) {
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#10b981';
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 3;
        ctx.beginPath();
        for (let i = 0; i < bufferLength; i++) {
          const amp = dataArray[i] / 255;
          const angle = (i * 2 * Math.PI) / bufferLength;
          const x = centerX + (baseRadius + amp * 50) * Math.cos(angle);
          const y = centerY + (baseRadius + amp * 50) * Math.sin(angle);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.stroke();

        // User Pulse (Inner Dots)
        ctx.beginPath();
        ctx.strokeStyle = '#0ea5e9';
        ctx.lineWidth = 2;
        ctx.shadowBlur = 0;
        for (let i = 0; i < bufferLength; i++) {
          const amp = userDataArray[i] / 255;
          const angle = (i * 2 * Math.PI) / bufferLength;
          const x = centerX + (baseRadius - 10 - amp * 30) * Math.cos(angle);
          const y = centerY + (baseRadius - 10 - amp * 30) * Math.sin(angle);
          if (i % 2 === 0) {
             ctx.moveTo(x, y);
             ctx.arc(x, y, 1, 0, Math.PI * 2);
          }
        }
        ctx.stroke();
      }
    };

    draw();
    return () => cancelAnimationFrame(animationId);
  }, [isActive, analyser, userAnalyser]);

  return (
    <div className="relative flex items-center justify-center w-72 h-72">
      <canvas 
        ref={canvasRef} 
        width={400} 
        height={400} 
        className="absolute inset-0 w-full h-full z-0 transition-opacity duration-1000"
        style={{ opacity: isActive ? 1 : 0.2 }}
      />
      
      <div className={`relative w-48 h-48 rounded-full border-[3px] transition-all duration-1000 overflow-hidden bg-slate-900 z-10 ${isActive ? 'border-emerald-500 shadow-[0_0_40px_rgba(16,185,129,0.3)] scale-105' : 'border-slate-800 grayscale'}`}>
        <img 
          src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=600&h=600&q=80" 
          alt="Akhi AI" 
          className="w-full h-full object-cover"
        />
        
        {/* Neon Scanner Line */}
        <div className="absolute inset-0 scanner-line"></div>
        
        <div className={`absolute inset-0 bg-gradient-to-t from-emerald-950/90 via-transparent to-transparent flex flex-col items-center justify-end pb-8 transition-opacity duration-700 ${isActive ? 'opacity-100' : 'opacity-0'}`}>
           <span className="text-[9px] font-bold text-emerald-400 tracking-[0.5em] mono-font">LIVE_LINK</span>
        </div>
      </div>
      
      <style>{`
        .scanner-line {
          height: 100%;
          width: 100%;
          background: linear-gradient(to bottom, transparent, rgba(16, 185, 129, 0.1), transparent);
          position: absolute;
          top: -100%;
          animation: scan 3s linear infinite;
        }
        @keyframes scan {
          0% { top: -100%; }
          100% { top: 100%; }
        }
      `}</style>
    </div>
  );
};

export default PulseCircle;
