import { useState, useRef, useCallback } from 'react';
import axios from 'axios';

export function useSignalWire() {
  const [status, setStatus] = useState('ready');
  const [callDuration, setCallDuration] = useState(0);
  const [transcript, setTranscript] = useState([]);
  const [interimText, setInterimText] = useState('');
  const [serverDisposition, setServerDisposition] = useState(null);
  const leadCallSidRef = useRef(null);
  const timerRef = useRef(null);
  const recognitionRef = useRef(null);
  const pollRef = useRef(null);

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
    recognition.onend = () => { if (leadCallSidRef.current) recognition.start(); };
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

  function startPolling() {
    pollRef.current = setInterval(async () => {
      try {
        const { data } = await axios.get('/calls/status');
        if (!data.active && data.disposition && data.disposition !== 'answered') {
          stopPolling();
          stopTimer();
          stopTranscription();
          leadCallSidRef.current = null;
          setServerDisposition(data.disposition);
          setStatus('ready');
        }
      } catch (e) {
        console.warn('Status poll error:', e.message);
      }
    }, 3000);
  }

  function stopPolling() {
    clearInterval(pollRef.current);
    pollRef.current = null;
  }

  const makeCall = useCallback(async (phoneNumber, leadMeta = {}) => {
    if (!phoneNumber) return;
    try {
      setStatus('connecting');
      setTranscript([]);
      setInterimText('');
      setServerDisposition(null);

      const { data } = await axios.post('/calls/initiate', {
        to: phoneNumber,
        leadName: leadMeta.leadName || '',
        rowIndex: leadMeta.rowIndex || null,
        sheetName: leadMeta.sheetName || 'No Reply/Declined',
      }, { timeout: 30000 });
      leadCallSidRef.current = data.leadCallSid;
      setStatus('in-call');
      startTimer();
      startTranscription();
      startPolling();
    } catch (err) {
      console.error('Call error:', err.response?.data || err.message);
      setStatus('error');
    }
  }, []);

  const hangUp = useCallback(async () => {
    stopPolling();
    stopTimer();
    stopTranscription();
    const sid = leadCallSidRef.current;
    leadCallSidRef.current = null;
    setStatus('ready');
    try {
      await axios.post('/calls/hangup', { callSid: sid });
    } catch (e) { console.error('Hangup error:', e.message); }
  }, []);

  const clearTranscript = useCallback(() => {
    setTranscript([]);
    setInterimText('');
  }, []);

  const clearDisposition = useCallback(() => setServerDisposition(null), []);

  return {
    status, callDuration, makeCall, hangUp,
    transcript, interimText, clearTranscript,
    serverDisposition, clearDisposition,
  };
}
