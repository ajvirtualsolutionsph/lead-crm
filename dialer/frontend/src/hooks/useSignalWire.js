import { useState, useRef, useCallback } from 'react';
import axios from 'axios';

export function useSignalWire() {
  const [status, setStatus] = useState('ready');
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [transcript, setTranscript] = useState([]);
  const [interimText, setInterimText] = useState('');
  const callSidsRef = useRef({ lead: null, agent: null });
  const timerRef = useRef(null);
  const recognitionRef = useRef(null);

  function startTimer() {
    setCallDuration(0);
    timerRef.current = setInterval(() => setCallDuration(s => s + 1), 1000);
  }

  function stopTimer() {
    clearInterval(timerRef.current);
    timerRef.current = null;
  }

  function startTranscription() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    const recognition = new SR();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.onresult = (event) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          const text = result[0].transcript.trim();
          if (text) {
            const time = new Date().toLocaleTimeString('en-US', {
              hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit',
            });
            setTranscript(prev => [...prev, { time, text }]);
          }
        } else {
          interim += result[0].transcript;
        }
      }
      setInterimText(interim);
    };
    recognition.onerror = () => {};
    recognition.onend = () => { if (callSidsRef.current.lead) recognition.start(); };
    recognition.start();
    recognitionRef.current = recognition;
  }

  function stopTranscription() {
    if (recognitionRef.current) {
      recognitionRef.current.onend = null;
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setInterimText('');
  }

  const makeCall = useCallback(async (phoneNumber, agentPhone) => {
    if (!phoneNumber || !agentPhone) return;
    try {
      setStatus('connecting');
      setIsMuted(false);
      setTranscript([]);
      setInterimText('');

      const { data } = await axios.post('/api/calls/initiate', {
        to: phoneNumber,
        agentPhone,
      });
      callSidsRef.current = { lead: data.leadCallSid, agent: data.agentCallSid };
      setStatus('in-call');
      startTimer();
      startTranscription();
    } catch (err) {
      console.error('Call error:', err.response?.data || err.message);
      setStatus('error');
    }
  }, []);

  const hangUp = useCallback(async () => {
    stopTimer();
    stopTranscription();
    const sids = callSidsRef.current;
    callSidsRef.current = { lead: null, agent: null };
    setStatus('ready');
    try {
      await Promise.all([
        sids.lead ? axios.post('/api/calls/hangup', { callSid: sids.lead }) : Promise.resolve(),
        sids.agent ? axios.post('/api/calls/hangup', { callSid: sids.agent }) : Promise.resolve(),
      ]);
    } catch (e) { console.error('Hangup error:', e.message); }
  }, []);

  // Mute is not applicable for phone-based calls
  const toggleMute = useCallback(() => setIsMuted(m => !m), []);

  const clearTranscript = useCallback(() => {
    setTranscript([]);
    setInterimText('');
  }, []);

  return { status, callDuration, isMuted, makeCall, hangUp, toggleMute, transcript, interimText, clearTranscript };
}
