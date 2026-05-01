import { useState, useEffect, useRef, useCallback } from 'react';
import { SignalWire } from '@signalwire/js';
import axios from 'axios';

export function useSignalWire() {
  const [status, setStatus] = useState('idle');
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [transcript, setTranscript] = useState([]);
  const [interimText, setInterimText] = useState('');
  const clientRef = useRef(null);
  const callRef = useRef(null);
  const timerRef = useRef(null);
  const recognitionRef = useRef(null);

  useEffect(() => {
    let mounted = true;

    async function setup() {
      try {
        const { data } = await axios.post('/api/token');
        const client = await SignalWire({
          token: data.token,
          host: import.meta.env.VITE_SIGNALWIRE_SPACE_URL || 'aj-virtual-solutions.signalwire.com',
        });
        if (mounted) {
          clientRef.current = client;
        }
      } catch (err) {
        console.error('SignalWire setup error:', err);
        if (mounted) setStatus('error');
      }
    }

    setup();

    return () => {
      mounted = false;
      clientRef.current?.disconnect();
      clientRef.current = null;
    };
  }, []);

  function startTimer() {
    setCallDuration(0);
    timerRef.current = setInterval(() => setCallDuration(s => s + 1), 1000);
  }

  function stopTimer() {
    clearInterval(timerRef.current);
    timerRef.current = null;
  }

  const clearTranscript = useCallback(() => {
    setTranscript([]);
    setInterimText('');
  }, []);

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
        if (event.results[i].isFinal) {
          const text = event.results[i][0].transcript.trim();
          if (text) {
            setTranscript(prev => [
              ...prev,
              {
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
                text,
              },
            ]);
          }
        } else {
          interim += event.results[i][0].transcript;
        }
      }
      setInterimText(interim);
    };

    recognition.onerror = (e) => {
      if (e.error !== 'no-speech') console.warn('Speech recognition error:', e.error);
    };

    // Auto-restart after browser's ~1 min silence timeout
    recognition.onend = () => {
      if (recognitionRef.current) {
        try { recognitionRef.current.start(); } catch (_) {}
      }
    };

    recognitionRef.current = recognition;
    try { recognition.start(); } catch (_) {}
  }

  function stopTranscription() {
    if (recognitionRef.current) {
      recognitionRef.current.onend = null;
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setInterimText('');
  }

  const makeCall = useCallback(async (phoneNumber) => {
    if (!clientRef.current || !phoneNumber) return;

    try {
      setStatus('connecting');
      setIsMuted(false);

      const call = await clientRef.current.dial({
        to: phoneNumber,
        from: import.meta.env.VITE_SIGNALWIRE_FROM_NUMBER || '+12525303318',
        audio: true,
        video: false,
      });
      callRef.current = call;

      call.on('destroy', () => {
        setStatus('idle');
        stopTimer();
        stopTranscription();
        callRef.current = null;
      });

      const callEnded = new Promise((_, reject) =>
        call.once('destroy', () => reject(new Error('Call ended before connecting')))
      );
      await Promise.race([call.start(), callEnded]);

      setStatus('in-call');
      startTimer();
      clearTranscript();
      startTranscription();
    } catch (err) {
      if (err.message !== 'Call ended before connecting') {
        console.error('Call error:', err);
        setStatus('error');
      }
      stopTimer();
      callRef.current = null;
    }
  }, [clearTranscript]);

  const hangUp = useCallback(async () => {
    if (!callRef.current) return;
    stopTranscription();
    try {
      await callRef.current.end();
    } catch (err) {
      console.error('Hangup error:', err);
    }
  }, []);

  const toggleMute = useCallback(async () => {
    if (!callRef.current) return;
    try {
      if (isMuted) {
        await callRef.current.audioUnmute();
        setIsMuted(false);
      } else {
        await callRef.current.audioMute();
        setIsMuted(true);
      }
    } catch (err) {
      console.error('Mute toggle error:', err);
    }
  }, [isMuted]);

  return { status, callDuration, isMuted, makeCall, hangUp, toggleMute, transcript, interimText, clearTranscript };
}
