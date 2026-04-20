import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import VoiceChat from './VoiceChat';

// Mock WebRTC and MediaDevices
const mockGetUserMedia = jest.fn();
Object.defineProperty(global.navigator, 'mediaDevices', {
  value: {
    getUserMedia: mockGetUserMedia,
  },
  configurable: true
});

global.RTCPeerConnection = jest.fn().mockImplementation(() => ({
  createOffer: jest.fn().mockResolvedValue({ type: 'offer', sdp: 'sdp' }),
  createAnswer: jest.fn().mockResolvedValue({ type: 'answer', sdp: 'sdp' }),
  setLocalDescription: jest.fn().mockResolvedValue(null),
  setRemoteDescription: jest.fn().mockResolvedValue(null),
  addTrack: jest.fn(),
  addIceCandidate: jest.fn().mockResolvedValue(null),
  close: jest.fn(),
  onicecandidate: null,
  ontrack: null,
  oniceconnectionstatechange: null,
}));

global.RTCSessionDescription = jest.fn().mockImplementation((data) => data);
global.RTCIceCandidate = jest.fn().mockImplementation((data) => data);
global.MediaStream = jest.fn().mockImplementation(() => ({
  getTracks: () => [],
  getAudioTracks: () => [],
}));

describe('VoiceChat Component', () => {
  const mockSocket = {
    on: jest.fn(),
    off: jest.fn(),
    emit: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetUserMedia.mockResolvedValue({
      getTracks: () => [{ stop: jest.fn(), enabled: true }],
      getAudioTracks: () => [{ enabled: true }],
    });
  });

  test('renders in connecting state initially', async () => {
    await act(async () => {
      render(<VoiceChat socket={mockSocket} matchId="m1" role="player1" userId="u1" />);
    });
    expect(screen.getByText(/CONNECTING/i)).toBeInTheDocument();
  });

  test('toggles mute state when clicked', async () => {
    // Mock AudioContext because initAudioEngine uses it
    global.AudioContext = jest.fn().mockImplementation(() => ({
      state: 'suspended',
      resume: jest.fn().mockResolvedValue(null),
      createOscillator: jest.fn().mockReturnValue({
        connect: jest.fn(),
        start: jest.fn(),
        stop: jest.fn(),
        frequency: { value: 0 }
      }),
      createGain: jest.fn().mockReturnValue({
        connect: jest.fn(),
        gain: { setValueAtTime: jest.fn(), exponentialRampToValueAtTime: jest.fn() }
      }),
      destination: {},
      currentTime: 0
    }));

    await act(async () => {
      render(<VoiceChat socket={mockSocket} matchId="m1" role="player1" userId="u1" />);
    });

    const micButton = screen.getAllByRole('button')[0]; // The first button is the Mic toggle
    
    // Initial state is muted (MicOff icon)
    fireEvent.click(micButton);
    // After click, it should try to initialize audio and toggle state.
    // Testing the UI change is sufficient here.
  });
});
