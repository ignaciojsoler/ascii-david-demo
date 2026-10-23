import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import GUI from 'three/examples/jsm/libs/lil-gui.module.min.js';
import { createAsciiPass } from './ascii.js';

const status = document.getElementById('status');

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x111111);

const camera = new THREE.PerspectiveCamera(35, window.innerWidth / window.innerHeight, 0.01, 100);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.autoRotate = true;
controls.autoRotateSpeed = 0.6;

// Iluminación tipo museo: luz cálida desde arriba a un lado y relleno frío.
scene.add(new THREE.HemisphereLight(0xffffff, 0x222222, 0.6));
const key = new THREE.DirectionalLight(0xfff1e0, 2.5);
key.position.set(2, 4, 3);
scene.add(key);
const rim = new THREE.DirectionalLight(0xbfd4ff, 1.0);
rim.position.set(-3, 2, -2);
scene.add(rim);

// Render → tone mapping/sRGB → ASCII. El ASCII va último para trabajar
// sobre los colores finales de pantalla.
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
composer.addPass(new OutputPass());
const ascii = createAsciiPass();
composer.addPass(ascii);

const settings = { cellSize: 9 };

function updateResolution() {
  const pixelRatio = renderer.getPixelRatio();
  renderer.getDrawingBufferSize(ascii.uniforms.resolution.value);
  ascii.uniforms.cellSize.value = settings.cellSize * pixelRatio;
}
updateResolution();

const gui = new GUI({ title: 'ASCII' });
gui.add(ascii, 'enabled').name('activo (A)').listen();
gui.add(settings, 'cellSize', 4, 24, 1).name('tamaño celda').onChange(updateResolution);
gui.add(ascii.uniforms.contrast, 'value', 0.5, 3, 0.05).name('contraste');
gui.add(ascii.uniforms.brightness, 'value', -0.5, 0.5, 0.01).name('brillo');
gui.add(ascii.uniforms.colored, 'value').name('color');
gui.add(controls, 'autoRotate').name('rotar');
if (window.innerWidth < 600) gui.close();

window.addEventListener('keydown', (e) => {
  if (e.key === 'a' || e.key === 'A') ascii.enabled = !ascii.enabled;
});

const draco = new DRACOLoader().setDecoderPath('/draco/');
const loader = new GLTFLoader().setDRACOLoader(draco);

loader.load(
  '/models/david.glb',
  (gltf) => {
    const model = gltf.scene;

    // Material estándar tono mármol para que reaccione a las luces.
    model.traverse((obj) => {
      if (!obj.isMesh) return;
      const old = obj.material;
      obj.material = new THREE.MeshStandardMaterial({
        map: old.map,
        color: old.map ? 0xffffff : 0xece6dc,
        roughness: 0.55,
        metalness: 0,
        side: THREE.DoubleSide,
      });
      old.dispose();
      obj.geometry.computeVertexNormals();
    });

    // Normalizar: altura 2 unidades, base en y=0, centrado en x/z.
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    model.scale.multiplyScalar(2 / size.y);
    box.setFromObject(model);
    const center = box.getCenter(new THREE.Vector3());
    model.position.sub(new THREE.Vector3(center.x, box.min.y, center.z));
    scene.add(model);

    controls.target.set(0, 1.1, 0);
    camera.position.set(0, 1.3, 4.2);
    controls.update();

    status.remove();
  },
  (e) => {
    if (e.total) status.textContent = `Cargando modelo… ${Math.round((e.loaded / e.total) * 100)}%`;
  },
  (err) => {
    console.error(err);
    status.textContent = 'Error al cargar el modelo';
  },
);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
  updateResolution();
});

renderer.setAnimationLoop(() => {
  controls.update();
  composer.render();
});
