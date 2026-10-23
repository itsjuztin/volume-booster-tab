# Privacy Policy

**Last Updated:** October 23, 2026

## Overview
**Volume Booster & Equalizer for Tabs** is an open-source, local-first browser extension designed to amplify and equalize audio on individual tabs. We believe privacy is a fundamental right. This policy outlines our strict commitment to zero data collection.

## Data Collection & Storage
- **No Personal Data Collected:** We do not collect, track, log, or store any personal information, browsing history, search queries, or user identifiers.
- **No Audio Recording or Transmission:** Audio processing (amplification, soft limiting, and equalization) is handled in real-time entirely on your local machine using the browser's native Web Audio API. Audio streams are never recorded, saved, or transmitted to any external server.
- **No Telemetry or Analytics:** The extension contains zero tracking scripts, analytics SDKs, ads, or telemetry.

## Permissions Usage
- `tabCapture`: Used exclusively to capture the audio stream of the active tab for real-time local amplification and filtering.
- `offscreen`: Used to host the Web Audio Context and audio DSP nodes in a background offscreen document as required by Chrome Manifest V3.
- `tabs` & `activeTab`: Used solely to detect which tab you are viewing and identify background tabs currently producing sound.

## Third-Party Services
This extension does not connect to any third-party APIs, servers, or external services.

## Contact & Bug Reports
For questions, suggestions, or issues, please visit our GitHub repository:  
https://github.com/itsjuztin/volume-booster-tab/issues
