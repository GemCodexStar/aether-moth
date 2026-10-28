import * as THREE from 'three';
import { createGearGeometry } from './geometry.js';
import { makeAstrolabeTexture, makeSmokeTexture } from './textures.js';

const TAU = Math.PI * 2;
const rand = (min, max) => min + Math.random() * (max - min);

function createSky() {
  const geometry = new THREE.SphereGeometry(38, 32, 20);
  const material = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      uTime: { value: 0 },
    },
    vertexShader: /* glsl */ `
      varying vec3 vDirection;
      void main() {
        vDirection = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      varying vec3 vDirection;
      void main() {
        float horizon = smoothstep(-0.24, 0.72, vDirection.y);
        vec3 low = vec3(0.018, 0.012, 0.009);
        vec3 high = vec3(0.066, 0.045, 0.03);
        vec3 color = mix(low, high, horizon);
        float warmPool = pow(max(0.0, dot(vDirection, normalize(vec3(0.1, 0.18, 0.98)))), 5.0);
        color += vec3(0.17, 0.085, 0.032) * warmPool;
        float coolVeil = pow(max(0.0, dot(vDirection, normalize(vec3(-0.82, 0.16, -0.54)))), 8.0);
        color += vec3(0.02, 0.05, 0.052) * coolVeil;
        color *= 0.93 + sin(vDirection.x * 19.0 + uTime * 0.015) * 0.025;
        gl_FragColor = vec4(color, 1.0);
      }
    `,
  });
  return new THREE.Mesh(geometry, material);
}

function createPortal(astrolabeTexture) {
  const group = new THREE.Group();
  group.position.set(0, 2.25, -4.85);

  const dial = new THREE.Mesh(
    new THREE.CircleGeometry(4.45, 128),
    new THREE.MeshBasicMaterial({
      map: astrolabeTexture,
      toneMapped: true,
      color: new THREE.Color(1.4, 1.24, 1.08),
    }),
  );
  dial.position.z = -0.2;
  group.add(dial);

  const darkBrass = new THREE.MeshStandardMaterial({
    color: 0x302317,
    metalness: 0.94,
    roughness: 0.32,
    envMapIntensity: 1.15,
  });
  const brightBrass = new THREE.MeshPhysicalMaterial({
    color: 0x9f713a,
    metalness: 1,
    roughness: 0.22,
    clearcoat: 0.45,
    envMapIntensity: 1.7,
  });
  const patina = new THREE.MeshPhysicalMaterial({
    color: 0x4f7468,
    metalness: 0.86,
    roughness: 0.34,
    clearcoat: 0.2,
    envMapIntensity: 1.3,
  });

  const outerRing = new THREE.Mesh(new THREE.TorusGeometry(4.44, 0.14, 10, 144), darkBrass);
  outerRing.castShadow = true;
  group.add(outerRing);

  const innerRim = new THREE.Mesh(new THREE.TorusGeometry(4.24, 0.032, 7, 144), brightBrass);
  innerRim.position.z = 0.04;
  group.add(innerRim);

  const outerRim = new THREE.Mesh(new THREE.TorusGeometry(4.63, 0.022, 6, 144), brightBrass);
  outerRim.position.z = -0.03;
  group.add(outerRim);

  const rivetGeometry = new THREE.SphereGeometry(0.055, 8, 6);
  const rivets = new THREE.InstancedMesh(rivetGeometry, brightBrass, 28);
  const matrix = new THREE.Matrix4();
  for (let i = 0; i < 28; i += 1) {
    const angle = (i / 28) * TAU + 0.05;
    matrix.makeTranslation(Math.cos(angle) * 4.44, Math.sin(angle) * 4.44, 0.11);
    rivets.setMatrixAt(i, matrix);
  }
  rivets.instanceMatrix.needsUpdate = true;
  group.add(rivets);

  for (let i = 0; i < 8; i += 1) {
    const angle = (i / 8) * TAU + Math.PI / 8;
    const bracket = new THREE.Group();
    bracket.position.set(Math.cos(angle) * 4.44, Math.sin(angle) * 4.44, 0.03);
    bracket.rotation.z = angle;
    const plate = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.52, 0.1), darkBrass);
    plate.castShadow = true;
    bracket.add(plate);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.16, 10), brightBrass);
    cap.rotation.x = Math.PI / 2;
    cap.position.z = 0.08;
    bracket.add(cap);
    group.add(bracket);
  }

  const spinners = [];

  const chapterGroup = new THREE.Group();
  chapterGroup.position.z = 0.09;
  group.add(chapterGroup);
  const chapterRing = new THREE.Mesh(new THREE.TorusGeometry(3.92, 0.012, 5, 144), brightBrass);
  chapterGroup.add(chapterRing);
  const chapterMarks = new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.045, 0.16, 0.025),
    brightBrass,
    24,
  );
  const markMatrix = new THREE.Matrix4();
  const markQuaternion = new THREE.Quaternion();
  const markPosition = new THREE.Vector3();
  const markScale = new THREE.Vector3(1, 1, 1);
  for (let i = 0; i < 24; i += 1) {
    const angle = (i / 24) * TAU;
    markPosition.set(Math.cos(angle) * 3.92, Math.sin(angle) * 3.92, 0);
    markQuaternion.setFromAxisAngle(new THREE.Vector3(0, 0, 1), angle - Math.PI / 2);
    markMatrix.compose(markPosition, markQuaternion, markScale);
    chapterMarks.setMatrixAt(i, markMatrix);
  }
  chapterMarks.instanceMatrix.needsUpdate = true;
  chapterGroup.add(chapterMarks);
  spinners.push({ object: chapterGroup, speed: 0.013 });

  const armillaryTilt = new THREE.Group();
  armillaryTilt.position.z = 0.13;
  armillaryTilt.rotation.set(0.46, 0.16, 0);
  group.add(armillaryTilt);
  const armillary = new THREE.Mesh(new THREE.TorusGeometry(3.26, 0.008, 4, 144), patina);
  armillaryTilt.add(armillary);
  const armillaryBeads = new THREE.InstancedMesh(new THREE.SphereGeometry(0.055, 8, 6), brightBrass, 4);
  for (let i = 0; i < 4; i += 1) {
    const angle = (i / 4) * TAU;
    matrix.makeTranslation(Math.cos(angle) * 3.26, Math.sin(angle) * 3.26, 0);
    armillaryBeads.setMatrixAt(i, matrix);
  }
  armillaryBeads.instanceMatrix.needsUpdate = true;
  armillary.add(armillaryBeads);
  spinners.push({ object: armillary, speed: -0.021 });

  const hourSocketGeometry = new THREE.CylinderGeometry(0.058, 0.075, 0.028, 12);
  hourSocketGeometry.rotateX(Math.PI / 2);
  const hourSockets = new THREE.InstancedMesh(hourSocketGeometry, darkBrass, 12);
  const hourLightGeometry = new THREE.SphereGeometry(0.026, 10, 8);
  const hourLightMaterial = new THREE.MeshBasicMaterial({
    color: new THREE.Color(1.7, 0.72, 0.24),
    toneMapped: true,
  });
  const hourLights = new THREE.InstancedMesh(hourLightGeometry, hourLightMaterial, 12);
  const hourMatrix = new THREE.Matrix4();
  for (let i = 0; i < 12; i += 1) {
    const angle = (i / 12) * TAU - Math.PI / 2;
    const x = Math.cos(angle) * 4.07;
    const y = Math.sin(angle) * 4.07;
    hourMatrix.makeTranslation(x, y, 0.14);
    hourSockets.setMatrixAt(i, hourMatrix);
    hourMatrix.makeTranslation(x, y, 0.17);
    hourLights.setMatrixAt(i, hourMatrix);
  }
  hourSockets.instanceMatrix.needsUpdate = true;
  hourLights.instanceMatrix.needsUpdate = true;
  group.add(hourSockets, hourLights);

  const orrery = new THREE.Group();
  orrery.position.z = 0.27;
  orrery.rotation.set(0.78, 0.27, -0.15);
  group.add(orrery);
  const orrerySpin = new THREE.Group();
  orrery.add(orrerySpin);
  const orreryMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x8a653c,
    metalness: 1,
    roughness: 0.3,
    clearcoat: 0.25,
    envMapIntensity: 1.3,
    emissive: 0x160d05,
    emissiveIntensity: 0.5,
  });
  const orreryRing = new THREE.Mesh(new THREE.TorusGeometry(5.18, 0.022, 5, 192), orreryMaterial);
  orrerySpin.add(orreryRing);
  const orreryBeadGeometry = new THREE.SphereGeometry(0.052, 9, 7);
  const orreryBeads = new THREE.InstancedMesh(orreryBeadGeometry, orreryMaterial, 8);
  const orreryMatrix = new THREE.Matrix4();
  for (let i = 0; i < 8; i += 1) {
    const angle = (i / 8) * TAU;
    orreryMatrix.makeTranslation(Math.cos(angle) * 5.18, Math.sin(angle) * 5.18, 0);
    orreryBeads.setMatrixAt(i, orreryMatrix);
  }
  orreryBeads.instanceMatrix.needsUpdate = true;
  orrerySpin.add(orreryBeads);
  const orreryStar = new THREE.Mesh(
    new THREE.SphereGeometry(0.075, 12, 9),
    new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 0.78, 0.34) }),
  );
  orreryStar.position.set(5.18, 0, 0);
  orrerySpin.add(orreryStar);
  spinners.push({ object: orrerySpin, speed: -0.014 });

  const handGroup = new THREE.Group();
  handGroup.position.z = 0.19;
  handGroup.rotation.z = -0.38;
  group.add(handGroup);
  const handMaterial = new THREE.MeshStandardMaterial({
    color: 0x4c351e,
    metalness: 1,
    roughness: 0.3,
    envMapIntensity: 1.35,
    emissive: 0x140a03,
    emissiveIntensity: 0.65,
  });
  const handBar = new THREE.Mesh(new THREE.BoxGeometry(3.7, 0.032, 0.022), handMaterial);
  handBar.position.x = 1.85;
  handGroup.add(handBar);
  const counterWeight = new THREE.Mesh(new THREE.SphereGeometry(0.17, 14, 10), handMaterial);
  counterWeight.position.x = -0.42;
  handGroup.add(counterWeight);
  const handHub = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.08, 20), brightBrass);
  handHub.rotation.x = Math.PI / 2;
  handGroup.add(handHub);
  spinners.push({ object: handGroup, speed: 0.006 });

  return { group, spinners };
}

