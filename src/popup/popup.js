/**
 * SonicWave - Popup Controller
 * Manages slider interactions, EQ presets, audio tab switching, and theme integration.
 */

import { applyChromeTheme } from './theme.js';

const EQ_PRESETS = {
  flat: { name: 'Flat', bass: 0, mid: 0, treble: 0 },
  vocal: { name: 'Vocal Clarity', bass: -2, mid: 6, treble: 3 },
  bass: { name: 'Bass Boost', bass: 8, mid: 0, treble: -1 },
  night: { name: 'Night Mode', bass: 3, mid: 4, treble: -3 }
};

let currentTabId = null;
let currentVolume = 100;
let currentEq = { bass: 0, mid: 0, treble: 0 };

/**
 * Maps slider position (0..1000) to human-perceptual volume (0..1000%).
 * 0..333 -> 0..100% (fine control, 1% steps)
 * 333..667 -> 100..500% (boost control, 5% steps)
 * 667..1000 -> 500..1000% (high boost, 10% steps)
 */
function sliderToVolume(pos) {
  if (pos <= 0) return 0;
  if (pos >= 1000) return 1000;
  if (pos <= 333) {
    return Math.round((pos / 333.0) * 100);
  } else if (pos <= 667) {
    const frac = (pos - 333) / 334.0;
    const val = 100 + frac * 400;
    return Math.round(val / 5.0) * 5;
  } else {
    const frac = (pos - 667) / 333.0;
    const val = 500 + frac * 500;
    return Math.round(val / 10.0) * 10;
  }
}

/**
 * Maps volume (0..1000%) to slider position (0..1000).
 */
function volumeToSlider(vol) {
  if (vol <= 0) return 0;
  if (vol >= 1000) return 1000;
  if (vol <= 100) {
    return Math.round((vol / 100.0) * 333);
  } else if (vol <= 500) {
    const frac = (vol - 100.0) / 400.0;
    return Math.round(333 + frac * 334);
  } else {
    const frac = (vol - 500.0) / 500.0;
    return Math.round(667 + frac * 333);
  }
}

function getDomElements() {
  return {
    tabLabel: document.getElementById('currentTabLabel'),
    resetBtn: document.getElementById('resetTabBtn'),
    volumeSlider: document.getElementById('volumeSlider'),
    volumeValue: document.getElementById('volumeValue'),
    presetButtons: document.querySelectorAll('.preset-pill[data-volume]'),
    markers: document.querySelectorAll('.marker'),
    eqToggle: document.getElementById('eqToggle'),
    eqContent: document.getElementById('eqContent'),
    eqBadge: document.getElementById('eqBadge'),
    eqPresetButtons: document.querySelectorAll('.preset-pill[data-preset]'),
    bassSlider: document.getElementById('bassSlider'),
    midSlider: document.getElementById('midSlider'),
    trebleSlider: document.getElementById('trebleSlider'),
    bassVal: document.getElementById('bassVal'),
    midVal: document.getElementById('midVal'),
    trebleVal: document.getElementById('trebleVal'),
    audibleTabsList: document.getElementById('audibleTabsList')
  };
}

function updateVolumeUi(volume, elements) {
  currentVolume = volume;
  elements.volumeValue.textContent = volume;
  elements.volumeSlider.value = volumeToSlider(volume);

  elements.presetButtons.forEach(btn => {
    const btnVol = parseInt(btn.dataset.volume, 10);
    btn.classList.toggle('active', btnVol === volume);
  });

  elements.markers.forEach(marker => {
    const markerVal = parseInt(marker.dataset.val, 10);
    marker.classList.toggle('active-marker', markerVal === volume);
  });
}

function updateEqUi(eq, elements, presetKey = null) {
  currentEq = { ...eq };
  elements.bassSlider.value = eq.bass;
  elements.midSlider.value = eq.mid;
  elements.trebleSlider.value = eq.treble;

  elements.bassVal.textContent = `${eq.bass > 0 ? '+' : ''}${eq.bass} dB`;
  elements.midVal.textContent = `${eq.mid > 0 ? '+' : ''}${eq.mid} dB`;
  elements.trebleVal.textContent = `${eq.treble > 0 ? '+' : ''}${eq.treble} dB`;

  elements.eqPresetButtons.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.preset === presetKey);
  });

  if (presetKey && EQ_PRESETS[presetKey]) {
    elements.eqBadge.textContent = EQ_PRESETS[presetKey].name;
  } else if (eq.bass === 0 && eq.mid === 0 && eq.treble === 0) {
    elements.eqBadge.textContent = 'Flat';
  } else {
    elements.eqBadge.textContent = 'Custom';
  }
}

