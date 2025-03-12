// David Ho dho20ucsc.edu
// Mazda RX-7 by IvOfficial [CC-BY] via Poly Pizza
// Extra Features: Shadow, Fog, Billboard

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { MTLLoader } from 'three/addons/loaders/MTLLoader.js';

const scene = new THREE.Scene();

//fog
const fogColor = 0xaaaaaa;
scene.fog = new THREE.Fog(fogColor, 15, 50);

//Skybox
const skyboxTexture = new THREE.TextureLoader().load('skybox.png');
skyboxTexture.mapping = THREE.EquirectangularReflectionMapping;
skyboxTexture.colorSpace = THREE.SRGBColorSpace;
scene.background = skyboxTexture;

//amera
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 10, 25);

//shadows
const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

//OrbitControls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.screenSpacePanning = false;
controls.maxDistance = 50;
controls.minDistance = 5;

//Lights
const ambientLight = new THREE.AmbientLight(0xffffff, 1);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 3);
directionalLight.position.set(0, 20, 10);
directionalLight.castShadow = true;
directionalLight.shadow.mapSize.width = 4096;
directionalLight.shadow.mapSize.height = 4096;
directionalLight.shadow.camera.near = 1;
directionalLight.shadow.camera.far = 100;
directionalLight.shadow.camera.left = -50;
directionalLight.shadow.camera.right = 50;
directionalLight.shadow.camera.top = 50;
directionalLight.shadow.camera.bottom = -50;
scene.add(directionalLight);

const pointLight = new THREE.PointLight(0xff0000, 30, 60);
pointLight.position.set(0, 4, 0);
pointLight.castShadow = true;
pointLight.shadow.mapSize.width = 2048;
pointLight.shadow.mapSize.height = 2048;
pointLight.shadow.camera.near = 0.1;
pointLight.shadow.camera.far = 50;
scene.add(pointLight);

//Cubes
const loader = new THREE.TextureLoader();
const materials = [
    new THREE.MeshStandardMaterial({ map: loader.load('1.jpg') }),
    new THREE.MeshStandardMaterial({ map: loader.load('2.jpg') }),
    new THREE.MeshStandardMaterial({ map: loader.load('3.jpg') }),
    new THREE.MeshStandardMaterial({ map: loader.load('4.jpg') }),
    new THREE.MeshStandardMaterial({ map: loader.load('5.jpg') }),
    new THREE.MeshStandardMaterial({ map: loader.load('6.jpg') })
];

const cubes = [];
const cubeGeometry = new THREE.BoxGeometry();

for (let i = 0; i < 10; i++) {
    const cube = new THREE.Mesh(cubeGeometry, materials);
    cube.position.set((Math.random() - 0.5) * 20, 0.5, (Math.random() - 0.5) * 20);
    cube.castShadow = true;
    cube.receiveShadow = true;
    scene.add(cube);
    cubes.push(cube);
}

//Obama
const obamaTexture = loader.load('obama.jpg');
const sphereMaterial = new THREE.MeshStandardMaterial({ map: obamaTexture });

const sphereGeometry = new THREE.SphereGeometry(1, 32, 32);
const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
sphere.position.set(3, 1, -3);
sphere.castShadow = true;
sphere.receiveShadow = true;
scene.add(sphere);

//Floor Plane
const planeSize = 40;
const texture = loader.load('https://threejs.org/manual/examples/resources/images/checker.png');
texture.wrapS = THREE.RepeatWrapping;
texture.wrapT = THREE.RepeatWrapping;
texture.magFilter = THREE.NearestFilter;
texture.colorSpace = THREE.SRGBColorSpace;
const repeats = planeSize / 2;
texture.repeat.set(repeats, repeats);

const planeGeo = new THREE.PlaneGeometry(planeSize, planeSize);
const planeMat = new THREE.MeshPhongMaterial({ map: texture, side: THREE.DoubleSide });
const planeMesh = new THREE.Mesh(planeGeo, planeMat);
planeMesh.rotation.x = Math.PI * -0.5;
planeMesh.receiveShadow = true;
scene.add(planeMesh);

//trees
const treeCount = 10;

for (let i = 0; i < treeCount; i++) {
    const trunkHeight = Math.random() * 3 + 3;
    const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.5, 0.5, trunkHeight, 32),
        new THREE.MeshStandardMaterial({ color: 0x8B4513 })
    );
    const foliage = new THREE.Mesh(
        new THREE.SphereGeometry(1.2, 32, 32),
        new THREE.MeshStandardMaterial({ color: 0x228B22 })
    );

    const x = (Math.random() - 0.5) * planeSize * 0.9;
    const z = (Math.random() - 0.5) * planeSize * 0.9;

    trunk.position.set(x, trunkHeight / 2, z);
    foliage.position.set(x, trunkHeight + 1, z);

    trunk.castShadow = true;
    trunk.receiveShadow = true;
    foliage.castShadow = true;
    foliage.receiveShadow = true;

    scene.add(trunk);
    scene.add(foliage);
}

//car
const mtlLoader = new MTLLoader();
mtlLoader.load('car.mtl', (materials) => {
    materials.preload();
    const objLoader = new OBJLoader();
    objLoader.setMaterials(materials);
    objLoader.load('car.obj', (object) => {
        object.position.set(0, 0, 0);
        object.scale.set(1, 1, 1);
        object.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });
        scene.add(object);
    });
});

//billboard
const textCanvas = document.createElement('canvas');
const context = textCanvas.getContext('2d');
textCanvas.width = 256;
textCanvas.height = 64;
context.fillStyle = 'white';
context.fillRect(0, 0, textCanvas.width, textCanvas.height);
context.fillStyle = 'black';
context.font = 'Bold 48px Arial';
context.textAlign = 'center';
context.textBaseline = 'middle';
context.fillText('OBAMA', textCanvas.width / 2, textCanvas.height / 2);

const textTexture = new THREE.CanvasTexture(textCanvas);
const textMaterial = new THREE.SpriteMaterial({ map: textTexture });
const textSprite = new THREE.Sprite(textMaterial);
textSprite.scale.set(5, 1.5, 1);
textSprite.position.set(3, 3, -3);
scene.add(textSprite);

//loop
function animate() {
    requestAnimationFrame(animate);
    cubes.forEach(cube => cube.rotation.y += 0.01);
    controls.update();
    renderer.render(scene, camera);
}

animate();