function createLamp(glowTexture, position, scale = 1, cordTop = 7.4) {
  const root = new THREE.Group();
  root.position.copy(position);
  root.scale.setScalar(scale);

  const cableLength = cordTop - position.y;
  const cable = new THREE.Mesh(
    new THREE.CylinderGeometry(0.008, 0.008, cableLength, 5),
    new THREE.MeshStandardMaterial({ color: 0x16130f, metalness: 0.4, roughness: 0.8 }),
  );
  cable.position.y = cableLength / 2 + 0.3;
  root.add(cable);

  const cap = new THREE.Mesh(
    new THREE.CylinderGeometry(0.13, 0.17, 0.34, 16),
    new THREE.MeshPhysicalMaterial({
      color: 0x6d4d29,
      metalness: 1,
      roughness: 0.25,
      envMapIntensity: 1.5,
    }),
  );
  cap.position.y = 0.26;
  root.add(cap);
  const capRim = new THREE.Mesh(
    new THREE.TorusGeometry(0.16, 0.025, 6, 20),
    new THREE.MeshStandardMaterial({ color: 0xc79a5b, metalness: 1, roughness: 0.22 }),
  );
  capRim.rotation.x = Math.PI / 2;
  capRim.position.y = 0.09;
  root.add(capRim);

  const glassMaterial = new THREE.MeshStandardMaterial({
    color: 0xffcc8c,
    emissive: 0xffa654,
    emissiveIntensity: 0.34,
    metalness: 0.05,
    roughness: 0.08,
    transparent: true,
    opacity: 0.42,
    depthWrite: false,
  });
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.24, 24, 18), glassMaterial);
  bulb.scale.set(0.84, 1.12, 0.84);
  bulb.position.y = -0.08;
  root.add(bulb);

  const filamentMaterial = new THREE.MeshStandardMaterial({
    color: 0xffc47d,
    emissive: 0xff9e42,
    emissiveIntensity: 3.3,
    roughness: 0.3,
  });
  const filament = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.012, 5, 18, Math.PI * 1.6), filamentMaterial);
  filament.rotation.z = 0.6;
  filament.position.y = 0.03;
  root.add(filament);

  const haloMaterial = new THREE.SpriteMaterial({
    map: glowTexture,
    color: 0xffb266,
    transparent: true,
    opacity: 0.55,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const halo = new THREE.Sprite(haloMaterial);
  halo.position.y = -0.02;
  halo.scale.setScalar(1.38);
  root.add(halo);

  const auraMaterial = new THREE.SpriteMaterial({
    map: glowTexture,
    color: 0xff9e55,
    transparent: true,
    opacity: 0.12,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const aura = new THREE.Sprite(auraMaterial);
  aura.position.y = -0.04;
  aura.scale.setScalar(3.3);
  root.add(aura);

  return { root, haloMaterial, filamentMaterial, glassMaterial };
}

function createBeam({ position, target, radius, color, intensity, speed = 1 }) {
  const direction = target.clone().sub(position);
  const height = direction.length();
  const geometry = new THREE.ConeGeometry(radius, height, 52, 1, true);
  geometry.translate(0, -height / 2, 0);
  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      uColor: { value: new THREE.Color(color) },
      uIntensity: { value: intensity },
      uHeight: { value: height },
      uSpeed: { value: speed },
    },
    vertexShader: /* glsl */ `
      uniform float uHeight;
      varying float vDepth;
      varying float vAngle;
      void main() {
        vDepth = clamp(-position.y / uHeight, 0.0, 1.0);
        vAngle = atan(position.z, position.x);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform float uTime;
      uniform float uIntensity;
      uniform float uSpeed;
      varying float vDepth;
      varying float vAngle;
      void main() {
        float fade = smoothstep(0.0, 0.1, vDepth) * pow(1.0 - vDepth, 1.35);
        float striation = 0.78 + 0.22 * sin(vDepth * 42.0 - uTime * uSpeed + vAngle * 3.0);
        float breathing = 0.86 + 0.14 * sin(uTime * 0.55 * uSpeed + vDepth * 3.0);
        gl_FragColor = vec4(uColor, fade * striation * breathing * uIntensity);
      }
    `,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.copy(position);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), direction.normalize());
  mesh.renderOrder = 3;
  return { mesh, material };
}

