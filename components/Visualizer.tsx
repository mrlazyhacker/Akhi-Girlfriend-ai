
import React, { useEffect, useRef } from 'react';

interface VisualizerProps {
  analyser: AnalyserNode | null;
  color: string;
  isMirror?: boolean;
}

const Visualizer: React.FC<VisualizerProps> = ({ analyser, color, isMirror = false }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!analyser || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const barWidth = (canvas.width / bufferLength) * 2.5;
      let barHeight;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        barHeight = (dataArray[i] / 255) * canvas.height;
        ctx.fillStyle = color;
        
        const yPos = isMirror ? 0 : canvas.height - barHeight;
        ctx.fillRect(x, yPos, barWidth, barHeight);

        x += barWidth + 1;
      }
    };

    draw();
  }, [analyser, color, isMirror]);

  return <canvas ref={canvasRef} className="w-full h-16 opacity-60" width={300} height={64} />;
};

export default Visualizer;
