
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

    const bufferLength = 128;
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
      const baseRadius = canvas.width * 0.32;

      // Akhi's Voice Indicator (External Glowing Emerald Ring)
      if (isActive) {
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#10b981';
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 4;
        ctx.beginPath();
        for (let i = 0; i < bufferLength; i++) {
          const amplitude = dataArray[i] / 255.0;
          const barHeight = amplitude * 60;
          const angle = (i * 2 * Math.PI) / bufferLength;
          const x = centerX + (baseRadius + barHeight) * Math.cos(angle);
          const y = centerY + (baseRadius + barHeight) * Math.sin(angle);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.stroke();
      }

      // User Input Indicator (Inner Dotted Blue Ring)
      if (isActive) {
        ctx.shadowBlur = 0;
        ctx.strokeStyle = '#0ea5e9';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        for (let i = 0; i < bufferLength; i++) {
          const amplitude = userDataArray[i] / 255.0;
          const barHeight = amplitude * 30;
          const angle = (i * 2 * Math.PI) / bufferLength;
          const x = centerX + (baseRadius - 15 - barHeight) * Math.cos(angle);
          const y = centerY + (baseRadius - 15 - barHeight) * Math.sin(angle);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.stroke();
        ctx.setLineDash([]);
      }
    };

    draw();
    return () => cancelAnimationFrame(animationId);
  }, [isActive, analyser, userAnalyser]);

  return (
    <div className="relative flex items-center justify-center w-full max-w-[400px] aspect-square">
      <canvas 
        ref={canvasRef} 
        width={500} 
        height={500} 
        className="absolute inset-0 w-full h-full z-0 pointer-events-none transition-opacity duration-1000"
        style={{ opacity: isActive ? 1 : 0.2 }}
      />
      
      <div className={`relative w-3/4 h-3/4 rounded-full border-[4px] transition-all duration-1000 overflow-hidden bg-slate-900 z-10 ${isActive ? 'border-emerald-500 shadow-[0_0_50px_rgba(16,185,129,0.4)] scale-105' : 'border-slate-800 grayscale scale-100'}`}>
        <img 
          src="https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?auto=format&fit=crop&w=600&h=600&q=80" 
          alt="Akhi Portrait" 
          className="w-full h-full object-cover"
        />
        <div className="scanner-line"></div>
        
        <div className={`absolute inset-0 bg-gradient-to-t from-emerald-950/80 via-transparent to-transparent flex flex-col items-center justify-end pb-8 transition-opacity duration-700 ${isActive ? 'opacity-100' : 'opacity-0'}`}>
           <span className="text-[10px] font-bold text-emerald-400 tracking-[0.4em] mono-font animate-pulse">SYSTEM LIVE</span>
        </div>
      </div>
    </div>
  );
};

export default PulseCircle;
