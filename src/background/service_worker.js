/**
 * SonicWave - Service Worker
 * Manages extension lifecycle, offscreen audio pipeline, tab navigation resets, and badge notifications.
 */

const OFFSCREEN_PATH = 'src/offscreen/offscreen.html';
const BADGE_COLOR = '#0ea5e9';

async function ensureOffscreenDocument() {
  const contexts = await chrome.runtime.getContexts({
    contextTypes: ['OFFSCREEN_DOCUMENT'],
    documentUrls: [chrome.runtime.getURL(OFFSCREEN_PATH)]
  });

  if (contexts.length > 0) {
    return;
  }

  await chrome.offscreen.createDocument({
    url: OFFSCREEN_PATH,
    reasons: [chrome.offscreen.Reason.USER_MEDIA],
    justification: 'Captures tab audio stream for amplification and equalization.'
  });
}

async function sendToAudioEngine(payload) {
  await ensureOffscreenDocument();
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ ...payload, target: 'audio_engine' }, (response) => {
      if (chrome.runtime.lastError) {
        resolve({ success: false, error: chrome.runtime.lastError.message });
        return;
      }
      resolve(response || { success: true });
    });
  });
}

function updateTabBadge(tabId, volume) {
  if (volume > 100) {
    chrome.action.setBadgeText({ tabId, text: `${Math.round(volume)}%` });
    chrome.action.setBadgeBackgroundColor({ tabId, color: BADGE_COLOR });
  } else {
    chrome.action.setBadgeText({ tabId, text: '' });
  }
}

async function startTabCapture(tabId, volume, bass = 0, mid = 0, treble = 0) {
  await ensureOffscreenDocument();

  return new Promise((resolve, reject) => {
    chrome.tabCapture.getMediaStreamId({ targetTabId: tabId }, async (streamId) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }

      const result = await sendToAudioEngine({
        action: 'START_CAPTURE',
        tabId,
        streamId,
        volume,
        bass,
        mid,
        treble
      });

      if (result && result.success) {
        updateTabBadge(tabId, volume);
        resolve(result);
      } else {
        reject(new Error((result && result.error) || 'Failed to start capture'));
      }
    });
  });
}

// Clean up audio capture when tab is closed
chrome.tabs.onRemoved.addListener((tabId) => {
  sendToAudioEngine({ action: 'STOP_CAPTURE', tabId }).catch(() => {});
});

// Reset tab audio to clean 100% state when navigating or refreshing
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === 'loading') {
    updateTabBadge(tabId, 100);
    sendToAudioEngine({ action: 'STOP_CAPTURE', tabId }).catch(() => {});
  }
});

// Handle popup commands
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.target !== 'service_worker') {
    return false;
  }

  const { action, tabId } = message;

  if (action === 'GET_POPUP_STATE') {
    (async () => {
      const sessionState = await sendToAudioEngine({ action: 'GET_SESSION', tabId });
      const audibleTabs = await chrome.tabs.query({ audible: true });
      sendResponse({
        session: sessionState,
        audibleTabs: audibleTabs.map(t => ({ id: t.id, title: t.title, favIconUrl: t.favIconUrl, active: t.id === tabId }))
      });
    })();
    return true;
  }

  if (action === 'SET_VOLUME') {
    (async () => {
      const state = await sendToAudioEngine({ action: 'GET_SESSION', tabId });
      if (!state || !state.active) {
        // If not capturing yet and volume is changing from 100%, start capture
        if (message.volume !== 100) {
          try {
            await startTabCapture(tabId, message.volume, message.bass, message.mid, message.treble);
            sendResponse({ success: true });
          } catch (err) {
            sendResponse({ success: false, error: err.message });
          }
          return;
        }
        sendResponse({ success: true });
        return;
      }

      const res = await sendToAudioEngine({ action: 'SET_VOLUME', tabId, volume: message.volume });
      updateTabBadge(tabId, message.volume);
      sendResponse(res);
    })();
    return true;
  }

  if (action === 'SET_EQ') {
    (async () => {
      const state = await sendToAudioEngine({ action: 'GET_SESSION', tabId });
      if (!state || !state.active) {
        try {
          await startTabCapture(tabId, message.volume || 100, message.bass, message.mid, message.treble);
          sendResponse({ success: true });
        } catch (err) {
          sendResponse({ success: false, error: err.message });
        }
        return;
      }

      const res = await sendToAudioEngine({
        action: 'SET_EQ',
        tabId,
        bass: message.bass,
        mid: message.mid,
        treble: message.treble
      });
      sendResponse(res);
    })();
    return true;
  }

  if (action === 'RESET_TAB') {
    (async () => {
      await sendToAudioEngine({ action: 'STOP_CAPTURE', tabId });
      updateTabBadge(tabId, 100);
      sendResponse({ success: true });
    })();
    return true;
  }

  if (action === 'FOCUS_TAB') {
    chrome.tabs.update(tabId, { active: true }, (tab) => {
      if (tab && tab.windowId) {
        chrome.windows.update(tab.windowId, { focused: true });
      }
      sendResponse({ success: true });
    });
    return true;
  }

  return false;
});
