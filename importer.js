/

ModelPrep — Importer Module (STL, OBJ, 3MF Parsers with Safety & Validation)
*/
class ImporterModule {
async handleFiles(files) {
for (const file of files) {
const fileName = file.name;
const sanitizedName = fileName.replace(/[^a-zA-Z0-9_.-]/g, '_');
const extension = sanitizedName.split('.').pop().toLowerCase();

     App.showToast(`Importowanie: ${sanitizedName}...`, 'info');

     try {
         if (extension === 'stl') {
             const buffer = await file.arrayBuffer();
             const loader = new THREE.STLLoader();
             const geometry = loader.parse(buffer);
             this.addGeometryToScene(geometry, sanitizedName);
         } else if (extension === 'obj') {
             const text = await file.text();
             const loader = new THREE.OBJLoader();
             const objGroup = loader.parse(text);

             objGroup.traverse((child) => {
                 if (child.isMesh && child.geometry) {
                     this.addGeometryToScene(child.geometry.clone(), sanitizedName);
                 }
             });
         } else if (extension === '3mf') {
             // 3MF fallback parser note / binary reader
             const buffer = await file.arrayBuffer();
             // Basic fallback to binary STL loader if 3MF raw container structure is zipped
             const loader = new THREE.STLLoader();
             try {
                 const geometry = loader.parse(buffer);
                 this.addGeometryToScene(geometry, sanitizedName);
             } catch (err) {
                 throw new Error('Format 3MF wymaga rozpakowania kontenera ZIP. Użyj plików STL/OBJ.');
             }
         } else {
             App.showToast(`Nieobsługiwany format pliku: .${extension}`, 'error');
         }
     } catch (err) {
         console.error(err);
         App.showToast(`Błąd parsowania pliku ${sanitizedName}: ${err.message}`, 'error');
     }
 }


}

addGeometryToScene(geometry, name) {
if (!geometry || !geometry.attributes.position || geometry.attributes.position.count === 0) {
App.showToast(Plik ${name} zawiera pustą lub uszkodzoną geometrię!, 'error');
return;
}

 geometry.computeVertexNormals();
 geometry.center();

 const material = new THREE.MeshStandardMaterial({
     color: 0x00e5ff,
     roughness: 0.4,
     metalness: 0.1,
     side: THREE.DoubleSide
 });

 const mesh = new THREE.Mesh(geometry, material);
 mesh.castShadow = true;
 mesh.receiveShadow = true;

 geometry.computeBoundingBox();
 const box = geometry.boundingBox;

 // Default orientation correction for STL
 mesh.rotation.x = -Math.PI / 2;
 mesh.position.set(0, (box.max.z - box.min.z) / 2, 0);

 Viewer.scene.add(mesh);

 const objectData = {
     id: 'obj_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
     name: name,
     mesh: mesh,
     visible: true,
     locked: false,
     group: null
 };

 App.loadedObjects.push(objectData);
 App.selectObject(App.loadedObjects.length - 1);
 App.updateObjectListUI();
 App.checkBedCollisions();
 App.saveSessionToIndexedDB();
 App.pushUndoState();

 App.showToast(`Pomyślnie zaimportowano: ${name}`, 'success');


}
}

const Importer = new ImporterModule();
