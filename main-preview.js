import * as THREE from 'https://unpkg.com/three@0.165.0/build/three.module.js';
import { GLTFLoader } from 'https://unpkg.com/three@0.165.0/examples/jsm/loaders/GLTFLoader.js';
import { RGBELoader } from 'https://unpkg.com/three@0.165.0/examples/jsm/loaders/RGBELoader.js';
import { OrbitControls } from 'https://unpkg.com/three@0.165.0/examples/jsm/controls/OrbitControls.js';

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
    // TOEGEVOEGD:
    // harde checks zodat je sneller ziet wat ontbreekt
    if (!app) {
      throw new Error('#app niet gevonden in je HTML');
    }

    if (!video) {
      throw new Error('#promoVideo niet gevonden in je HTML');
    }

    setStatus('Preview initialiseren...');

    // ================================
    // 1. BASIS SCENE ZONDER AR
    // ================================
    const scene = new THREE.Scene();

    // TOEGEVOEGD:
    // neutrale achtergrond als fallback, tot HDRI geladen is
    scene.background = new THREE.Color(0x111111);

    // TOEGEVOEGD:
    // fallback afmetingen als app nog geen grootte heeft
    const width = app.clientWidth || window.innerWidth;
    const height = app.clientHeight || window.innerHeight;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 1.0, 3.0);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false, // AANGEPAST: voor preview is false meestal stabieler
    });

    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // ================================
    // 2. RENDERER SETTINGS
    // ================================
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    // TOEGEVOEGD:
    // bestaande canvas opruimen
    app.innerHTML = '';
    app.appendChild(renderer.domElement);

    // ================================
    // 3. CONTROLS
    // ================================
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.target.set(0, 0.6, 0);
    controls.update();

    // ================================
    // 4. HDRI
    // ================================
    // AANGEPAST:
    // foutmelding duidelijker gemaakt
    const rgbeLoader = new RGBELoader();
    rgbeLoader.load(
      './public/hdr/studio.hdr',
      (texture) => {
        texture.mapping = THREE.EquirectangularReflectionMapping;
        scene.environment = texture;

        // Alleen in preview tonen we de HDRI als achtergrond
        scene.background = texture;

        setStatus('HDRI geladen');
      },
      undefined,
      (err) => {
        console.warn('HDRI kon niet geladen worden:', err);
        setStatus('HDRI niet geladen, preview draait zonder HDRI');
      }
    );

    // ================================
    // 5. LICHTEN
    // ================================
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 1.2);
    scene.add(hemiLight);

    const mainLight = new THREE.DirectionalLight(0xffffff, 1.0);
    mainLight.position.set(2, 4, 3);
    scene.add(mainLight);

    const fillLight = new THREE.DirectionalLight(0xffffff, 0.4);
    fillLight.position.set(-2, 2, -2);
    scene.add(fillLight);

    // TOEGEVOEGD:
    // extra zacht frontlicht zodat je model bijna altijd zichtbaar blijft
    const frontLight = new THREE.DirectionalLight(0xffffff, 0.35);
    frontLight.position.set(0, 1.5, 2);
    scene.add(frontLight);

    // ================================
    // 6. HELPERS
    // ================================
    const grid = new THREE.GridHelper(10, 20);
    scene.add(grid);

    const axes = new THREE.AxesHelper(1);
    scene.add(axes);

    // ================================
    // 7. VIDEO CHECK
    // ================================
    if (!video.src || video.src.includes('undefined')) {
      showError('❌ video.mp4 ontbreekt of pad is fout');
      return;
    }

    // TOEGEVOEGD:
    // voor preview liever muted starten, zodat autoplay meestal lukt
    // haal dit weg als je bewust op klik met geluid wilt starten
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    video.setAttribute('playsinline', '');
    video.setAttribute('webkit-playsinline', '');
    video.crossOrigin = 'anonymous';

    video.onerror = () => {
      showError('❌ video.mp4 kan niet geladen worden');
    };

    // ================================
    // 8. VIDEO-PLANE
    // ================================
    const videoTexture = new THREE.VideoTexture(video);
    videoTexture.colorSpace = THREE.SRGBColorSpace;

    const videoPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(1.2, 0.675),
      new THREE.MeshBasicMaterial({
        map: videoTexture,
        transparent: true,
        side: THREE.DoubleSide, // TOEGEVOEGD
      })
    );

    // AANGEPAST:
    // iets hoger en iets naar achter zodat model en video niet precies botsen
    videoPlane.position.set(0, 0.9, -0.15);
    scene.add(videoPlane);

    // TOEGEVOEGD:
    // randje om videovlak beter te zien
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
      (err) => {
        console.error(err);
        showError('❌ model.glb kon niet geladen worden');
      }
    );

    // ================================
    // 10. VIDEO STARTEN
    // ================================
    // AANGEPAST:
    // muted autoplay heeft meer kans van slagen
    try {
      video.currentTime = 0;
      await video.play();
      console.log('Video gestart');
    } catch (err) {
      console.warn('Video autoplay geblokkeerd:', err);
      setStatus('Preview klaar - video niet automatisch gestart');
    }

    // ================================
    // 11. RESIZE
    // ================================
    window.addEventListener('resize', () => {
      const newWidth = app.clientWidth || window.innerWidth;
      const newHeight = app.clientHeight || window.innerHeight;

      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();

      renderer.setSize(newWidth, newHeight);
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
    console.error(err);
    showError(`❌ Preview start mislukt: ${err.message}`);
  }
}

startPreview();
