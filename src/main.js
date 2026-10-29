import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { history, disposeModel } from './history.js';
import './style.css';

const container = document.querySelector('#scene');
try {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-6,6,4,-4,.1,100);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.enablePan = false;
  controls.minZoom = .7; controls.maxZoom = 2;
  controls.minPolarAngle = .15; controls.maxPolarAngle = Math.PI/2.05;
  controls.autoRotateSpeed = .75;
  controls.target.set(0,.5,0);

  scene.add(new THREE.HemisphereLight('#ffffff','#8d9b7c',2));
  const key = new THREE.DirectionalLight('#fff5df',2.8);
  key.position.set(-3,8,-5); key.castShadow = true;
  key.shadow.mapSize.set(2048,2048);
  Object.assign(key.shadow.camera,{left:-6,right:6,top:6,bottom:-6,near:.1,far:25});
  key.shadow.normalBias = .035; key.shadow.bias = -.0003;
  key.shadow.radius = 5;
  scene.add(key);
  const fill = new THREE.DirectionalLight('#c9dcff',1);
  fill.position.set(4,4,3); scene.add(fill);

  const display = new THREE.Group();
  scene.add(display);
  const plinth = new THREE.Mesh(new THREE.CylinderGeometry(3.35,3.4,.18,96),new THREE.MeshStandardMaterial({color:'#d7ddcb',roughness:.95}));
  plinth.position.y = -.13; plinth.receiveShadow = true; plinth.castShadow = true; scene.add(plinth);
  const surface = new THREE.Mesh(new THREE.CylinderGeometry(3.31,3.34,.055,96),new THREE.MeshStandardMaterial({color:'#e5e8da',roughness:1}));
  surface.position.y=-.0275; surface.receiveShadow=true; scene.add(surface);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(200,200),new THREE.ShadowMaterial({opacity:.1}));
  floor.rotation.x=-Math.PI/2; floor.position.y=-.225; floor.receiveShadow=true; scene.add(floor);
  let car = null;
  let selectionVersion = 0;
  let disposed = false;
  const historyList = document.querySelector('#history-list');
  const status = document.querySelector('#history-status');
  const dateFormatter = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' });
  for (const entry of history) {
    const button = document.createElement('button');
    button.type = 'button'; button.dataset.carId = entry.id;
    button.setAttribute('aria-pressed', 'false');
    const chip = document.createElement('span'); chip.className = 'history-chip'; chip.style.backgroundColor = entry.config.color;
    const text = document.createElement('span');
    const title = document.createElement('strong'); title.textContent = entry.name;
    const detail = document.createElement('small'); detail.textContent = `${entry.config.bodyType} · ${entry.config.color} · ${dateFormatter.format(new Date(entry.createdAt))}`;
    text.append(title, detail); button.append(chip, text); historyList.append(button);
    button.addEventListener('click', () => selectCar(entry));
  }
  async function selectCar(entry) {
    const version = ++selectionVersion;
    status.hidden = false;
    status.textContent = `Loading ${entry.name}…`;
    try {
      const response = await fetch(entry.modelUrl);
      if (!response.ok) throw new Error(`Model request returned ${response.status}`);
      const json = await response.json();
      if (version !== selectionVersion || disposed) return;
      const next = new THREE.ObjectLoader().parse(json);
      if (car) { display.remove(car); disposeModel(car); }
      car = next; display.add(car);
      // Center and fit the preview without modifying the saved asset.
      const bounds = new THREE.Box3().setFromObject(car);
      const size = bounds.getSize(new THREE.Vector3());
      const center = bounds.getCenter(new THREE.Vector3());
      const previewScale = 4.3 / Math.max(size.x, size.z, size.y * 2.5);
      car.scale.multiplyScalar(previewScale);
      car.position.set(-center.x * previewScale, -bounds.min.y * previewScale, -center.z * previewScale);
      document.querySelector('#vehicle-name').textContent = entry.name;
      document.querySelector('#vehicle-type').textContent = entry.config.bodyType.toUpperCase();
      document.querySelector('#finish-name').textContent = entry.config.color.toUpperCase();
      document.querySelector('#finish-hex').textContent = entry.config.color.toUpperCase();
      document.querySelector('.paint-chip').style.backgroundColor = entry.config.color;
      container.setAttribute('aria-label', `${entry.name}, ${entry.config.bodyType}, ${entry.config.color}. Drag to orbit and scroll to zoom.`);
      document.title = `${entry.name} — isometricCarFactory Preview`;
      document.querySelector('#model-download').href = entry.modelUrl;
      document.querySelector('#source-download').href = entry.sourceUrl;
      document.querySelector('#factory-download').href = entry.factoryUrl;
      document.querySelector('#model-download').download = 'model.json';
      document.querySelector('#source-download').download = 'car.js';
      document.querySelector('#factory-download').download = 'factory.js';
      document.querySelector('#artifact-links').hidden = false;
      for (const button of historyList.children) button.setAttribute('aria-pressed', String(button.dataset.carId === entry.id));
      status.textContent = '';
      status.hidden = true;
      setView('hero');
    } catch (error) {
      if (version !== selectionVersion || disposed) return;
      status.textContent = `Could not load ${entry.name}. Select it to retry.`;
      console.error(error);
    }
  }

  const views = {hero:[-6,4.3,-6.4],side:[-8,2.2,0],front:[0,2.3,-8]};
  let transition = null;
  function setView(view, instant = false) {
    const destination = new THREE.Vector3(...views[view]);
    controls.autoRotate=false;
    document.querySelector('#rotate').setAttribute('aria-pressed','false');
    if (instant) {camera.position.copy(destination); camera.zoom=1; camera.updateProjectionMatrix();}
    else transition={start:camera.position.clone(),end:destination,startZoom:camera.zoom,time:performance.now()};
    document.querySelectorAll('[data-view]').forEach(button=>{
      const active=button.dataset.view===view;
      button.classList.toggle('active',active); button.setAttribute('aria-pressed',String(active));
    });
    controls.target.set(0,.5,0); controls.update();
  }
  setView('hero',true);
  if (history.length) selectCar(history[0]);
  else status.textContent = 'No generated cars yet. Generate a car using the skill to add it here.';
  document.querySelectorAll('[data-view]').forEach(button=>button.addEventListener('click',()=>setView(button.dataset.view)));
  document.querySelector('#reset').addEventListener('click',()=>setView('hero'));
  function zoom(factor) {transition=null;camera.zoom=THREE.MathUtils.clamp(camera.zoom*factor,.7,2);camera.updateProjectionMatrix();}
  document.querySelector('#zoom-in').addEventListener('click',()=>zoom(1.15));
  document.querySelector('#zoom-out').addEventListener('click',()=>zoom(1/1.15));
  document.querySelector('#rotate').addEventListener('click',event=>{
    transition=null; controls.autoRotate=!controls.autoRotate;
    event.currentTarget.setAttribute('aria-pressed',String(controls.autoRotate));
  });
  controls.addEventListener('start',()=>{
    transition=null; controls.autoRotate=false;
    document.querySelector('#rotate').setAttribute('aria-pressed','false');
    document.querySelectorAll('[data-view]').forEach(button=>{button.classList.remove('active');button.setAttribute('aria-pressed','false');});
  });
  function resize() {
    const width=container.clientWidth,height=container.clientHeight;
    renderer.setSize(width,height);
    const aspect=width/height;
    const size=width<600?3.65:2.9;
    camera.left=-size*aspect;camera.right=size*aspect;camera.top=size;camera.bottom=-size;
    camera.updateProjectionMatrix();
  }
  const observer=new ResizeObserver(resize);observer.observe(container);resize();
  const clock = new THREE.Clock();
  renderer.setAnimationLoop(()=>{
    const delta=Math.min(clock.getDelta(),.05);
    if(transition){
      const progress=Math.min((performance.now()-transition.time)/700,1);
      const eased=progress*progress*(3-2*progress);
      camera.position.lerpVectors(transition.start,transition.end,eased);
      camera.zoom=THREE.MathUtils.lerp(transition.startZoom,1,eased);camera.updateProjectionMatrix();
      if(progress===1)transition=null;
    }
    controls.update(delta);renderer.render(scene,camera);
  });
  window.addEventListener('pagehide',()=>{disposed=true;observer.disconnect();renderer.setAnimationLoop(null);controls.dispose();if(car)disposeModel(car);renderer.dispose();},{once:true});
} catch(error) {
  document.querySelector('#scene-error').hidden=false;
  document.querySelectorAll('.view-tools button, [data-view], #rotate').forEach(button=>button.disabled=true);
  console.error('Showroom could not initialize:',error);
}
