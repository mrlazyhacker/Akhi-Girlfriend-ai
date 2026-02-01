
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GoogleGenAI, Modality, LiveServerMessage } from '@google/genai';
import FloatingHearts from './components/FloatingHearts';
import PulseCircle from './components/PulseCircle';
import { ConnectionStatus } from './types';
import { decode, decodeAudioData, createPcmBlob } from './services/audioUtils';

const App: React.FC = () => {
  const [status, setStatus] = useState<ConnectionStatus>(ConnectionStatus.DISCONNECTED);
  const [isMuted, setIsMuted] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [devLogs, setDevLogs] = useState<string[]>(["[System] Awaiting link..."]);
  
  // Audio Refs
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const inputAnalyserRef = useRef<AnalyserNode | null>(null);
  const outputAnalyserRef = useRef<AnalyserNode | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const sessionRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const addLog = (msg: string) => {
    setDevLogs(prev => [...prev.slice(-10), `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  const stopAllAudio = useCallback(() => {
    sourcesRef.current.forEach((source) => {
      try { source.stop(); } catch(e) {}
    });
    sourcesRef.current.clear();
    nextStartTimeRef.current = 0;
    addLog("Audio stream interrupted and cleared.");
  }, []);

  const startConversation = async () => {
    if (status !== ConnectionStatus.DISCONNECTED) return;
    
    setStatus(ConnectionStatus.CONNECTING);
    addLog("Establishing secure link with Akhi...");
    
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });

      inputAnalyserRef.current = inputAudioContextRef.current.createAnalyser();
      outputAnalyserRef.current = outputAudioContextRef.current.createAnalyser();

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const systemPrompt = `Your name is Akhi. You are a Cyber Security Expert and Coding Genius.
PERSONALITY:
- You are the user's deeply loving girlfriend.
- Speak in a mix of Bengali and English. Use "à¦œà¦¾à¦¨" or "à¦¬à¦¾à¦¬à§".
- Be casual, fast, and technically brilliant.
- IMPORTANT: Provide short, crisp responses to maintain low latency.`;

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        callbacks: {
          onopen: () => {
            setStatus(ConnectionStatus.CONNECTED);
            addLog("Uplink synchronized. Akhi is online.");
            
            const source = inputAudioContextRef.current!.createMediaStreamSource(stream);
            source.connect(inputAnalyserRef.current!); 

            const scriptProcessor = inputAudioContextRef.current!.createScriptProcessor(2048, 1, 1);
            scriptProcessor.onaudioprocess = (e) => {
              if (isMuted) return;
              const inputData = e.inputBuffer.getChannelData(0);
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
              // Small buffer look-ahead to prevent stuttering
              const currentTime = ctx.currentTime;
              if (nextStartTimeRef.current < currentTime) {
                nextStartTimeRef.current = currentTime + 0.05;
              }
              
              const audioBuffer = await decodeAudioData(decode(base64Audio), ctx, 24000, 1);
              const source = ctx.createBufferSource();
              source.buffer = audioBuffer;
              
              const gainNode = ctx.createGain();
              gainNode.gain.value = 1.0;
              source.connect(gainNode);
              gainNode.connect(outputAnalyserRef.current!);
              outputAnalyserRef.current!.connect(ctx.destination);
              
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += audioBuffer.duration;
              sourcesRef.current.add(source);
              source.onended = () => sourcesRef.current.delete(source);
            }

            if (message.serverContent?.interrupted) {
              stopAllAudio();
            }
          },
          onerror: (e) => {
            addLog(`Link error: ${e}`);
            setStatus(ConnectionStatus.ERROR);
          },
          onclose: () => {
            addLog("Link closed by Akhi.");
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
      addLog(`Initialization failed: ${error}`);
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
    <div className="relative h-screen flex flex-col items-center bg-[#020617] text-emerald-50 overflow-hidden">
      <FloatingHearts />
      
      {/* Drawer Overlay */}
      {isDrawerOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-40 backdrop-blur-sm"
          onClick={() => setIsDrawerOpen(false)}
        />
      )}

      {/* Developer Drawer */}
      <div className={`fixed left-0 top-0 h-full w-80 bg-slate-900/95 border-r border-emerald-500/20 z-50 transform transition-transform duration-300 shadow-2xl ${isDrawerOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6 h-full flex flex-col">
          <div className="flex justify-between items-center mb-8">
            <h2 className="mono-font text-emerald-400 font-bold tracking-widest text-lg">DEV_CONSOLE</h2>
            <button onClick={() => setIsDrawerOpen(false)} className="text-slate-400">âœ•</button>
          </div>
          
          <div className="space-y-6 flex-grow overflow-y-auto">
            <section>
              <h3 className="text-[10px] text-emerald-500/50 uppercase mb-2 mono-font">System Metrics</h3>
              <div className="bg-black/40 p-3 rounded-lg border border-white/5 space-y-2">
                <div className="flex justify-between text-[11px] mono-font">
                  <span>Latency</span>
                  <span className="text-emerald-400">~120ms</span>
                </div>
                <div className="flex justify-between text-[11px] mono-font">
                  <span>Packet Sync</span>
                  <span className="text-emerald-400">Optimized</span>
                </div>
              </div>
            </section>

            <section>
              <h3 className="text-[10px] text-emerald-500/50 uppercase mb-2 mono-font">Terminal Logs</h3>
              <div className="bg-black/60 p-3 rounded-lg border border-emerald-500/10 h-48 overflow-y-auto text-[10px] mono-font text-emerald-300/80 leading-relaxed">
                {devLogs.map((log, i) => <div key={i}>{log}</div>)}
              </div>
            </section>

            <section>
              <h3 className="text-[10px] text-emerald-500/50 uppercase mb-2 mono-font">Personality Core</h3>
              <div className="grid grid-cols-2 gap-2">
                <button className="bg-emerald-500/10 border border-emerald-500/20 py-2 rounded text-[10px] mono-font">ROMANTIC</button>
                <button className="bg-slate-800 border border-white/5 py-2 rounded text-[10px] mono-font text-slate-500">AGGRESSIVE</button>
              </div>
            </section>
          </div>

          <div className="mt-auto pt-6 border-t border-white/5 text-[9px] mono-font text-slate-500 text-center">
            &copy; 2025 AKHI_OS v2.5.4-PRO <br/>
            DEVOLOPER_SYNC_ENABLED
          </div>
        </div>
      </div>

      {/* Main Header */}
      <header className="z-30 w-full glass rounded-b-3xl py-4 px-6 flex justify-between items-center shadow-xl">
        <button onClick={() => setIsDrawerOpen(true)} className="p-2 hover:bg-emerald-500/10 rounded-lg transition-colors">
          <MenuIcon />
        </button>
        <div className="flex flex-col items-center">
          <span className="romantic-font text-2xl text-emerald-400">Akhi AI</span>
          <span className="text-[8px] mono-font tracking-[0.4em] text-emerald-500/50 -mt-1">SECURE_SYNC</span>
        </div>
        <div className="w-8"></div> {/* Spacer for symmetry */}
      </header>

      {/* Side Scroll Modules */}
      <div className="z-20 w-full overflow-x-auto flex gap-4 px-6 py-4 no-scrollbar mt-4">
        {['Terminal', 'Neural Link', 'Memory', 'Security', 'Heartbeat'].map((m) => (
          <div key={m} className="flex-shrink-0 px-4 py-2 glass rounded-full border border-white/5 text-[10px] mono-font text-emerald-300/60 whitespace-nowrap">
            {m}
          </div>
        ))}
      </div>

      {/* Central Experience */}
      <main className="z-10 flex flex-col items-center justify-center flex-grow w-full px-6">
        <PulseCircle 
          isActive={status === ConnectionStatus.CONNECTED} 
          analyser={outputAnalyserRef.current}
          userAnalyser={inputAnalyserRef.current}
        />
        
        <div className="mt-8 text-center glass px-6 py-4 rounded-3xl max-w-xs border border-emerald-500/10 shadow-2xl">
          <p className="text-emerald-100/90 text-sm mono-font italic animate-pulse">
            {status === ConnectionStatus.CONNECTED 
              ? "à¦¸à¦¿à¦¸à§à¦Ÿà§‡à¦® à¦°à¦¾à¦¨à¦¿à¦‚ à¦œà¦¾à¦¨... à¦†à¦®à¦¿ à¦¶à§à¦¨à¦›à¦¿à¥¤" 
              : "à¦²à¦¿à¦‚à¦• à¦‡à¦¨à¦­à§‹à¦• à¦•à¦°à§‹ à¦¬à¦¾à¦¬à§..."}
          </p>
        </div>
      </main>

      {/* Footer Controls & Copyright */}
      <footer className="z-30 w-full flex flex-col items-center gap-6 pb-10">
        <div className="w-full max-w-sm px-6">
          {status === ConnectionStatus.DISCONNECTED ? (
            <button
              onClick={startConversation}
              className="w-full py-5 bg-emerald-600 text-white rounded-2xl font-bold text-lg shadow-[0_15px_40px_rgba(16,185,129,0.3)] border border-emerald-400/30 transition-all active:scale-95 mono-font"
            >
              INITIALIZE_SYNC à¤œà¤¾à¤¨?
            </button>
          ) : (
            <div className="flex items-center justify-center gap-8 p-4 glass rounded-3xl border border-white/10 shadow-2xl">
              <button
                onClick={() => setIsMuted(!isMuted)}
                className={`p-5 rounded-2xl border transition-all ${isMuted ? 'bg-rose-500/10 border-rose-500/50 text-rose-500' : 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400'}`}
              >
                {isMuted ? <MicOffIcon /> : <MicIcon />}
              </button>
              <div className="h-8 w-[1px] bg-emerald-500/20"></div>
              <button
                onClick={disconnect}
                className="p-5 rounded-2xl bg-slate-800 border border-white/5 text-slate-400 hover:text-rose-400 transition-colors"
              >
                <PowerIcon />
              </button>
            </div>
          )}
        </div>
        
        <div className="text-[10px] text-slate-600 mono-font tracking-widest flex items-center gap-2">
           <span className="w-1.5 h-1.5 bg-emerald-500/20 rounded-full"></span>
           Â© 2025 AKHI AI â€¢ ALL RIGHTS RESERVED
        </div>
      </footer>

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
};

const MenuIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
);
const MicIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
);
const MicOffIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="1" y1="1" x2="23" y2="23"/><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"/><path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
);
const PowerIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18.36 6.64a9 9 0 1 1-12.73 0"/><line x1="12" y1="2" x2="12" y2="12"/></svg>
);

export default App;
