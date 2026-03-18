import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { MindARThree } from 'https://cdn.jsdelivr.net/npm/mind-ar@1.2.5/dist/mindar-image-three.prod.js';

const startBtn = document.querySelector('#startBtn');
const playVideoBtn = document.querySelector('#playVideoBtn'); // TOEGEVOEGD: aparte knop voor video playback
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

// TOEGEVOEGD:
// helper om de play-knop veilig te tonen
function showPlayButton() {
  if (playVideoBtn) {
    playVideoBtn.classList.remove('hidden');
  }
}

// TOEGEVOEGD:
// helper om de play-knop veilig te verbergen
function hidePlayButton() {
  if (playVideoBtn) {
    playVideoBtn.classList.add('hidden');
  }
}

// TOEGEVOEGD:
// aparte user interaction voor video met geluid
if (playVideoBtn) {
  playVideoBtn.addEventListener('click', async () => {
    try {
      video.currentTime = 0; // optioneel: altijd vanaf begin
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
  // extra zekerheid voor mobiel/iPhone inline video
  video.setAttribute('playsinline', '');
  video.setAttribute('webkit-playsinline', '');

  // TOEGEVOEGD:
  // preload helpen voor mobiel
  video.load();

  await startAR();

  // AANGEPAST:
  // video niet meer hier starten, want dat is vaak niet "direct genoeg"
  // de aparte playVideoBtn doet dat nu betrouwbaarder
});

async function startAR() {
  clearError();
  hidePlayButton(); // TOEGEVOEGD: play-knop standaard verbergen bij opstarten

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

    // TOEGEVOEGD:
    // extra debug moment: video is speelbaar
    video.oncanplay = () => {
      console.log('Video can play');
    };

    // Init MindAR
    const mindarThree = new MindARThree({
      container: app,
      imageTargetSrc: './public/targets/inclusie.mind',
    });

    const { renderer, scene, camera } = mindarThree;

    // renderer settings voor mooiere kleuren en contrast
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    // HDRI environment map laden voor mooiere reflecties/materialen
    // Zet alleen scene.environment, NIET scene.background in AR
    const rgbeLoader = new RGBELoader();
    rgbeLoader.load(
      './public/tree_lined_driveway_1k.hdr',
      (texture) => {
        texture.mapping = THREE.EquirectangularReflectionMapping;
        scene.environment = texture;

        // Optioneel
        scene.environmentIntensity = 0.8;

        console.log('HDRI geladen');
      },
      undefined,
      () => {
        console.warn('HDRI kon niet geladen worden, scene draait zonder HDRI');
      }
    );

    // basislicht - zachte algemene belichting
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 1.2);
    scene.add(hemiLight);

    // hoofdlicht - geeft vorm, highlights en meer diepte aan je model
    const mainLight = new THREE.DirectionalLight(0xffffff, 1.0);
    mainLight.position.set(2, 4, 3);
    scene.add(mainLight);

    // fill light - maakt de schaduwkant zachter
    const fillLight = new THREE.DirectionalLight(0xffffff, 0.4);
    fillLight.position.set(-2, 2, -2);
    scene.add(fillLight);

    const anchor = mindarThree.addAnchor(0);

    // Video plane
    const videoTexture = new THREE.VideoTexture(video);
    videoTexture.colorSpace = THREE.SRGBColorSpace;

    const plane = new THREE.Mesh(
      new THREE.PlaneGeometry(1.2, 0.675),
      new THREE.MeshBasicMaterial({
        map: videoTexture,
        transparent: true,
      })
    );

    // video eerst verbergen tot target gevonden is
    plane.visible = false;

    anchor.group.add(plane);

    // Model laden
    setStatus('Model laden...');

    const loader = new GLTFLoader();

    let modelLoaded = false;

    loader.load(
      './public/boom.glb',
      (gltf) => {
        modelLoaded = true;

        const model = gltf.scene;
        model.scale.set(0.25, 0.25, 0.25);
        model.position.set(0, 0, 0);

        // Three.js gebruikt radialen, geen graden
        model.rotation.set(0, 0, Math.PI / 2);

        // materiaal/mesh update voor nettere rendering
        model.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = false;
            child.receiveShadow = false;

            if (child.material) {
              child.material.needsUpdate = true;
            }
          }
        });

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

    // AANGEPAST:
    // target gevonden -> videovlak tonen + play-knop tonen
    anchor.onTargetFound = () => {
      setStatus('Target gevonden');
      plane.visible = true;
      showPlayButton(); // TOEGEVOEGD: gebruiker kan nu handmatig de video starten
    };

    // AANGEPAST:
    // target kwijt -> videovlak verbergen + video pauzeren + play-knop verbergen
    anchor.onTargetLost = () => {
      setStatus('Target kwijt');
      plane.visible = false;
      video.pause(); // TOEGEVOEGD: video stoppen als target weg is
      hidePlayButton(); // TOEGEVOEGD
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
