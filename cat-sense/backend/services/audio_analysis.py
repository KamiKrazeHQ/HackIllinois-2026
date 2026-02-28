"""
FFT-based audio analysis for heavy machinery diagnostics.
Identifies dominant frequency and flags abnormal bands.
Requires: numpy, scipy
"""

import io
import logging
import numpy as np

logger = logging.getLogger(__name__)

# ── Known fault frequency bands (Hz) ─────────────────────────────────────────
# Based on common machinery failure signatures
FAULT_BANDS = [
    {"name": "bearing inner race fault",  "low": 100,  "high": 200,  "severity": "Moderate"},
    {"name": "bearing outer race fault",  "low": 200,  "high": 350,  "severity": "Moderate"},
    {"name": "gear mesh frequency",       "low": 350,  "high": 600,  "severity": "Minor"},
    {"name": "blade pass frequency",      "low": 600,  "high": 900,  "severity": "Minor"},
    {"name": "cavitation / turbulence",   "low": 900,  "high": 1500, "severity": "Severe"},
    {"name": "structural resonance",      "low": 20,   "high": 80,   "severity": "Severe"},
    {"name": "electrical hum",            "low": 50,   "high": 70,   "severity": "Minor"},
]

SEVERITY_RANK = {"Minor": 1, "Moderate": 2, "Severe": 3}


def _load_audio_numpy(audio_bytes: bytes) -> tuple[np.ndarray, int]:
    """
    Try to decode audio bytes → float32 waveform + sample rate.
    Supports WAV natively. Falls back to raw PCM if scipy is unavailable.
    """
    try:
        from scipy.io import wavfile
        sr, data = wavfile.read(io.BytesIO(audio_bytes))
        if data.ndim > 1:
            data = data.mean(axis=1)  # stereo → mono
        data = data.astype(np.float32)
        return data, int(sr)
    except Exception:
        # Treat as raw 16-bit PCM at 44100 Hz
        data = np.frombuffer(audio_bytes, dtype=np.int16).astype(np.float32)
        return data, 44100


def run_fft(audio_bytes: bytes) -> dict:
    """
    Run FFT on audio bytes.
    Returns dominant frequency, matched fault band, severity estimate.
    """
    try:
        waveform, sample_rate = _load_audio_numpy(audio_bytes)

        if len(waveform) == 0:
            return _empty_result("Empty audio buffer")

        # Compute FFT magnitude spectrum
        n = len(waveform)
        fft_magnitude = np.abs(np.fft.rfft(waveform))
        freqs = np.fft.rfftfreq(n, d=1.0 / sample_rate)

        # Ignore DC component (index 0)
        fft_magnitude[0] = 0

        # Dominant frequency
        dominant_idx = int(np.argmax(fft_magnitude))
        dominant_freq = float(freqs[dominant_idx])
        peak_amplitude = float(fft_magnitude[dominant_idx])

        # Normalise to 0-1
        max_amp = float(fft_magnitude.max()) or 1.0
        normalized_peak = peak_amplitude / max_amp

        # Match against fault bands
        matched_fault = None
        highest_severity = "Minor"
        for band in FAULT_BANDS:
            band_energy = float(
                fft_magnitude[(freqs >= band["low"]) & (freqs <= band["high"])].sum()
            )
            total_energy = float(fft_magnitude.sum()) or 1.0
            band_ratio = band_energy / total_energy

            if band_ratio > 0.15:  # >15% energy in this band → flag it
                if SEVERITY_RANK[band["severity"]] >= SEVERITY_RANK[highest_severity]:
                    highest_severity = band["severity"]
                    matched_fault = band["name"]

        anomaly_detected = matched_fault is not None or normalized_peak > 0.8

        return {
            "dominant_frequency_hz": round(dominant_freq, 2),
            "peak_amplitude_normalized": round(normalized_peak, 3),
            "anomaly_detected": anomaly_detected,
            "anomaly_type": matched_fault or ("high amplitude spike" if anomaly_detected else "none"),
            "severity": highest_severity if anomaly_detected else "Minor",
            "sample_rate_hz": sample_rate,
            "error": None,
        }

    except Exception as e:
        logger.error("FFT analysis error: %s", e)
        return _empty_result(f"{type(e).__name__}: {e}")


def _empty_result(error: str) -> dict:
    return {
        "dominant_frequency_hz": 0.0,
        "peak_amplitude_normalized": 0.0,
        "anomaly_detected": False,
        "anomaly_type": "none",
        "severity": "Minor",
        "sample_rate_hz": 0,
        "error": error,
    }
