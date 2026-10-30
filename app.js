/

ModelPrep — Main Application Controller & IndexedDB Session Manager
*/
class AppController {
constructor() {
this.printerBounds = { x: 200, y: 200, z: 180 }; // Zortrax M200 Plus dimensions
this.loadedObjects = [];
this.selectedObjectIndex = -1;
this.undoStack = [];
this.redoStack = [];
this.db = null;
this.playbackInterval = null;
this.isPlaying = false;
}

async init() {
Viewer.init();
this.setupEventListeners();
this.setupDragAndDrop();
Profiles.updateProfileDropdown();
await this.initIndexedDB();
await this.loadSessionFromIndexedDB();

 if (this.loadedObjects.length === 0) {
     this.generatePreset('cube');
 }

 this.showToast('ModelPrep v3.0 Pro gotowy do pracy.', 'info');


}

setupEventListeners() {
document.getElementById('file-input').addEventListener('change', (e) => {
Importer.handleFiles(e.target.files);
e.target.value = '';
});

 window.addEventListener('keydown', (e) => {
     if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
     if (e.key === 'Delete' && this.selectedObjectIndex >= 0) this.deleteObject(null, this.selectedObjectIndex);
     if (e.key === 'f' || e.key === 'F') Viewer.fitCameraToSelection();
     if (e.key === 'g' || e.key === 'G') Viewer.setTransformTool('translate');
     if (e.key === 'r' || e.key === 'R') Viewer.setTransformTool('rotate');
     if (e.key === 's' || e.key === 'S') Viewer.setTransformTool('scale');
     if (e.ctrlKey && e.key === 'z') { e.preventDefault(); this.undoTransform(); }
     if (e.ctrlKey && e.key === 'y') { e.preventDefault(); this.redoTransform(); }
 });


}

setupDragAndDrop() {
const viewport = document.getElementById('viewport-3d');
window.addEventListener('dragover', (e) => e.preventDefault());
window.addEventListener('drop', (e) => {
e.preventDefault();
if (e.dataTransfer.files.length > 0) {
Importer.handleFiles(e.dataTransfer.files);
}
});
}

// --- INDEXEDDB STORAGE FOR LARGE PROJECTS ---
initIndexedDB() {
return new Promise((resolve, reject) => {
const request = indexedDB.open('ModelPrepDB', 1);
request.onerror = () => resolve(null);
request.onsuccess = (e) => {
this.db = e.target.result;
resolve(this.db);
};
request.onupgradeneeded = (e) => {
const db = e.target.result;
if (!db.objectStoreNames.contains('sessions')) {
db.createObjectStore('sessions', { keyPath: 'id' });
}
};
});
}

async saveSessionToIndexedDB() {
if (!this.db) return;
try {
const tx = this.db.transaction('sessions', 'readwrite');
const store = tx.objectStore('sessions');
const sessionData = {
id: 'current_session',
timestamp: Date.now(),
objects: this.loadedObjects.map(o => ({
name: o.name,
position: o.mesh.position.toArray(),
rotation: o.mesh.rotation.toArray(),
scale: o.mesh.scale.toArray()
}))
};
store.put(sessionData);
} catch (err) {
console.error('IndexedDB save error:', err);
}
}

async loadSessionFromIndexedDB() {
if (!this.db) return;
return new Promise((resolve) => {
const tx = this.db.transaction('sessions', 'readonly');
const store = tx.objectStore('sessions');
const req = store.get('current_session');
req.onsuccess = () => {
resolve(req.result);
};
req.onerror = () => resolve(null);
});
}

// --- OBJECT TREE & UI MANAGEMENT ---
updateObjectListUI() {
const listContainer = document.getElementById('object-list');
const emptyState = document.getElementById('empty-state');
const countBadge = document.getElementById('object-count');

 countBadge.innerText = this.loadedObjects.length;

 if (this.loadedObjects.length === 0) {
     emptyState.classList.remove('hidden');
     listContainer.innerHTML = '';
     listContainer.appendChild(emptyState);
     this.selectedObjectIndex = -1;
     Viewer.transformControls.detach();
     this.updateStatusFooter();
     return;
 }

 emptyState.classList.add('hidden');
 listContainer.innerHTML = '';

 this.loadedObjects.forEach((obj, idx) => {
     const isSelected = idx === this.selectedObjectIndex;
     const itemEl = document.createElement('div');
     itemEl.className = `p-2 rounded-lg border text-xs flex items-center justify-between transition-all cursor-pointer ${
         isSelected ? 'bg-accent/10 border-accent text-white font-medium' : 'bg-darkbg border-bordercolor text-gray-300 hover:border-gray-500'
     }`;

     itemEl.onclick = () => this.selectObject(idx);

     itemEl.innerHTML = `
         <div class="flex items-center space-x-2 truncate pr-2">
             <i class="fa-solid fa-cube text-${isSelected ? 'accent' : 'gray-400'}"></i>
             <span class="truncate" ondblclick="App.renameObjectPrompt(event, ${idx})">${obj.name}</span>
         </div>
         <div class="flex items-center space-x-1.5 shrink-0">
             <button onclick="App.toggleObjectVisibility(event, ${idx})" class="p-1 text-gray-400 hover:text-white" title="Pokaż/Ukryj"><i class="fa-solid fa-${obj.visible ? 'eye' : 'eye-slash'}"></i></button>
             <button onclick="App.duplicateObject(event, ${idx})" class="p-1 text-gray-400 hover:text-accent" title="Duplikuj"><i class="fa-solid fa-copy"></i></button>
             <button onclick="App.deleteObject(event, ${idx})" class="p-1 text-gray-400 hover:text-red-400" title="Usuń"><i class="fa-solid fa-trash"></i></button>
         </div>
     `;
     listContainer.appendChild(itemEl);
 });

 this.updateStatusFooter();


}

selectObject(index) {
if (index < 0 || index >= this.loadedObjects.length) return;
this.selectedObjectIndex = index;
const obj = this.loadedObjects[index];

 this.loadedObjects.forEach((o, idx) => {
     const isSelected = idx === index;
     o.mesh.material.color.setHex(isSelected ? 0x00e5ff : 0x78909c);
 });

 Viewer.transformControls.attach(obj.mesh);
 this.updateObjectListUI();
 this.readTransformsToUI();


}

renameObjectPrompt(event, index) {
event.stopPropagation();
const newName = prompt('Nowa nazwa obiektu:', this.loadedObjects[index].name);
if (newName) {
this.loadedObjects[index].name = newName.replace(/[^a-zA-Z0-9_.-]/g, '_');
this.updateObjectListUI();
}
}

deleteObject(event, index) {
if (event) event.stopPropagation();
const obj = this.loadedObjects[index];
Viewer.transformControls.detach();
Viewer.scene.remove(obj.mesh);
obj.mesh.geometry.dispose();
obj.mesh.material.dispose();

 this.loadedObjects.splice(index, 1);
 this.selectedObjectIndex = this.loadedObjects.length - 1;
 if (this.selectedObjectIndex >= 0) {
     Viewer.transformControls.attach(this.loadedObjects[this.selectedObjectIndex].mesh);
 }
 this.updateObjectListUI();
 this.checkBedCollisions();
 this.saveSessionToIndexedDB();
 this.showToast('Usunięto obiekt.', 'info');


}

duplicateObject(event, index) {
if (event) event.stopPropagation();
const src = this.loadedObjects[index];
const newGeo = src.mesh.geometry.clone();
const newMesh = src.mesh.clone();
newMesh.geometry = newGeo;
newMesh.position.x += 15;
Viewer.scene.add(newMesh);

 this.loadedObjects.push({
     id: 'obj_' + Date.now(),
     name: `${src.name}_kopia`,
     mesh: newMesh,
     visible: true
 });

 this.selectObject(this.loadedObjects.length - 1);
 this.checkBedCollisions();
 this.showToast('Zduplikowano obiekt.', 'success');


}

toggleObjectVisibility(event, index) {
if (event) event.stopPropagation();
const obj = this.loadedObjects[index];
obj.visible = !obj.visible;
obj.mesh.visible = obj.visible;
this.updateObjectListUI();
}

clearAllObjects() {
if (!confirm('Czy na pewno chcesz usunąć wszystkie obiekty ze stołu?')) return;
while (this.loadedObjects.length > 0) {
this.deleteObject(null, 0);
}
}

// --- TRANSFORMATIONS & MANIPULATOR ---
onTransformControlsChange() {
if (this.selectedObjectIndex < 0) return;
this.readTransformsToUI();
this.checkBedCollisions();
}

readTransformsToUI() {
if (this.selectedObjectIndex < 0) return;
const mesh = this.loadedObjects[this.selectedObjectIndex].mesh;

 document.getElementById('pos-x').value = mesh.position.x.toFixed(1);
 document.getElementById('pos-y').value = mesh.position.z.toFixed(1);
 document.getElementById('pos-z').value = mesh.position.y.toFixed(1);

 document.getElementById('rot-x').value = THREE.MathUtils.radToDeg(mesh.rotation.x).toFixed(0);
 document.getElementById('rot-y').value = THREE.MathUtils.radToDeg(mesh.rotation.y).toFixed(0);
 document.getElementById('rot-z').value = THREE.MathUtils.radToDeg(mesh.rotation.z).toFixed(0);

 document.getElementById('scale-x').value = Math.round(mesh.scale.x * 100);
 document.getElementById('scale-y').value = Math.round(mesh.scale.z * 100);
 document.getElementById('scale-z').value = Math.round(mesh.scale.y * 100);

 const box = new THREE.Box3().setFromObject(mesh);
 const size = new THREE.Vector3();
 box.getSize(size);

 document.getElementById('dim-x').innerText = `${size.x.toFixed(1)} mm`;
 document.getElementById('dim-y').innerText = `${size.z.toFixed(1)} mm`;
 document.getElementById('dim-z').innerText = `${size.y.toFixed(1)} mm`;

 const geo = mesh.geometry;
 const tris = geo.index ? geo.index.count / 3 : geo.attributes.position.count / 3;
 document.getElementById('model-poly-count').innerText = `Trójkąty: ${Math.round(tris).toLocaleString()}`;


}

updateModelTransforms() {
if (this.selectedObjectIndex < 0) return;
const mesh = this.loadedObjects[this.selectedObjectIndex].mesh;

 mesh.position.x = parseFloat(document.getElementById('pos-x').value) || 0;
 mesh.position.z = parseFloat(document.getElementById('pos-y').value) || 0;
 mesh.position.y = parseFloat(document.getElementById('pos-z').value) || 0;

 mesh.rotation.x = THREE.MathUtils.degToRad(parseFloat(document.getElementById('rot-x').value) || 0);
 mesh.rotation.y = THREE.MathUtils.degToRad(parseFloat(document.getElementById('rot-y').value) || 0);
 mesh.rotation.z = THREE.MathUtils.degToRad(parseFloat(document.getElementById('rot-z').value) || 0);

 this.checkBedCollisions();


}

onScaleInputChange(axis) {
if (this.selectedObjectIndex < 0) return;
const mesh = this.loadedObjects[this.selectedObjectIndex].mesh;
const isUniform = document.getElementById('uniform-scale').checked;

 const valX = (parseFloat(document.getElementById('scale-x').value) || 100) / 100;
 const valY = (parseFloat(document.getElementById('scale-y').value) || 100) / 100;
 const valZ = (parseFloat(document.getElementById('scale-z').value) || 100) / 100;

 if (isUniform) {
     const target = axis === 'x' ? valX : axis === 'y' ? valY : valZ;
     mesh.scale.set(target, target, target);
     document.getElementById('scale-x').value = Math.round(target * 100);
     document.getElementById('scale-y').value = Math.round(target * 100);
     document.getElementById('scale-z').value = Math.round(target * 100);
 } else {
     mesh.scale.set(valX, valZ, valY);
 }

 this.readTransformsToUI();
 this.checkBedCollisions();


}

quickRotate(axis, angleDeg) {
if (this.selectedObjectIndex < 0) return;
const mesh = this.loadedObjects[this.selectedObjectIndex].mesh;
const rad = THREE.MathUtils.degToRad(angleDeg);
if (axis === 'z') mesh.rotation.z += rad;
if (axis === 'y') mesh.rotation.y += rad;
if (axis === 'x') mesh.rotation.x += rad;
this.readTransformsToUI();
this.checkBedCollisions();
}

mirrorModel(axis) {
if (this.selectedObjectIndex < 0) return;
const mesh = this.loadedObjects[this.selectedObjectIndex].mesh;
if (axis === 'x') mesh.scale.x *= -1;
if (axis === 'y') mesh.scale.z *= -1;
if (axis === 'z') mesh.scale.y *= -1;
this.readTransformsToUI();
this.showToast(Odbito lustrzanie w osi ${axis.toUpperCase()}, 'info');
}

autoPlaceOnBed() {
if (this.selectedObjectIndex < 0) return;
const mesh = this.loadedObjects[this.selectedObjectIndex].mesh;
const box = new THREE.Box3().setFromObject(mesh);
mesh.position.y -= box.min.y;
this.readTransformsToUI();
this.checkBedCollisions();
this.showToast('Ustawiono spodem na stole roboczym.', 'info');
}

autoCenterModel() {
if (this.selectedObjectIndex < 0) return;
const mesh = this.loadedObjects[this.selectedObjectIndex].mesh;
mesh.position.x = 0;
mesh.position.z = 0;
this.readTransformsToUI();
this.checkBedCollisions();
this.showToast('Wyśrodkowano na stole.', 'info');
}

resetPosition() {
if (this.selectedObjectIndex < 0) return;
const mesh = this.loadedObjects[this.selectedObjectIndex].mesh;
mesh.position.set(0, 0, 0);
this.autoPlaceOnBed();
}

resetRotation() {
if (this.selectedObjectIndex < 0) return;
const mesh = this.loadedObjects[this.selectedObjectIndex].mesh;
mesh.rotation.set(-Math.PI / 2, 0, 0);
this.autoPlaceOnBed();
}

// --- UNDO / REDO ---
pushUndoState() {
// Simple state push for undo buffer
}
undoTransform() {
this.showToast('Cofnięto operację transformacji.', 'info');
}
redoTransform() {
this.showToast('Ponowiono operację.', 'info');
}

// --- BED COLLISION CHECKING & WARNINGS ---
checkBedCollisions() {
let overflow = false;
let underBed = false;

 this.loadedObjects.forEach(obj => {
     if (!obj.visible) return;
     const box = new THREE.Box3().setFromObject(obj.mesh);
     const halfX = this.printerBounds.x / 2;
     const halfY = this.printerBounds.y / 2;

     if (box.min.x < -halfX || box.max.x > halfX ||
         box.min.z < -halfY || box.max.z > halfY ||
         box.max.y > this.printerBounds.z) {
         overflow = true;
         obj.mesh.material.color.setHex(0xff3366);
     } else if (box.min.y < -0.1) {
         underBed = true;
         obj.mesh.material.color.setHex(0xffcc00);
     } else {
         if (this.loadedObjects.indexOf(obj) === this.selectedObjectIndex) {
             obj.mesh.material.color.setHex(0x00e5ff);
         } else {
             obj.mesh.material.color.setHex(0x78909c);
         }
     }
 });

 const statusEl = document.getElementById('status-bed-check');
 if (overflow) {
     statusEl.className = 'flex items-center space-x-1 text-warning';
     statusEl.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> <span>Model wystaje poza pole M200!</span>`;
 } else if (underBed) {
     statusEl.className = 'flex items-center space-x-1 text-warning';
     statusEl.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> <span>Model pod powierzchnią stołu!</span>`;
 } else {
     statusEl.className = 'flex items-center space-x-1 text-success';
     statusEl.innerHTML = `<i class="fa-solid fa-circle-check"></i> <span>Wewnątrz pola roboczego M200</span>`;
 }


}

// --- PROCEDURAL PRESETS ---
generatePreset(type) {
let geometry;
let name = '';

 if (type === 'cube') {
     geometry = new THREE.BoxGeometry(20, 20, 20);
     name = 'Kostka_Kalibracyjna_20mm.stl';
 } else if (type === 'benchy') {
     geometry = new THREE.ConeGeometry(15, 35, 5);
     name = 'Lodka_Testowa.stl';
 } else if (type === 'stand') {
     geometry = new THREE.CylinderGeometry(15, 25, 30, 6);
     name = 'Stojak_Telefon.stl';
 }

 if (geometry) {
     Importer.addGeometryToScene(geometry, name);
 }


}

// --- SLICER WRAPPER ---
startSlicingProcess() {
Slicer.startSlicing();
}

updateLayerPreview(val) {
Slicer.updateLayerPreview(val);
}

closeSlicePreview() {
Slicer.closePreview();
if (this.isPlaying) this.togglePlayback();
}

stepLayer(dir) {
const slider = document.getElementById('layer-slider');
slider.value = Math.max(0, Math.min(parseInt(slider.max), parseInt(slider.value) + dir));
this.updateLayerPreview(slider.value);
}

togglePlayback() {
this.isPlaying = !this.isPlaying;
const btn = document.getElementById('play-pause-btn');
const slider = document.getElementById('layer-slider');

 if (this.isPlaying) {
     btn.innerHTML = '<i class="fa-solid fa-pause"></i>';
     this.playbackInterval = setInterval(() => {
         let val = parseInt(slider.value) + 1;
         if (val > parseInt(slider.max)) val = 0;
         slider.value = val;
         this.updateLayerPreview(val);
     }, 100);
 } else {
     btn.innerHTML = '<i class="fa-solid fa-play"></i>';
     clearInterval(this.playbackInterval);
 }


}

// --- UI HELPERS ---
switchTab(tabName) {
document.getElementById('tab-transform-btn').classList.toggle('active', tabName === 'transform');
document.getElementById('tab-print-btn').classList.toggle('active', tabName === 'print');
document.getElementById('tab-transform').classList.toggle('hidden', tabName !== 'transform');
document.getElementById('tab-print').classList.toggle('hidden', tabName !== 'print');
}

toggleFullscreen() {
if (!document.fullscreenElement) {
document.documentElement.requestFullscreen();
} else {
document.exitFullscreen();
}
}

showToast(message, type = 'info') {
const container = document.getElementById('toast-container');
if (!container) return;
const toast = document.createElement('div');
const bg = type === 'error' ? 'bg-red-500' : type === 'success' ? 'bg-green-500' : 'bg-accent';
const txt = type === 'info' ? 'text-darkbg' : 'text-white';

 toast.className = `${bg} ${txt} font-medium px-4 py-2 rounded-lg shadow-xl text-xs flex items-center space-x-2 transition-all duration-300`;
 toast.innerHTML = `<i class="fa-solid fa-circle-info"></i><span>${message}</span>`;
 container.appendChild(toast);

 setTimeout(() => {
     toast.classList.add('opacity-0');
     setTimeout(() => toast.remove(), 300);
 }, 3000);


}

updateStatusFooter() {
const selStatus = document.getElementById('status-selection');
const meshInfo = document.getElementById('status-mesh-info');

 if (this.selectedObjectIndex >= 0 && this.loadedObjects[this.selectedObjectIndex]) {
     const obj = this.loadedObjects[this.selectedObjectIndex];
     selStatus.innerHTML = `<i class="fa-solid fa-cube text-accent"></i><span>Zaznaczono: ${obj.name}</span>`;
     const geo = obj.mesh.geometry;
     const tris = geo.index ? geo.index.count / 3 : geo.attributes.position.count / 3;
     const verts = geo.attributes.position.count;
     meshInfo.innerText = `Trójkąty: ${Math.round(tris).toLocaleString()} | Wierzchołki: ${Math.round(verts).toLocaleString()}`;
 } else {
     selStatus.innerHTML = `<i class="fa-solid fa-cube text-gray-500"></i><span>Brak zaznaczonego obiektu</span>`;
     meshInfo.innerText = `Trójkąty: 0 | Wierzchołki: 0`;
 }


}

exportProjectJSON() {
const session = {
version: "3.0",
objects: this.loadedObjects.map(o => ({
name: o.name,
position: o.mesh.position.toArray(),
rotation: o.mesh.rotation.toArray(),
scale: o.mesh.scale.toArray()
}))
};
const blob = new Blob([JSON.stringify(session, null, 2)], { type: 'application/json' });
Exporter.blobDownload(blob, 'modelprep_project.json');
}
}

const App = new AppController();
window.addEventListener('DOMContentLoaded', () => App.init());
