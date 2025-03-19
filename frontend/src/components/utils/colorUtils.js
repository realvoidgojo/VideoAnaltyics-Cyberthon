// utils/colorUtils.js

/**
 * Generates a distinct color in hex format.
 * Ensures the color is sufficiently different from existing colors.
 *
 * @param {Array<number>} existingColors - Array of existing hues (0-360).
 * @returns {Object} - An object containing the hue and hex color.
 */
export const getDistinctColor = (existingColors) => {
  let hue = Math.random() * 360; // Initial random hue
  const minHueDifference = 30; // Minimum degrees of hue difference

  // Function to calculate the hue difference
  const hueDifference = (hue1, hue2) => {
    let diff = Math.abs(hue1 - hue2);
    return Math.min(diff, 360 - diff);
  };

  // Ensure the new color is distinct from existing colors
  if (existingColors.length > 0) {
    let validHue = false;
    let attempts = 0;
    while (!validHue && attempts < 100) {
      validHue = true;
      for (let i = 0; i < existingColors.length; i++) {
        const existingHue = existingColors[i];
        if (hueDifference(hue, existingHue) < minHueDifference) {
          hue = Math.random() * 360; // Generate a new hue
          validHue = false;
          break;
        }
      }
      attempts++;
    }
  }

  // Convert HSL to hex
  const hslToHex = (h, s, l) => {
    l /= 100;
    const a = (s * Math.min(l, 1 - l)) / 100;
    const f = (n) => {
      const k = (n + h / 30) % 12;
      const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
      return Math.round(255 * color)
        .toString(16)
        .padStart(2, "0"); // Convert to Hex and pad
    };
    return `#${f(0)}${f(8)}${f(4)}`;
  };

  // Convert the HSL value to Hex
  const hexColor = hslToHex(hue, 90, 50); // High saturation and brightness
  return { hue: hue, hex: hexColor };
};
