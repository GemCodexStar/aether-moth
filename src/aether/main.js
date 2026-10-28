import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createMoth } from './moth.js';
import { createWorld } from './world.js';
import { createStudioEnvironment, makeGlowTexture } from './textures.js';

const app = document.getElementById('app');
const canvas = document.getElementById('aether-canvas');
const loader = document.getElementById('loader');
const loaderPercent = document.getElementById('loaderPercent');
const loaderBar = document.getElementById('loaderBar');
const loaderStatus = document.getElementById('loaderStatus');
const beatValue = document.getElementById('beatValue');
const pressureValue = document.getElementById('pressureValue');
const tempValue = document.getElementById('tempValue');
const stateText = document.getElementById('stateText');
const stirCount = document.getElementById('stirCount');
const beatButton = document.getElementById('beatButton');
const orbitButton = document.getElementById('orbitButton');
const lampButton = document.getElementById('lampButton');
const specimenCue = document.getElementById('specimenCue');
const webglError = document.getElementById('webglError');
const recovery = document.getElementById('recovery');
const meterFill = document.getElementById('meterFill');

const state = {
  elapsed: 0,
  burst: 0,
  stirs: 0,
  glow: true,
  orbit: false,
  pointerX: 0,
  pointerY: 0,
  targetPointerX: 0,
  targetPointerY: 0,
  hovered: false,
  telemetryClock: 0,
  lastStatus: '',
  contextLost: false,
};

let renderer;
let scene;
let camera;
let controls;
let moth;
let world;
let clock;
let animationFrame;
let glowTexture;
let lowPowerRendering = false;
let recoveryReloadTimer = null;

const raycaster = new THREE.Raycaster();
const pointerNdc = new THREE.Vector2();
const mouthPosition = new THREE.Vector3();
const pressPoint = { x: 0, y: 0, active: false, moved: false, pointerId: null };

function updateLoader(percent, label) {
  if (loaderPercent) loaderPercent.textContent = String(Math.round(percent)).padStart(2, '0');
  if (loaderBar) loaderBar.style.width = `${percent}%`;
  if (label && loaderStatus) loaderStatus.textContent = label;
}

function setStatus(label) {
  if (state.lastStatus === label) return;
  state.lastStatus = label;
  if (stateText) stateText.textContent = label;
}

function getPixelRatio() {
  if (lowPowerRendering) return 1;
  return Math.min(window.devicePixelRatio, 1.5);
}

function init() {
  const params = new URLSearchParams(window.location.search);
  renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    powerPreference: 'high-performance',
    alpha: false,
    preserveDrawingBuffer: true,
  });
  const gl = renderer.getContext();
  const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
  const rendererName = debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : '';
  const qualityOverride = params.get('quality');
  lowPowerRendering =
    qualityOverride === 'low' ||
    (qualityOverride !== 'high' &&
      (/swiftshader|llvmpipe|software|basic render/i.test(String(rendererName)) ||
        (typeof navigator.deviceMemory === 'number' && navigator.deviceMemory <= 2)));
  renderer.setPixelRatio(getPixelRatio());
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0x080604, 1);
  renderer.shadowMap.enabled = false;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.98;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x080604, 0.026);

  const isPortrait = window.innerWidth / window.innerHeight < 0.85;
  camera = new THREE.PerspectiveCamera(
    isPortrait ? 48 : 39,
    window.innerWidth / window.innerHeight,
    0.1,
    90,
  );
  camera.position.set(isPortrait ? 0.7 : 1.55, isPortrait ? 4.6 : 4.55, isPortrait ? 16.1 : 9.6);

  controls = new OrbitControls(camera, canvas);
  controls.target.set(0, isPortrait ? 1.95 : 1.85, 0);
  controls.enableDamping = true;
  controls.dampingFactor = 0.055;
  controls.enablePan = false;
  controls.rotateSpeed = 0.52;
  controls.zoomSpeed = 0.72;
  controls.minDistance = isPortrait ? 7.5 : 5.2;
  controls.maxDistance = isPortrait ? 21 : 16;
  controls.minPolarAngle = 0.58;
  controls.maxPolarAngle = 1.62;
  controls.minAzimuthAngle = -1.05;
  controls.maxAzimuthAngle = 1.05;
  controls.autoRotateSpeed = 0.42;

  glowTexture = makeGlowTexture(256);
  const environment = createStudioEnvironment(renderer);
  scene.environment = environment;
  if ('environmentIntensity' in scene) scene.environmentIntensity = 1.18;

  updateLoader(42, 'FORGING BRASS MEMBRANES');
  moth = createMoth(glowTexture);
  scene.add(moth.group);

  updateLoader(68, 'PRESSURIZING THE AETHER CORE');
  world = createWorld(scene, renderer, glowTexture);

  updateLoader(88, 'ALIGNING THE WING ARMATURE');
  bindEvents();
  bindControls();
  onResize();
  clock = new THREE.Clock();
  updateLoader(94, 'CALIBRATING THE LENSES');
  renderer.compile(scene, camera);
  renderer.render(scene, camera);
  updateLoader(100, 'APPARATUS READY');

  window.setTimeout(() => {
    app.classList.add('is-ready');
    loader?.setAttribute('aria-hidden', 'true');
    startLoop();
  }, 760);
}

