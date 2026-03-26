import { useState, useRef, useCallback } from 'react';
import { pipeline } from '@huggingface/transformers';

// SpeechT5 uses speaker embeddings.
const DEFAULT_EMBEDDING = 'https://huggingface.co/datasets/Xenova/transformers.js-docs/resolve/main/speaker_embeddings.bin';
const EMBEDDINGS = {
    Alex: DEFAULT_EMBEDDING,
    Sam:  DEFAULT_EMBEDDING,
};

/** Convert raw PCM Float32Array to WAV Blob */
function float32ToWavBlob(samples, sampleRate) {
    const dataLen = samples.length * 2;
    const buf = new ArrayBuffer(44 + dataLen);
    const v = new DataView(buf);
    const str = (off, s) => [...s].forEach((c, i) => v.setUint8(off + i, c.charCodeAt(0)));
    str(0, 'RIFF'); v.setUint32(4, 36 + dataLen, true);
    str(8, 'WAVE'); str(12, 'fmt ');
    v.setUint32(16, 16, true); v.setUint16(20, 1, true);
    v.setUint16(22, 1, true);  v.setUint32(24, sampleRate, true);
    v.setUint32(28, sampleRate * 2, true); v.setUint16(32, 2, true);
    v.setUint16(34, 16, true); str(36, 'data'); v.setUint32(40, dataLen, true);
    for (let i = 0; i < samples.length; i++) {
        const s = Math.max(-1, Math.min(1, samples[i]));
        v.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }
    return new Blob([buf], { type: 'audio/wav' });
}

export function usePodcastTTS() {
    const [ttsReady,   setTtsReady]   = useState(false);
    const [ttsLoading, setTtsLoading] = useState(false);
    const [ttsError,   setTtsError]   = useState(null);
    const pipeRef   = useRef(null);
    const audioRef  = useRef(null);
    const stopFlag  = useRef(false);

    const initTTS = useCallback(async () => {
        if (pipeRef.current || ttsLoading) return;
        setTtsLoading(true);
        setTtsError(null);
        try {
            // Use SpeechT5, the standard TTS model in transformers.js
            pipeRef.current = await pipeline('text-to-speech', 'Xenova/speecht5_tts');
            setTtsReady(true);
        } catch (err) {
            setTtsError(err.message || 'Failed to initialize TTS');
            pipeRef.current = null;
        } finally {
            setTtsLoading(false);
        }
    }, [ttsLoading]);

    const speak = useCallback(async (text, speaker) => {
        if (!pipeRef.current) throw new Error('TTS not initialized');
        if (stopFlag.current) return;
        if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }

        const speaker_embeddings = EMBEDDINGS[speaker] ?? EMBEDDINGS.Sam;
        
        try {
            const out = await pipeRef.current(text, { speaker_embeddings });
            if (stopFlag.current) return;

            const blob = float32ToWavBlob(out.audio, out.sampling_rate);
            const url  = URL.createObjectURL(blob);

            return new Promise((resolve) => {
                const el = new Audio(url);
                audioRef.current = el;
                const cleanup = () => { URL.revokeObjectURL(url); audioRef.current = null; resolve(); };
                el.onended = cleanup;
                el.onerror = cleanup;
                el.play().catch((err) => {
                    if (err.name !== 'AbortError') console.warn('Audio play error:', err);
                    cleanup();
                });
            });
        } catch (err) {
            console.error('SpeechT5 synthesis error:', err);
        }
    }, []);

    const stopAudio = useCallback(() => {
        stopFlag.current = true;
        if (audioRef.current) {
            const el = audioRef.current;
            audioRef.current = null;
            el.onended = null;
            el.onerror = null;
            el.pause();
        }
    }, []);

    const resetStop = useCallback(() => { stopFlag.current = false; }, []);

    return { ttsReady, ttsLoading, ttsError, initTTS, speak, stopAudio, resetStop };
}
