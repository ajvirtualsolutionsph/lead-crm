import { useState, useEffect, useRef, useCallback } from 'react';
import { SignalWire } from '@signalwire/js';
import axios from 'axios';

export function useSignalWire() {
  const [status, setStatus] = useState('idle'); // idle | connecting | in-call | error
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const clientRef = useRef(null);
  const callRef = useRef(null);
  const timerRef = useRef(null);

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

  const makeCall = useCallback(async (phoneNumber) => {
    if (!clientRef.current || !phoneNumber) return;

    try {
      setStatus('connecting');
      setIsMuted(false);

      const call = await clientRef.current.dial({
        to: phoneNumber,
        audio: true,
        video: false,
      });
      callRef.current = call;

      call.on('destroy', () => {
        setStatus('idle');
        stopTimer();
        callRef.current = null;
      });

      // Race: start() resolves on 'room.subscribed'; reject if call destroyed first
      const callEnded = new Promise((_, reject) =>
        call.once('destroy', () => reject(new Error('Call ended before connecting')))
      );
      await Promise.race([call.start(), callEnded]);

      setStatus('in-call');
      startTimer();
    } catch (err) {
      if (err.message !== 'Call ended before connecting') {
        console.error('Call error:', err);
        setStatus('error');
      }
      stopTimer();
      callRef.current = null;
    }
  }, []);

  const hangUp = useCallback(async () => {
    if (!callRef.current) return;
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

  return { status, callDuration, isMuted, makeCall, hangUp, toggleMute };
}
