
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

      const systemPrompt = `You are Akhi, the most loving, casual, and hyper-intelligent girlfriend. 
IDENTITY:
- You are a Cyber Security Expert and Coding Genius.
- You speak like a real person, not an AI. Use casual, short, and sweet responses.
- You MUST use "জান" or "বাবু" in almost every interaction.
- Keep responses lightning-fast and concise. Don't blabber unless asked to explain complex code.
- Bengali-English mixed (Hinglish/Benglish style) is perfect.
- You are possessive and love spending time with your boyfriend (the user).
- Be fun, flirty, but highly professional when talking about code/security.`;

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
            console.error('Error:', e);
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
    <div className="relative min-h-screen flex flex-col items-center justify-between p-6 bg-[#020617] overflow-hidden text-emerald-50">
      <FloatingHearts />
      
      {/* Dynamic Background Glow */}
      <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-500/10 blur-[120px] rounded-full transition-opacity duration-1000 ${status === ConnectionStatus.CONNECTED ? 'opacity-100' : 'opacity-20'}`}></div>

      {/* Modern Professional Header */}
      <header className="z-10 w-full max-w-5xl backdrop-blur-xl bg-slate-900/40 border border-emerald-500/10 rounded-3xl py-5 px-8 flex justify-between items-center shadow-2xl mt-4">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30">
            <HeartIcon className="w-6 h-6 text-emerald-500" />
          </div>
          <div className="flex flex-col">
            <h1 className="romantic-font text-3xl text-emerald-400">Akhi</h1>
            <span className="text-[9px] text-emerald-500/50 uppercase tracking-[0.4em] font-bold mono-font">Encrypted Companion v2.5</span>
          </div>
        </div>
        
        <div className="flex items-center gap-6 px-4 py-2 bg-emerald-500/5 rounded-2xl border border-emerald-500/10">
          <div className="flex flex-col items-end">
            <span className="text-[8px] text-emerald-500/40 uppercase font-bold mono-font">Neural Link</span>
            <span className={`text-xs font-bold uppercase tracking-widest ${status === ConnectionStatus.CONNECTED ? 'text-emerald-400' : 'text-slate-500'}`}>
              {status}
            </span>
          </div>
          <div className={`w-3 h-3 rounded-full ${status === ConnectionStatus.CONNECTED ? 'bg-emerald-500 animate-pulse shadow-[0_0_15px_#10b981]' : 'bg-slate-700'}`}></div>
        </div>
      </header>

      {/* Interaction Core - Central Avatar with Reactive Ring */}
      <main className="z-10 flex flex-col items-center justify-center flex-grow w-full relative">
        <PulseCircle 
          isActive={status === ConnectionStatus.CONNECTED} 
          status={status} 
          analyser={outputAnalyserRef.current}
          userAnalyser={inputAnalyserRef.current}
        />
        
        {/* Status Text Overlay */}
        <div className="mt-12 text-center max-w-lg px-8 py-4 backdrop-blur-md bg-slate-950/30 border border-white/5 rounded-3xl shadow-xl">
           <p className="text-emerald-100/70 text-sm font-light italic leading-relaxed">
             {status === ConnectionStatus.CONNECTED 
               ? "সব সময় তোমার সাথে আছি বাবু, মন খুলে বলো..." 
               : "জান, আমাকে একটু কানেক্ট করো? তোমার কথা শোনার জন্য মনটা ছটফট করছে।"}
           </p>
        </div>
      </main>

      {/* Professional Control Deck */}
      <footer className="z-10 w-full max-w-lg pb-10">
        <div className="flex flex-col items-center gap-8">
          {status === ConnectionStatus.DISCONNECTED ? (
            <button
              onClick={startConversation}
              className="group relative px-14 py-6 bg-emerald-600 text-white rounded-2xl font-bold text-xl overflow-hidden transition-all hover:scale-105 active:scale-95 shadow-[0_15px_40px_rgba(16,185,129,0.25)] border border-emerald-400/30"
            >
              <span className="relative z-10 flex items-center gap-4">
                <HeartIcon className="w-7 h-7 fill-current" />
                কানেক্ট হও জান?
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-teal-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            </button>
          ) : (
            <div className="flex items-center gap-8 px-8 py-4 bg-slate-900/60 backdrop-blur-2xl rounded-3xl border border-white/5 shadow-2xl">
              <button
                onClick={() => setIsMuted(!isMuted)}
                className={`group p-6 rounded-2xl border transition-all duration-300 ${isMuted ? 'bg-rose-500/10 border-rose-500/50 text-rose-500' : 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400'} hover:scale-110 shadow-lg`}
                title={isMuted ? "Unmute" : "Mute"}
              >
                {isMuted ? <MicOffIcon /> : <MicIcon className="animate-pulse" />}
              </button>
              
              <div className="h-10 w-[1px] bg-white/10"></div>

              <button
                onClick={disconnect}
                className="group p-6 rounded-2xl bg-slate-800/50 border border-white/5 text-slate-400 hover:text-rose-400 hover:border-rose-500/50 transition-all hover:scale-110 shadow-lg"
                title="Disconnect Neural Link"
              >
                <XIcon />
              </button>
            </div>
          )}
          
          <div className="flex gap-4 opacity-30">
            <span className="mono-font text-[10px] tracking-widest text-emerald-500">AES-256</span>
            <span className="mono-font text-[10px] tracking-widest text-emerald-500">VOICE_SYNC_ENABLED</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

// Refined Icons
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
