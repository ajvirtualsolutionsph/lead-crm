import { useState, useRef, useCallback } from 'react';
import axios from 'axios';

export function useSignalWire() {
  const [status, setStatus] = useState('ready');
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const callSidRef = useRef(null);
  const timerRef = useRef(null);

  function startTimer() {
    setCallDuration(0);
    timerRef.current = setInterval(() => setCallDuration(s => s + 1), 1000);
  }

  function stopTimer() {
    clearInterval(timerRef.current);
    timerRef.current = null;
  }

  const makeCall = useCallback(async (phoneNumber) => {
    if (!phoneNumber) return;
    try {
      setStatus('connecting');
      setIsMuted(false);
      const { data } = await axios.post('/api/calls/initiate', { to: phoneNumber });
      callSidRef.current = data.callSid;
      setStatus('in-call');
      startTimer();
    } catch (err) {
      console.error('Call error:', err.response?.data || err.message);
      setStatus('error');
      callSidRef.current = null;
    }
  }, []);

  const hangUp = useCallback(async () => {
    stopTimer();
    const sid = callSidRef.current;
    callSidRef.current = null;
    setStatus('ready');
    try {
      await axios.post('/api/calls/hangup', { callSid: sid });
    } catch (err) {
      console.error('Hangup error:', err.message);
    }
  }, []);

  const toggleMute = useCallback(() => {
    setIsMuted(m => !m);
  }, []);

  const clearTranscript = useCallback(() => {}, []);

  return {
    status,
    callDuration,
    isMuted,
    makeCall,
    hangUp,
    toggleMute,
    transcript: [],
    interimText: '',
    clearTranscript,
  };
}