function createDust(glowTexture) {
  const count = 440;
  const positions = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const seeds = new Float32Array(count);
  for (let i = 0; i < count; i += 1) {
    const radius = Math.pow(Math.random(), 0.55) * 8.2;
    const angle = Math.random() * TAU;
    positions[i * 3] = Math.cos(angle) * radius;
    positions[i * 3 + 1] = rand(-0.9, 6.1);
    positions[i * 3 + 2] = Math.sin(angle) * radius * 0.7 + rand(-1.2, 1.4);
    sizes[i] = rand(0.7, 2.6);
    seeds[i] = Math.random();
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
  geometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));

  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
      uColor: { value: new THREE.Color(0xffc583) },
      uOpacity: { value: 0.62 },
    },
    vertexShader: /* glsl */ `
      attribute float aSize;
      attribute float aSeed;
      uniform float uTime;
      uniform float uPixelRatio;
      varying float vTwinkle;
      void main() {
        vec3 transformed = position;
        transformed.y += sin(uTime * 0.11 + aSeed * 17.0) * 0.26;
        transformed.x += sin(uTime * 0.07 + aSeed * 31.0) * 0.24;
        transformed.z += cos(uTime * 0.06 + aSeed * 23.0) * 0.18;
        vec4 mvPosition = modelViewMatrix * vec4(transformed, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        gl_PointSize = clamp(aSize * uPixelRatio * (27.0 / max(1.0, -mvPosition.z)), 1.0, 6.0);
        vTwinkle = 0.25 + 0.75 * pow(0.5 + 0.5 * sin(uTime * 1.25 + aSeed * 55.0), 2.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform float uOpacity;
      varying float vTwinkle;
      void main() {
        float distanceToCenter = length(gl_PointCoord - 0.5);
        float alpha = smoothstep(0.5, 0.06, distanceToCenter);
        if (alpha < 0.01) discard;
        gl_FragColor = vec4(uColor, alpha * vTwinkle * uOpacity);
      }
    `,
  });
  const points = new THREE.Points(geometry, material);
  points.renderOrder = 4;
  return { points, material };
}

