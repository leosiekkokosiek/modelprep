/

ModelPrep — Profiles Module (Printer & Material Custom Profiles Management)
*/
class ProfilesModule {
constructor() {
this.customProfiles = JSON.parse(localStorage.getItem('modelprep_custom_profiles') || '{}');
}

applyMaterialPreset(preset) {
const nozzle = document.getElementById('param-nozzle-temp');
const bed = document.getElementById('param-bed-temp');

 if (preset === 'z-abs' || preset === 'z-ultrat') {
     nozzle.value = 275; bed.value = 80;
 } else if (preset === 'z-pla') {
     nozzle.value = 210; bed.value = 50;
 } else if (preset === 'z-petg') {
     nozzle.value = 245; bed.value = 70;
 }
 App.showToast(`Zastosowano profil materiałowy: ${preset.toUpperCase()}`, 'info');


}

saveCurrentAsProfile() {
const name = prompt('Podaj nazwę nowego profilu druku:');
if (!name) return;

 const profileData = {
     layerHeight: document.getElementById('param-layer-height').value,
     lineWidth: document.getElementById('param-line-width').value,
     infillDensity: document.getElementById('param-infill-density').value,
     infillPattern: document.getElementById('param-infill-pattern').value,
     wallLoops: document.getElementById('param-wall-loops').value,
     topBottomLayers: document.getElementById('param-top-bottom-layers').value,
     nozzleTemp: document.getElementById('param-nozzle-temp').value,
     bedTemp: document.getElementById('param-bed-temp').value,
     printSpeed: document.getElementById('param-print-speed').value,
     raft: document.getElementById('param-raft').checked,
     support: document.getElementById('param-support').checked
 };

 this.customProfiles[name] = profileData;
 localStorage.setItem('modelprep_custom_profiles', JSON.stringify(this.customProfiles));
 this.updateProfileDropdown();
 App.showToast(`Zapisano profil: ${name}`, 'success');


}

updateProfileDropdown() {
const select = document.getElementById('user-profile-select');
if (!select) return;

 // Keep default option
 select.innerHTML = '<option value="default">Zortrax M200 Plus — Domyślny Standard</option>';
 for (const name in this.customProfiles) {
     const opt = document.createElement('option');
     opt.value = name;
     opt.innerText = name;
     select.appendChild(opt);
 }


}

loadSelectedProfile(name) {
if (name === 'default') return;
const p = this.customProfiles[name];
if (!p) return;

 document.getElementById('param-layer-height').value = p.layerHeight;
 document.getElementById('param-line-width').value = p.lineWidth;
 document.getElementById('param-infill-density').value = p.infillDensity;
 document.getElementById('param-infill-pattern').value = p.infillPattern;
 document.getElementById('param-wall-loops').value = p.wallLoops;
 document.getElementById('param-top-bottom-layers').value = p.topBottomLayers;
 document.getElementById('param-nozzle-temp').value = p.nozzleTemp;
 document.getElementById('param-bed-temp').value = p.bedTemp;
 document.getElementById('param-print-speed').value = p.printSpeed;
 document.getElementById('param-raft').checked = p.raft;
 document.getElementById('param-support').checked = p.support;

 App.showToast(`Załadowano profil: ${name}`, 'success');


}
}

const Profiles = new ProfilesModule();
