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

// TOEGEVOEGD / GEFIXT:
// deze functie stond uitgecomment, maar werd later wel gebruikt.
// Daardoor zou je code crashen bij een error.
function showError(text) {
  console.error(text);
  errorBox.style.display = 'block';
  errorBox.innerText = text;
}

function clearError() {
  errorBox.style.display = 'none';
}

startBtn.addEventListener('click', async () => {
  await startAR();

  // Bestaand:
  // video starten na user interaction
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
    // optionele kwaliteitsinstellingen voor video texture
    videoTexture.colorSpace = THREE.SRGBColorSpace;

    const plane = new THREE.Mesh(
      new THREE.PlaneGeometry(1.2, 0.675),
      new THREE.MeshBasicMaterial({
        map: videoTexture,
        transparent: true, // TOEGEVOEGD: handig als je later alpha of overlay wilt
      })
    );

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

        // TOEGEVOEGD:
        // zorgt dat meshes in het model netjes schaduw/licht kunnen ontvangen
        model.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = false;   // shadows uit laten voor performance in AR
            child.receiveShadow = false;

            // TOEGEVOEGD:
            // soms handig om materialen correct te updaten als ze uit Blender komen
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

    // TOEGEVOEGD:
    // target found weer actief gemaakt, zodat status en video logisch werken
    anchor.onTargetFound = async () => {
      setStatus('Target gevonden');

      try {
        await video.play();
      } catch (err) {
        console.warn('❌ video kon niet starten', err);
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
