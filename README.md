# Volume Booster & Equalizer for Tabs

> A lightweight, open-source Manifest V3 Chrome extension that boosts tab audio up to 1000% with a real soft limiter and 3-band equalizer. No paywalls, no popups, zero distortion.

[![Manifest V3](https://img.shields.io/badge/Manifest-V3-blue.svg)](https://developer.chrome.com/docs/extensions/mv3/intro/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Privacy: 100% Local](https://img.shields.io/badge/Privacy-100%25%20Local-green.svg)](#privacy--security)

---

## Why This Exists

Most tab volume boosters on the Chrome Web Store suffer from the same issues:
1. **Harsh Digital Distortion:** Without a limiter, pushing audio beyond 100% squares off the waveform, producing harsh, unlistenable static and speaker crackle.
2. **Aggressive Monetization:** Popular extensions lock higher volume levels (like 800% or 1000%) behind payment tiers or bombard users with donation popups.
3. **Audio Latency Drift:** Inefficient audio capture pipelines often drift out of lip-sync during video playback.

**Volume Booster & Equalizer for Tabs** is built from the ground up on modern Web Audio standards to fix this.

---

## Features

- **Up to 1000% Volume Boost:** Smooth, fine-grained slider control with quick presets (100%, 200%, 500%, 1000%).
- **Anti-Clipping Soft Limiter:** Integrated `DynamicsCompressorNode` acts as a brickwall limiter, keeping audio loud and punchy without cracking your speakers.
- **3-Band Equalizer:** Dedicated Bass (100 Hz), Mid/Vocal (1.5 kHz), and Treble (8 kHz) adjustments with one-click presets (*Flat*, *Vocal*, *Bass*, *Night*).
- **Tab Isolation:** Volume changes strictly apply to the active session and cleanly default to 100% on page refresh.
- **Tab Switcher:** Quickly view and switch to any background tab currently outputting sound.
- **Native Chromium Design:** Clean, distraction-free Material Dark interface designed to match your browser.

---

## Comparison

| Feature | Volume Master | Volume Booster & Equalizer |
| :--- | :--- | :--- |
| **Max Volume** | 600% (Free) / 1000% (Paid) | **1000% (100% Free)** |
| **Anti-Clipping Limiter** | No (Harsh Distortion) | **Yes (DynamicsCompressorNode)** |
| **3-Band Equalizer** | Basic Presets Only | **Yes (Full Band Sliders + Presets)** |
| **Anniversary / Donation Nags** | Yes | **Never (Zero Ads / Zero Popups)** |
| **Open Source** | Closed Source | **MIT Licensed** |

---

## Installation

### Manual Install (Developer Mode)
1. Clone or download this repository.
2. In Google Chrome, go to `chrome://extensions/`.
3. Enable **Developer mode** (top-right toggle).
4. Click **Load unpacked** (top-left) and select this folder.

---

## Privacy & Security

- **100% Client-Side:** Operates entirely locally inside your browser using the Chrome `tabCapture` and Web Audio APIs.
- **Zero Telemetry:** No user data, URLs, or audio content is ever stored, logged, or transmitted across the network.

---

## The Developer Utility Suite

Check out the other tools in this open-source suite:
- [**Playback Tools for YouTube**](https://github.com/itsjuztin/playback-tools-youtube) — Forces 4K/top resolution, auto-guards against bitrate drops, and cleans up Shorts & end cards.
- [**Playback Tools for Plex**](https://github.com/itsjuztin/playback-tools-plex) — Silent auto-skip for intros and credits, countdown bypass, and 1-click Picture-in-Picture.
- [**Independent Tab Zoom**](https://github.com/itsjuztin/independent-tab-zoom) — Per-tab isolated zoom control without syncing across the same domain.

---

## License

[MIT](LICENSE) © 2026 Justin
