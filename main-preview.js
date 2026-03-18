import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const statusEl = document.querySelector('#status');
const errorBox = document.querySelector('#errorBox');
const coordsBox = document.querySelector('#coordsBox'); // TOEGEVOEGD: live coordinaatbox
const video = document.querySelector('#promoVideo');
const app = document.querySelector('#app');

function setStatus(text) {
  if (statusEl) statusEl.textContent = text;
  console.log(text);
}

function showError(text) {
  console.error(text);
  if (errorBox) {
    errorBox.style.display = 'block';
    errorBox.innerText = text;
  }
}

function clearError() {
  if (errorBox) errorBox.style.display = 'none';
}

function fmt(n) {
  return Number(n).toFixed(3);
}

// TOEGEVOEGD:
// live waardes van model tonen
function updateCoordsBox(target) {
  if (!coordsBox || !target) return;

  coordsBox.textContent = [
    'Model transform',
    '',
    `position.x: ${fmt(target.position.x)}`,
    `position.y: ${fmt(target.position.y)}`,
    `position.z: ${fmt(target.position.z)}`,
    '',
    `rotation.x: ${fmt(target.rotation.x)} rad`,
    `rotation.y: ${fmt(target.rotation.y)} rad`,
    `rotation.z: ${fmt(target.rotation.z)} rad`,
    '',
    `rotation.x: ${fmt(THREE.MathUtils.radToDeg(target.rotation.x))}°`,
    `rotation.y: ${fmt(THREE.MathUtils.radToDeg(target.rotation.y))}°`,
    `rotation.z: ${fmt(THREE.MathUtils.radToDeg(target.rotation.z))}°`,
    '',
    `scale.x: ${fmt(target.scale.x)}`,
    `scale.y: ${fmt(target.scale.y)}`,
    `scale.z: ${fmt(target.scale.z)}`,
  ].join('\n');
}

// TOEGEVOEGD:
// GUI voor realtime aanpassen
function createTransformGUI(target) {
  const GUI = window.GUI;
  if (!GUI || !target) {
    console.warn('window.GUI niet gevonden of target ontbreekt');
    return null;
  }

  const gui = new GUI({ title: 'Model Controls' });

  const state = {
    posX: target.position.x,
    posY: target.position.y,
    posZ: target.position.z,

    rotX: THREE.MathUtils.radToDeg(target.rotation.x),
    rotY: THREE.MathUtils.radToDeg(target.rotation.y),
    rotZ: THREE.MathUtils.radToDeg(target.rotation.z),

    scaleX: target.scale.x,
    scaleY: target.scale.y,
    scaleZ: target.scale.z,

    uniformScale: target.scale.x,

    copyValues: () => {
      const text = `
model.position.set(${fmt(target.position.x)}, ${fmt(target.position.y)}, ${fmt(target.position.z)});
model.rotation.set(${fmt(target.rotation.x)}, ${fmt(target.rotation.y)}, ${fmt(target.rotation.z)});
model.scale.set(${fmt(target.scale.x)}, ${fmt(target.scale.y)}, ${fmt(target.scale.z)});
      `.trim();

      navigator.clipboard.writeText(text).then(() => {
        setStatus('Transform gekopieerd');
      }).catch(() => {
        setStatus('Kon transform niet kopiëren');
      });
    },

    reset: () => {
      target.position.set(0, 0, 0);
      target.rotation.set(0, -Math.PI / 2, 0);
      target.scale.set(0.25, 0.25, 0.25);

      state.posX = target.position.x;
      state.posY = target.position.y;
      state.posZ = target.position.z;

      state.rotX = THREE.MathUtils.radToDeg(target.rotation.x);
      state.rotY = THREE.MathUtils.radToDeg(target.rotation.y);
      state.rotZ = THREE.MathUtils.radToDeg(target.rotation.z);

      state.scaleX = target.scale.x;
      state.scaleY = target.scale.y;
      state.scaleZ = target.scale.z;
      state.uniformScale = target.scale.x;

      gui.controllersRecursive().forEach((controller) => controller.updateDisplay());
      updateCoordsBox(target);
    },
  };

  const posFolder = gui.addFolder('Position');
  posFolder.add(state, 'posX', -5, 5, 0.001).name('x').onChange((v) => {
    target.position.x = v;
    updateCoordsBox(target);
  });
  posFolder.add(state, 'posY', -5, 5, 0.001).name('y').onChange((v) => {
    target.position.y = v;
    updateCoordsBox(target);
  });
  posFolder.add(state, 'posZ', -5, 5, 0.001).name('z').onChange((v) => {
    target.position.z = v;
    updateCoordsBox(target);
  });

  const rotFolder = gui.addFolder('Rotation (degrees)');
  rotFolder.add(state, 'rotX', -180, 180, 0.1).name('x').onChange((v) => {
    target.rotation.x = THREE.MathUtils.degToRad(v);
    updateCoordsBox(target);
  });
  rotFolder.add(state, 'rotY', -180, 180, 0.1).name('y').onChange((v) => {
    target.rotation.y = THREE.MathUtils.degToRad(v);
    updateCoordsBox(target);
  });
  rotFolder.add(state, 'rotZ', -180, 180, 0.1).name('z').onChange((v) => {
    target.rotation.z = THREE.MathUtils.degToRad(v);
    updateCoordsBox(target);
  });

  const scaleFolder = gui.addFolder('Scale');
  scaleFolder.add(state, 'uniformScale', 0.01, 3, 0.001).name('uniform').onChange((v) => {
    target.scale.set(v, v, v);
    state.scaleX = v;
    state.scaleY = v;
    state.scaleZ = v;
    gui.controllersRecursive().forEach((controller) => controller.updateDisplay());
    updateCoordsBox(target);
  });

  scaleFolder.add(state, 'scaleX', 0.01, 3, 0.001).name('x').onChange((v) => {
    target.scale.x = v;
    updateCoordsBox(target);
  });
  scaleFolder.add(state, 'scaleY', 0.01, 3, 0.001).name('y').onChange((v) => {
    target.scale.y = v;
    updateCoordsBox(target);
  });
  scaleFolder.add(state, 'scaleZ', 0.01, 3, 0.001).name('z').onChange((v) => {
    target.scale.z = v;
    updateCoordsBox(target);
  });

  gui.add(state, 'copyValues').name('Copy values');
  gui.add(state, 'reset').name('Reset');

  posFolder.open();
  rotFolder.open();
  scaleFolder.open();

  updateCoordsBox(target);
  return gui;
}

