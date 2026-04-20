import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Radio, RefreshCw } from 'lucide-react';
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

  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const iceCandidatesQueue = useRef([]);
  const hasStartedNegotiation = useRef(false);
  const audioContextRef = useRef(null);
  const remoteAnalyzerRef = useRef(null);
  const remoteSourceRef = useRef(null);
  const remoteStream = remoteStreamRef; // alias for clarity

  useEffect(() => {
    if (!socket || !matchId || !role) return;
    let cancelled = false;

    // ── Named handlers so socket.off removes the exact right function ──
    const handleOffer = async (data) => {
      if (cancelled || role !== 'player2') return;
      const pc = peerConnectionRef.current;
      if (!pc) return;
      if (pc.signalingState !== 'stable' && pc.signalingState !== 'have-local-pranswer') return;
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit('webrtc_answer', { match_id: matchId, answer });
        while (iceCandidatesQueue.current.length > 0) {
          await addCandidate(iceCandidatesQueue.current.shift());
        }
      } catch (err) { console.error("Offer error:", err); }
    };

    const handleAnswer = async (data) => {
      if (cancelled || role !== 'player1') return;
      const pc = peerConnectionRef.current;
      if (!pc || pc.signalingState !== 'have-local-offer') return;
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
        while (iceCandidatesQueue.current.length > 0) {
          await addCandidate(iceCandidatesQueue.current.shift());
        }
      } catch (err) { console.error("Answer error:", err); }
    };

    const handleIce = async (data) => {
      if (cancelled) return;
      await addCandidate(data.candidate);
    };

    const handleStartWebRTC = async () => {
      if (cancelled || role !== 'player1' || hasStartedNegotiation.current) return;
      hasStartedNegotiation.current = true;
      const pc = peerConnectionRef.current;
      if (!pc) return;
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit('webrtc_offer', { match_id: matchId, offer });
        console.log("Offer sent by P1");
      } catch (err) { console.error("Offer creation error:", err); }
    };

    const addCandidate = async (candidate) => {
      const pc = peerConnectionRef.current;
      if (!pc) return;
      try {
        if (pc.remoteDescription?.type) {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } else {
          iceCandidatesQueue.current.push(candidate);
        }
      } catch (e) { console.warn("ICE candidate error:", e); }
    };

    const setup = async () => {
      try {
        console.log("Setting up WebRTC for", role);
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
        });
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }

        localStreamRef.current = stream;
        stream.getAudioTracks().forEach(t => { t.enabled = false; });

        const pc = new RTCPeerConnection(STUN_SERVERS);
        peerConnectionRef.current = pc;
        stream.getTracks().forEach(t => pc.addTrack(t, stream));

        pc.ontrack = (event) => {
          if (cancelled) return;
          const rStream = event.streams[0] || new MediaStream([event.track]);
          remoteStreamRef.current = rStream;

          // Audio element is the sole playback channel
          if (remoteAudioRef.current) {
            remoteAudioRef.current.srcObject = rStream;
            remoteAudioRef.current.play().catch(e => {
              if (e.name !== 'AbortError') console.warn("Autoplay deferred:", e.message);
            });
          }
          // Wire visualizer if AudioContext is already alive
          if (audioContextRef.current?.state === 'running') {
            wireRemoteVisualizer(rStream);
          }
        };

        pc.onicecandidate = (e) => {
          if (cancelled || !e.candidate) return;
          socket.emit('webrtc_ice_candidate', { match_id: matchId, candidate: e.candidate });
        };

        pc.oniceconnectionstatechange = () => {
          if (cancelled) return;
          const s = pc.iceConnectionState;
          console.log("ICE:", s);
          if (s === 'connected' || s === 'completed') {
            setIsConnected(true);
            // Try playing audio once connection is confirmed
            if (remoteAudioRef.current && remoteStreamRef.current) {
              remoteAudioRef.current.play().catch(() => {});
            }
          }
          if (s === 'disconnected' || s === 'failed') setIsConnected(false);
        };

        // Attach named handlers — safe to remove later
        socket.on('webrtc_offer', handleOffer);
        socket.on('webrtc_answer', handleAnswer);
        socket.on('webrtc_ice_candidate', handleIce);
        socket.on('start_webrtc', handleStartWebRTC);

        // Signal ready with one retry
        socket.emit('webrtc_ready', { match_id: matchId, user_id: userId });
        setTimeout(() => {
          if (!cancelled && !hasStartedNegotiation.current) {
            socket.emit('webrtc_ready', { match_id: matchId, user_id: userId });
          }
        }, 2000);

      } catch (err) {
        console.error('VoiceChat setup error:', err);
        setError("Micro non accessible");
      }
    };

    setup();

    return () => {
      cancelled = true;
      console.log("Cleaning up VoiceChat");
      localStreamRef.current?.getTracks().forEach(t => t.stop());
      peerConnectionRef.current?.close();
      peerConnectionRef.current = null;
      // Remove exactly our named handlers — won't affect other listeners
      socket.off('webrtc_offer', handleOffer);
      socket.off('webrtc_answer', handleAnswer);
      socket.off('webrtc_ice_candidate', handleIce);
      socket.off('start_webrtc', handleStartWebRTC);
      remoteAnalyzerRef.current = null;
      if (audioContextRef.current?.state !== 'closed') {
        audioContextRef.current?.close().catch(() => {});
        audioContextRef.current = null;
      }
    };
  }, [socket, matchId, role, userId]); // eslint-disable-line

  const wireRemoteVisualizer = (rStream) => {
    const ctx = audioContextRef.current;
    if (!ctx || !rStream) return;
    try {
      if (remoteSourceRef.current) remoteSourceRef.current.disconnect();
      const src = ctx.createMediaStreamSource(rStream);
      const an = ctx.createAnalyser(); an.fftSize = 256;
      src.connect(an); // Visualizer only — NO connect to destination
      remoteSourceRef.current = src;
      remoteAnalyzerRef.current = an;
      const buf = new Uint8Array(an.frequencyBinCount);
      const tick = () => {
        if (!remoteAnalyzerRef.current) return;
        remoteAnalyzerRef.current.getByteFrequencyData(buf);
        setRemoteActivity(buf.reduce((a, b) => a + b, 0) / buf.length);
        requestAnimationFrame(tick);
      };
      tick();
    } catch (e) { console.warn("Visualizer error:", e); }
  };

  // Called on first user gesture — unlocks AudioContext and triggers audio play
  const initAudioEngine = useCallback(() => {
    if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    const ctx = audioContextRef.current;
    if (ctx.state === 'suspended') ctx.resume();

    // Local visualizer
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

    // Remote visualizer
    if (remoteStreamRef.current) wireRemoteVisualizer(remoteStreamRef.current);

    // Unlock audio element playback (satisfies browser autoplay policy)
    if (remoteAudioRef.current) {
      remoteAudioRef.current.play().catch(() => {});
    }
  }, []); // eslint-disable-line

  const toggleMute = () => {
    initAudioEngine();
    const next = !isMuted;
    setIsMuted(next);
    localStreamRef.current?.getAudioTracks().forEach(t => { t.enabled = !next; });
  };

  const testAudio = () => {
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

  return (
    <div className="flex items-center gap-3 bg-white/5 backdrop-blur-sm p-3 rounded-2xl border border-white/10 shadow-xl">
      {/* Audio element — sole playback channel */}
      <audio ref={remoteAudioRef} autoPlay playsInline style={{ display: 'none' }} />

      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
        <span className="text-xs font-medium text-blue-200 uppercase tracking-wider">
          {isConnected ? 'LIVE VOICE' : 'CONNECTING...'}
        </span>
      </div>

      <div className="h-4 w-[1px] bg-white/10" />

      {/* Mic button */}
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

      {/* Beep test — does NOT restart WebRTC */}
      <Button
        variant="ghost"
        size="icon"
        onClick={testAudio}
        title="Tester le son"
        className="w-8 h-8 rounded-lg text-blue-300 hover:bg-blue-500/20"
      >
        <Radio size={16} />
      </Button>

      {/* Restart WebRTC — only when disconnected */}
      {!isConnected && (
        <Button
          variant="ghost"
          size="icon"
          onClick={forceRestart}
          title="Relancer la connexion vocale"
          className="w-8 h-8 rounded-lg text-orange-300 hover:bg-orange-500/20 animate-pulse"
        >
          <RefreshCw size={16} />
        </Button>
      )}

      {/* Remote activity bars */}
      {isConnected && (
        <div className="flex flex-col gap-1 w-12 h-8 items-center justify-center">
          <div className="flex gap-1 items-end h-4">
            {[0.3, 0.7, 1, 0.6, 0.4].map((h, i) => (
              <motion.div
                key={i}
                animate={{ scaleY: remoteActivity > 5 ? [1, 1.5 + h, 1] : 1 }}
                transition={{ repeat: Infinity, duration: 0.5, delay: i * 0.1 }}
                className="w-1 bg-emerald-400 rounded-full h-2 origin-bottom"
              />
            ))}
          </div>
          <span className="text-[8px] text-emerald-400 uppercase font-bold">REC-VOICE</span>
        </div>
      )}

      <AnimatePresence>
        {error && (
          <motion.span
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-[10px] text-red-400 font-medium"
          >
            {error}
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  );
};

export default VoiceChat;
