
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

    const bufferLength = 128; // Higher resolution for smoother rings
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
      const radius = 105;

      // Akhi's Neural Voice Ring (Glowing Emerald)
      if (isActive) {
        ctx.beginPath();
        for (let i = 0; i < bufferLength; i++) {
          const amplitude = dataArray[i] / 255.0;
          const barHeight = amplitude * 50;
          const angle = (i * 2 * Math.PI) / bufferLength;
          const x = centerX + (radius + barHeight) * Math.cos(angle);
          const y = centerY + (radius + barHeight) * Math.sin(angle);
          
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 4;
        ctx.shadowBlur = 20;
        ctx.shadowColor = '#10b981';
        ctx.stroke();
      }

      // User's Response Ring (Sky Blue Pulse)
      if (isActive) {
        ctx.beginPath();
        ctx.shadowBlur = 0;
        for (let i = 0; i < bufferLength; i++) {
          const amplitude = userDataArray[i] / 255.0;
          const barHeight = amplitude * 30;
          const angle = (i * 2 * Math.PI) / bufferLength;
          // Inner ring with slight offset
          const x = centerX + (radius - 12 - barHeight) * Math.cos(angle);
          const y = centerY + (radius - 12 - barHeight) * Math.sin(angle);
          
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.strokeStyle = '#0ea5e9';
        ctx.lineWidth = 2;
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
        width={400} 
        height={400} 
        className="absolute z-0 pointer-events-none transition-opacity duration-1000"
        style={{ opacity: isActive ? 1 : 0.1 }}
      />
      
      <div className={`relative w-56 h-56 rounded-full border-[3px] transition-all duration-1000 overflow-hidden bg-slate-900 z-10 ${isActive ? 'border-emerald-500/50 shadow-[0_0_80px_rgba(16,185,129,0.2)] scale-110' : 'border-slate-800 scale-100 grayscale opacity-40'}`}>
        <img 
          src="https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&w=600&h=600&q=80" 
          alt="Akhi Portrait" 
          className="w-full h-full object-cover transition-transform duration-[3000ms] hover:scale-110"
        />
        
        {/* Professional Overlay */}
        <div className={`absolute inset-0 bg-gradient-to-t from-emerald-950/90 via-transparent to-emerald-500/5 flex flex-col items-center justify-end pb-8 transition-opacity duration-700 ${isActive ? 'opacity-100' : 'opacity-0'}`}>
           <div className="flex gap-1 mb-2">
             <div className="w-1 h-1 bg-emerald-400 rounded-full animate-bounce"></div>
             <div className="w-1 h-1 bg-emerald-400 rounded-full animate-bounce [animation-delay:0.2s]"></div>
             <div className="w-1 h-1 bg-emerald-400 rounded-full animate-bounce [animation-delay:0.4s]"></div>
           </div>
           <span className="text-[10px] font-bold text-emerald-300 tracking-[0.5em] mono-font uppercase">Connected</span>
        </div>
        
        {/* Subtle scanline effect */}
        <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(16,185,129,0)_50%,rgba(16,185,129,0.05)_50%)] bg-[length:100%_4px]"></div>
      </div>
    </div>
  );
};

export default PulseCircle;
