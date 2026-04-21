import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Mic, MicOff, Radio, RefreshCw, Volume2, VolumeX } from 'lucide-react';
import { Button } from './ui/button';

const STUN_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

const VoiceChat = ({ socket, matchId, role, userId }) => {
  const [isMuted, setIsMuted] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);
  const [remoteActivity, setRemoteActivity] = useState(0);
  const [localActivity, setLocalActivity] = useState(0);
  const [isSpeakerMuted, setIsSpeakerMuted] = useState(false);

  const isSpectator = role === 'spectator';
  const localStreamRef = useRef(null);
  const peerConnectionsRef = useRef(new Map()); // map of sid -> pc
  const remoteStreamsRef = useRef(new Map()); // map of sid -> stream
  const remoteAudioElementsRef = useRef(new Map()); // map of sid -> audio element
  const iceQueuesRef = useRef(new Map()); // map of sid -> candidate[]
  
  const audioContextRef = useRef(null);
  const remoteAnalyzersRef = useRef(new Map()); // map of sid -> analyzer
  const remoteSourcesRef = useRef(new Map()); // map of sid -> source

  useEffect(() => {
    if (!socket || !matchId || !role) return;
    let cancelled = false;

    const getOrCreatePC = (sid, isInitiator = false) => {
      if (peerConnectionsRef.current.has(sid)) return peerConnectionsRef.current.get(sid);

      console.log(`Creating PC for ${sid} as ${isInitiator ? 'initiator' : 'receiver'}`);
      const pc = new RTCPeerConnection(STUN_SERVERS);
      peerConnectionsRef.current.set(sid, pc);

      if (!isSpectator && localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(t => pc.addTrack(t, localStreamRef.current));
      }

      pc.ontrack = (event) => {
        if (cancelled) return;
        const rStream = event.streams[0] || new MediaStream([event.track]);
        remoteStreamsRef.current.set(sid, rStream);

        // Create or update audio element for this sid
        let audioEl = remoteAudioElementsRef.current.get(sid);
        if (!audioEl) {
          audioEl = new Audio();
          audioEl.autoplay = true;
          audioEl.playsInline = true;
          remoteAudioElementsRef.current.set(sid, audioEl);
        }
        audioEl.srcObject = rStream;
        audioEl.play().catch(e => {
          if (e.name !== 'AbortError') console.warn("Autoplay deferred:", e.message);
        });

        if (audioContextRef.current?.state === 'running') {
          wireRemoteVisualizer(sid, rStream);
        }
      };

      pc.onicecandidate = (e) => {
        if (cancelled || !e.candidate) return;
        socket.emit('webrtc_ice_candidate', { 
          match_id: matchId, 
          candidate: e.candidate,
          target_sid: sid
        });
      };

      pc.oniceconnectionstatechange = () => {
        if (cancelled) return;
        const s = pc.iceConnectionState;
        console.log(`ICE with ${sid}:`, s);
        if (s === 'connected' || s === 'completed') {
          setIsConnected(true);
        }
        if (s === 'disconnected' || s === 'failed') {
          // If all connections are dead, setIsConnected(false)
          const anyActive = Array.from(peerConnectionsRef.current.values())
            .some(conn => ['connected', 'completed'].includes(conn.iceConnectionState));
          setIsConnected(anyActive);
        }
      };

      return pc;
    };

    const handleOffer = async (data) => {
      if (cancelled) return;
      const sid = data.from_sid || 'player'; // fallback for backward compatibility
      const pc = getOrCreatePC(sid, false);
      
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit('webrtc_answer', { 
          match_id: matchId, 
          answer,
          target_sid: sid
        });
        
        const queue = iceQueuesRef.current.get(sid) || [];
        while (queue.length > 0) {
          await pc.addIceCandidate(new RTCIceCandidate(queue.shift()));
        }
      } catch (err) { console.error("Offer error:", err); }
    };

    const handleAnswer = async (data) => {
      if (cancelled) return;
      const sid = data.from_sid || 'player';
      const pc = peerConnectionsRef.current.get(sid);
      if (!pc) return;
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
        const queue = iceQueuesRef.current.get(sid) || [];
        while (queue.length > 0) {
          await pc.addIceCandidate(new RTCIceCandidate(queue.shift()));
        }
      } catch (err) { console.error("Answer error:", err); }
    };

    const handleIce = async (data) => {
      if (cancelled) return;
      const sid = data.from_sid || 'player';
      const pc = peerConnectionsRef.current.get(sid);
      const candidate = data.candidate;
      
      if (pc && pc.remoteDescription?.type) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(() => {});
      } else {
        const queue = iceQueuesRef.current.get(sid) || [];
        queue.push(candidate);
        iceQueuesRef.current.set(sid, queue);
      }
    };

    const handleStartWebRTC = async () => {
      if (cancelled || role !== 'player1') return;
      const pc = getOrCreatePC('player2', true); // P1 connects to P2
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit('webrtc_offer', { match_id: matchId, offer, target_sid: null });
      } catch (err) { console.error("Offer creation error:", err); }
    };

    const handleSpectatorVoiceReady = async (data) => {
      if (cancelled || isSpectator) return;
      const specSid = data.spectator_sid;
      console.log("Initiating outgoing voice to spectator:", specSid);
      const pc = getOrCreatePC(specSid, true);
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit('webrtc_offer', { 
          match_id: matchId, 
          offer, 
          target_sid: specSid 
        });
      } catch (err) { console.error("Spectator offer error:", err); }
    };

    const setup = async () => {
      try {
        if (!isSpectator) {
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
          });
          if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }
          localStreamRef.current = stream;
          stream.getAudioTracks().forEach(t => { t.enabled = false; });
        }

        socket.on('webrtc_offer', (data) => {
           // On server-side we now wrap and add from_sid, but here we just accept
           handleOffer(data);
        });
        socket.on('webrtc_answer', handleAnswer);
        socket.on('webrtc_ice_candidate', handleIce);
        socket.on('start_webrtc', handleStartWebRTC);
        socket.on('spectator_voice_ready', handleSpectatorVoiceReady);

        const onUnlock = () => {
          console.log("Audio unlocked via global event");
          initAudioEngine();
          window.removeEventListener('unlock_audio', onUnlock);
        };
        window.addEventListener('unlock_audio', onUnlock);

        if (isSpectator) {
           socket.emit('spectator_voice_ready', { match_id: matchId });
        } else {
           socket.emit('webrtc_ready', { match_id: matchId, user_id: userId });
        }

      } catch (err) {
        console.error('VoiceChat setup error:', err);
        setError(isSpectator ? "Audio non disponible" : "Micro non accessible");
      }
    };

    setup();

    return () => {
      cancelled = true;
      localStreamRef.current?.getTracks().forEach(t => t.stop());
      peerConnectionsRef.current.forEach(pc => pc.close());
      peerConnectionsRef.current.clear();
      remoteAudioElementsRef.current.forEach(el => { el.srcObject = null; el.remove(); });
      remoteAudioElementsRef.current.clear();
      
      socket.off('webrtc_offer');
      socket.off('webrtc_answer');
      socket.off('webrtc_ice_candidate');
      socket.off('start_webrtc');
      socket.off('spectator_voice_ready');

      if (audioContextRef.current?.state !== 'closed') {
        audioContextRef.current?.close().catch(() => {});
      }
    };
  }, [socket, matchId, role, userId, isSpectator]);

  const wireRemoteVisualizer = (sid, rStream) => {
    const ctx = audioContextRef.current;
    if (!ctx || !rStream) return;
    try {
      const oldSrc = remoteSourcesRef.current.get(sid);
      if (oldSrc) oldSrc.disconnect();
      
      const src = ctx.createMediaStreamSource(rStream);
      const an = ctx.createAnalyser(); an.fftSize = 256;
      src.connect(an); 
      remoteSourcesRef.current.set(sid, src);
      remoteAnalyzersRef.current.set(sid, an);
      
      const buf = new Uint8Array(an.frequencyBinCount);
      const tick = () => {
        if (!remoteAnalyzersRef.current.has(sid)) return;
        an.getByteFrequencyData(buf);
        const activity = buf.reduce((a, b) => a + b, 0) / buf.length;
        
        // Update global remote activity (simple max for now)
        setRemoteActivity(prev => Math.max(prev, activity));
        
        // Reset after a short delay
        setTimeout(() => setRemoteActivity(0), 100);
        
        requestAnimationFrame(tick);
      };
      tick();
    } catch (e) { console.warn("Visualizer error:", e); }
  };

  const initAudioEngine = useCallback(() => {
    if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    const ctx = audioContextRef.current;
    if (ctx.state === 'suspended') ctx.resume();

    if (localStreamRef.current) {
      const src = ctx.createMediaStreamSource(localStreamRef.current);
      const an = ctx.createAnalyser(); an.fftSize = 256;
      src.connect(an);
      const buf = new Uint8Array(an.frequencyBinCount);
      const tick = () => {
        an.getByteFrequencyData(buf);
        setLocalActivity(buf.reduce((a, b) => a + b, 0) / buf.length);
        requestAnimationFrame(tick);
      };
      tick();
    }

    remoteStreamsRef.current.forEach((stream, sid) => {
      wireRemoteVisualizer(sid, stream);
    });

    remoteAudioElementsRef.current.forEach(el => {
      el.play().catch(() => {});
    });
  }, []);

  const toggleMute = () => {
    initAudioEngine();
    const next = !isMuted;
    setIsMuted(next);
    localStreamRef.current?.getAudioTracks().forEach(t => { t.enabled = !next; });
  };

  const toggleSpeaker = () => {
    initAudioEngine();
    const next = !isSpeakerMuted;
    setIsSpeakerMuted(next);
    remoteAudioElementsRef.current.forEach(el => {
      el.muted = next;
    });
  };

  const testBip = () => {
    initAudioEngine();
    const ctx = audioContextRef.current;
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    gain.gain.setValueAtTime(0.5, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.8);
    osc.frequency.value = 440;
    osc.start(); osc.stop(ctx.currentTime + 0.8);
  };

  const forceRestart = () => {
    window.dispatchEvent(new CustomEvent('force_webrtc_restart'));
  };

  if (isSpectator) {
    return (
      <div className="flex items-center gap-2 bg-slate-900/60 backdrop-blur-xl p-1.5 px-3 rounded-full border border-white/10 shadow-2xl">
        <div className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSpeaker}
          className={`w-8 h-8 rounded-full transition-all duration-300 ${
            isSpeakerMuted
              ? 'text-slate-500 hover:text-slate-300'
              : 'text-blue-400 hover:text-blue-300'
          }`}
        >
          {isSpeakerMuted ? <VolumeX size={18} /> : <Volume2 size={18} className={isConnected ? "animate-pulse" : ""} />}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 bg-slate-900/40 backdrop-blur-md p-3 rounded-2xl border border-white/10 shadow-xl min-w-[200px]">
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
        <span className="text-[10px] font-bold text-blue-200 uppercase tracking-widest">
          {isConnected ? 'VOIX LIVE' : 'CONNEXION...'}
        </span>
      </div>

      <div className="h-4 w-[1px] bg-white/10 mx-1" />

      {/* Mic Toggle (Player Only) */}
      <Button
        variant="ghost"
        size="icon"
        onClick={toggleMute}
        className={`w-10 h-10 rounded-xl transition-all duration-300 relative overflow-hidden ${
          isMuted
            ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
            : 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
        }`}
      >
        {!isMuted && localActivity > 5 && (
          <motion.div
            className="absolute bottom-0 left-0 right-0 bg-emerald-500/40"
            style={{ height: `${Math.min(localActivity * 2, 100)}%` }}
          />
        )}
        {isMuted ? <MicOff size={20} className="relative z-10" /> : <Mic size={20} className="relative z-10" />}
      </Button>

      {/* Visualizer / Status Activity */}
      {isConnected ? (
        <div className="flex items-center gap-3">
          <div className="flex flex-col gap-0.5 w-10 items-center justify-center">
              <div className="flex gap-0.5 items-end h-3">
                {[0.3, 0.7, 1, 0.6, 0.4].map((h, i) => (
                  <motion.div
                    key={i}
                    animate={{ scaleY: remoteActivity > 5 ? [1, 1.5 + h, 1] : 1 }}
                    transition={{ repeat: Infinity, duration: 0.5, delay: i * 0.1 }}
                    className="w-0.5 bg-emerald-400 rounded-full h-1.5 origin-bottom"
                  />
                ))}
              </div>
            <span className="text-[7px] text-emerald-400 uppercase font-black tracking-tighter">PLAYER 🎙️</span>
          </div>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={testBip}
            title="Tester le son (Bip)"
            className="w-8 h-8 rounded-lg text-slate-500 hover:text-white"
          >
            <Bell size={14} />
          </Button>
        </div>
      ) : (
        <Button
          variant="ghost"
          size="icon"
          onClick={forceRestart}
          title="Relancer"
          className="w-8 h-8 rounded-lg text-orange-300 hover:bg-orange-500/20"
        >
          <RefreshCw size={14} />
        </Button>
      )}

      {/* Error Message */}
      <AnimatePresence>
        {error && (
          <motion.span
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-[9px] text-red-400 font-bold uppercase"
          >
            {error}
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  );
};

export default VoiceChat;
