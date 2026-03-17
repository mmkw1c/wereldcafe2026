import * as THREE from 'https://unpkg.com/three@0.165.0/build/three.module.js';
import { GLTFLoader } from 'https://unpkg.com/three@0.165.0/examples/jsm/loaders/GLTFLoader.js';
import { MindARThree } from 'https://cdn.jsdelivr.net/npm/mind-ar@1.2.5/dist/mindar-image-three.prod.js';

const startBtn = document.querySelector('#startBtn');
const video = document.querySelector('#promoVideo');

let mindarThree;
let renderer;
let scene;
let camera;
let ring;

startBtn.addEventListener('click', startAR);

async function startAR() {
  try {
    mindarThree = new MindARThree({
      container: document.body,
      imageTargetSrc: './targets/targets.mind',
    });

    ({ renderer, scene, camera } = mindarThree);

    const light = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1);
    scene.add(light);

    const anchor = mindarThree.addAnchor(0);

    // Video texture
    const videoTexture = new THREE.VideoTexture(video);
    const planeGeometry = new THREE.PlaneGeometry(1, 0.5625); // 16:9
    const planeMaterial = new THREE.MeshBasicMaterial({
      map: videoTexture,
      transparent: true,
    });

    const videoPlane = new THREE.Mesh(planeGeometry, planeMaterial);
    videoPlane.position.set(0, 0, 0);
    anchor.group.add(videoPlane);

    // Ring
    const ringGeometry = new THREE.TorusGeometry(0.35, 0.02, 16, 64);
    const ringMaterial = new THREE.MeshStandardMaterial();
    ring = new THREE.Mesh(ringGeometry, ringMaterial);
    ring.position.set(0, 0.45, 0);
    ring.rotation.x = Math.PI / 2;
    anchor.group.add(ring);

    // Remote GLB model
    const loader = new GLTFLoader();
    loader.load(
      'http://elektrafungi.com/model.glb',
      (gltf) => {
        const model = gltf.scene;
        model.scale.set(0.2, 0.2, 0.2);
        model.position.set(0.45, -0.2, 0);
        anchor.group.add(model);
      },
      undefined,
      (error) => {
        console.error('Model kon niet geladen worden:', error);
      }
    );

    anchor.onTargetFound = async () => {
      console.log('Target gevonden');
      try {
        await video.play();
      } catch (err) {
        console.warn('Video kon niet starten:', err);
      }
    };

    anchor.onTargetLost = () => {
      console.log('Target kwijt');
      video.pause();
    };

    await mindarThree.start();

    renderer.setAnimationLoop(() => {
      if (ring) {
        ring.rotation.z += 0.02;
      }
      renderer.render(scene, camera);
    });

    startBtn.style.display = 'none';
  } catch (error) {
    console.error('Fout bij starten AR:', error);
    alert('AR kon niet starten. Check targets.mind, video-link en model-link.');
  }
}