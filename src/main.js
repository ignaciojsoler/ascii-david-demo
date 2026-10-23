import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

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
});

renderer.setAnimationLoop(() => {
  controls.update();
  renderer.render(scene, camera);
});