function sendWorkerMessage(action, payload = {}) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({
      target: 'service_worker',
      tabId: currentTabId,
      action,
      ...payload
    }, (res) => {
      resolve(res || {});
    });
  });
}

function renderAudibleTabs(tabs, container) {
  if (!tabs || tabs.length === 0) {
    container.innerHTML = '<div class="empty-state">No other audio tabs active</div>';
    return;
  }

  container.innerHTML = '';
  tabs.forEach(tab => {
    const item = document.createElement('div');
    item.className = `audible-tab-item ${tab.active ? 'current' : ''}`;
    item.title = `Switch to ${tab.title}`;

    const iconUrl = tab.favIconUrl || 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8" fill="%2364748b"/></svg>';
    item.innerHTML = `
      <div class="tab-left">
        <img class="tab-favicon" src="${iconUrl}" alt="" />
        <span class="tab-title-text">${tab.title || 'Untitled tab'}</span>
      </div>
      <span style="font-size: 10px; color: var(--text-muted);">${tab.active ? 'Active' : 'Play'}</span>
    `;

    item.addEventListener('click', () => {
      sendWorkerMessage('FOCUS_TAB', { tabId: tab.id });
    });

    container.appendChild(item);
  });
}

function bindEventListeners(elements) {
  // Volume Slider input
  elements.volumeSlider.addEventListener('input', (e) => {
    const pos = parseInt(e.target.value, 10);
    const vol = sliderToVolume(pos);
    currentVolume = vol;
    elements.volumeValue.textContent = vol;

    elements.presetButtons.forEach(btn => {
      const btnVol = parseInt(btn.dataset.volume, 10);
      btn.classList.toggle('active', btnVol === vol);
    });

    elements.markers.forEach(marker => {
      const markerVal = parseInt(marker.dataset.val, 10);
      marker.classList.toggle('active-marker', markerVal === vol);
    });

    sendWorkerMessage('SET_VOLUME', { volume: vol, ...currentEq });
  });

  // Preset Buttons
  elements.presetButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const vol = parseInt(btn.dataset.volume, 10);
      updateVolumeUi(vol, elements);
      sendWorkerMessage('SET_VOLUME', { volume: vol, ...currentEq });
    });
  });

  // Markers
  elements.markers.forEach(marker => {
    marker.addEventListener('click', () => {
      const vol = parseInt(marker.dataset.val, 10);
      updateVolumeUi(vol, elements);
      sendWorkerMessage('SET_VOLUME', { volume: vol, ...currentEq });
    });
  });

  // Reset Button
  elements.resetBtn.addEventListener('click', () => {
    updateVolumeUi(100, elements);
    updateEqUi(EQ_PRESETS.flat, elements, 'flat');
    sendWorkerMessage('RESET_TAB');
  });

  // EQ Accordion Toggle
  elements.eqToggle.addEventListener('click', () => {
    const isHidden = elements.eqContent.style.display === 'none';
    elements.eqContent.style.display = isHidden ? 'flex' : 'none';
  });

  // EQ Preset buttons
  elements.eqPresetButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const key = btn.dataset.preset;
      const preset = EQ_PRESETS[key] || EQ_PRESETS.flat;
      updateEqUi(preset, elements, key);
      sendWorkerMessage('SET_EQ', { volume: currentVolume, ...preset });
    });
  });

  // Manual EQ Sliders
  const handleEqSliderChange = () => {
    const eq = {
      bass: parseInt(elements.bassSlider.value, 10),
      mid: parseInt(elements.midSlider.value, 10),
      treble: parseInt(elements.trebleSlider.value, 10)
    };
    updateEqUi(eq, elements, null);
    sendWorkerMessage('SET_EQ', { volume: currentVolume, ...eq });
  };

  elements.bassSlider.addEventListener('input', handleEqSliderChange);
  elements.midSlider.addEventListener('input', handleEqSliderChange);
  elements.trebleSlider.addEventListener('input', handleEqSliderChange);
}

async function initPopup() {
  applyChromeTheme();
  const elements = getDomElements();

  const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (activeTab) {
    currentTabId = activeTab.id;
    elements.tabLabel.textContent = activeTab.title || activeTab.url || 'Active Tab';
  }

  const response = await sendWorkerMessage('GET_POPUP_STATE');
  if (response && response.session) {
    const { session } = response;
    updateVolumeUi(session.volume || 100, elements);
    updateEqUi({
      bass: session.bass || 0,
      mid: session.mid || 0,
      treble: session.treble || 0
    }, elements);
  }

  if (response && response.audibleTabs) {
    renderAudibleTabs(response.audibleTabs, elements.audibleTabsList);
  }

  bindEventListeners(elements);
}

document.addEventListener('DOMContentLoaded', initPopup);