function createSteam(smokeTexture) {
  const count = 44;
  const positions = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const alphas = new Float32Array(count);
  const seeds = new Float32Array(count);
  const particles = [];
  for (let i = 0; i < count; i += 1) {
    positions[i * 3 + 1] = -99;
    seeds[i] = Math.random();
    particles.push({
      life: Math.random() * 2.4,
      maxLife: rand(2.2, 4.2),
      velocity: new THREE.Vector3(),
      originType: i % 3,
      size: 0.4,
      delay: Math.random() * 2.5,
    });
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
  geometry.setAttribute('aAlpha', new THREE.BufferAttribute(alphas, 1));
  geometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));

  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    depthTest: true,
    uniforms: {
      uTime: { value: 0 },
      uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
      uMap: { value: smokeTexture },
      uColor: { value: new THREE.Color(0xb9a48b) },
    },
    vertexShader: /* glsl */ `
      attribute float aSize;
      attribute float aAlpha;
      attribute float aSeed;
      uniform float uPixelRatio;
      varying float vAlpha;
      varying float vSeed;
      void main() {
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        gl_PointSize = aSize * uPixelRatio * (360.0 / max(1.0, -mvPosition.z));
        vAlpha = aAlpha;
        vSeed = aSeed;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform sampler2D uMap;
      uniform vec3 uColor;
      uniform float uTime;
      varying float vAlpha;
      varying float vSeed;
      void main() {
        vec2 p = gl_PointCoord - 0.5;
        float angle = vSeed * 6.2831 + uTime * 0.08 * (vSeed - 0.5);
        mat2 rot = mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
        p = rot * p + 0.5;
        vec4 smoke = texture2D(uMap, p);
        float alpha = smoke.a * vAlpha;
        if (alpha < 0.004) discard;
        gl_FragColor = vec4(uColor, alpha);
      }
    `,
  });
  const points = new THREE.Points(geometry, material);

  function spawn(index, mouthPosition, initial = false) {
    const particle = particles[index];
    const useMouth = Math.random() < 0.48;
    let origin;
    if (useMouth) {
      origin = mouthPosition;
      particle.velocity.set(rand(-0.16, 0.16), rand(0.13, 0.32), rand(-0.16, 0.16));
      particle.size = rand(0.28, 0.56);
    } else {
      origin = Math.random() > 0.5 ? new THREE.Vector3(-2.55, -1.12, -2.55) : new THREE.Vector3(2.7, -1.12, -2.25);
      particle.velocity.set(rand(-0.05, 0.05), rand(0.2, 0.34), rand(-0.06, 0.06));
      particle.size = rand(0.6, 1.08);
    }
    positions[index * 3] = origin.x + rand(-0.13, 0.13);
    positions[index * 3 + 1] = origin.y + rand(-0.08, 0.08);
    positions[index * 3 + 2] = origin.z + rand(-0.13, 0.13);
    particle.life = 0;
    particle.maxLife = rand(2.6, 4.8);
    particle.delay = initial ? -Math.random() * 3.2 : rand(0.1, 1.05);
    sizes[index] = particle.size;
    alphas[index] = 0;
    seeds[index] = Math.random();
  }

  // Prime the system with staggered, already-living puffs.
  particles.forEach((particle, index) => {
    spawn(index, new THREE.Vector3(0, 1.6, 1.2), true);
    particle.life = Math.random() * particle.maxLife * 0.65;
  });

  function update(dt, mouthPosition, energy) {
    for (let i = 0; i < count; i += 1) {
      const particle = particles[i];
      if (particle.delay > 0) {
        particle.delay -= dt;
        positions[i * 3 + 1] = -99;
        alphas[i] = 0;
        continue;
      }
      particle.life += dt;
      if (particle.life > particle.maxLife) {
        spawn(i, mouthPosition);
        continue;
      }
      const t = particle.life / particle.maxLife;
      const swirl = Math.sin(particle.life * 1.4 + i) * 0.04;
      particle.velocity.x += swirl * dt;
      particle.velocity.z += Math.cos(particle.life * 1.1 + i * 0.7) * 0.03 * dt;
      particle.velocity.y += 0.025 * dt;
      positions[i * 3] += particle.velocity.x * dt;
      positions[i * 3 + 1] += particle.velocity.y * dt;
      positions[i * 3 + 2] += particle.velocity.z * dt;
      const fadeIn = THREE.MathUtils.smoothstep(t, 0, 0.16);
      const fadeOut = Math.pow(1 - t, 1.5);
      alphas[i] = fadeIn * fadeOut * (0.3 + energy * 0.08);
      sizes[i] = particle.size * (1 + t * 2.2);
    }
    geometry.attributes.position.needsUpdate = true;
    geometry.attributes.aSize.needsUpdate = true;
    geometry.attributes.aAlpha.needsUpdate = true;
    geometry.attributes.aSeed.needsUpdate = false;
  }

  return { points, update, material };
}

