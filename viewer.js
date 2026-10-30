/

ModelPrep — Viewer Module (Three.js Viewport & TransformControls)
*/
class ViewerModule {
constructor() {
this.scene = null;
this.camera = null;
this.renderer = null;
this.controls = null;
this.transformControls = null;
this.bedBoxMesh = null;
this.bedGridHelper = null;
}

init() {
const container = document.getElementById('viewport-3d');

 // Scene
 this.scene = new THREE.Scene();
 this.scene.background = new THREE.Color(0x111318);

 // Camera
 this.camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 2000);
 this.camera.position.set(220, 220, 250);

 // Renderer
 this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
 this.renderer.setSize(container.clientWidth, container.clientHeight);
 this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
 this.renderer.shadowMap.enabled = true;
 this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
 container.appendChild(this.renderer.domElement);

 // OrbitControls
 this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
 this.controls.enableDamping = true;
 this.controls.dampingFactor = 0.05;
 this.controls.maxPolarAngle = Math.PI / 2 + 0.05;

 // TransformControls
 this.transformControls = new THREE.TransformControls(this.camera, this.renderer.domElement);
 this.transformControls.size = 0.75;
 this.scene.add(this.transformControls);

 this.transformControls.addEventListener('dragging-changed', (event) => {
     this.controls.enabled = !event.value;
 });

 this.transformControls.addEventListener('change', () => {
     if (App && typeof App.onTransformControlsChange === 'function') {
         App.onTransformControlsChange();
     }
 });

 // Lighting
 const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
 this.scene.add(ambientLight);

 const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
 dirLight.position.set(150, 250, 150);
 dirLight.castShadow = true;
 this.scene.add(dirLight);

 const fillLight = new THREE.DirectionalLight(0x00e5ff, 0.25);
 fillLight.position.set(-150, 100, -150);
 this.scene.add(fillLight);

 this.createZortraxBuildPlate();
 window.addEventListener('resize', () => this.onWindowResize());
 this.animate();


}

createZortraxBuildPlate() {
const bedGroup = new THREE.Group();
const bounds = App.printerBounds;

 const bedGeo = new THREE.BoxGeometry(bounds.x, 4, bounds.y);
 const bedMat = new THREE.MeshStandardMaterial({ color: 0x1e222b, roughness: 0.8, metalness: 0.2 });
 this.bedBoxMesh = new THREE.Mesh(bedGeo, bedMat);
 this.bedBoxMesh.position.set(0, -2, 0);
 this.bedBoxMesh.receiveShadow = true;
 bedGroup.add(this.bedBoxMesh);

 this.bedGridHelper = new THREE.GridHelper(bounds.x, 20, 0x00e5ff, 0x2a303d);
 this.bedGridHelper.position.y = 0.1;
 bedGroup.add(this.bedGridHelper);

 const volumeGeo = new THREE.BoxGeometry(bounds.x, bounds.z, bounds.y);
 const wireGeo = new THREE.WireframeGeometry(volumeGeo);
 const wireMat = new THREE.LineBasicMaterial({ color: 0x2a303d, transparent: true, opacity: 0.5 });
 const volumeWireframe = new THREE.LineSegments(wireGeo, wireMat);
 volumeWireframe.position.set(0, bounds.z / 2, 0);
 bedGroup.add(volumeWireframe);

 const axesHelper = new THREE.AxesHelper(30);
 axesHelper.position.set(-bounds.x / 2 + 5, 1, -bounds.y / 2 + 5);
 bedGroup.add(axesHelper);

 this.scene.add(bedGroup);


}

setCameraView(view) {
const dist = 280;
if (view === 'iso') this.camera.position.set(220, 220, 250);
if (view === 'top') this.camera.position.set(0, dist, 0.1);
if (view === 'front') this.camera.position.set(0, 0, dist);
if (view === 'side') this.camera.position.set(dist, 0, 0);
this.controls.target.set(0, 40, 0);
this.controls.update();
}

fitCameraToSelection() {
if (!App || App.loadedObjects.length === 0) return;
const box = new THREE.Box3();
App.loadedObjects.forEach(o => {
if (o.visible) box.expandByObject(o.mesh);
});
const center = box.getCenter(new THREE.Vector3());
this.controls.target.copy(center);
this.camera.position.set(center.x + 150, center.y + 150, center.z + 150);
this.controls.update();
}

setTransformTool(tool) {
this.transformControls.setMode(tool);
document.querySelectorAll('#tool-translate, #tool-rotate, #tool-scale').forEach(b => b.classList.remove('active'));
const btn = document.getElementById(tool-${tool});
if (btn) btn.classList.add('active');
}

onWindowResize() {
const container = document.getElementById('viewport-3d');
if (!container) return;
this.camera.aspect = container.clientWidth / container.clientHeight;
this.camera.updateProjectionMatrix();
this.renderer.setSize(container.clientWidth, container.clientHeight);
}

animate() {
requestAnimationFrame(() => this.animate());
if (this.controls) this.controls.update();
if (this.renderer && this.scene && this.camera) {
this.renderer.render(this.scene, this.camera);
}
}
}

const Viewer = new ViewerModule();
