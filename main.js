import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js'; // TOEGEVOEGD: voor HDRI laden
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

startBtn.addEventListener('click', async () => {
  // TOEGEVOEGD:
  // extra zekerheid voor mobiel/iPhone inline video
  video.setAttribute('playsinline', '');
  video.setAttribute('webkit-playsinline', '');

  await startAR();

  // AANGEPAST:
  // video starten direct na user interaction
  try {
    video.currentTime = 0;
    await video.play();
  } catch (err) {
    console.warn('Video play geblokkeerd:', err);
  }
});

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
      imageTargetSrc: './public/targets/inclusie.mind',
    });

    const { renderer, scene, camera } = mindarThree;

    // TOEGEVOEGD:
    // renderer settings voor mooiere kleuren en contrast
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    // TOEGEVOEGD:
    // HDRI environment map laden voor mooiere reflecties/materialen
    // Zet alleen scene.environment, NIET scene.background in AR
    const rgbeLoader = new RGBELoader();
    rgbeLoader.load(
      './public/hdr/tree_lined_driveway_1k.hdr',
      (texture) => {
        texture.mapping = THREE.EquirectangularReflectionMapping;
        scene.environment = texture;

        // Optioneel: sommige Three.js versies ondersteunen dit niet.
        // Laat staan als het werkt, anders kun je deze regel weghalen.
        scene.environmentIntensity = 0.8;

        console.log('HDRI geladen');
      },
      undefined,
      () => {
        console.warn('HDRI kon niet geladen worden, scene draait zonder HDRI');
      }
    );

    // TOEGEVOEGD:
    // basislicht - zachte algemene belichting
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 1.2);
    scene.add(hemiLight);

    // TOEGEVOEGD:
    // hoofdlicht - geeft vorm, highlights en meer diepte aan je model
    const mainLight = new THREE.DirectionalLight(0xffffff, 1.0);
    mainLight.position.set(2, 4, 3);
    scene.add(mainLight);

    // TOEGEVOEGD:
    // fill light - maakt de schaduwkant zachter
    const fillLight = new THREE.DirectionalLight(0xffffff, 0.4);
    fillLight.position.set(-2, 2, -2);
    scene.add(fillLight);

    const anchor = mindarThree.addAnchor(0);

    // Video plane
    const videoTexture = new THREE.VideoTexture(video);

    // TOEGEVOEGD:
    // kwaliteitsinstelling voor video texture
    videoTexture.colorSpace = THREE.SRGBColorSpace;

    const plane = new THREE.Mesh(
      new THREE.PlaneGeometry(1.2, 0.675),
      new THREE.MeshBasicMaterial({
        map: videoTexture,
        transparent: true,
      })
    );

    // TOEGEVOEGD:
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

        // AANGEPAST:
        // Three.js gebruikt radialen, geen graden
        model.rotation.set(0, 0, Math.PI / 2);

        // TOEGEVOEGD:
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
    // video niet starten/stoppen op target events
    // alleen zichtbaarheid van het videovlak wijzigen
    anchor.onTargetFound = () => {
      setStatus('Target gevonden');
      plane.visible = true;
    };

    anchor.onTargetLost = () => {
      setStatus('Target kwijt');
      plane.visible = false;
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
