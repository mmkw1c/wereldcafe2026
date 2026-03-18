import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { MindARThree } from 'https://cdn.jsdelivr.net/npm/mind-ar@1.2.5/dist/mindar-image-three.prod.js';

const startBtn = document.querySelector('#startBtn');
const playVideoBtn = document.querySelector('#playVideoBtn');
const statusEl = document.querySelector('#status');
const errorBox = document.querySelector('#errorBox');
const ui = document.querySelector('#ui');
const video = document.querySelector('#promoVideo');
const app = document.querySelector('#app');

let plane = null;

function setStatus(text) {
  statusEl.textContent = text;
  console.log(text);
}

function showError(text) {
  console.error(text);
  errorBox.style.display = 'block';
  errorBox.innerText = text;
}

function clearError() {
  errorBox.style.display = 'none';
}

function showPlayButton() {
  if (playVideoBtn) {
    playVideoBtn.classList.remove('hidden');
  }
}

function hidePlayButton() {
  if (playVideoBtn) {
    playVideoBtn.classList.add('hidden');
  }
}

// ================================
// PLAY BUTTON (DEBUG: MUTED)
// ================================
if (playVideoBtn) {
  playVideoBtn.addEventListener('click', async () => {
    try {
      video.muted = true; // 🔥 BELANGRIJK: debug zonder audio restricties
      video.playsInline = true;
      video.setAttribute('playsinline', '');
      video.setAttribute('webkit-playsinline', '');

      console.log('Voor play():', {
        paused: video.paused,
        muted: video.muted,
        readyState: video.readyState,
      });

      await video.play();

      console.log('Na play():', {
        paused: video.paused,
        muted: video.muted,
        readyState: video.readyState,
      });

      hidePlayButton();
      setStatus('Video speelt (muted debug)');
    } catch (err) {
      console.warn('Video play geblokkeerd:', err);
      showError(`❌ Video kon niet gestart worden: ${err.message}`);
    }
  });
}

// ================================
// START AR
// ================================
startBtn.addEventListener('click', async () => {
  video.setAttribute('playsinline', '');
  video.setAttribute('webkit-playsinline', '');
  video.preload = 'auto';
  video.load();

  await startAR();

  startBtn.classList.add('hidden');
  showPlayButton();
});

// ================================
// MAIN AR
// ================================
async function startAR() {
  clearError();
  hidePlayButton();

  try {
    setStatus('Initialiseren...');

    if (!video.src || video.src.includes('undefined')) {
      showError('❌ video.mp4 ontbreekt');
      return;
    }

    const mindarThree = new MindARThree({
      container: app,
      imageTargetSrc: './public/targets/inclusie.mind',
    });

    const { renderer, scene, camera } = mindarThree;

    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    // ================================
    // HDRI
    // ================================
    const rgbeLoader = new RGBELoader();
    rgbeLoader.load('./public/tree_lined_driveway_1k.hdr', (texture) => {
      texture.mapping = THREE.EquirectangularReflectionMapping;
      scene.environment = texture;
    });

    // ================================
    // LICHT
    // ================================
    scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 1.2));

    const mainLight = new THREE.DirectionalLight(0xffffff, 1);
    mainLight.position.set(2, 4, 3);
    scene.add(mainLight);

    // ================================
    // ANCHOR
    // ================================
    const anchor = mindarThree.addAnchor(0);

    // ================================
    // VIDEO TEXTURE
    // ================================
    const videoTexture = new THREE.VideoTexture(video);
    videoTexture.colorSpace = THREE.SRGBColorSpace;

    plane = new THREE.Mesh(
      new THREE.PlaneGeometry(1.2, 0.675),
      new THREE.MeshBasicMaterial({
        map: videoTexture,
        side: THREE.DoubleSide,
      })
    );

    // 🔥 BELANGRIJK: altijd zichtbaar voor debug
    plane.visible = true;

    anchor.group.add(plane);

    // ================================
    // MODEL
    // ================================
    const loader = new GLTFLoader();

    loader.load('./public/boom.glb', (gltf) => {
      const model = gltf.scene;
      const wrapper = new THREE.Group();

      model.position.set(0, 0, 0);
      model.rotation.set(0, 0, 0);
      model.scale.set(1, 1, 1);

      wrapper.position.set(0.000, -0.150, -0.098);
      wrapper.rotation.set(-1.388, 3.142, 1.138);
      wrapper.scale.set(0.133, 0.133, 0.133);

      wrapper.add(model);
      anchor.group.add(wrapper);

      setStatus('Model geladen');
    });

    // ================================
    // DEBUG: alleen logging
    // ================================
    anchor.onTargetFound = () => {
      console.log('Target gevonden');
    };

    anchor.onTargetLost = () => {
      console.log('Target kwijt');
    };

    await mindarThree.start();

    renderer.setAnimationLoop(() => {
      renderer.render(scene, camera);
    });

    setStatus('Scan de afbeelding');

  } catch (err) {
    showError('❌ AR start mislukt');
    console.error(err);
  }
}
