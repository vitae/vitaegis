# Glyph Atlas Assets

## Overview
This directory contains the glyph atlas assets for the Matrix Digital Rain effect.

## Files

### atlas.json
Contains the UV mapping metadata and glyph index information for the texture atlas.

### atlas.png (To be added)
A 512x512px texture atlas containing all the glyphs arranged in a 16x16 grid.

## Procedural Generation
Currently, the MatrixCanvas component generates the glyph atlas **procedurally at runtime** using an HTML5 Canvas element. This approach:
- Creates a 512x512px texture with 16x16 grid layout
- Renders Japanese katakana characters and alphanumerics
- Uses Courier New monospace font for consistent character sizing
- Converts to THREE.CanvasTexture for WebGL rendering

## Using Rezmason's Atlas (Optional Enhancement)
To use the authentic Rezmason Matrix Digital Rain glyph atlas:

1. Download the atlas.png from: https://github.com/Rezmason/matrix
2. Place it in this directory as `atlas.png`
3. Update MatrixCanvas.jsx to load the texture file instead of generating it:

```javascript
// Replace the canvas generation code with:
const textureLoader = new THREE.TextureLoader();
textureLoader.load('/glyphs/atlas.png', (texture) => {
  setAtlasTexture(texture);
});
```

## Atlas Specifications
- **Size**: 512x512 pixels
- **Grid**: 16x16 glyphs (256 total slots)
- **Glyph Size**: 32x32 pixels each
- **Format**: PNG with alpha channel
- **Characters**: Japanese katakana + alphanumeric + symbols

## Performance Notes
The current procedural approach is lightweight and requires no external assets, making it ideal for:
- Fast initial page loads
- Deployment simplicity
- Customization flexibility

For production use with high-fidelity rendering, consider using a pre-generated atlas.png file.
