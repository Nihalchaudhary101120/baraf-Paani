import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * useVoiceToText Hook
 * Offline-compatible, multi-engine voice-to-text hook.
 * Uses browser-native SpeechRecognition (webkitSpeechRecognition) where available,
 * with adapter architecture extensible for local WASM / WebGPU whisper models.
 */
export const useVoiceToText = (options = {}) => {
  const {
    lang = 'en-US',
    continuous = true,
    interimResults = true,
    onResult = null,
    onError = null
  } = options;

  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [durationSeconds, setDurationSeconds] = useState(0);

  const recognitionRef = useRef(null);
  const timerRef = useRef(null);
  const isSupportedRef = useRef(false);

  // Check if browser SpeechRecognition API is available
  const isSupported = typeof window !== 'undefined' && Boolean(
    window.SpeechRecognition || window.webkitSpeechRecognition
  );
  isSupportedRef.current = isSupported;

  // Clean timer helper
  const clearListeningTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Format seconds to MM:SS
  const formatTimer = useCallback((sec) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }, []);

  // Initialize browser speech recognition engine
  const initEngine = useCallback(() => {
    if (!isSupported) {
      setError('Voice recognition is not supported in this browser. You can type manually.');
      return null;
    }

    const SpeechRecognitionClass = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognitionClass();

    recognition.continuous = continuous;
    recognition.interimResults = interimResults;
    recognition.lang = lang;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      setIsProcessing(false);
      setError(null);
      setDurationSeconds(0);

      // Start elapsed timer
      clearListeningTimer();
      timerRef.current = setInterval(() => {
        setDurationSeconds((prev) => prev + 1);
      }, 1000);
    };

    recognition.onresult = (event) => {
      let finalStr = '';
      let interimStr = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const item = event.results[i];
        if (item.isFinal) {
          finalStr += item[0].transcript + ' ';
        } else {
          interimStr += item[0].transcript;
        }
      }

      if (finalStr) {
        setTranscript((prev) => {
          const updated = (prev ? prev.trim() + ' ' : '') + finalStr.trim();
          if (onResult) onResult(updated, finalStr);
          return updated;
        });
      }

      setInterimTranscript(interimStr);
    };

    recognition.onerror = (event) => {
      clearListeningTimer();
      setIsListening(false);
      setIsProcessing(false);

      let friendlyMsg = 'Voice recognition encountered an issue. You can type manually.';
      if (event.error === 'not-allowed' || event.error === 'permission-denied') {
        friendlyMsg = 'Microphone permission was denied. You can type the description manually.';
      } else if (event.error === 'network') {
        friendlyMsg = 'Network service error in browser speech recognition. You can type the emergency description manually.';
      } else if (event.error === 'no-speech') {
        friendlyMsg = 'No speech detected. Click Speak to try again, or type manually.';
      }

      setError(friendlyMsg);
      if (onError) onError(event.error, friendlyMsg);
    };

    recognition.onend = () => {
      clearListeningTimer();
      setIsListening(false);
      setInterimTranscript('');
    };

    return recognition;
  }, [isSupported, continuous, interimResults, lang, clearListeningTimer, onResult, onError]);

  /**
   * Start microphone listening
   */
  const startListening = useCallback(() => {
    if (!isSupported) {
      setError('Voice recognition unavailable. You can type the emergency description manually.');
      return false;
    }

    try {
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch {}
      }

      const rec = initEngine();
      if (!rec) return false;

      recognitionRef.current = rec;
      rec.start();
      return true;
    } catch (err) {
      console.warn('[useVoiceToText] start error:', err);
      setError('Could not access microphone. You can type manually.');
      setIsListening(false);
      return false;
    }
  }, [isSupported, initEngine]);

  /**
   * Stop microphone listening
   */
  const stopListening = useCallback(() => {
    clearListeningTimer();
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (err) {
        console.warn('[useVoiceToText] stop error:', err);
      }
    }
    setIsListening(false);
  }, [clearListeningTimer]);

  /**
   * Clear transcript text
   */
  const resetTranscript = useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
    setError(null);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearListeningTimer();
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch {}
      }
    };
  }, [clearListeningTimer]);

  return {
    transcript,
    interimTranscript,
    isListening,
    isProcessing,
    isSupported,
    error,
    durationSeconds,
    durationFormatted: formatTimer(durationSeconds),
    startListening,
    stopListening,
    resetTranscript,
    setTranscript
  };
};

export default useVoiceToText;
