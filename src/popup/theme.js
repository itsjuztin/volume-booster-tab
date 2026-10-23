/**
 * SonicWave - Theme Adapter
 * Dynamically queries Chrome's installed theme colors and maps them to CSS custom properties.
 */

function formatRgbColor(colorArray) {
  if (!Array.isArray(colorArray) || colorArray.length < 3) {
    return null;
  }
  const [r, g, b, a] = colorArray;
  if (a !== undefined) {
    const alpha = (a / 255).toFixed(2);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  return `rgb(${r}, ${g}, ${b})`;
}

export function applyChromeTheme() {
  if (!chrome.theme || !chrome.theme.getCurrent) {
    return;
  }

  chrome.theme.getCurrent((theme) => {
    if (!theme || !theme.colors) {
      return;
    }

    const { colors } = theme;
    const rootStyle = document.documentElement.style;

    const frameColor = formatRgbColor(colors.frame);
    const toolbarColor = formatRgbColor(colors.toolbar);
    const tabTextColor = formatRgbColor(colors.tab_text || colors.bookmark_text);
    const buttonIconColor = formatRgbColor(colors.toolbar_button_icon);

    if (frameColor) {
      rootStyle.setProperty('--bg-primary', frameColor);
    }
    if (toolbarColor) {
      rootStyle.setProperty('--bg-surface', toolbarColor);
      rootStyle.setProperty('--bg-card', toolbarColor);
    }
    if (tabTextColor) {
      rootStyle.setProperty('--text-primary', tabTextColor);
    }
    if (buttonIconColor) {
      rootStyle.setProperty('--accent-primary', buttonIconColor);
    }
  });
}
