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

        model.scale.set(0.25, 0.25, 0.25);
        model.position.set(0, 0, 0);
       model.rotation.set(0, -Math.PI / 2, 0);
        model.rotation.y = -Math.PI / 2;

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
