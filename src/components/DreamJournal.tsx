import * as React from 'react';
import { motion, AnimatePresence, useScroll, useTransform, useSpring, useMotionValue } from 'motion/react';
import { Mic, MicOff, Send, Play, Pause, Trash2, History, Sparkles, Volume2, VolumeX, Search, X, Image as ImageIcon, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { interpretDream, transcribeAudio, speakInterpretation, generateDreamImage } from '../lib/gemini';
import { cn } from '../lib/utils';

interface Dream {
  id: string;
  date: string;
  text: string;
  interpretation?: string;
  imageUrl?: string;
}

export default function DreamJournal() {
  const [dreamText, setDreamText] = React.useState('');
  const [isRecording, setIsRecording] = React.useState(false);
  const [isInterpreting, setIsInterpreting] = React.useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = React.useState(false);
  const [interpretation, setInterpretation] = React.useState<string | null>(null);
  const [currentImageUrl, setCurrentImageUrl] = React.useState<string | null>(null);
  const [history, setHistory] = React.useState<Dream[]>([]);
  const [showHistory, setShowHistory] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [audioContext, setAudioContext] = React.useState<AudioContext | null>(null);
  const [audioBufferSource, setAudioBufferSource] = React.useState<AudioBufferSourceNode | null>(null);

  const mediaRecorderRef = React.useRef<MediaRecorder | null>(null);
  const chunksRef = React.useRef<Blob[]>([]);

  // Parallax effects
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const springConfig = { damping: 25, stiffness: 150 };
  const smoothX = useSpring(mouseX, springConfig);
  const smoothY = useSpring(mouseY, springConfig);

  const bgX = useTransform(smoothX, [-500, 500], [20, -20]);
  const bgY = useTransform(smoothY, [-500, 500], [20, -20]);
  const bg2X = useTransform(smoothX, [-500, 500], [-30, 30]);
  const bg2Y = useTransform(smoothY, [-500, 500], [-30, 30]);

  React.useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mouseX.set(e.clientX - window.innerWidth / 2);
      mouseY.set(e.clientY - window.innerHeight / 2);
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [mouseX, mouseY]);

  // Load history from localStorage
  React.useEffect(() => {
    const saved = localStorage.getItem('dream_history');
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse history", e);
      }
    }
  }, []);

  // Save history to localStorage
  React.useEffect(() => {
    localStorage.setItem('dream_history', JSON.stringify(history));
  }, [history]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = async () => {
          const base64 = (reader.result as string).split(',')[1];
          setIsInterpreting(true);
          try {
            const transcription = await transcribeAudio(base64, 'audio/webm');
            setDreamText((prev) => prev + (prev ? ' ' : '') + transcription);
          } catch (error) {
            console.error("Transcription failed", error);
          } finally {
            setIsInterpreting(false);
          }
        };
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Failed to start recording", err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
  };

  const handleInterpret = async () => {
    if (!dreamText.trim()) return;
    setIsInterpreting(true);
    setIsGeneratingImage(true);
    setInterpretation(null);
    setCurrentImageUrl(null);
    
    try {
      // Run interpretation and image generation in parallel
      const [interpretationResult, imageUrlResult] = await Promise.all([
        interpretDream(dreamText),
        generateDreamImage(dreamText)
      ]);

      setInterpretation(interpretationResult);
      setCurrentImageUrl(imageUrlResult);
      
      const newDream: Dream = {
        id: Date.now().toString(),
        date: new Date().toLocaleString(),
        text: dreamText,
        interpretation: interpretationResult,
        imageUrl: imageUrlResult || undefined
      };
      setHistory([newDream, ...history]);
    } catch (error) {
      console.error("Interpretation or image generation failed", error);
      setInterpretation("The dream realm is currently clouded. Please try again in a moment.");
    } finally {
      setIsInterpreting(false);
      setIsGeneratingImage(false);
    }
  };

  const handleSpeak = async () => {
    if (!interpretation || isPlaying) {
      if (isPlaying && audioBufferSource) {
        audioBufferSource.stop();
        setIsPlaying(false);
      }
      return;
    }

    setIsPlaying(true);
    try {
      const audioData = await speakInterpretation(interpretation);
      if (!audioData) {
        setIsPlaying(false);
        return;
      }

      const ctx = audioContext || new (window.AudioContext || (window as any).webkitAudioContext)();
      if (!audioContext) setAudioContext(ctx);

      // PCM 24000Hz 16-bit Mono
      const buffer = ctx.createBuffer(1, audioData.length / 2, 24000);
      const channelData = buffer.getChannelData(0);
      const view = new DataView(audioData.buffer);
      
      for (let i = 0; i < channelData.length; i++) {
        // Int16 to Float32
        channelData[i] = view.getInt16(i * 2, true) / 32768;
      }

      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.onended = () => setIsPlaying(false);
      source.start();
      setAudioBufferSource(source);
    } catch (error) {
      console.error("TTS failed", error);
      setIsPlaying(false);
    }
  };

  const clearHistory = () => {
    if (confirm("Are you sure you want to clear your entire dream journal?")) {
      setHistory([]);
    }
  };

  const deleteEntry = (id: string) => {
    setHistory(history.filter(item => item.id !== id));
  };

  const filteredHistory = history.filter(dream => 
    dream.text.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (dream.interpretation?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="min-h-screen relative overflow-hidden bg-[#020617] text-slate-100 font-sans selection:bg-sky-500/30">
      {/* Atmospheric Background */}
      <div className="fixed inset-0 z-0">
        <motion.div 
          style={{ x: bgX, y: bgY }}
          animate={{
            scale: [1, 1.1, 1],
            opacity: [0.3, 0.5, 0.3]
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[-10%] left-[-5%] w-[80%] h-[80%] rounded-full bg-sky-500/10 blur-[140px]"
        />
        <motion.div 
          style={{ x: bg2X, y: bg2Y }}
          animate={{
            scale: [1.1, 1, 1.1],
            opacity: [0.2, 0.4, 0.2]
          }}
          transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
          className="absolute bottom-[-5%] right-[-5%] w-[70%] h-[70%] rounded-full bg-indigo-500/10 blur-[120px]"
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(15,23,42,0)_0%,rgba(2,6,23,0.9)_100%)]" />
        
        {/* Subtle Stars/Dust */}
        <div className="absolute inset-0 opacity-20 pointer-events-none">
          {[...Array(20)].map((_, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0 }}
              animate={{ 
                opacity: [0, 1, 0],
                scale: [0.5, 1, 0.5]
              }}
              transition={{
                duration: 3 + Math.random() * 5,
                repeat: Infinity,
                delay: Math.random() * 5
              }}
              className="absolute w-1 h-1 bg-white rounded-full"
              style={{
                top: `${Math.random() * 100}%`,
                left: `${Math.random() * 100}%`
              }}
            />
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-4xl mx-auto px-6 py-12 md:py-20">
        <header className="text-center mb-16 relative">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
            className="relative inline-block"
          >
            {/* Beaming Glow */}
            <div className="absolute inset-0 -z-10 bg-sky-400 blur-[100px] opacity-20 scale-[2.5] rounded-full" />
            
            <h1 
              className="text-4xl md:text-6xl font-black tracking-tighter mb-4 px-4 text-white relative"
              style={{
                textShadow: '0 1px 0 #1e293b, 0 2px 0 #0f172a, 0 3px 0 #020617, 0 4px 0 #000, 0 8px 16px rgba(0,0,0,0.5)',
                filter: 'drop-shadow(0 0 20px rgba(56,189,248,0.3))'
              }}
            >
              Dream Interpretation Dictionary
            </h1>
            <p className="text-sky-400/60 text-[10px] md:text-xs uppercase tracking-[0.6em] font-bold">
              Your Subconscious, Deciphered
            </p>
          </motion.div>
        </header>

        <main className="space-y-12">
          {/* Input Section */}
          <motion.div 
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="backdrop-blur-2xl bg-slate-900/40 border border-white/10 rounded-[48px] p-6 md:p-10 shadow-2xl shadow-black/50"
          >
            <div className="relative">
              <textarea
                value={dreamText}
                onChange={(e) => setDreamText(e.target.value)}
                placeholder="Describe your dream... What did you see? How did you feel?"
                className="w-full h-48 bg-transparent border-none focus:ring-0 text-lg md:text-xl placeholder:text-slate-600 text-slate-100 resize-none leading-relaxed"
              />
              
              <div className="flex items-center justify-between mt-6 pt-6 border-t border-white/5">
                <div className="flex gap-3">
                  <button
                    onClick={isRecording ? stopRecording : startRecording}
                    className={cn(
                      "p-5 rounded-[2.5rem] transition-all duration-500 shadow-lg",
                      isRecording 
                        ? "bg-red-500/20 text-red-400 animate-pulse ring-2 ring-red-500/50" 
                        : "bg-slate-800/50 hover:bg-slate-700/50 text-slate-400 hover:text-sky-400 border border-white/5"
                    )}
                    title={isRecording ? "Stop recording" : "Record your dream"}
                  >
                    {isRecording ? <MicOff size={24} /> : <Mic size={24} />}
                  </button>
                  
                  <button
                    onClick={() => setShowHistory(!showHistory)}
                    className={cn(
                      "p-5 rounded-[2.5rem] transition-all duration-500 bg-slate-800/50 border border-white/5 shadow-lg",
                      showHistory ? "text-sky-400 bg-sky-500/10 border-sky-500/20" : "text-slate-400 hover:text-sky-400 hover:bg-slate-700/50"
                    )}
                    title="View history"
                  >
                    <History size={24} />
                  </button>
                </div>

                <button
                  onClick={handleInterpret}
                  disabled={!dreamText.trim() || isInterpreting}
                  className="flex items-center gap-4 px-12 py-5 bg-sky-500 text-white rounded-[3rem] rounded-tl-[1.5rem] rounded-br-[1.5rem] font-black shadow-xl shadow-sky-500/20 hover:shadow-sky-500/40 hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95 group border border-sky-400/50"
                >
                  {isInterpreting ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    >
                      <Sparkles size={22} />
                    </motion.div>
                  ) : <Sparkles size={22} className="group-hover:animate-pulse" />}
                  <span className="tracking-tight">{isInterpreting ? "Interpreting..." : "Interpret Dream"}</span>
                </button>
              </div>
            </div>
          </motion.div>

          {/* Interpretation Result */}
          <AnimatePresence mode="wait">
            {(interpretation || isGeneratingImage) && (
              <motion.div
                key="result"
                initial={{ opacity: 0, y: 50, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.98 }}
                transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                className="backdrop-blur-2xl bg-slate-900/60 border border-white/10 rounded-[48px] p-8 md:p-12 shadow-2xl shadow-black/50"
              >
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-xs uppercase tracking-[0.5em] text-sky-400 font-black">
                    The Interpretation
                  </h2>
                  <div className="flex gap-3">
                    {interpretation && (
                      <button
                        onClick={handleSpeak}
                        className={cn(
                          "flex items-center gap-3 px-8 py-4 rounded-[2.5rem] text-sm font-black transition-all shadow-lg border",
                          isPlaying 
                            ? "bg-sky-500 text-white border-sky-400" 
                            : "bg-slate-800/50 text-slate-300 border-white/5 hover:bg-slate-700/50 hover:text-sky-400"
                        )}
                      >
                        {isPlaying ? <VolumeX size={18} /> : <Volume2 size={18} />}
                        {isPlaying ? "Stop Reading" : "Read Aloud"}
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                  <div className="lg:col-span-7 prose prose-invert prose-sky max-w-none prose-p:leading-relaxed prose-p:text-slate-300 prose-headings:text-white">
                    {interpretation ? (
                      <ReactMarkdown>{interpretation}</ReactMarkdown>
                    ) : (
                      <div className="flex items-center gap-4 text-sky-400/60 animate-pulse py-8">
                        <Loader2 className="animate-spin" size={24} />
                        <span className="text-lg font-light tracking-wide">Deciphering your subconscious...</span>
                      </div>
                    )}
                  </div>

                  <div className="lg:col-span-5">
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.4, duration: 1 }}
                      className="aspect-square rounded-[3rem] overflow-hidden bg-slate-800/50 border border-white/5 relative group shadow-2xl"
                    >
                      {isGeneratingImage ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-sky-400/40 gap-4">
                          <motion.div
                            animate={{ 
                              scale: [1, 1.1, 1],
                              opacity: [0.4, 0.8, 0.4]
                            }}
                            transition={{ duration: 3, repeat: Infinity }}
                          >
                            <ImageIcon size={64} strokeWidth={1} />
                          </motion.div>
                          <span className="text-[10px] font-black tracking-[0.3em] uppercase">Visualizing...</span>
                        </div>
                      ) : currentImageUrl ? (
                        <motion.img
                          initial={{ opacity: 0, scale: 1.2 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ duration: 1.5, ease: "easeOut" }}
                          src={currentImageUrl}
                          alt="Dream visualization"
                          className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-slate-700">
                          <ImageIcon size={64} strokeWidth={1} />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />
                    </motion.div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* History Section */}
          <AnimatePresence>
            {showHistory && (
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                className="overflow-hidden pt-4"
              >
                <div className="backdrop-blur-2xl bg-slate-900/40 border border-white/10 rounded-[48px] p-8 md:p-12 shadow-2xl">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                    <h2 className="text-2xl font-light text-white">Dream Journal</h2>
                    
                    <div className="flex items-center gap-4">
                      <div className="relative flex-1 md:w-72">
                        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Search dreams..."
                          className="w-full bg-slate-800/50 border border-white/5 rounded-full py-3 pl-12 pr-4 text-sm focus:outline-none focus:border-sky-500/50 transition-all text-slate-100 placeholder:text-slate-600"
                        />
                        {searchQuery && (
                          <button 
                            onClick={() => setSearchQuery('')}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                          >
                            <X size={16} />
                          </button>
                        )}
                      </div>
                      
                      <button 
                        onClick={clearHistory}
                        className="p-3 text-slate-600 hover:text-red-400 transition-colors bg-slate-800/50 rounded-full border border-white/5"
                        title="Clear all"
                      >
                        <Trash2 size={22} />
                      </button>
                    </div>
                  </div>
                  
                  {filteredHistory.length === 0 ? (
                    <div className="text-center py-20">
                      <History size={48} className="mx-auto text-slate-800 mb-4" strokeWidth={1} />
                      <p className="text-slate-500 italic">
                        {searchQuery ? "No dreams match your search." : "Your journal is empty. Start by sharing a dream."}
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {filteredHistory.map((dream) => (
                        <motion.div 
                          key={dream.id} 
                          layout
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="group bg-slate-800/30 border border-white/5 rounded-[32px] p-6 hover:bg-slate-800/50 transition-all duration-500"
                        >
                          <div className="flex justify-between items-start mb-4">
                            <span className="text-[10px] uppercase tracking-[0.3em] text-sky-500/60 font-bold">
                              {dream.date}
                            </span>
                            <button 
                              onClick={() => deleteEntry(dream.id)}
                              className="opacity-0 group-hover:opacity-100 p-2 text-slate-600 hover:text-red-400 transition-all bg-slate-900/50 rounded-full"
                              title="Delete entry"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                          <p className="text-slate-300 text-sm line-clamp-3 mb-6 leading-relaxed">
                            {dream.text}
                          </p>
                          <button 
                            onClick={() => {
                              setDreamText(dream.text);
                              setInterpretation(dream.interpretation || null);
                              setCurrentImageUrl(dream.imageUrl || null);
                              setShowHistory(false);
                              window.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                            className="w-full py-3 bg-slate-900/50 text-sky-400 rounded-2xl text-xs font-black hover:bg-sky-500 hover:text-white transition-all flex items-center justify-center gap-2 border border-white/5"
                          >
                            Revisit <Sparkles size={14} />
                          </button>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        <footer className="mt-24 text-center text-slate-600 text-[10px] tracking-[0.4em] uppercase pb-12 font-bold">
          &copy; {new Date().getFullYear()} Dream Interpretation Dictionary • dreaminterpretation-dictionary.com
        </footer>
      </div>
    </div>
  );
}
