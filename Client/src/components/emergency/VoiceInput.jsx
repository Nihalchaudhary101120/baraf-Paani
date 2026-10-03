import React from 'react';
import useVoiceToText from '@/hooks/useVoiceToText';

/**
 * VoiceInput
 * Provides microphone-driven voice-to-text input for the Situation Description textarea.
 * Displays:
 *  - 🎙 Speak button when idle
 *  - 🔴 Listening... MM:SS [ Stop ] when active
 *  - Interim preview and graceful fallback notice if unsupported.
 */
const VoiceInput = ({ value, onChange, placeholder = 'Describe what happened...', disabled = false }) => {
  const {
    isListening,
    isSupported,
    durationFormatted,
    interimTranscript,
    error,
    startListening,
    stopListening
  } = useVoiceToText({
    onResult: (fullText, newChunk) => {
      // Append voice transcript to existing text or initialize
      const base = (value || '').trim();
      const updated = base ? `${base} ${newChunk}`.trim() : newChunk.trim();
      onChange(updated);
    }
  });

  const handleToggle = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', position: 'relative' }}>
      <div style={{ position: 'relative' }}>
        <textarea
          required
          rows={3}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          style={{
            width: '100%',
            padding: '0.65rem 0.75rem',
            paddingBottom: '2.5rem', // Leaves room for voice controls
            borderRadius: '8px',
            border: isListening ? '2px solid #EF4444' : '1.5px solid #CBD5E1',
            fontSize: '0.86rem',
            fontFamily: 'inherit',
            resize: 'vertical',
            minHeight: '85px',
            boxSizing: 'border-box',
            backgroundColor: isListening ? '#FEF2F2' : '#FFFFFF',
            transition: 'all 0.15s ease'
          }}
        />

        {/* Floating Voice Action Controls inside Textarea Bottom-Right */}
        <div style={{
          position: 'absolute',
          bottom: '8px',
          right: '8px',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          zIndex: 2
        }}>
          {isListening ? (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              backgroundColor: '#DC2626',
              color: '#FFFFFF',
              padding: '3px 10px',
              borderRadius: '9999px',
              fontSize: '0.72rem',
              fontWeight: 800,
              boxShadow: '0 2px 8px rgba(220, 38, 38, 0.4)',
              animation: 'pulse-red 1.8s infinite'
            }}>
              <span style={{
                display: 'inline-block',
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: '#FFFFFF',
                animation: 'blink 1s infinite'
              }} />
              <span>Listening... {durationFormatted}</span>
              <button
                type="button"
                onClick={handleToggle}
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.25)',
                  border: 'none',
                  borderRadius: '4px',
                  color: '#FFFFFF',
                  padding: '1px 6px',
                  fontSize: '0.7rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  marginLeft: '2px'
                }}
              >
                Stop
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleToggle}
              title={isSupported ? 'Click to dictate situation description' : 'Voice recognition unavailable in this browser'}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.3rem',
                backgroundColor: '#FFFFFF',
                border: '1px solid #CBD5E1',
                padding: '3px 9px',
                borderRadius: '6px',
                fontSize: '0.74rem',
                fontWeight: 700,
                color: '#334155',
                cursor: 'pointer',
                boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '16px', color: '#DC2626' }}>mic</span>
              <span>Speak</span>
            </button>
          )}
        </div>
      </div>

      {/* Interim live preview text */}
      {isListening && interimTranscript && (
        <div style={{
          fontSize: '0.75rem',
          color: '#DC2626',
          fontStyle: 'italic',
          padding: '2px 6px',
          backgroundColor: '#FFF1F2',
          borderRadius: '4px',
          border: '1px dashed #FECACA'
        }}>
          Dictating: "{interimTranscript}..."
        </div>
      )}

      {/* Notice if voice unsupported or error */}
      {error && !isListening && (
        <div style={{
          fontSize: '0.72rem',
          color: '#92400E',
          backgroundColor: '#FFFBEB',
          border: '1px solid #FDE68A',
          padding: '4px 8px',
          borderRadius: '4px',
          display: 'flex',
          alignItems: 'center',
          gap: '4px'
        }}>
          <span className="material-symbols-outlined" style={{ fontSize: '14px', color: '#D97706' }}>info</span>
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};

export default VoiceInput;