function setupHover(event) {
  const rect = canvas.getBoundingClientRect();
  pointerNdc.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointerNdc.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointerNdc, camera);
  const hit = raycaster.intersectObject(moth.group, true).length > 0;
  if (hit !== state.hovered) {
    state.hovered = hit;
    app.classList.toggle('is-hovering-specimen', hit);
  }
}

function bindEvents() {
  window.addEventListener('resize', onResize);
  window.addEventListener('pointermove', (event) => {
    state.targetPointerX = (event.clientX / window.innerWidth) * 2 - 1;
    state.targetPointerY = -((event.clientY / window.innerHeight) * 2 - 1);
  });

  let hoverTicket = 0;
  canvas.addEventListener('pointermove', (event) => {
    if (event.pointerType === 'touch') return;
    const now = performance.now();
    if (now - hoverTicket < 80) return;
    hoverTicket = now;
    setupHover(event);
  });

  canvas.addEventListener('pointerleave', () => {
    state.hovered = false;
    app.classList.remove('is-hovering-specimen');
  });

  canvas.addEventListener('pointerdown', (event) => {
    if (event.pointerType === 'touch' && !event.isPrimary) return;
    pressPoint.x = event.clientX;
    pressPoint.y = event.clientY;
    pressPoint.active = true;
    pressPoint.moved = false;
    pressPoint.pointerId = event.pointerId;
  });

  canvas.addEventListener('pointermove', (event) => {
    if (!pressPoint.active || pressPoint.pointerId !== event.pointerId) return;
    if (Math.hypot(event.clientX - pressPoint.x, event.clientY - pressPoint.y) > 7) {
      pressPoint.moved = true;
    }
  });

  canvas.addEventListener('pointerup', (event) => {
    if (!pressPoint.active || pressPoint.pointerId !== event.pointerId) return;
    pressPoint.active = false;
    if (pressPoint.moved) return;
    setupHover(event);
    if (state.hovered) stir();
  });

  canvas.addEventListener('pointercancel', () => {
    pressPoint.active = false;
  });

  canvas.addEventListener(
    'webglcontextlost',
    (event) => {
      event.preventDefault();
      if (state.contextLost) return;
      state.contextLost = true;
      cancelAnimationFrame(animationFrame);
      animationFrame = null;
      app.classList.add('is-context-lost');
      if (recovery) recovery.hidden = false;
      window.setTimeout(() => renderer?.forceContextRestore?.(), 500);

      let recentRecovery = false;
      try {
        const lastReload = Number(sessionStorage.getItem('aether-recovery-at') || 0);
        recentRecovery = Date.now() - lastReload <= 15000;
        sessionStorage.setItem('aether-recovery-at', String(Date.now()));
      } catch {
        recentRecovery = false;
      }
      if (!recentRecovery) {
        recoveryReloadTimer = window.setTimeout(() => window.location.reload(), 2400);
      } else {
        const kicker = recovery?.querySelector('.recovery-kicker');
        if (kicker) kicker.textContent = 'RENDER PAUSED · 请刷新页面';
      }
    },
    false,
  );

  canvas.addEventListener(
    'webglcontextrestored',
    () => {
      if (recoveryReloadTimer) window.clearTimeout(recoveryReloadTimer);
      window.location.reload();
    },
    false,
  );

  beatButton.addEventListener('click', stir);
  orbitButton.addEventListener('click', () => {
    state.orbit = !state.orbit;
    controls.autoRotate = state.orbit;
    orbitButton.classList.toggle('is-active', state.orbit);
    orbitButton.setAttribute('aria-pressed', String(state.orbit));
  });
  lampButton.addEventListener('click', () => {
    state.glow = !state.glow;
    world.setLumen(state.glow);
    lampButton.classList.toggle('is-active', state.glow);
    lampButton.setAttribute('aria-pressed', String(state.glow));
    app.classList.toggle('is-dimmed', !state.glow);
  });

  document.addEventListener('keydown', (event) => {
    if (event.repeat) return;
    const key = event.key.toLowerCase();
    if (key === 'w') {
      event.preventDefault();
      stir();
    } else if (key === 'o') {
      event.preventDefault();
      orbitButton.click();
    } else if (key === 'l') {
      event.preventDefault();
      lampButton.click();
    }
  });
}