function createEmbers(glowTexture) {
  const count = 130;
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const particles = [];
  for (let i = 0; i < count; i += 1) {
    positions[i * 3 + 1] = -99;
    particles.push({ life: 0, maxLife: 1, velocity: new THREE.Vector3(), size: 1 });
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const material = new THREE.PointsMaterial({
    size: 0.075,
    map: glowTexture,
    transparent: true,
    opacity: 0.95,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexColors: true,
    sizeAttenuation: true,
  });
  const points = new THREE.Points(geometry, material);

  function emit(origin, amount = 68, power = 1) {
    let spawned = 0;
    for (let i = 0; i < count && spawned < amount; i += 1) {
      const particle = particles[i];
      if (particle.life > 0) continue;
      const direction = new THREE.Vector3(
        rand(-1, 1),
        rand(-0.35, 1),
        rand(-1, 1),
      ).normalize();
      const speed = rand(0.25, 1.1) * power;
      particle.velocity.copy(direction).multiplyScalar(speed);
      particle.velocity.y += rand(0.2, 0.85);
      particle.life = rand(0.7, 1.7);
      particle.maxLife = particle.life;
      particle.size = rand(0.6, 1.35);
      positions[i * 3] = origin.x + direction.x * rand(0.1, 0.5);
      positions[i * 3 + 1] = origin.y + direction.y * rand(0.05, 0.4);
      positions[i * 3 + 2] = origin.z + direction.z * rand(0.1, 0.45);
      spawned += 1;
    }
  }

  function update(dt) {
    for (let i = 0; i < count; i += 1) {
      const particle = particles[i];
      if (particle.life <= 0) {
        colors[i * 3] = 0;
        colors[i * 3 + 1] = 0;
        colors[i * 3 + 2] = 0;
        continue;
      }
      particle.life -= dt;
      particle.velocity.y += 0.22 * dt;
      particle.velocity.multiplyScalar(0.985);
      positions[i * 3] += particle.velocity.x * dt;
      positions[i * 3 + 1] += particle.velocity.y * dt;
      positions[i * 3 + 2] += particle.velocity.z * dt;
      const t = Math.max(0, particle.life / particle.maxLife);
      colors[i * 3] = 1.5 * t;
      colors[i * 3 + 1] = 0.48 * t * t + 0.22 * t;
      colors[i * 3 + 2] = 0.09 * t * t;
    }
    geometry.attributes.position.needsUpdate = true;
    geometry.attributes.color.needsUpdate = true;
  }

  return { points, emit, update };
}

function createFloor(glowTexture, astrolabeTexture) {
  const group = new THREE.Group();

  const platform = new THREE.Mesh(
    new THREE.CircleGeometry(5.42, 128),
    new THREE.MeshStandardMaterial({
      color: 0x17110b,
      metalness: 0.96,
      roughness: 0.16,
      envMapIntensity: 1.45,
    }),
  );
  platform.rotation.x = -Math.PI / 2;
  platform.position.y = -1.42;
  platform.receiveShadow = true;
  group.add(platform);

  const dialReflection = new THREE.Mesh(
    new THREE.CircleGeometry(5.36, 128),
    new THREE.MeshBasicMaterial({
      map: astrolabeTexture,
      color: 0xb08a5b,
      transparent: true,
      opacity: 0.2,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  dialReflection.rotation.x = -Math.PI / 2;
  dialReflection.position.y = -1.406;
  dialReflection.renderOrder = 1;
  group.add(dialReflection);

  const outerFloor = new THREE.Mesh(
    new THREE.CircleGeometry(30, 96),
    new THREE.MeshStandardMaterial({
      color: 0x080604,
      metalness: 0.75,
      roughness: 0.46,
      envMapIntensity: 0.8,
    }),
  );
  outerFloor.rotation.x = -Math.PI / 2;
  outerFloor.position.y = -1.445;
  outerFloor.receiveShadow = true;
  group.add(outerFloor);

  const brass = new THREE.MeshPhysicalMaterial({
    color: 0x8a6135,
    metalness: 1,
    roughness: 0.27,
    clearcoat: 0.3,
    envMapIntensity: 1.6,
  });
  const darkMetal = new THREE.MeshStandardMaterial({
    color: 0x2c2117,
    metalness: 0.9,
    roughness: 0.38,
  });

  const rim = new THREE.Mesh(new THREE.TorusGeometry(5.42, 0.105, 8, 160), brass);
  rim.rotation.x = Math.PI / 2;
  rim.position.y = -1.38;
  rim.castShadow = true;
  group.add(rim);

  const innerLine = new THREE.Mesh(new THREE.TorusGeometry(5.12, 0.018, 5, 160), darkMetal);
  innerLine.rotation.x = Math.PI / 2;
  innerLine.position.y = -1.385;
  group.add(innerLine);

  [2.35, 3.55, 4.7].forEach((radius, index) => {
    const line = new THREE.Mesh(
      new THREE.TorusGeometry(radius, index === 2 ? 0.014 : 0.008, 5, 128),
      index === 1 ? brass : darkMetal,
    );
    line.rotation.x = Math.PI / 2;
    line.position.y = -1.397;
    group.add(line);
  });

  const tickGeometry = new THREE.BoxGeometry(0.018, 0.007, 0.18);
  const ticks = new THREE.InstancedMesh(tickGeometry, brass, 48);
  const matrix = new THREE.Matrix4();
  const quaternion = new THREE.Quaternion();
  const position = new THREE.Vector3();
  const scale = new THREE.Vector3(1, 1, 1);
  for (let i = 0; i < 48; i += 1) {
    const angle = (i / 48) * TAU;
    position.set(Math.cos(angle) * 5.28, -1.388, Math.sin(angle) * 5.28);
    quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), -angle);
    matrix.compose(position, quaternion, scale);
    ticks.setMatrixAt(i, matrix);
  }
  ticks.instanceMatrix.needsUpdate = true;
  group.add(ticks);

  for (let i = 0; i < 8; i += 1) {
    const angle = (i / 8) * TAU + Math.PI / 8;
    const spoke = new THREE.Mesh(
      new THREE.BoxGeometry(i % 2 === 0 ? 0.024 : 0.012, 0.005, i % 2 === 0 ? 2.15 : 1.5),
      i % 2 === 0 ? brass : darkMetal,
    );
    spoke.position.set(Math.cos(angle) * 3.9, -1.396, Math.sin(angle) * 3.9);
    spoke.rotation.y = -angle + Math.PI / 2;
    group.add(spoke);
  }

  const glow = new THREE.Mesh(
    new THREE.PlaneGeometry(9.6, 8.4),
    new THREE.MeshBasicMaterial({
      map: glowTexture,
      color: 0xa85d28,
      transparent: true,
      opacity: 0.21,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  glow.rotation.x = -Math.PI / 2;
  glow.position.y = -1.36;
  group.add(glow);

  const reflection = new THREE.Mesh(
    new THREE.PlaneGeometry(3.4, 5.8),
    new THREE.MeshBasicMaterial({
      map: glowTexture,
      color: 0x6f3a19,
      transparent: true,
      opacity: 0.24,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  reflection.rotation.x = -Math.PI / 2;
  reflection.position.set(0.15, -1.38, -0.1);
  reflection.scale.y = 1.4;
  group.add(reflection);

  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(4.7, 3.3),
    new THREE.MeshBasicMaterial({
      map: glowTexture,
      color: 0x000000,
      transparent: true,
      opacity: 0.42,
      depthWrite: false,
    }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = -1.365;
  group.add(shadow);

  return { group, glow, reflection };
}

function createGrandArches(glowTexture) {
  const group = new THREE.Group();
  const iron = new THREE.MeshStandardMaterial({
    color: 0x2c2218,
    metalness: 0.9,
    roughness: 0.38,
    envMapIntensity: 0.9,
    emissive: 0x0a0603,
    emissiveIntensity: 1,
  });
  const trim = new THREE.MeshPhysicalMaterial({
    color: 0x7e5c38,
    metalness: 1,
    roughness: 0.34,
    envMapIntensity: 1.25,
    emissive: 0x3c2815,
    emissiveIntensity: 0.95,
  });
  const lampGlow = new THREE.MeshStandardMaterial({
    color: 0xffc27b,
    emissive: 0xff9844,
    emissiveIntensity: 3,
    roughness: 0.3,
  });

  const tieTransforms = [];
  const lanternAnchors = [];
  const archLightPositions = [];

  function buildArch(radius, apex, z, weight) {
    const outerLeft = new THREE.CubicBezierCurve3(
      new THREE.Vector3(-radius, -1.5, z),
      new THREE.Vector3(-radius * 0.97, 3.1, z),
      new THREE.Vector3(-radius * 0.52, apex * 0.72, z),
      new THREE.Vector3(0, apex, z),
    );
    const outerRight = new THREE.CubicBezierCurve3(
      new THREE.Vector3(radius, -1.5, z),
      new THREE.Vector3(radius * 0.97, 3.1, z),
      new THREE.Vector3(radius * 0.52, apex * 0.72, z),
      new THREE.Vector3(0, apex, z),
    );
    const innerLeft = new THREE.CubicBezierCurve3(
      new THREE.Vector3(-radius * 0.975, -1.5, z + 0.03),
      new THREE.Vector3(-radius * 0.94, 3.05, z + 0.03),
      new THREE.Vector3(-radius * 0.5, apex * 0.71, z + 0.03),
      new THREE.Vector3(0, apex - 0.32, z + 0.03),
    );
    const innerRight = new THREE.CubicBezierCurve3(
      new THREE.Vector3(radius * 0.975, -1.5, z + 0.03),
      new THREE.Vector3(radius * 0.94, 3.05, z + 0.03),
      new THREE.Vector3(radius * 0.5, apex * 0.71, z + 0.03),
      new THREE.Vector3(0, apex - 0.32, z + 0.03),
    );

    [outerLeft, outerRight, innerLeft, innerRight].forEach((curve, index) => {
      const isInner = index > 1;
      const tube = new THREE.Mesh(
        new THREE.TubeGeometry(curve, 88, (isInner ? 0.032 : 0.16) * weight, isInner ? 5 : 7, false),
        isInner ? trim : iron,
      );
      group.add(tube);
    });

    [
      [outerLeft, innerLeft],
      [outerRight, innerRight],
    ].forEach(([outer, inner]) => {
      for (let i = 1; i < 7; i += 1) {
        const t = i / 7.4;
        const a = outer.getPoint(t);
        const b = inner.getPoint(t);
        const mid = a.clone().add(b).multiplyScalar(0.5);
        const direction = b.clone().sub(a);
        tieTransforms.push({
          position: mid,
          quaternion: new THREE.Quaternion().setFromUnitVectors(
            new THREE.Vector3(0, 1, 0),
            direction.clone().normalize(),
          ),
          scale: new THREE.Vector3(1, direction.length(), 1),
        });
      }
    });

    if (weight > 0.8) {
      [outerLeft, outerRight].forEach((curve) => {
        lanternAnchors.push(curve.getPoint(0.43));
        lanternAnchors.push(curve.getPoint(0.64));
        for (let i = 1; i < 10; i += 1) {
          const point = curve.getPoint(i / 10);
          point.z += 0.08;
          archLightPositions.push(point);
        }
      });
    }
  }

  buildArch(6.6, 8.7, -8.1, 1);
  buildArch(8.8, 10.9, -10.9, 0.68);

  const tieGeometry = new THREE.CylinderGeometry(0.022, 0.022, 1, 5);
  const ties = new THREE.InstancedMesh(tieGeometry, trim, tieTransforms.length);
  const matrix = new THREE.Matrix4();
  tieTransforms.forEach((item, index) => {
    matrix.compose(item.position, item.quaternion, item.scale);
    ties.setMatrixAt(index, matrix);
  });
  ties.instanceMatrix.needsUpdate = true;
  group.add(ties);

  const archLightGeometry = new THREE.BufferGeometry();
  archLightGeometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(archLightPositions.flatMap((position) => [position.x, position.y, position.z]), 3),
  );
  const archLights = new THREE.Points(
    archLightGeometry,
    new THREE.PointsMaterial({
      map: glowTexture,
      color: 0xffb36a,
      size: 0.13,
      transparent: true,
      opacity: 0.42,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    }),
  );
  group.add(archLights);

  lanternAnchors.forEach((anchor, index) => {
    const cableLength = 0.34 + (index % 2) * 0.18;
    const cable = new THREE.Mesh(
      new THREE.CylinderGeometry(0.007, 0.007, cableLength, 4),
      iron,
    );
    cable.position.set(anchor.x, anchor.y - cableLength / 2, anchor.z + 0.08);
    group.add(cable);
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.062, 10, 8), lampGlow);
    lamp.position.set(anchor.x, anchor.y - cableLength, anchor.z + 0.08);
    group.add(lamp);
    const haloMaterial = new THREE.SpriteMaterial({
      map: glowTexture,
      color: 0xffad61,
      transparent: true,
      opacity: 0.42,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const halo = new THREE.Sprite(haloMaterial);
    halo.position.copy(lamp.position);
    halo.scale.setScalar(0.58);
    group.add(halo);
  });

  return group;
}

function createStarfield() {
  const count = 340;
  const positions = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const seeds = new Float32Array(count);
  for (let i = 0; i < count; i += 1) {
    const radius = 20 + Math.random() * 10;
    const theta = Math.random() * TAU;
    const phi = Math.acos(THREE.MathUtils.randFloatSpread(1.9));
    positions[i * 3] = Math.sin(phi) * Math.cos(theta) * radius;
    positions[i * 3 + 1] = Math.cos(phi) * radius;
    positions[i * 3 + 2] = Math.sin(phi) * Math.sin(theta) * radius;
    sizes[i] = rand(0.8, 2.4);
    seeds[i] = Math.random();
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
  geometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));
  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
      uColor: { value: new THREE.Color(0xf1d3a1) },
    },
    vertexShader: /* glsl */ `
      attribute float aSize;
      attribute float aSeed;
      uniform float uPixelRatio;
      varying float vTwinkle;
      uniform float uTime;
      void main() {
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        gl_PointSize = aSize * uPixelRatio * 0.85;
        vTwinkle = 0.25 + 0.75 * pow(0.5 + 0.5 * sin(uTime * 0.5 + aSeed * 50.0), 2.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      varying float vTwinkle;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        float alpha = smoothstep(0.5, 0.08, d) * vTwinkle * 0.55;
        if (alpha < 0.01) discard;
        gl_FragColor = vec4(uColor, alpha);
      }
    `,
  });
  const points = new THREE.Points(geometry, material);
  points.renderOrder = 0;
  return { points, material };
}

function createBackgroundHaze(smokeTexture) {
  const group = new THREE.Group();
  const puffs = [];
  [
    { position: [-3.7, 1.6, -4.6], scale: [11, 6.4], opacity: 0.075, drift: 0.09, phase: 0.4 },
    { position: [3.8, 3.2, -5.2], scale: [9.5, 5.2], opacity: 0.055, drift: -0.07, phase: 2.1 },
    { position: [0.8, -0.4, -3.4], scale: [8.5, 3.4], opacity: 0.05, drift: 0.05, phase: 4.2 },
    { position: [0.4, 3.4, -8.9], scale: [19, 9], opacity: 0.045, drift: -0.04, phase: 5.3 },
  ].forEach((item, index) => {
    const material = new THREE.SpriteMaterial({
      map: smokeTexture,
      color: index === 2 ? 0x777f72 : 0xb99875,
      transparent: true,
      opacity: item.opacity,
      depthWrite: false,
    });
    const sprite = new THREE.Sprite(material);
    sprite.position.set(...item.position);
    sprite.scale.set(item.scale[0], item.scale[1], 1);
    group.add(sprite);
    puffs.push({
      sprite,
      material,
      baseX: item.position[0],
      baseY: item.position[1],
      baseOpacity: item.opacity,
      phase: item.phase,
    });
  });
  return {
    group,
    update(time) {
      puffs.forEach((puff) => {
        puff.sprite.position.x = puff.baseX + Math.sin(time * 0.05 + puff.phase) * 0.55;
        puff.sprite.position.y = puff.baseY + Math.sin(time * 0.08 + puff.phase) * 0.08;
        puff.material.opacity = puff.baseOpacity * (0.8 + Math.sin(time * 0.13 + puff.phase) * 0.2);
      });
    },
  };
}

function createVent(position, brass) {
  const root = new THREE.Group();
  root.position.copy(position);

  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.31, 0.16, 20), brass);
  base.castShadow = true;
  root.add(base);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.27, 0.026, 6, 24), brass);
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.085;
  root.add(rim);

  for (let i = 0; i < 5; i += 1) {
    const slat = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.024, 0.045), brass);
    slat.position.set(0, 0.1, -0.16 + i * 0.08);
    slat.rotation.y = Math.PI / 2;
    root.add(slat);
  }
  return root;
}

