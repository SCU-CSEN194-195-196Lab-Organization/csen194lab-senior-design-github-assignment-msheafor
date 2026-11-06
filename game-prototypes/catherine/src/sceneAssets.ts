/**
 * Image paths for the dialogue scene.
 * Drop a PNG at the public path, or change the path here, and refresh.
 * Missing files fall back to labeled stand-ins.
 * Each suspect PNG is both the lineup portrait and the character in that dialogue.
 */
export const sceneAssets = {
  background: "/assets/background.png",
  cursor: "/assets/magnifying-glass.png",
  suspectsBackground: "/assets/suspects-background.png",
  suspects: [
    "/assets/suspect-1.png",
    "/assets/suspect-2.png",
    "/assets/suspect-3.png",
  ],
};

/**
 * Pixel hotspot at the center of the magnifying-glass lens.
 * A replacement cursor PNG should place the lens center on this pixel.
 */
export const cursorHotspot = { x: 11, y: 11 };
