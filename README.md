# ascii-demo

Michelangelo's David rendered in the browser with three.js, with a GPU ASCII post-processing shader on top.

## Running

```bash
npm install
npm run dev
```

Then open http://localhost:5173.

## Controls

- Drag to orbit, scroll to zoom.
- **A** toggles the ASCII effect.
- The panel in the top-right corner adjusts cell size, contrast, brightness, color mode and auto-rotation.

## Credits

The 3D model in `public/models/david.glb` is ["David Statue 3D Model FREE"](https://sketchfab.com/3d-models/david-statue-3d-model-free-fa01a0cf020943549f1c34ebbd598488) by [Mohammad Rajabloo](https://sketchfab.com/MohammadRajabloo), licensed under [CC BY 4.0](http://creativecommons.org/licenses/by/4.0/). It was converted to GLB and compressed with Draco; the geometry is otherwise unchanged.