export function createWorld(scene, renderer, glowTexture) {
  const root = new THREE.Group();
  scene.add(root);

  const sky = createSky();
  scene.add(sky);

  const hemi = new THREE.HemisphereLight(0xc7b69e, 0x24150b, 0.72);
  scene.add(hemi);

  const key = new THREE.SpotLight(0xffb471, 350, 28, 0.37, 0.7, 2);
  key.position.set(4.4, 7.5, 4.6);
  key.target.position.set(0, 1.55, 0);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.bias = -0.0004;
  key.shadow.normalBias = 0.015;
  key.shadow.camera.near = 2;
  key.shadow.camera.far = 20;
  scene.add(key, key.target);

  const rim = new THREE.SpotLight(0x6fc4ba, 235, 26, 0.42, 0.9, 2);
  rim.position.set(-5.6, 4.8, -4.2);
  rim.target.position.set(0, 1.7, 0);
  scene.add(rim, rim.target);

  const portalLight = new THREE.PointLight(0xff9a50, 22, 12, 2);
  portalLight.position.set(-1.7, 3.9, -3.4);
  scene.add(portalLight);

  const astrolabeTexture = makeAstrolabeTexture(2048);
  const portal = createPortal(astrolabeTexture);
  root.add(portal.group);

  const arches = createGrandArches(glowTexture);
  root.add(arches);

  const floor = createFloor(glowTexture, astrolabeTexture);
  root.add(floor.group);

  const stars = createStarfield();
  root.add(stars.points);

  const brass = new THREE.MeshPhysicalMaterial({
    color: 0x986d3a,
    metalness: 1,
    roughness: 0.26,
    clearcoat: 0.4,
    envMapIntensity: 1.65,
  });
  root.add(createVent(new THREE.Vector3(-2.55, -1.34, -2.55), brass));
  root.add(createVent(new THREE.Vector3(2.7, -1.34, -2.25), brass));

  const lampLeft = createLamp(glowTexture, new THREE.Vector3(-4.8, 3.7, -1.3), 1.05, 7.6);
  const lampRight = createLamp(glowTexture, new THREE.Vector3(4.85, 2.95, -2.1), 0.85, 7.1);
  root.add(lampLeft.root, lampRight.root);

  const beams = [
    createBeam({
      position: new THREE.Vector3(4.4, 7.5, 4.6),
      target: new THREE.Vector3(0.2, -0.9, -0.2),
      radius: 2.8,
      color: 0xffb06b,
      intensity: 0.019,
      speed: 0.8,
    }),
    createBeam({
      position: new THREE.Vector3(-6.4, 5.6, -4.8),
      target: new THREE.Vector3(-1.8, -1.1, -2.0),
      radius: 2.2,
      color: 0x8ec9bd,
      intensity: 0.011,
      speed: 0.55,
    }),
  ];
  beams.forEach((beam) => {
    beam.mesh.renderOrder = 1;
    root.add(beam.mesh);
  });

  const dust = createDust(glowTexture);
  root.add(dust.points);

  const smokeTexture = makeSmokeTexture(192);
  const steam = createSteam(smokeTexture);
  root.add(steam.points);

  const backgroundHaze = createBackgroundHaze(smokeTexture);
  root.add(backgroundHaze.group);

  const embers = createEmbers(glowTexture);
  root.add(embers.points);

  const largeGearMaterial = new THREE.MeshStandardMaterial({
    color: 0x352718,
    metalness: 0.95,
    roughness: 0.36,
    envMapIntensity: 1.2,
  });
  const smallGearMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x76512b,
    metalness: 1,
    roughness: 0.3,
    clearcoat: 0.25,
    envMapIntensity: 1.4,
  });
  const gears = [];
  [
    { position: [-4.7, 3.15, -4.15], radius: 2.1, teeth: 29, strength: 0.035, material: largeGearMaterial },
    { position: [4.65, 1.1, -4.25], radius: 1.32, teeth: 22, strength: -0.055, material: largeGearMaterial },
    { position: [-3.45, -0.2, -3.2], radius: 0.78, teeth: 16, strength: 0.07, material: smallGearMaterial },
  ].forEach((item, index) => {
    const gearGroup = new THREE.Group();
    gearGroup.position.set(...item.position);
    gearGroup.rotation.z = index * 0.24;
    const gear = new THREE.Mesh(
      createGearGeometry({
        radius: item.radius,
        teeth: item.teeth,
        toothDepth: item.radius * 0.12,
        thickness: 0.16,
        lighteningHoles: 6,
      }),
      item.material,
    );
    gearGroup.add(gear);
    const axle = new THREE.Mesh(
      new THREE.CylinderGeometry(item.radius * 0.14, item.radius * 0.16, 0.55, 18),
      largeGearMaterial,
    );
    axle.rotation.x = Math.PI / 2;
    axle.position.z = -0.2;
    gearGroup.add(axle);
    const hub = new THREE.Mesh(
      new THREE.CylinderGeometry(item.radius * 0.23, item.radius * 0.23, 0.09, 24),
      smallGearMaterial,
    );
    hub.rotation.x = Math.PI / 2;
    hub.position.z = 0.12;
    gearGroup.add(hub);
    root.add(gearGroup);
    gears.push({ group: gearGroup, mesh: gear, strength: item.strength });
  });

  // A vertical pressure pipe at the left edge.
  const pipeGroup = new THREE.Group();
  pipeGroup.position.set(-5.55, 1.4, -3.6);
  const pipe = new THREE.Mesh(
    new THREE.CylinderGeometry(0.15, 0.18, 7.4, 18),
    new THREE.MeshStandardMaterial({ color: 0x3b2a1a, metalness: 0.92, roughness: 0.4 }),
  );
  pipeGroup.add(pipe);
  [2.6, 0.5, -1.8].forEach((y) => {
    const collar = new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.045, 6, 20), smallGearMaterial);
    collar.rotation.x = Math.PI / 2;
    collar.position.y = y;
    pipeGroup.add(collar);
  });
  const valveRoot = new THREE.Group();
  valveRoot.position.set(0.1, 1.2, 0.22);
  valveRoot.rotation.y = 0.2;
  const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.04, 7, 28), smallGearMaterial);
  valveRoot.add(wheel);
  for (let i = 0; i < 4; i += 1) {
    const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.72, 0.035), smallGearMaterial);
    spoke.rotation.z = (i / 4) * Math.PI;
    valveRoot.add(spoke);
  }
  const valveHub = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.15, 12), smallGearMaterial);
  valveHub.rotation.x = Math.PI / 2;
  valveRoot.add(valveHub);
  pipeGroup.add(valveRoot);
  root.add(pipeGroup);

  const state = {
    time: 0,
    pulse: 0,
    lumen: 1,
    lumenTarget: 1,
    emberTimer: 0,
  };

  function emitBurst(origin) {
    state.pulse = 1;
    embers.emit(origin, 82, 1.15);
  }

  function setLumen(on) {
    state.lumenTarget = on ? 1 : 0.12;
  }

  function setPixelRatio(ratio) {
    dust.material.uniforms.uPixelRatio.value = ratio;
    steam.material.uniforms.uPixelRatio.value = ratio;
    stars.material.uniforms.uPixelRatio.value = ratio;
  }

  function update(dt, time, { energy = 0, mouthPosition, lumen = true }) {
    state.time = time;
    state.pulse = Math.max(0, state.pulse - dt * 0.65);
    state.lumenTarget = lumen ? 1 : 0.12;
    state.lumen = THREE.MathUtils.damp(state.lumen, state.lumenTarget, 3.2, dt);

    key.intensity = (308 + Math.sin(time * 13.7) * 3 + Math.cos(time * 23.1) * 1.5) * (0.75 + state.lumen * 0.25) * (1 + energy * 0.1);
    rim.intensity = 192 + Math.sin(time * 0.8) * 6 + energy * 26;
    portalLight.intensity = (20 + Math.sin(time * 0.9) * 1.5) * state.lumen;
    lampLeft.haloMaterial.opacity = 0.5 * state.lumen;
    lampRight.haloMaterial.opacity = 0.42 * state.lumen;
    lampLeft.filamentMaterial.emissiveIntensity = 3.3 * (0.65 + state.lumen * 0.35);
    lampRight.filamentMaterial.emissiveIntensity = 3.0 * (0.65 + state.lumen * 0.35);
    lampLeft.glassMaterial.emissiveIntensity = 0.26 * (0.4 + state.lumen * 0.6);
    lampRight.glassMaterial.emissiveIntensity = 0.26 * (0.4 + state.lumen * 0.6);

    gears.forEach((gear) => {
      gear.mesh.rotation.z += gear.strength * dt * (1 + energy * 2.2);
    });
    portal.spinners.forEach((spinner) => {
      spinner.object.rotation.z += spinner.speed * dt * (1 + energy * 1.6);
    });

    beams.forEach((beam, index) => {
      beam.material.uniforms.uTime.value = time;
      beam.material.uniforms.uIntensity.value =
        (index === 0 ? 0.019 : 0.011) * (0.8 + energy * 0.3) * (0.82 + state.lumen * 0.18);
    });
    dust.material.uniforms.uTime.value = time;
    dust.material.uniforms.uOpacity.value = 0.46 + energy * 0.25 + state.pulse * 0.12;
    stars.material.uniforms.uTime.value = time;
    steam.material.uniforms.uTime.value = time;
    steam.update(dt, mouthPosition, energy);
    backgroundHaze.update(time);
    embers.update(dt);

    state.emberTimer -= dt;
    if (state.emberTimer <= 0) {
      if (energy > 0.18) {
        state.emberTimer = rand(0.18, 0.45);
        embers.emit(mouthPosition, 2, 0.55);
      } else {
        state.emberTimer = rand(1.4, 2.6);
        const sparkOrigin = new THREE.Vector3(rand(-2.4, 2.4), rand(-0.9, 0.3), rand(-2.2, 0.4));
        embers.emit(sparkOrigin, 1, 0.32);
      }
    }

    sky.material.uniforms.uTime.value = time;
    floor.glow.material.opacity = 0.16 + energy * 0.08 + Math.sin(time * 0.9) * 0.018;
    floor.reflection.material.opacity = 0.19 + energy * 0.09 + Math.sin(time * 1.1) * 0.022;
  }

  return {
    update,
    emitBurst,
    setLumen,
    setPixelRatio,
    gears,
  };
}
