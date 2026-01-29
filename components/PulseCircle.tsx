
import React, { useEffect, useRef } from 'react';

interface PulseCircleProps {
  isActive: boolean;
  status: string;
  analyser: AnalyserNode | null;
  userAnalyser: AnalyserNode | null;
}

const PulseCircle: React.FC<PulseCircleProps> = ({ isActive, status, analyser, userAnalyser }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bufferLength = analyser?.frequencyBinCount || 64;
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
      const radius = 95;

      // Akhi's Voice Ring (Emerald)
      if (isActive) {
        ctx.beginPath();
        ctx.setLineDash([]); // Reset line dash
        for (let i = 0; i < bufferLength; i++) {
          const barHeight = (dataArray[i] / 255) * 45;
          const angle = (i * 2 * Math.PI) / bufferLength;
          const x = centerX + (radius + barHeight) * Math.cos(angle);
          const y = centerY + (radius + barHeight) * Math.sin(angle);
          
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 3;
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#10b981';
        ctx.stroke();
      }

      // User's Voice Ring (Sky Blue - Inner)
      if (isActive) {
        ctx.beginPath();
        ctx.setLineDash([2, 4]); // Technical dashed line look
        for (let i = 0; i < bufferLength; i++) {
          const barHeight = (userDataArray[i] / 255) * 20;
          const angle = (i * 2 * Math.PI) / bufferLength;
          const x = centerX + (radius - 8 - barHeight) * Math.cos(angle);
          const y = centerY + (radius - 8 - barHeight) * Math.sin(angle);
          
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.strokeStyle = '#0ea5e9';
        ctx.lineWidth = 2;
        ctx.shadowBlur = 0;
        ctx.stroke();
      }
    };

    draw();
    return () => cancelAnimationFrame(animationId);
  }, [isActive, analyser, userAnalyser]);

  return (
    <div className="relative flex items-center justify-center">
      <canvas 
        ref={canvasRef} 
        width={320} 
        height={320} 
        className="absolute z-0 pointer-events-none transition-opacity duration-1000"
        style={{ opacity: isActive ? 1 : 0.2 }}
      />
      
      <div className={`relative w-52 h-52 rounded-full border-2 transition-all duration-1000 overflow-hidden bg-slate-900 z-10 ${isActive ? 'border-emerald-500 shadow-[0_0_60px_rgba(16,185,129,0.4)] scale-105' : 'border-slate-800 scale-100 grayscale opacity-80'}`}>
        <img 
          src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=600&h=600&q=80" 
          alt="Akhi Portrait" 
          className="w-full h-full object-cover opacity-90 transition-all duration-1000"
        />
        {/* Technical scanning overlay effect */}
        <div className={`absolute inset-0 bg-gradient-to-t from-emerald-950/90 via-emerald-500/10 to-transparent flex flex-col items-center justify-end pb-6 transition-opacity duration-1000 ${isActive ? 'opacity-100' : 'opacity-0'}`}>
           <div className="w-1/2 h-[1px] bg-emerald-400/50 mb-2 animate-[pulse_2s_infinite]"></div>
           <span className="text-[9px] font-bold text-emerald-300 tracking-[0.4em] uppercase mono-font animate-pulse">NEURAL LINK ACTIVE</span>
        </div>
        
        {/* Subtle scanline */}
        <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%),linear-gradient(90deg,rgba(255,0,0,0.02),rgba(0,255,0,0.01),rgba(0,0,255,0.02))] bg-[length:100%_2px,3px_100%]"></div>
      </div>
    </div>
  );
};

export default PulseCircle;
