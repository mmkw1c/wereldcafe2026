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

if (playVideoBtn) {
  playVideoBtn.addEventListener('click', async () => {
    try {
      video.currentTime = 0;
      await video.play();
      hidePlayButton();
      setStatus('Video speelt');
    } catch (err) {
      console.warn('Video play geblokkeerd:', err);
      showError('❌ Video kon niet gestart worden');
    }
  });
}

startBtn.addEventListener('click', async () => {
  video.setAttribute('playsinline', '');
  video.setAttribute('webkit-playsinline', '');
  video.load();

  await startAR();
});

async function startAR() {
  clearError();
  hidePlayButton();

  try {
    setStatus('Initialiseren...');

    if (!video.src || video.src.includes('undefined')) {
      showError('❌ video.mp4 ontbreekt in /public/assets/');
      return;
    }

    video.onerror = () => {
      showError('❌ video.mp4 kan niet geladen worden');
    };

    video.onloadeddata = () => {
      console.log('Video OK');
    };

    video.oncanplay = () => {
      console.log('Video can play');
    };

    const mindarThree = new MindARThree({
      container: app,
      imageTargetSrc: './public/targets/inclusie.mind',
    });

    const { renderer, scene, camera } = mindarThree;

    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    const rgbeLoader = new RGBELoader();
    rgbeLoader.load(
      './public/tree_lined_driveway_1k.hdr',
      (texture) => {
        texture.mapping = THREE.EquirectangularReflectionMapping;
        scene.environment = texture;
        scene.environmentIntensity = 0.8;
        console.log('HDRI geladen');
      },
      undefined,
      () => {
        console.warn('HDRI kon niet geladen worden, scene draait zonder HDRI');
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

    const anchor = mindarThree.addAnchor(0);

    const videoTexture = new THREE.VideoTexture(video);
    videoTexture.colorSpace = THREE.SRGBColorSpace;

    const plane = new THREE.Mesh(
      new THREE.PlaneGeometry(1.2, 0.675),
      new THREE.MeshBasicMaterial({
        map: videoTexture,
        transparent: true,
      })
    );

    plane.visible = false;
    anchor.group.add(plane);

    setStatus('Model laden...');

    const loader = new GLTFLoader();
    let modelLoaded = false;

    loader.load(
      './public/boom.glb',
      (gltf) => {
        modelLoaded = true;

        const model = gltf.scene;

        // ================================
        // NIEUW: wrapper group tussen anchor en model
        // ================================
        const wrapper = new THREE.Group();

        // ================================
        // BELANGRIJK: reset het ruwe model eerst
        // zodat alleen de wrapper jouw preview-waardes draagt
        // ================================
        model.position.set(0, 0, 0);
        model.rotation.set(0, 0, 0);
        model.scale.set(1, 1, 1);

        // ================================
        // JOUW GETUNDE WAARDES HIER
        // afkomstig uit preview
        // ================================
        wrapper.position.set(0.000, 0.000, -0.098);
        wrapper.rotation.set(-1.388, 3.142, 1.138);
        wrapper.scale.set(0.133, 0.133, 0.133);

        model.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = false;
            child.receiveShadow = false;

            if (child.material) {
              child.material.needsUpdate = true;
            }
          }
        });

        // model in wrapper, wrapper in anchor
        wrapper.add(model);
        anchor.group.add(wrapper);

        setStatus('Model geladen');
      },
      undefined,
      () => {
        showError('❌ model.glb kon niet geladen worden (check pad of bestand)');
      }
    );

    setTimeout(() => {
      if (!modelLoaded) {
        showError('❌ model.glb niet gevonden of fout bestand');
      }
    }, 3000);

    anchor.onTargetFound = () => {
      setStatus('Target gevonden');
      plane.visible = true;
      showPlayButton();
    };

    anchor.onTargetLost = () => {
      setStatus('Target kwijt');
      plane.visible = false;
      video.pause();
      hidePlayButton();
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
