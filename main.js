import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MindARThree } from 'https://cdn.jsdelivr.net/npm/mind-ar@1.2.5/dist/mindar-image-three.prod.js';

const startBtn = document.querySelector('#startBtn');
const statusEl = document.querySelector('#status');
const errorBox = document.querySelector('#errorBox');
const ui = document.querySelector('#ui');
const video = document.querySelector('#promoVideo');
const app = document.querySelector('#app');

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

startBtn.addEventListener('click', startAR);

async function startAR() {
  clearError();

  try {
    setStatus('Initialiseren...');

    // Check video file
    if (!video.src || video.src.includes('undefined')) {
      showError('❌ video.mp4 ontbreekt in /public/assets/');
      return;
    }

    // Check video load
    video.onerror = () => {
      showError('❌ video.mp4 kan niet geladen worden');
    };

    video.onloadeddata = () => {
      console.log('Video OK');
    };

    // Init MindAR
    const mindarThree = new MindARThree({
      container: app,
      imageTargetSrc: './public/targets/wereldcafe.mind',
    });

    const { renderer, scene, camera } = mindarThree;

    // Licht
    scene.add(new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1));

    const anchor = mindarThree.addAnchor(0);

    // Video plane
    const videoTexture = new THREE.VideoTexture(video);
    const plane = new THREE.Mesh(
      new THREE.PlaneGeometry(1.2, 0.675),
      new THREE.MeshBasicMaterial({ map: videoTexture })
    );
    anchor.group.add(plane);

    // Model laden
    setStatus('Model laden...');

    const loader = new GLTFLoader();

    let modelLoaded = false;

    loader.load(
      'https://elektrafungi.com/kw1c/model/scene.gltf',
      (gltf) => {
        modelLoaded = true;

        const model = gltf.scene;
        model.scale.set(0.25, 0.25, 0.25);
        model.position.set(0, -0.2, 0);

        anchor.group.add(model);
        setStatus('Model geladen');
      },
      undefined,
      () => {
        showError('❌ model.glb kon niet geladen worden (check pad of bestand)');
      }
    );

    // Safety timeout
    setTimeout(() => {
      if (!modelLoaded) {
        showError('❌ model.glb niet gevonden of fout bestand');
      }
    }, 3000);

    anchor.onTargetFound = async () => {
      setStatus('Target gevonden');

      try {
        await video.play();
      } catch {
        showError('❌ video kon niet starten');
      }
    };

    anchor.onTargetLost = () => {
      setStatus('Target kwijt');
      video.pause();
    };

    await mindarThree.start();

    renderer.setAnimationLoop(() => {
      renderer.render(scene, camera);
    });

    ui.classList.add('hidden');
    setStatus('Scan de afbeelding');

  } catch (err) {
    showError('❌ AR start mislukt (targets.mind ontbreekt of fout)');
    console.error(err);
  }
}
