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

if (playVideoBtn) {
  playVideoBtn.addEventListener('click', async () => {
    try {
      video.muted = false;
      video.playsInline = true;
      video.setAttribute('playsinline', '');
      video.setAttribute('webkit-playsinline', '');

      console.log('Voor play():', {
        paused: video.paused,
        muted: video.muted,
        readyState: video.readyState,
        currentTime: video.currentTime
      });

      // GEEN currentTime = 0; hier
      await video.play();

      if (plane) {
        plane.visible = true;
      }

      console.log('Na play():', {
        paused: video.paused,
        muted: video.muted,
        readyState: video.readyState,
        currentTime: video.currentTime
      });

      hidePlayButton();
      setStatus('Video speelt');
    } catch (err) {
      console.warn('Video play geblokkeerd:', err);
      showError(`❌ Video kon niet gestart worden: ${err.message}`);
    }
  });
}

startBtn.addEventListener('click', async () => {
  video.setAttribute('playsinline', '');
  video.setAttribute('webkit-playsinline', '');
  video.preload = 'auto';
  video.load();

  await startAR();

  // NIEUW:
  // Startknop verbergen zodra AR draait
  startBtn.classList.add('hidden');

  // NIEUW:
  // Play-knop direct tonen nadat AR gestart is
  // dus niet meer afhankelijk van target found/lost
  showPlayButton();
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

    video.onplay = () => {
      console.log('Video event: play');
    };

    video.onpause = () => {
      console.log('Video event: pause');
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

    plane = new THREE.Mesh(
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
        const wrapper = new THREE.Group();

        model.position.set(0, 0, 0);
        model.rotation.set(0, 0, 0);
        model.scale.set(1, 1, 1);

        wrapper.position.set(0.000, -0.150, -0.098);
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
      if (plane && !video.paused) {
        plane.visible = true;
      }
    };

    anchor.onTargetLost = () => {
      setStatus('Target kwijt');
      if (plane) {
        plane.visible = false;
      }
    };

    await mindarThree.start();

    renderer.setAnimationLoop(() => {
      renderer.render(scene, camera);
    });

    setStatus('Scan de afbeelding');

  } catch (err) {
    showError('❌ AR start mislukt (targets.mind ontbreekt of fout)');
    console.error(err);
  }
}
