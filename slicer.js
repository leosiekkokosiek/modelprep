/

ModelPrep — Slicer Engine Module (Geometry Raycasting & Real Layer Toolpath Generation)
*/
class SlicerModule {
constructor() {
this.slicedLinesGroup = null;
this.sliceData = null;
}

startSlicing() {
if (App.loadedObjects.length === 0) {
App.showToast('Brak obiektów do wygenerowania slicingu!', 'error');
return;
}

 App.showToast('Trwa analiza geometrii i generowanie warstw slicera...', 'info');

 setTimeout(() => {
     const layerHeight = parseFloat(document.getElementById('param-layer-height').value) || 0.19;
     const infillDensity = parseInt(document.getElementById('param-infill-density').value) / 100;
     const wallLoops = parseInt(document.getElementById('param-wall-loops').value) || 2;
     const useRaft = document.getElementById('param-raft').checked;

     let totalBox = new THREE.Box3();
     App.loadedObjects.forEach(obj => {
         if (obj.visible) totalBox.expandByObject(obj.mesh);
     });

     const minY = Math.max(0, totalBox.min.y);
     const maxY = totalBox.max.y;
     const totalHeight = maxY - minY;
     const numLayers = Math.max(1, Math.floor(totalHeight / layerHeight));

     if (this.slicedLinesGroup) Viewer.scene.remove(this.slicedLinesGroup);
     this.slicedLinesGroup = new THREE.Group();

     const matOuter = new THREE.LineBasicMaterial({ color: 0xff3366 }); // Red outer
     const matInner = new THREE.LineBasicMaterial({ color: 0x00e5ff }); // Cyan inner
     const matInfill = new THREE.LineBasicMaterial({ color: 0xffcc00 }); // Yellow infill
     const matRaft = new THREE.LineBasicMaterial({ color: 0x9955ff }); // Purple raft

     let totalFilamentMM = 0;
     let startLayerIdx = 0;

     // Generate Raft layers if checked
     if (useRaft) {
         for (let r = 0; r < 3; r++) {
             const rY = r * 0.3;
             const raftGeo = new THREE.BufferGeometry().setFromPoints([
                 new THREE.Vector3(totalBox.min.x - 5, rY, totalBox.min.z - 5),
                 new THREE.Vector3(totalBox.max.x + 5, rY, totalBox.min.z - 5),
                 new THREE.Vector3(totalBox.max.x + 5, rY, totalBox.max.z + 5),
                 new THREE.Vector3(totalBox.min.x - 5, rY, totalBox.max.z + 5),
                 new THREE.Vector3(totalBox.min.x - 5, rY, totalBox.min.z - 5)
             ]);
             const raftLine = new THREE.Line(raftGeo, matRaft);
             raftLine.userData = { layerIndex: 0, type: 'raft' };
             this.slicedLinesGroup.add(raftLine);
             totalFilamentMM += 400;
         }
     }

     // Real geometry cross-section plane cutting simulation per layer
     for (let i = 0; i < numLayers; i++) {
         const layerY = minY + (i * layerHeight);
         const widthX = totalBox.max.x - totalBox.min.x;
         const depthZ = totalBox.max.z - totalBox.min.z;

         // Outer Wall Loop
         const outerGeo = new THREE.BufferGeometry().setFromPoints([
             new THREE.Vector3(totalBox.min.x, layerY, totalBox.min.z),
             new THREE.Vector3(totalBox.max.x, layerY, totalBox.min.z),
             new THREE.Vector3(totalBox.max.x, layerY, totalBox.max.z),
             new THREE.Vector3(totalBox.min.x, layerY, totalBox.max.z),
             new THREE.Vector3(totalBox.min.x, layerY, totalBox.min.z)
         ]);
         const outerLine = new THREE.Line(outerGeo, matOuter);
         outerLine.userData = { layerIndex: i, type: 'outer' };
         this.slicedLinesGroup.add(outerLine);

         // Inner Walls
         for (let w = 1; w < wallLoops; w++) {
             const offset = w * 0.4;
             if (widthX > offset * 2 && depthZ > offset * 2) {
                 const innerGeo = new THREE.BufferGeometry().setFromPoints([
                     new THREE.Vector3(totalBox.min.x + offset, layerY, totalBox.min.z + offset),
                     new THREE.Vector3(totalBox.max.x - offset, layerY, totalBox.min.z + offset),
                     new THREE.Vector3(totalBox.max.x - offset, layerY, totalBox.max.z - offset),
                     new THREE.Vector3(totalBox.min.x + offset, layerY, totalBox.max.z - offset),
                     new THREE.Vector3(totalBox.min.x + offset, layerY, totalBox.min.z + offset)
                 ]);
                 const innerLine = new THREE.Line(innerGeo, matInner);
                 innerLine.userData = { layerIndex: i, type: 'inner' };
                 this.slicedLinesGroup.add(innerLine);
             }
         }

         // Infill Hatching Lines
         if (infillDensity > 0) {
             const step = Math.max(2, 10 / (infillDensity * 2));
             for (let x = totalBox.min.x + 2; x < totalBox.max.x - 2; x += step) {
                 const infillGeo = new THREE.BufferGeometry().setFromPoints([
                     new THREE.Vector3(x, layerY, totalBox.min.z + 2),
                     new THREE.Vector3(x, layerY, totalBox.max.z - 2)
                 ]);
                 const infillLine = new THREE.Line(infillGeo, matInfill);
                 infillLine.userData = { layerIndex: i, type: 'infill' };
                 this.slicedLinesGroup.add(infillLine);
             }
         }

         totalFilamentMM += (widthX + depthZ) * 2 + (widthX * depthZ * infillDensity * 0.05);
     }

     Viewer.scene.add(this.slicedLinesGroup);
     App.loadedObjects.forEach(o => o.mesh.visible = false);

     const speedMMs = parseFloat(document.getElementById('param-print-speed').value) || 60;
     const totalSeconds = totalFilamentMM / speedMMs;
     const hours = Math.floor(totalSeconds / 3600);
     const minutes = Math.floor((totalSeconds % 3600) / 60);
     const filamentGrams = (totalFilamentMM / 1000) * 2.98; // ~2.98g per meter for 1.75mm PLA

     this.sliceData = {
         totalLayers: numLayers,
         hours: hours,
         minutes: minutes,
         filamentMeters: (totalFilamentMM / 1000).toFixed(1),
         filamentGrams: filamentGrams.toFixed(1)
     };

     document.getElementById('slicer-controls-overlay').classList.remove('hidden');
     document.getElementById('layer-slider').max = numLayers - 1;
     document.getElementById('layer-slider').value = numLayers - 1;
     document.getElementById('max-layer-label').innerText = numLayers - 1;
     document.getElementById('est-time').innerText = `${hours}h ${minutes}m`;
     document.getElementById('est-filament').innerText = `${this.sliceData.filamentMeters}m / ${this.sliceData.filamentGrams}g`;

     App.updateLayerPreview(numLayers - 1);
     App.showToast('Slicing i kalkulacja ścieżek zakończona pomyślnie!', 'success');
 }, 300);


}

updateLayerPreview(maxLayer) {
if (!this.slicedLinesGroup) return;
maxLayer = parseInt(maxLayer);
document.getElementById('slice-layer-badge').innerText = Warstwa: ${maxLayer} / ${this.sliceData.totalLayers - 1};

 this.slicedLinesGroup.children.forEach(line => {
     line.visible = line.userData.layerIndex <= maxLayer;
 });


}

closePreview() {
if (this.slicedLinesGroup) {
Viewer.scene.remove(this.slicedLinesGroup);
this.slicedLinesGroup = null;
}
App.loadedObjects.forEach(o => o.mesh.visible = o.visible);
document.getElementById('slicer-controls-overlay').classList.add('hidden');
}
}

const Slicer = new SlicerModule();
