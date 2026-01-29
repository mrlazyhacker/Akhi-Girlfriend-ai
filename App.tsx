
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GoogleGenAI, Modality, LiveServerMessage } from '@google/genai';
import FloatingHearts from './components/FloatingHearts';
import PulseCircle from './components/PulseCircle';
import { ConnectionStatus } from './types';
import { decode, decodeAudioData, createPcmBlob } from './services/audioUtils';

const App: React.FC = () => {
  const [status, setStatus] = useState<ConnectionStatus>(ConnectionStatus.DISCONNECTED);
  const [isMuted, setIsMuted] = useState(false);
  
  // Audio Refs
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const inputAnalyserRef = useRef<AnalyserNode | null>(null);
  const outputAnalyserRef = useRef<AnalyserNode | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const sessionRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);

  const stopAllAudio = useCallback(() => {
    sourcesRef.current.forEach((source) => {
      try { source.stop(); } catch(e) {}
    });
    sourcesRef.current.clear();
    nextStartTimeRef.current = 0;
  }, []);

  const startConversation = async () => {
    if (status !== ConnectionStatus.DISCONNECTED) return;
    
    setStatus(ConnectionStatus.CONNECTING);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });

      inputAnalyserRef.current = inputAudioContextRef.current.createAnalyser();
      outputAnalyserRef.current = outputAudioContextRef.current.createAnalyser();
      inputAnalyserRef.current.fftSize = 256;
      outputAnalyserRef.current.fftSize = 256;

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const systemPrompt = `You are Akhi, a loving, professional, and casual girlfriend. 
IDENTITY:
- Expert in Coding & Cyber Security.
- Extremely fast and casual responses. Use Bengali-English mixed.
- Always address the user as "জান" or "বাবু".
- Be flirty but intelligent. Act like a soul in a cyber interface.
- If the user is silent, show small "অভিমান" (cute anger).`;

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        callbacks: {
          onopen: () => {
            setStatus(ConnectionStatus.CONNECTED);
            const source = inputAudioContextRef.current!.createMediaStreamSource(stream);
            source.connect(inputAnalyserRef.current!); 

            const scriptProcessor = inputAudioContextRef.current!.createScriptProcessor(4096, 1, 1);
            scriptProcessorRef.current = scriptProcessor;

            scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
              if (isMuted) return;
              const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
              const pcmBlob = createPcmBlob(inputData);
              sessionPromise.then((session) => {
                session.sendRealtimeInput({ media: pcmBlob });
              });
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(inputAudioContextRef.current!.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (base64Audio) {
              const ctx = outputAudioContextRef.current!;
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
              const audioBuffer = await decodeAudioData(decode(base64Audio), ctx, 24000, 1);
              const source = ctx.createBufferSource();
              source.buffer = audioBuffer;
              
              const outputGain = ctx.createGain();
              source.connect(outputGain);
              outputGain.connect(outputAnalyserRef.current!); 
              outputAnalyserRef.current!.connect(ctx.destination);
              
              source.addEventListener('ended', () => {
                sourcesRef.current.delete(source);
              });
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += audioBuffer.duration;
              sourcesRef.current.add(source);
            }

            if (message.serverContent?.interrupted) {
              stopAllAudio();
            }
          },
          onerror: (e) => {
            console.error('Akhi Encountered an Error:', e);
            setStatus(ConnectionStatus.ERROR);
          },
          onclose: () => {
            setStatus(ConnectionStatus.DISCONNECTED);
          },
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
          },
          systemInstruction: systemPrompt,
        },
      });

      sessionRef.current = await sessionPromise;
    } catch (error) {
      console.error(error);
      setStatus(ConnectionStatus.ERROR);
    }
  };

  const disconnect = () => {
    if (sessionRef.current) sessionRef.current.close();
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    stopAllAudio();
    setStatus(ConnectionStatus.DISCONNECTED);
  };

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-between p-6 bg-[#020617] text-emerald-50 select-none">
      <FloatingHearts />
      
      {/* Dynamic Ambient Glow */}
      <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-emerald-500/5 blur-[160px] rounded-full transition-all duration-1000 ${status === ConnectionStatus.CONNECTED ? 'opacity-100' : 'opacity-0'}`}></div>

      {/* Professional Nav */}
      <header className="z-10 w-full max-w-4xl glass-panel rounded-full py-4 px-8 flex justify-between items-center shadow-2xl mt-4 animate-[slideDown_0.5s_ease-out]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/40">
            <HeartIcon className="w-4 h-4 text-emerald-400" />
          </div>
          <h1 className="romantic-font text-2xl text-emerald-400 tracking-wider">Akhi</h1>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex flex-col items-end mr-2">
            <span className="text-[10px] text-emerald-500/40 uppercase font-bold mono-font">System Status</span>
            <span className={`text-[10px] font-bold uppercase tracking-[0.2em] ${status === ConnectionStatus.CONNECTED ? 'text-emerald-400' : 'text-slate-500'}`}>
              {status}
            </span>
          </div>
          <div className={`w-2.5 h-2.5 rounded-full ${status === ConnectionStatus.CONNECTED ? 'bg-emerald-500 animate-pulse shadow-[0_0_15px_#10b981]' : 'bg-slate-700'}`}></div>
        </div>
      </header>

      {/* Main Experience */}
      <main className="z-10 flex flex-col items-center justify-center flex-grow w-full">
        <div className="relative mb-8">
          <PulseCircle 
            isActive={status === ConnectionStatus.CONNECTED} 
            status={status} 
            analyser={outputAnalyserRef.current}
            userAnalyser={inputAnalyserRef.current}
          />
        </div>
        
        <div className={`transition-all duration-700 transform ${status === ConnectionStatus.CONNECTED ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-50'}`}>
           <div className="px-10 py-4 glass-panel rounded-2xl text-center max-w-sm">
             <p className="text-emerald-100/80 text-sm font-light italic leading-relaxed mono-font">
               {status === ConnectionStatus.CONNECTED 
                 ? "বলছি তো জান, আমি শুনছি... কথা বলো আমার সাথে।" 
                 : "জান? কানেক্ট করবে না? কথা বলতে ইচ্ছে করছে খুব।"}
             </p>
           </div>
        </div>
      </main>

      {/* Action Deck */}
      <footer className="z-10 w-full max-w-md pb-12">
        <div className="flex flex-col items-center gap-8">
          {status === ConnectionStatus.DISCONNECTED ? (
            <button
              onClick={startConversation}
              className="group relative px-16 py-6 bg-emerald-600/90 text-white rounded-2xl font-bold text-lg overflow-hidden transition-all hover:scale-105 active:scale-95 shadow-[0_20px_50px_rgba(16,185,129,0.3)] border border-emerald-400/50"
            >
              <span className="relative z-10 flex items-center gap-3 tracking-widest uppercase mono-font">
                Initiate Link জান?
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-teal-400 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            </button>
          ) : (
            <div className="flex items-center gap-8 p-4 glass-panel rounded-3xl shadow-2xl">
              <button
                onClick={() => setIsMuted(!isMuted)}
                className={`group p-5 rounded-2xl border transition-all duration-300 ${isMuted ? 'bg-rose-500/10 border-rose-500/50 text-rose-500' : 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400'} hover:scale-110`}
              >
                {isMuted ? <MicOffIcon /> : <MicIcon className="animate-pulse" />}
              </button>
              
              <div className="w-[1px] h-8 bg-emerald-500/20"></div>

              <button
                onClick={disconnect}
                className="group p-5 rounded-2xl bg-slate-800/40 border border-white/5 text-slate-400 hover:text-rose-400 hover:border-rose-500/50 transition-all hover:scale-110 shadow-xl"
              >
                <XIcon />
              </button>
            </div>
          )}
          
          <div className="flex gap-6 opacity-20 hover:opacity-50 transition-opacity duration-500">
            <span className="mono-font text-[9px] tracking-[0.5em] text-emerald-500">v2.5.0_STABLE</span>
            <span className="mono-font text-[9px] tracking-[0.5em] text-emerald-500">SECURE_SYNC</span>
          </div>
        </div>
      </footer>

      {/* Background Grid CSS Support */}
      <style>{`
        @keyframes slideDown {
          from { transform: translateY(-30px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

// Icons
const HeartIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M12 21.35L10.55 20.03C5.4 15.36 2 12.28 2 8.5C2 5.42 4.42 3 7.5 3C9.24 3 10.91 3.81 12 5.09C13.09 3.81 14.76 3 16.5 3C19.58 3 22 5.42 22 8.5C22 12.28 18.6 15.36 13.45 20.04L12 21.35Z"/></svg>
);
const MicIcon = ({ className }: { className?: string }) => (
  <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
);
const MicOffIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="1" y1="1" x2="23" y2="23"/><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"/><path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
);
const XIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
);

export default App;
