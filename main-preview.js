import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const statusEl = document.querySelector('#status');
const errorBox = document.querySelector('#errorBox');
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

async function startPreview() {
  clearError();

  try {
    setStatus('Preview initialiseren...');

    // ================================
    // 1. BASIS SCENE ZONDER AR
    // ================================
    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(
      45,
      app.clientWidth / app.clientHeight,
      0.1,
      100
    );
    camera.position.set(0, 1.2, 3.2);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
    });
    renderer.setSize(app.clientWidth, app.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // ================================
    // 2. RENDERER SETTINGS
    // ================================
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    app.innerHTML = '';
    app.appendChild(renderer.domElement);

    // ================================
    // 3. CONTROLS
    // hiermee kun je rond je scene draaien
    // ================================
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.target.set(0, 0.6, 0);

    // ================================
    // 4. HDRI
    // ================================
    const rgbeLoader = new RGBELoader();
    rgbeLoader.load(
      './public/hdr/studio.hdr',
      (texture) => {
        texture.mapping = THREE.EquirectangularReflectionMapping;
        scene.environment = texture;

        // achtergrond alleen in preview, niet in AR
        scene.background = texture;

        console.log('HDRI geladen');
      },
      undefined,
      () => {
        console.warn('HDRI kon niet geladen worden');
      }
    );

    // ================================
    // 5. LICHTEN
    // dezelfde setup als je AR scene
    // ================================
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 1.2);
    scene.add(hemiLight);

    const mainLight = new THREE.DirectionalLight(0xffffff, 1.0);
    mainLight.position.set(2, 4, 3);
    scene.add(mainLight);

    const fillLight = new THREE.DirectionalLight(0xffffff, 0.4);
    fillLight.position.set(-2, 2, -2);
    scene.add(fillLight);

    // ================================
    // 6. HELPER GRID
    // handig om schaal en positie te checken
    // ================================
    const grid = new THREE.GridHelper(10, 20);
    scene.add(grid);

    const axes = new THREE.AxesHelper(1);
    scene.add(axes);

    // ================================
    // 7. VIDEO CHECK
    // ================================
    if (!video.src || video.src.includes('undefined')) {
      showError('❌ video.mp4 ontbreekt in /public/assets/');
      return;
    }

    video.setAttribute('playsinline', '');
    video.setAttribute('webkit-playsinline', '');

    video.onerror = () => {
      showError('❌ video.mp4 kan niet geladen worden');
    };

    // ================================
    // 8. VIDEO-PLANE
    // hier staat je video gewoon in de scene
    // ================================
    const videoTexture = new THREE.VideoTexture(video);
    videoTexture.colorSpace = THREE.SRGBColorSpace;

    const videoPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(1.2, 0.675),
      new THREE.MeshBasicMaterial({
        map: videoTexture,
        transparent: true,
      })
    );

    // positie van het videoscherm in de previewscene
    videoPlane.position.set(0, 0.7, 0);
    scene.add(videoPlane);

    // ================================
    // 9. MODEL LADEN
    // ================================
    setStatus('Model laden...');

    const loader = new GLTFLoader();

    loader.load(
      './public/boom.glb',
      (gltf) => {
        const model = gltf.scene;

        model.scale.set(0.25, 0.25, 0.25);
        model.position.set(0, 0, 0);
        model.rotation.set(0, 0, Math.PI / 2);

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
        setStatus('Preview klaar');
      },
      undefined,
      () => {
        showError('❌ model.glb kon niet geladen worden');
      }
    );

    // ================================
    // 10. VIDEO STARTEN
    // in preview mag hij direct proberen te starten
    // ================================
    try {
      video.currentTime = 0;
      await video.play();
    } catch (err) {
      console.warn('Video play geblokkeerd:', err);
    }

    // ================================
    // 11. RESIZE
    // ================================
    window.addEventListener('resize', () => {
      camera.aspect = app.clientWidth / app.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(app.clientWidth, app.clientHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    });

    // ================================
    // 12. RENDER LOOP
    // ================================
    renderer.setAnimationLoop(() => {
      controls.update();
      renderer.render(scene, camera);
    });

  } catch (err) {
    showError('❌ Preview start mislukt');
    console.error(err);
  }
}

startPreview();
