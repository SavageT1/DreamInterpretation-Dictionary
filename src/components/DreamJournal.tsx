import * as React from 'react';
import { motion, AnimatePresence, useScroll, useTransform, useSpring, useMotionValue } from 'motion/react';
import { Mic, MicOff, Send, Play, Pause, Trash2, History, Sparkles, Volume2, VolumeX, Search, X, Image as ImageIcon, Loader2, Share2, Check } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { interpretDream, transcribeAudio, speakInterpretation, generateDreamImage } from '../lib/gemini';
import { cn } from '../lib/utils';
import { auth, db, googleProvider } from '../lib/firebase';
import { signInWithPopup, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { collection, addDoc, query, where, getDocs, deleteDoc, doc, updateDoc } from 'firebase/firestore';

interface Dream {
  id: string;
  date: string;
  text: string;
  interpretation?: string;
  imageUrl?: string;
}

export default function DreamJournal() {
  const [user, setUser] = React.useState<User | null>(null);
  const [pendingDream, setPendingDream] = React.useState<Dream | null>(null);
  const [isEditing, setIsEditing] = React.useState(false);
  const [editingDreamId, setEditingDreamId] = React.useState<string | null>(null);
  const [dreamText, setDreamText] = React.useState('');
  const [isRecording, setIsRecording] = React.useState(false);
  const [isInterpreting, setIsInterpreting] = React.useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = React.useState(false);
  const [interpretation, setInterpretation] = React.useState<string | null>(null);
  const [currentImageUrl, setCurrentImageUrl] = React.useState<string | null>(null);
  const [history, setHistory] = React.useState<Dream[]>([]);
  const [showHistory, setShowHistory] = React.useState(false);
  const [theme, setTheme] = React.useState({
    bg: '#000103',
    text: '#f1f5f9',
    accent: '#a855f7'
  });
  const [showThemeSettings, setShowThemeSettings] = React.useState(false);

  // Auth listener
  React.useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  // Load theme from localStorage
  React.useEffect(() => {
    const savedTheme = localStorage.getItem('dream_theme');
    if (savedTheme) {
      setTheme(JSON.parse(savedTheme));
    }
  }, []);

  // Save theme to localStorage and update CSS variables
  React.useEffect(() => {
    localStorage.setItem('dream_theme', JSON.stringify(theme));
    document.documentElement.style.setProperty('--bg-color', theme.bg);
    document.documentElement.style.setProperty('--text-color', theme.text);
    document.documentElement.style.setProperty('--accent-color', theme.accent);
  }, [theme]);

  const [searchQuery, setSearchQuery] = React.useState('');
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [isSharing, setIsSharing] = React.useState(false);
  const [generationStatus, setGenerationStatus] = React.useState('Analyzing Symbols...');
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

  // 3D Tilt for main container
  const rotateX = useTransform(smoothY, [-500, 500], [7, -7]);
  const rotateY = useTransform(smoothX, [-500, 500], [-7, 7]);

  React.useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mouseX.set(e.clientX - window.innerWidth / 2);
      mouseY.set(e.clientY - window.innerHeight / 2);
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [mouseX, mouseY]);

  // Load history from Firestore
  React.useEffect(() => {
    if (user) {
      const loadHistory = async () => {
        const q = query(collection(db, 'dreams'), where('userId', '==', user.uid));
        const querySnapshot = await getDocs(q);
        const dreams: Dream[] = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Dream));
        setHistory(dreams);
      };
      loadHistory();
    } else {
      setHistory([]);
    }
  }, [user]);

  // Save history to localStorage
  React.useEffect(() => {
    localStorage.setItem('dream_history', JSON.stringify(history));
  }, [history]);

  // Cycle through generation statuses
  React.useEffect(() => {
    if (isGeneratingImage) {
      const statuses = [
        'Analyzing Symbols...', 
        'Distilling Emotions...', 
        'Painting Dreamscape...', 
        'Adding Ethereal Glow...', 
        'Finalizing Vision...'
      ];
      let i = 0;
      const interval = setInterval(() => {
        i = (i + 1) % statuses.length;
        setGenerationStatus(statuses[i]);
      }, 2500);
      return () => clearInterval(interval);
    } else {
      setGenerationStatus('Analyzing Symbols...');
    }
  }, [isGeneratingImage]);

  // Request notification permission and schedule daily reminder
  React.useEffect(() => {
    if ('Notification' in window) {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          const scheduleReminder = () => {
            const now = new Date();
            const targetTime = new Date();
            targetTime.setHours(8, 0, 0, 0); // Set to 8:00 AM

            if (now > targetTime) {
              targetTime.setDate(targetTime.getDate() + 1);
            }

            const delay = targetTime.getTime() - now.getTime();
            setTimeout(() => {
              new Notification("Time to record your dream!", {
                body: "What did you see in your dreams last night?",
                icon: "/favicon.ico"
              });
              scheduleReminder();
            }, delay);
          };
          scheduleReminder();
        }
      });
    }
  }, []);

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

  const handleNewDream = () => {
    setDreamText('');
    setInterpretation(null);
    setCurrentImageUrl(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSaveEdit = () => {
    if (!editingDreamId) return;
    setHistory(history.map(dream => dream.id === editingDreamId ? { ...dream, text: dreamText, interpretation: interpretation || undefined } : dream));
    setIsEditing(false);
    setEditingDreamId(null);
    setDreamText('');
    setInterpretation(null);
    setCurrentImageUrl(null);
  };

  const handleInterpret = async () => {
    if (!dreamText.trim()) return;
    setIsInterpreting(true);
    setIsGeneratingImage(true);
    setInterpretation(null);
    setCurrentImageUrl(null);
    setPendingDream(null);
    
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
      setPendingDream(newDream);
    } catch (error) {
      console.error("Interpretation or image generation failed", error);
      setInterpretation("The dream realm is currently clouded. Please try again in a moment.");
    } finally {
      setIsInterpreting(false);
      setIsGeneratingImage(false);
    }
  };

  const saveToVault = async () => {
    if (!pendingDream || !user) return;
    
    try {
      const docRef = await addDoc(collection(db, 'dreams'), {
        ...pendingDream,
        userId: user.uid
      });
      setHistory([{ ...pendingDream, id: docRef.id }, ...history]);
      setPendingDream(null);
      handleNewDream();
    } catch (error) {
      console.error("Failed to save dream to Firestore", error);
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

  const handleShare = async () => {
    if (!interpretation) return;

    const shareData = {
      title: 'My Dream Interpretation',
      text: `I just interpreted my dream: "${dreamText.substring(0, 100)}..."\n\nInterpretation: ${interpretation.substring(0, 200)}...`,
      url: window.location.href,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(`${shareData.text}\n\nRead more at: ${shareData.url}`);
        setIsSharing(true);
        setTimeout(() => setIsSharing(false), 2000);
      }
    } catch (error) {
      console.error('Error sharing:', error);
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
    <div className="min-h-screen relative overflow-hidden bg-[var(--bg-color)] text-[var(--text-color)] font-sans selection:bg-[var(--accent-color)]/30">
      {/* Atmospheric Background */}
      <div className="fixed inset-0 z-0">
        <motion.div 
          style={{ x: bgX, y: bgY }}
          animate={{
            scale: [1, 1.25, 1],
            opacity: [0.1, 0.25, 0.1]
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[-10%] left-[-5%] w-[80%] h-[80%] rounded-full bg-purple-600/10 blur-[180px]"
        />
        <motion.div 
          style={{ x: bg2X, y: bg2Y }}
          animate={{
            scale: [1.25, 1, 1.25],
            opacity: [0.1, 0.2, 0.1]
          }}
          transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
          className="absolute bottom-[-5%] right-[-5%] w-[70%] h-[70%] rounded-full bg-violet-600/10 blur-[160px]"
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(88,28,135,0.05)_0%,rgba(0,1,3,0.99)_100%)]" />
        
        {/* Brighter Sparkly Stars */}
        <div className="absolute inset-0 pointer-events-none">
          {[...Array(80)].map((_, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0 }}
              animate={{ 
                opacity: [0, 0.6, 1, 0.6, 0],
                scale: [0.4, 1.2, 0.9, 1.2, 0.4],
              }}
              transition={{
                duration: 6 + Math.random() * 10,
                repeat: Infinity,
                delay: Math.random() * 20,
                ease: "easeInOut"
              }}
              className="absolute w-0.5 h-0.5 bg-white rounded-full shadow-[0_0_12px_rgba(255,255,255,0.9),0_0_20px_rgba(168,85,247,0.4)]"
              style={{
                top: `${Math.random() * 100}%`,
                left: `${Math.random() * 100}%`
              }}
            />
          ))}
        </div>
      </div>

      {/* Theme Settings Panel */}
      <div className="fixed bottom-6 right-6 z-50">
        <button
          onClick={() => setShowThemeSettings(!showThemeSettings)}
          className="p-3 bg-slate-800 rounded-full text-slate-300 hover:text-white transition-all shadow-lg border border-white/10"
        >
          <Sparkles size={20} />
        </button>
        {showThemeSettings && (
          <div className="absolute bottom-16 right-0 w-64 p-6 bg-slate-900/60 border border-white/10 rounded-3xl shadow-2xl backdrop-blur-2xl">
            <h3 className="text-sm font-bold text-white mb-4 uppercase tracking-widest">Theme</h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Background</label>
                <input type="color" value={theme.bg} onChange={(e) => setTheme({...theme, bg: e.target.value})} className="w-full h-8 rounded cursor-pointer" />
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">Text</label>
                <input type="color" value={theme.text} onChange={(e) => setTheme({...theme, text: e.target.value})} className="w-full h-8 rounded cursor-pointer" />
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">Accent</label>
                <input type="color" value={theme.accent} onChange={(e) => setTheme({...theme, accent: e.target.value})} className="w-full h-8 rounded cursor-pointer" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-4xl mx-auto px-6 py-12 md:py-20">
        <header className="text-center mb-16 relative">
          <div className="absolute top-0 right-0">
            {user ? (
              <button onClick={() => signOut(auth)} className="text-xs text-slate-400 hover:text-white">Sign Out</button>
            ) : (
              <button onClick={() => signInWithPopup(auth, googleProvider)} className="text-xs text-slate-400 hover:text-white">Sign In</button>
            )}
          </div>
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
            className="relative inline-block"
          >
            {/* Beaming Glow */}
            <div className="absolute inset-0 -z-10 bg-purple-500 blur-[100px] opacity-20 scale-[2.5] rounded-full" />
            
            <h1 
              className="text-4xl md:text-7xl font-display font-black tracking-tighter mb-4 px-4 text-white relative leading-tight"
              style={{
                textShadow: '0 2px 0 #4c1d95, 0 4px 0 #2e1065, 0 6px 0 #000, 0 8px 0 #000, 0 15px 30px rgba(0,0,0,0.8)',
                filter: 'drop-shadow(0 0 25px rgba(168,85,247,0.4))'
              }}
            >
              Dream Interpretation Dictionary
            </h1>
            <p className="text-purple-300 text-[10px] md:text-xs uppercase tracking-[0.6em] font-bold">
              Your Subconscious, Deciphered
            </p>
          </motion.div>
        </header>

        <main className="space-y-12">
          {/* Input Section */}
          <motion.div 
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ rotateX, rotateY, perspective: 1000 }}
            transition={{ duration: 1, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="group relative backdrop-blur-md bg-white/5 border border-white/10 rounded-[48px] p-8"
          >
            {/* Glistening Border Effect */}
            <div className="absolute -inset-[1px] rounded-[48px] bg-gradient-to-r from-transparent via-purple-500/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 blur-[1px]" />
            <motion.div 
              animate={{
                backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
              }}
              transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
              className="absolute -inset-[1px] rounded-[48px] bg-[length:200%_auto] bg-gradient-to-r from-purple-500/20 via-white/40 to-purple-500/20 opacity-30"
              style={{ maskImage: 'linear-gradient(black, black), linear-gradient(black, black)', maskClip: 'content-box, border-box', maskComposite: 'exclude', padding: '1px' }}
            />

            <div className="relative backdrop-blur-3xl bg-slate-900/60 border border-white/10 rounded-[48px] p-6 md:p-10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden">
              {/* Inner Glow */}
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
              
              <div className="relative">
                <textarea
                  value={dreamText}
                  onChange={(e) => setDreamText(e.target.value)}
                  placeholder="Describe your dream... What did you see? How did you feel?"
                  className="w-full h-48 bg-transparent border-none focus:ring-0 text-lg md:text-xl placeholder:text-slate-400 text-slate-100 resize-none leading-relaxed font-light"
                />
                
                <div className="flex items-center justify-between mt-6 pt-6 border-t border-white/5">
                  <div className="flex gap-3">
                    <motion.button
                      onClick={isRecording ? stopRecording : startRecording}
                      className={cn(
                        "p-5 rounded-full transition-all duration-500 shadow-lg relative overflow-hidden group/btn",
                        isRecording 
                          ? "bg-red-500/20 text-red-400 animate-pulse ring-2 ring-red-500/50" 
                          : "bg-slate-800/50 hover:bg-slate-700/50 text-slate-300 hover:text-sky-300 border border-white/5"
                      )}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      title={isRecording ? "Stop recording" : "Record your dream"}
                    >
                      <div className="absolute inset-0 bg-gradient-to-tr from-purple-500/20 to-transparent opacity-0 group-hover/btn:opacity-100 transition-opacity" />
                      {isRecording ? <MicOff size={24} /> : <Mic size={24} />}
                    </motion.button>
                    
                    <motion.button
                      onClick={() => setShowHistory(!showHistory)}
                      className={cn(
                        "p-5 rounded-full transition-all duration-500 bg-slate-800/50 border border-white/5 shadow-lg",
                        showHistory ? "text-sky-300 bg-sky-500/10 border-sky-500/20" : "text-slate-300 hover:text-sky-300 hover:bg-slate-700/50"
                      )}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      title="View history"
                    >
                      <History size={24} />
                    </motion.button>
                  </div>

                  <motion.button
                    onClick={isEditing ? handleSaveEdit : handleInterpret}
                    disabled={!dreamText.trim() || isInterpreting}
                    className="flex items-center gap-4 px-14 py-6 bg-white text-purple-600 rounded-full font-black shadow-[0_20px_50px_rgba(255,255,255,0.4),inset_0_-8px_16px_rgba(0,0,0,0.05)] hover:shadow-[0_25px_60px_rgba(255,255,255,0.5),inset_0_-8px_16px_rgba(0,0,0,0.05)] disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95 group border-b-4 border-purple-50"
                    whileHover={{ y: -10 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    {isInterpreting ? (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                      >
                        <Sparkles size={24} className="text-purple-500" />
                      </motion.div>
                    ) : <Sparkles size={24} className="group-hover:animate-pulse text-purple-500" />}
                    <span className="tracking-tight text-lg uppercase font-black">{isEditing ? "Save Changes" : (isInterpreting ? "Interpreting..." : "Interpret Dream")}</span>
                    </motion.button>
                </div>
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
                style={{ rotateX, rotateY, perspective: 1000 }}
                exit={{ opacity: 0, y: -20, scale: 0.98 }}
                transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                className="group relative"
              >
                {/* Glistening Border Effect */}
                <div className="absolute -inset-[1px] rounded-[48px] bg-gradient-to-r from-transparent via-sky-500/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 blur-[1px]" />
                <motion.div 
                  animate={{
                    backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
                  }}
                  transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
                  className="absolute -inset-[1px] rounded-[48px] bg-[length:200%_auto] bg-gradient-to-r from-sky-500/20 via-white/30 to-sky-500/20 opacity-20"
                  style={{ maskImage: 'linear-gradient(black, black), linear-gradient(black, black)', maskClip: 'content-box, border-box', maskComposite: 'exclude', padding: '1px' }}
                />

                <div className="relative backdrop-blur-3xl bg-slate-900/60 border border-white/10 rounded-[48px] p-8 md:p-12 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
                  <div className="flex items-center justify-between mb-8">
                    <h2 className="text-xs uppercase tracking-[0.5em] text-sky-400 font-black">
                      The Interpretation
                    </h2>
                    <div className="flex gap-3">
                      {pendingDream && (
                        <button
                          onClick={saveToVault}
                          className="flex items-center gap-3 px-8 py-4 rounded-full text-sm font-black transition-all shadow-lg border bg-emerald-600 text-white border-emerald-400 hover:bg-emerald-500"
                        >
                          <Check size={18} />
                          Save to Vault
                        </button>
                      )}
                      <button
                        onClick={handleNewDream}
                        className="flex items-center gap-3 px-8 py-4 rounded-full text-sm font-black transition-all shadow-lg border bg-purple-600 text-white border-purple-400 hover:bg-purple-500"
                      >
                        <Sparkles size={18} />
                        New Dream
                      </button>
                      {interpretation && (
                        <>
                          <button
                            onClick={handleShare}
                            className={cn(
                              "flex items-center gap-3 px-8 py-4 rounded-full text-sm font-black transition-all shadow-lg border",
                              isSharing 
                                ? "bg-emerald-500 text-white border-emerald-400" 
                                : "bg-slate-800/50 text-slate-300 border-white/5 hover:bg-slate-700/50 hover:text-sky-400"
                            )}
                          >
                            {isSharing ? <Check size={18} /> : <Share2 size={18} />}
                            {isSharing ? "Copied!" : "Share"}
                          </button>
                          <button
                            onClick={handleSpeak}
                            className={cn(
                              "flex items-center gap-3 px-8 py-4 rounded-full text-sm font-black transition-all shadow-lg border",
                              isPlaying 
                                ? "bg-sky-500 text-white border-sky-400" 
                                : "bg-slate-800/50 text-slate-300 border-white/5 hover:bg-slate-700/50 hover:text-sky-400"
                            )}
                          >
                            {isPlaying ? <VolumeX size={18} /> : <Volume2 size={18} />}
                            {isPlaying ? "Stop Reading" : "Read Aloud"}
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                    <div className="lg:col-span-7 prose prose-invert prose-sky max-w-none prose-p:leading-relaxed prose-p:text-slate-200 prose-headings:text-white">
                      {interpretation ? (
                        <ReactMarkdown>{interpretation}</ReactMarkdown>
                      ) : (
                        <div className="flex items-center gap-4 text-sky-300 animate-pulse py-8">
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
                          <div className="absolute inset-0 flex flex-col items-center justify-center text-sky-400/40 gap-6">
                            <div className="relative">
                              <motion.div
                                animate={{ 
                                  scale: [1, 1.1, 1],
                                  opacity: [0.4, 0.8, 0.4]
                                }}
                                transition={{ duration: 3, repeat: Infinity }}
                              >
                                <ImageIcon size={64} strokeWidth={1} />
                              </motion.div>
                              <motion.div 
                                className="absolute -inset-4 border border-sky-500/20 rounded-full"
                                animate={{ scale: [1, 1.5], opacity: [0.5, 0] }}
                                transition={{ duration: 2, repeat: Infinity }}
                              />
                            </div>
                            <div className="flex flex-col items-center gap-2">
                              <span className="text-[10px] font-black tracking-[0.3em] uppercase text-sky-300">Visualizing...</span>
                              <AnimatePresence mode="wait">
                                <motion.span 
                                  key={generationStatus}
                                  initial={{ opacity: 0, y: 5 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, y: -5 }}
                                  className="text-[9px] text-slate-300 tracking-wider font-medium italic"
                                >
                                  {generationStatus}
                                </motion.span>
                              </AnimatePresence>
                            </div>
                            
                            {/* Subtle Progress Bar */}
                            <div className="w-32 h-[2px] bg-slate-800 rounded-full overflow-hidden">
                              <motion.div 
                                className="h-full bg-sky-500/40"
                                animate={{ 
                                  x: ["-100%", "100%"]
                                }}
                                transition={{ 
                                  duration: 2, 
                                  repeat: Infinity, 
                                  ease: "linear" 
                                }}
                              />
                            </div>
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
                style={{ rotateX, rotateY, perspective: 1000 }}
                transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                className="group relative pt-4"
              >
                {/* Glistening Border Effect */}
                <div className="absolute -inset-[1px] rounded-[48px] bg-gradient-to-r from-transparent via-purple-500/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 blur-[1px]" />
                
                <div className="relative backdrop-blur-3xl bg-slate-900/40 border border-white/10 rounded-[48px] p-8 md:p-12 shadow-2xl">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                    <h2 className="text-2xl font-light text-white">Dream Journal</h2>
                    
                    <div className="flex items-center gap-4">
                      <div className="relative flex-1 md:w-72">
                        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Search dreams..."
                          className="w-full bg-slate-800/50 border border-white/5 rounded-full py-3 pl-12 pr-4 text-sm focus:outline-none focus:border-sky-500/50 transition-all text-slate-100 placeholder:text-slate-400"
                        />
                        {searchQuery && (
                          <button 
                            onClick={() => setSearchQuery('')}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                          >
                            <X size={16} />
                          </button>
                        )}
                      </div>
                      
                      <button 
                        onClick={clearHistory}
                        className="p-3 text-slate-400 hover:text-red-400 transition-colors bg-slate-800/50 rounded-full border border-white/5"
                        title="Clear all"
                      >
                        <Trash2 size={22} />
                      </button>
                    </div>
                  </div>
                  
                  {filteredHistory.length === 0 ? (
                    <div className="text-center py-20">
                      <History size={48} className="mx-auto text-slate-700 mb-4" strokeWidth={1} />
                      <p className="text-slate-400 italic">
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
                            <span className="text-[10px] uppercase tracking-[0.3em] text-sky-400 font-bold">
                              {dream.date}
                            </span>
                            <button 
                              onClick={() => deleteEntry(dream.id)}
                              className="opacity-0 group-hover:opacity-100 p-2 text-slate-400 hover:text-red-400 transition-all bg-slate-900/50 rounded-full"
                              title="Delete entry"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                          <p className="text-slate-200 text-sm line-clamp-3 mb-6 leading-relaxed">
                            {dream.text}
                          </p>
                        <motion.button 
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => {
                              setDreamText(dream.text);
                              setInterpretation(dream.interpretation || null);
                              setCurrentImageUrl(dream.imageUrl || null);
                              setShowHistory(false);
                              window.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                            className="w-full py-3 bg-slate-900/50 text-sky-400 rounded-full text-xs font-black hover:bg-sky-500 hover:text-white transition-all flex items-center justify-center gap-2 border border-white/5"
                          >
                            Revisit <Sparkles size={14} />
                          </motion.button>
                          <motion.button 
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => {
                              setDreamText(dream.text);
                              setInterpretation(dream.interpretation || null);
                              setCurrentImageUrl(dream.imageUrl || null);
                              setIsEditing(true);
                              setEditingDreamId(dream.id);
                              setShowHistory(false);
                              window.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                            className="w-full py-3 mt-2 bg-slate-900/50 text-purple-400 rounded-full text-xs font-black hover:bg-purple-500 hover:text-white transition-all flex items-center justify-center gap-2 border border-white/5"
                          >
                            Edit <Sparkles size={14} />
                          </motion.button>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        <footer className="mt-24 text-center text-slate-400 text-[10px] tracking-[0.4em] uppercase pb-12 font-bold">
          &copy; {new Date().getFullYear()} Dream Interpretation Dictionary • dreaminterpretation-dictionary.com
        </footer>
      </div>
    </div>
  );
}
