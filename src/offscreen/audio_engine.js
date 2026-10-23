/**
 * SonicWave - Offscreen Audio Engine
 * Handles low-latency tab audio capture, gain amplification, 3-band EQ, and dynamic limiting.
 */

const DEFAULT_VOLUME = 100;
const RAMP_TIME_CONSTANT = 0.015;
const BASS_FREQUENCY = 100;
const MID_FREQUENCY = 1500;
const TREBLE_FREQUENCY = 8000;

// Brickwall limiter parameters to prevent clipping at >100% volume
const LIMITER_THRESHOLD = -0.5;
const LIMITER_KNEE = 3.0;
const LIMITER_RATIO = 20.0;
const LIMITER_ATTACK = 0.003;
const LIMITER_RELEASE = 0.100;

const audioSessions = new Map();

function configureLimiter(limiter) {
  limiter.threshold.value = LIMITER_THRESHOLD;
  limiter.knee.value = LIMITER_KNEE;
  limiter.ratio.value = LIMITER_RATIO;
  limiter.attack.value = LIMITER_ATTACK;
  limiter.release.value = LIMITER_RELEASE;
}

function createFilterNodes(audioContext, bass, mid, treble) {
  const bassNode = audioContext.createBiquadFilter();
  bassNode.type = 'lowshelf';
  bassNode.frequency.value = BASS_FREQUENCY;
  bassNode.gain.value = bass;

  const midNode = audioContext.createBiquadFilter();
  midNode.type = 'peaking';
  midNode.frequency.value = MID_FREQUENCY;
  midNode.Q.value = 1.0;
  midNode.gain.value = mid;

  const trebleNode = audioContext.createBiquadFilter();
  trebleNode.type = 'highshelf';
  trebleNode.frequency.value = TREBLE_FREQUENCY;
  trebleNode.gain.value = treble;

  return { bassNode, midNode, trebleNode };
}

async function startTabAudioCapture({ tabId, streamId, volume = DEFAULT_VOLUME, bass = 0, mid = 0, treble = 0 }) {
  if (audioSessions.has(tabId)) {
    stopTabAudioCapture(tabId);
  }

  const rawStream = await navigator.mediaDevices.getUserMedia({
    audio: {
      mandatory: {
        chromeMediaSource: 'tab',
        chromeMediaSourceId: streamId
      }
    },
    video: {
      mandatory: {
        chromeMediaSource: 'tab',
        chromeMediaSourceId: streamId
      }
    }
  });

  // Discard video tracks immediately to eliminate unnecessary overhead
  rawStream.getVideoTracks().forEach(track => track.stop());

  const audioStream = new MediaStream(rawStream.getAudioTracks());
  const audioContext = new AudioContext({ latencyHint: 'interactive' });
  const sourceNode = audioContext.createMediaStreamSource(audioStream);

  const { bassNode, midNode, trebleNode } = createFilterNodes(audioContext, bass, mid, treble);

  const gainNode = audioContext.createGain();
  const initialGain = volume / 100.0;
  gainNode.gain.setValueAtTime(initialGain, audioContext.currentTime);

  const limiterNode = audioContext.createDynamicsCompressor();
  configureLimiter(limiterNode);

  // Audio Graph: Source -> Bass -> Mid -> Treble -> Gain -> Limiter -> Output
  sourceNode.connect(bassNode);
  bassNode.connect(midNode);
  midNode.connect(trebleNode);
  trebleNode.connect(gainNode);
  gainNode.connect(limiterNode);
  limiterNode.connect(audioContext.destination);

  if (audioContext.state === 'suspended') {
    await audioContext.resume();
  }

  audioSessions.set(tabId, {
    audioContext,
    stream: audioStream,
    gainNode,
    bassNode,
    midNode,
    trebleNode,
    limiterNode,
    volume,
    bass,
    mid,
    treble
  });

  return { success: true };
}

function updateTabVolume(tabId, volume) {
  const session = audioSessions.get(tabId);
  if (!session) {
    return { success: false, error: 'Session not found' };
  }

  const targetGain = Math.max(0, volume / 100.0);
  session.gainNode.gain.setTargetAtTime(targetGain, session.audioContext.currentTime, RAMP_TIME_CONSTANT);
  session.volume = volume;
  return { success: true, volume };
}

function updateTabEqualizer(tabId, bass, mid, treble) {
  const session = audioSessions.get(tabId);
  if (!session) {
    return { success: false, error: 'Session not found' };
  }

  const currentTime = session.audioContext.currentTime;
  session.bassNode.gain.setTargetAtTime(bass, currentTime, RAMP_TIME_CONSTANT);
  session.midNode.gain.setTargetAtTime(mid, currentTime, RAMP_TIME_CONSTANT);
  session.trebleNode.gain.setTargetAtTime(treble, currentTime, RAMP_TIME_CONSTANT);

  session.bass = bass;
  session.mid = mid;
  session.treble = treble;

  return { success: true, bass, mid, treble };
}

function stopTabAudioCapture(tabId) {
  const session = audioSessions.get(tabId);
  if (!session) {
    return { success: true };
  }

  session.stream.getTracks().forEach(track => track.stop());
  session.audioContext.close().catch(() => {});
  audioSessions.delete(tabId);
  return { success: true };
}

function getTabSessionState(tabId) {
  const session = audioSessions.get(tabId);
  if (!session) {
    return {
      active: false,
      volume: DEFAULT_VOLUME,
      bass: 0,
      mid: 0,
      treble: 0
    };
  }

  return {
    active: true,
    volume: session.volume,
    bass: session.bass,
    mid: session.mid,
    treble: session.treble
  };
}

function getAllActiveSessions() {
  const activeTabs = [];
  for (const [tabId, session] of audioSessions.entries()) {
    activeTabs.push({
      tabId,
      volume: session.volume,
      bass: session.bass,
      mid: session.mid,
      treble: session.treble
    });
  }
  return activeTabs;
}

// Runtime message listener
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.target !== 'audio_engine') {
    return false;
  }

  const { action, tabId } = message;

  if (action === 'START_CAPTURE') {
    startTabAudioCapture(message)
      .then(result => sendResponse(result))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }

  if (action === 'SET_VOLUME') {
    sendResponse(updateTabVolume(tabId, message.volume));
    return false;
  }

  if (action === 'SET_EQ') {
    sendResponse(updateTabEqualizer(tabId, message.bass, message.mid, message.treble));
    return false;
  }

  if (action === 'STOP_CAPTURE') {
    sendResponse(stopTabAudioCapture(tabId));
    return false;
  }

  if (action === 'GET_SESSION') {
    sendResponse(getTabSessionState(tabId));
    return false;
  }

  if (action === 'GET_ALL_SESSIONS') {
    sendResponse(getAllActiveSessions());
    return false;
  }

  return false;
});