function bindControls() {
  lampButton.classList.add('is-active');
  orbitButton.classList.remove('is-active');
  beatButton.classList.remove('is-active');
}

function stir() {
  state.burst = 1;
  state.stirs += 1;
  moth.triggerBurst();
  moth.getMouthWorldPosition(mouthPosition);
  world.emitBurst(mouthPosition);
  stirCount.textContent = String(state.stirs).padStart(2, '0');
  setStatus('RESONANCE PEAK');
  specimenCue?.classList.add('is-dismissed');
}

function updateTelemetry(dt) {
  state.telemetryClock += dt;
  if (state.telemetryClock < 0.11) return;
  state.telemetryClock = 0;
  const energy = Math.min(1, state.burst);
  const beat = moth.getBeatHz();
  beatValue.textContent = beat.toFixed(2);
  const pressure = Math.round(54 + energy * 34 + Math.sin(state.elapsed * 0.65) * 2.5);
  const temp = 64.8 + energy * 8.6 + Math.sin(state.elapsed * 0.4) * 0.35;
  pressureValue.innerHTML = `${pressure}<small>%</small>`;
  tempValue.innerHTML = `${temp.toFixed(1)}<small>°C</small>`;
  if (meterFill) meterFill.style.width = `${pressure}%`;
  if (energy > 0.52) setStatus('RESONANCE PEAK');
  else if (energy > 0.16) setStatus('WINGS ENGAGED');
  else if (!state.glow) setStatus('NIGHT WATCH');
  else setStatus('STEADY HOVER');
}

function animate() {
  if (state.contextLost) return;
  animationFrame = requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  state.elapsed += dt;
  state.burst = Math.max(0, state.burst - dt * (0.5 + state.burst * 0.9));
  state.pointerX = THREE.MathUtils.damp(state.pointerX, state.targetPointerX, 2.6, dt);
  state.pointerY = THREE.MathUtils.damp(state.pointerY, state.targetPointerY, 2.6, dt);

  moth.update(dt, state.elapsed, state.burst, { x: state.pointerX, y: state.pointerY });
  moth.getMouthWorldPosition(mouthPosition);
  world.update(dt, state.elapsed, {
    energy: state.burst,
    mouthPosition,
    lumen: state.glow,
  });

  controls.update();
  updateTelemetry(dt);

  // Render straight to the default framebuffer. The bloom composer's offscreen
  // chain left black tiles over the canvas while the camera was orbiting.
  renderer.render(scene, camera);
}

function startLoop() {
  if (!animationFrame && !state.contextLost) animate();
}

function onResize() {
  if (!renderer || !camera) return;
  const width = window.innerWidth;
  const height = window.innerHeight;
  const portrait = width / height < 0.85;
  const pixelRatio = getPixelRatio();
  renderer.setPixelRatio(pixelRatio);
  renderer.setSize(width, height);
  camera.aspect = width / height;
  camera.fov = portrait ? 48 : 39;
  camera.updateProjectionMatrix();
  world?.setPixelRatio?.(pixelRatio);
}

function showError(error) {
  console.error(error);
  loader?.setAttribute('aria-hidden', 'true');
  app.classList.add('is-ready');
  if (webglError) webglError.hidden = false;
}

function boot() {
  const progressTimer = window.setInterval(() => {
    const current = parseInt(loaderPercent?.textContent || '0', 10);
    if (current >= 96) return;
    updateLoader(Math.min(96, current + Math.ceil(Math.random() * 9)));
  }, 90);

  window.setTimeout(() => {
    try {
      init();
      window.clearInterval(progressTimer);
    } catch (error) {
      window.clearInterval(progressTimer);
      showError(error);
    }
  }, 120);
}

boot();