async function startPreview() {
  clearError();

  try {
    if (!app) {
      throw new Error('#app niet gevonden in je HTML');
    }

    if (!video) {
      throw new Error('#promoVideo niet gevonden in je HTML');
    }

    setStatus('Preview initialiseren...');

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x111111);

    const width = app.clientWidth || window.innerWidth;
    const height = app.clientHeight || window.innerHeight;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 1.0, 3.0);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
    });

    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    app.innerHTML = '';
    app.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.target.set(0, 0.6, 0);
    controls.update();

    const rgbeLoader = new RGBELoader();
    rgbeLoader.load(
      '/wereldcafe2026/public/tree_lined_driveway_1k.hdr',
      (texture) => {
        texture.mapping = THREE.EquirectangularReflectionMapping;
        scene.environment = texture;
        scene.background = texture;
        setStatus('HDRI geladen');
      },
      undefined,
      (err) => {
        console.warn('HDRI kon niet geladen worden:', err);
        setStatus('HDRI niet geladen, preview draait zonder HDRI');
      }
    );

    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 1.2);
    scene.add(hemiLight);

    const mainLight = new THREE.DirectionalLight(0xffffff, 1.0);
    mainLight.position.set(2, 4, 3);
    scene.add(mainLight);

    const fillLight = new THREE.DirectionalLight(0xffffff, 0.4);
    fillLight.position.set(-2, 2, -2);
    scene.add(fillLight);

    const frontLight = new THREE.DirectionalLight(0xffffff, 0.35);
    frontLight.position.set(0, 1.5, 2);
    scene.add(frontLight);

    const grid = new THREE.GridHelper(10, 20);
    scene.add(grid);

    const axes = new THREE.AxesHelper(1);
    scene.add(axes);

    if (!video.src || video.src.includes('undefined')) {
      showError('❌ video.mp4 ontbreekt of pad is fout');
      return;
    }

    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    video.setAttribute('playsinline', '');
    video.setAttribute('webkit-playsinline', '');
    video.crossOrigin = 'anonymous';

    video.onerror = () => {
      showError('❌ video.mp4 kan niet geladen worden');
    };

    const videoTexture = new THREE.VideoTexture(video);
    videoTexture.colorSpace = THREE.SRGBColorSpace;

    const videoPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(1.2, 0.675),
      new THREE.MeshBasicMaterial({
        map: videoTexture,
        transparent: true,
        side: THREE.DoubleSide,
      })
    );

    videoPlane.position.set(0, 0.9, -0.15);
    scene.add(videoPlane);

    const frame = new THREE.Mesh(
      new THREE.PlaneGeometry(1.28, 0.755),
      new THREE.MeshStandardMaterial({
        color: 0x222222,
        metalness: 0.25,
        roughness: 0.6,
      })
    );
    frame.position.set(0, 0.9, -0.16);
    scene.add(frame);

    setStatus('Model laden...');

    const loader = new GLTFLoader();
    loader.load(
      '/wereldcafe2026/public/boom.glb',
      (gltf) => {
        const model = gltf.scene;

model.position.set(0.000, 0.000, -0.098);
model.rotation.set(-1.388, 3.142, 1.138);
model.scale.set(0.133, 0.133, 0.133);

        model.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = false;
            child.receiveShadow = false;

            if (child.material) {
              child.material.needsUpdate = true;
            }
          }
        });

        scene.add(model);

        // TOEGEVOEGD:
        // realtime transform tool starten zodra model geladen is
        createTransformGUI(model);
        updateCoordsBox(model);

        setStatus('Preview klaar');
      },
      undefined,
      (err) => {
        console.error(err);
        showError('❌ model.glb kon niet geladen worden');
      }
    );

    try {
      video.currentTime = 0;
      await video.play();
      console.log('Video gestart');
    } catch (err) {
      console.warn('Video autoplay geblokkeerd:', err);
      setStatus('Preview klaar - video niet automatisch gestart');
    }

    window.addEventListener('resize', () => {
      const newWidth = app.clientWidth || window.innerWidth;
      const newHeight = app.clientHeight || window.innerHeight;

      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();

      renderer.setSize(newWidth, newHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    });

    renderer.setAnimationLoop(() => {
      controls.update();
      renderer.render(scene, camera);
    });

  } catch (err) {
    console.error(err);
    showError(`❌ Preview start mislukt: ${err.message}`);
  }
}

startPreview();
