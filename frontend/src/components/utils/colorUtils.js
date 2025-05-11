// utils/colorUtils.js

/**
 * Converts HSL to Hex color format.
 *
 * @param {number} h - Hue (0-360).
 * @param {number} s - Saturation (0-100).
 * @param {number} l - Lightness (0-100).
 * @returns {string} - Hex color string.
 */
export function hslToHex(h, s, l) {
  // Convert s and l to decimals
  s /= 100;
  l /= 100;

  // Calculate RGB values
  let c = (1 - Math.abs(2 * l - 1)) * s;
  let x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  let m = l - c / 2;
  let r = 0,
    g = 0,
    b = 0;

  if (0 <= h && h < 60) {
    r = c;
    g = x;
    b = 0;
  } else if (60 <= h && h < 120) {
    r = x;
    g = c;
    b = 0;
  } else if (120 <= h && h < 180) {
    r = 0;
    g = c;
    b = x;
  } else if (180 <= h && h < 240) {
    r = 0;
    g = x;
    b = c;
  } else if (240 <= h && h < 300) {
    r = x;
    g = 0;
    b = c;
  } else if (300 <= h && h < 360) {
    r = c;
    g = 0;
    b = x;
  }

  // Convert to hex
  r = Math.round((r + m) * 255)
    .toString(16)
    .padStart(2, "0");
  g = Math.round((g + m) * 255)
    .toString(16)
    .padStart(2, "0");
  b = Math.round((b + m) * 255)
    .toString(16)
    .padStart(2, "0");

  return `#${r}${g}${b}`;
}

/**
 * Generates a distinct color in hex format.
 * Ensures the color is sufficiently different from existing colors.
 *
 * @param {Array<number>} existingHues - Array of existing hues (0-360).
 * @returns {Object} - An object containing the hue and hex color.
 */
export const getDistinctColor = (existingHues = []) => {
  // Find a hue that's maximally distant from existing hues
  let newHue = Math.floor(Math.random() * 360);

  if (existingHues.length > 0) {
    // Try to find a distinct hue
    let bestHue = newHue;
    let maxDistance = 0;

    for (let testHue = 0; testHue < 360; testHue += 10) {
      let minDistance = 361;

      for (const existingHue of existingHues) {
        const distance = Math.min(
          Math.abs(testHue - existingHue),
          360 - Math.abs(testHue - existingHue)
        );
        minDistance = Math.min(minDistance, distance);
      }

      if (minDistance > maxDistance) {
        maxDistance = minDistance;
        bestHue = testHue;
      }
    }

    newHue = bestHue;
  }

  // Convert to hex directly
  const hex = hslToHex(newHue, 70, 50);

  return {
    hue: newHue,
    hex: hex,
  };
};
