import * as THREE from 'three';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';

// Caracteres ordenados de menos a más "tinta".
export const DEFAULT_CHARS = ' .:-=+*#%@';

// Dibuja los caracteres en una tira horizontal (un cuadrado por carácter)
// que el shader usa como atlas de glifos.
function createGlyphAtlas(chars, size = 64) {
  const canvas = document.createElement('canvas');
  canvas.width = size * chars.length;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#fff';
  ctx.font = `bold ${size * 0.9}px ui-monospace, "DejaVu Sans Mono", monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  [...chars].forEach((c, i) => ctx.fillText(c, i * size + size / 2, size / 2));

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  return texture;
}

// Los colores se usan tal cual en espacio de pantalla (sRGB), porque el pass
// corre después del OutputPass.
const srgb = (hex) => new THREE.Color().setHex(hex, THREE.LinearSRGBColorSpace);

const AsciiShader = {
  uniforms: {
    tDiffuse: { value: null },
    tGlyphs: { value: null },
    charCount: { value: 1 },
    resolution: { value: new THREE.Vector2() },
    cellSize: { value: 10 },
    contrast: { value: 1.2 },
    brightness: { value: 0 },
    colored: { value: false },
    fgColor: { value: srgb(0xf2ece0) },
    bgColor: { value: srgb(0x111111) },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform sampler2D tGlyphs;
    uniform float charCount;
    uniform vec2 resolution;
    uniform float cellSize;
    uniform float contrast;
    uniform float brightness;
    uniform bool colored;
    uniform vec3 fgColor;
    uniform vec3 bgColor;
    varying vec2 vUv;

    void main() {
      vec2 pixel = vUv * resolution;
      vec2 cell = floor(pixel / cellSize);
      vec2 inCell = fract(pixel / cellSize);

      // Un solo color por celda, muestreado en su centro.
      vec3 color = texture2D(tDiffuse, (cell + 0.5) * cellSize / resolution).rgb;
      float lum = dot(color, vec3(0.299, 0.587, 0.114));
      lum = clamp((lum - 0.5) * contrast + 0.5 + brightness, 0.0, 0.9999);

      float index = floor(lum * charCount);
      float glyph = texture2D(tGlyphs, vec2((index + inCell.x) / charCount, inCell.y)).r;

      vec3 ink = colored ? color / max(lum, 0.25) : fgColor;
      gl_FragColor = vec4(mix(bgColor, ink, glyph), 1.0);
    }
  `,
};

export function createAsciiPass(chars = DEFAULT_CHARS) {
  const pass = new ShaderPass(AsciiShader);
  pass.uniforms.tGlyphs.value = createGlyphAtlas(chars);
  pass.uniforms.charCount.value = chars.length;
  return pass;
}
