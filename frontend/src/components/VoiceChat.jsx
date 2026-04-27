import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Mic, MicOff, Radio, RefreshCw, Volume2, VolumeX } from 'lucide-react';
import { Button } from './ui/button';

const STUN_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { 
      urls: 'turn:openrelay.metered.ca:80',
      username: 'openrelayproject',
      credential: 'openrelayproject'
    },
    { 
      urls: 'turn:openrelay.metered.ca:443',
      username: 'openrelayproject',
      credential: 'openrelayproject'
    },
    { 
      urls: 'turn:openrelay.metered.ca:443?transport=tcp',
      username: 'openrelayproject',
      credential: 'openrelayproject'
    }
  ],
};

const VoiceChat = ({ socket, matchId, role, userId, duelMode }) => {
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
  const remoteAnalyzersRef = useRef(new Map()); 
  const remoteSourcesRef = useRef(new Map()); 
  
  const [remoteParticipants, setRemoteParticipants] = useState([]); // Array of { sid, role, activity }

  useEffect(() => {
    if (!socket || !matchId || !role) return;
    let cancelled = false;

    const optimizeSDP = (sdp) => {
      let lines = sdp.split('\r\n');
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].startsWith('a=fmtp:')) {
          // Check if this payload type corresponds to opus
          const pt = lines[i].match(/a=fmtp:(\d+)/)?.[1];
          if (pt && sdp.includes(`a=rtpmap:${pt} opus/48000`)) {
            lines[i] = `a=fmtp:${pt} maxaveragebitrate=64000;usedtx=1;sprop-stereo=0`;
          }
        }
      }
      return lines.join('\r\n');
    };

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

        let audioEl = remoteAudioElementsRef.current.get(sid);
        if (!audioEl) {
          audioEl = document.createElement('audio');
          audioEl.autoplay = true;
          audioEl.playsInline = true; 
          audioEl.style.display = 'none';
          document.body.appendChild(audioEl);
          remoteAudioElementsRef.current.set(sid, audioEl);
        }
        audioEl.srcObject = rStream;
        audioEl.play().catch(e => {
          if (e.name !== 'AbortError') console.warn("Autoplay deferred:", e.message);
        });

        if (audioContextRef.current?.state === 'running') {
          wireRemoteVisualizer(sid, rStream);
        }
        
        // Update participants list
        setRemoteParticipants(prev => {
          if (prev.find(p => p.sid === sid)) return prev;
          return [...prev, { sid, role: 'unknown', activity: 0 }];
        });
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
          const anyActive = Array.from(peerConnectionsRef.current.values())
            .some(conn => ['connected', 'completed'].includes(conn.iceConnectionState));
          setIsConnected(anyActive);
        }
      };

      return pc;
    };

    const handleOffer = async (data) => {
      if (cancelled) return;
      const sid = data.from_sid || 'player';
      const pRole = data.role || 'unknown';
      const pc = getOrCreatePC(sid, false);
      
      setRemoteParticipants(prev => {
        if (prev.find(p => p.sid === sid)) {
           return prev.map(p => p.sid === sid ? { ...p, role: pRole } : p);
        }
        return [...prev, { sid, role: pRole, activity: 0 }];
      });
      
      try {
        const desc = new RTCSessionDescription({
          type: 'offer',
          sdp: optimizeSDP(data.offer.sdp)
        });
        await pc.setRemoteDescription(desc);
        const answer = await pc.createAnswer();
        answer.sdp = optimizeSDP(answer.sdp);
        await pc.setLocalDescription(answer);
        socket.emit('webrtc_answer', { 
          match_id: matchId, 
          answer,
          target_sid: sid,
          role: role // Send my role
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
      const pRole = data.role || 'unknown';
      const pc = peerConnectionsRef.current.get(sid);
      if (!pc) return;
      
      setRemoteParticipants(prev => prev.map(p => 
        p.sid === sid ? { ...p, role: pRole } : p
      ));
      try {
        const desc = new RTCSessionDescription({
          type: 'answer',
          sdp: optimizeSDP(data.answer.sdp)
        });
        await pc.setRemoteDescription(desc);
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

    const handleStartWebRTC = async (data) => {
      if (cancelled) return;
      
      // Full Mesh Logic: player[N] initiates to player[M] if M > N
      // data contains player1_sid, player2_sid, player3_sid, player4_sid
      const myRoleIndex = parseInt(role.replace('player', ''));
      if (isNaN(myRoleIndex)) return; // Spectators are receivers only

      for (let i = 1; i <= 4; i++) {
        if (i <= myRoleIndex) continue; // Only call higher indices
        
        const targetSid = data[`player${i}_sid`];
        if (targetSid && targetSid !== socket.id) {
          console.log(`[FullMesh] Initiating call: ${role} -> player${i} (${targetSid})`);
          const pc = getOrCreatePC(targetSid, true);
          try {
            let offer = await pc.createOffer();
            offer = { type: 'offer', sdp: optimizeSDP(offer.sdp) };
            await pc.setLocalDescription(offer);
            socket.emit('webrtc_offer', { 
              match_id: matchId, 
              offer, 
              target_sid: targetSid,
              role: role 
            });
          } catch (err) { console.error(`[FullMesh] Offer error to player${i}:`, err); }
        }
      }
    };

    const handleSpectatorVoiceReady = async (data) => {
      if (cancelled || isSpectator) return;
      const specSid = data.spectator_sid;
      console.log("Initiating outgoing voice to spectator:", specSid);
      const pc = getOrCreatePC(specSid, true);
      try {
        let offer = await pc.createOffer();
        offer = { type: 'offer', sdp: optimizeSDP(offer.sdp) };
        await pc.setLocalDescription(offer);
        socket.emit('webrtc_offer', { 
          match_id: matchId, 
          offer, 
          target_sid: specSid,
          role: role // 'player1', etc.
        });
      } catch (err) { console.error("Spectator offer error:", err); }
    };

    const handleOpponentDisconnected = (data) => {
      const targetSid = data.sid;
      if (!targetSid) return;
      
      console.log(`[VoiceChat] Cleaning up disconnected peer: ${targetSid}`);
      
      const pc = peerConnectionsRef.current.get(targetSid);
      if (pc) {
        try { pc.close(); } catch(e) {}
        peerConnectionsRef.current.delete(targetSid);
      }
      
      const audioEl = remoteAudioElementsRef.current.get(targetSid);
      if (audioEl) {
        try {
          audioEl.pause();
          audioEl.srcObject = null;
          audioEl.remove();
        } catch(e) {}
        remoteAudioElementsRef.current.delete(targetSid);
      }
      
      setRemoteParticipants(prev => prev.filter(p => p.sid !== targetSid));
      
      if (remoteAnalyzersRef.current.has(targetSid)) {
        remoteAnalyzersRef.current.delete(targetSid);
      }
      if (remoteSourcesRef.current.has(targetSid)) {
        try { remoteSourcesRef.current.get(targetSid).disconnect(); } catch(e) {}
        remoteSourcesRef.current.delete(targetSid);
      }
    };

    const setup = async () => {
      try {
        if (!isSpectator) {
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: { 
              echoCancellation: true, 
              noiseSuppression: true, 
              autoGainControl: true,
              sampleRate: 48000,
              channelCount: 1
            }
          });
          if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }
          localStreamRef.current = stream;
          stream.getAudioTracks().forEach(t => { t.enabled = false; });
        }

        socket.on('webrtc_offer', handleOffer);
        socket.on('webrtc_answer', handleAnswer);
        socket.on('webrtc_ice_candidate', handleIce);
        socket.on('start_webrtc', handleStartWebRTC);
        socket.on('spectator_voice_ready', handleSpectatorVoiceReady);
        socket.on('opponent_disconnected', handleOpponentDisconnected);

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
      socket.off('opponent_disconnected');

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
        
        // Update individual activity
        setRemoteParticipants(prev => prev.map(p => 
          p.sid === sid ? { ...p, activity: activity } : p
        ));
        
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

  const getParticipantInfo = (pRole) => {
    // Try to find in duelMode
    const match = duelMode?.gameData;
    if (!match) return { name: pRole, picture: null };
    
    // Some match structures use player1_name, others differ. Try to be robust.
    return {
      name: match[`${pRole}_name`] || pRole,
      picture: match[`${pRole}_picture`] || null
    };
  };

  const renderParticipant = (p, index) => {
    const info = getParticipantInfo(p.role === 'unknown' ? `player${index + 2}` : p.role);
    const isSpeaking = p.activity > 10;
    
    return (
      <motion.div
        key={p.sid}
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="relative group"
      >
        <div className={`w-12 h-12 rounded-full border-2 transition-all duration-300 flex items-center justify-center bg-slate-800 overflow-hidden ${
          isSpeaking ? 'border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.4)]' : 'border-white/10'
        }`}>
          {info.picture ? (
            <img src={info.picture} alt={info.name} className="w-full h-full object-cover" />
          ) : (
            <span className="text-white font-bold text-lg">{info.name[0]?.toUpperCase()}</span>
          )}
          
          {isSpeaking && (
            <motion.div
              layoutId={`speaking-${p.sid}`}
              className="absolute -bottom-1 -right-1 bg-emerald-500 p-1 rounded-full border border-slate-900"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ repeat: Infinity, duration: 1 }}
            >
              <Mic size={8} className="text-white" />
            </motion.div>
          )}
        </div>
        
        {/* Tooltip / Name */}
        <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-900 text-[10px] text-white px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-20 pointer-events-none">
          {info.name}
        </div>
      </motion.div>
    );
  };

  if (isSpectator) {
    return (
      <div className="flex items-center gap-3 bg-black/40 backdrop-blur-xl p-2 px-4 rounded-2xl border border-white/5 shadow-2xl">
        <div className="flex -space-x-2">
          {remoteParticipants.map((p, i) => (
             <div key={p.sid} className={`w-8 h-8 rounded-full border-2 border-slate-900 bg-slate-800 flex items-center justify-center overflow-hidden ${p.activity > 10 ? 'border-emerald-500' : ''}`}>
                <span className="text-[10px] text-white font-bold">{getParticipantInfo(`player${i+1}`).name[0]}</span>
             </div>
          ))}
          {remoteParticipants.length === 0 && <span className="text-[10px] text-slate-500 italic">Personne ne parle</span>}
        </div>
        <div className="w-[1px] h-4 bg-white/10" />
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSpeaker}
          className={`w-9 h-9 rounded-xl transition-all duration-300 ${
            isSpeakerMuted ? 'text-red-400 bg-red-400/10' : 'text-blue-400 bg-blue-400/10'
          }`}
        >
          {isSpeakerMuted ? <VolumeX size={18} /> : <Volume2 size={18} className={isConnected ? "animate-pulse" : ""} />}
        </Button>
      </div>
    );
  }

  const myInfo = getParticipantInfo(role);

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Participants Grid (Meet Style) */}
      <div className="flex items-center gap-3">
        {/* Local Player */}
        <div className="relative group">
          <div className={`w-14 h-14 rounded-full border-2 transition-all duration-300 flex items-center justify-center bg-slate-800 overflow-hidden ${
            !isMuted && localActivity > 10 ? 'border-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.4)]' : 'border-white/10'
          } ${isMuted ? 'opacity-60' : ''}`}>
            {myInfo.picture ? (
              <img src={myInfo.picture} alt={myInfo.name} className="w-full h-full object-cover" />
            ) : (
              <span className="text-white font-black text-xl">{myInfo.name[0]?.toUpperCase()}</span>
            )}
            
            {!isMuted && localActivity > 10 && (
              <motion.div
                className="absolute inset-0 border-2 border-blue-400 rounded-full"
                animate={{ scale: [1, 1.1, 1], opacity: [0.5, 0, 0.5] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
              />
            )}
            
            {isMuted && (
               <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                  <MicOff size={16} className="text-red-400" />
               </div>
            )}
          </div>
          {/* Label "Moi" floating */}
          <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-blue-600 text-[10px] text-white px-2 py-0.5 rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-20 pointer-events-none font-bold">
            Moi ({myInfo.name})
          </div>
        </div>

        <div className="flex items-center gap-3">
          {remoteParticipants.map((p, i) => renderParticipant(p, i))}
        </div>
      </div>

      {/* Control Bar (Glassmorphism) */}
      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="flex items-center gap-2 bg-slate-900/60 backdrop-blur-2xl p-2 rounded-2xl border border-white/10 shadow-2xl"
      >
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleMute}
          className={`w-10 h-10 rounded-xl transition-all duration-300 ${
            isMuted
              ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
              : 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
          }`}
        >
          {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSpeaker}
          className={`w-10 h-10 rounded-xl transition-all duration-300 ${
            isSpeakerMuted ? 'bg-red-500/10 text-red-400' : 'bg-blue-500/10 text-blue-400'
          }`}
        >
          {isSpeakerMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
        </Button>

        <div className="w-[1px] h-6 bg-white/10 mx-1" />

        <Button
          variant="ghost"
          size="icon"
          onClick={forceRestart}
          title="Relancer WebRTC"
          className="w-10 h-10 rounded-xl text-slate-400 hover:text-white"
        >
          <RefreshCw size={18} className={!isConnected ? "animate-spin" : ""} />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={testBip}
          className="w-10 h-10 rounded-xl text-slate-400 hover:text-white"
        >
          <Bell size={18} />
        </Button>
      </motion.div>

      {error && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-[10px] text-red-400 font-bold uppercase tracking-widest"
        >
          {error}
        </motion.p>
      )}
    </div>
  );
};

export default VoiceChat;
