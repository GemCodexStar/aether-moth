import * as THREE from 'three';
import { createGearGeometry } from './geometry.js';
import { mergeStaticChildren } from './merge.js';
import { makeWeatheredMetalTexture, makeWingTexture } from './textures.js';

const TAU = Math.PI * 2;

function createWingShape(kind) {
  const shape = new THREE.Shape();
  if (kind === 'fore') {
    shape.moveTo(0.1, -0.32);
    shape.bezierCurveTo(0.58, -1.02, 1.54, -1.2, 2.36, -0.8);
    shape.bezierCurveTo(2.64, -0.64, 2.64, -0.18, 2.32, 0.08);
    shape.quadraticCurveTo(1.78, 0.45, 1.12, 0.66);
    shape.quadraticCurveTo(0.5, 0.8, 0.1, 0.42);
  } else {
    shape.moveTo(0.1, -0.12);
    shape.bezierCurveTo(0.55, -0.28, 1.25, -0.3, 1.8, -0.08);
    shape.quadraticCurveTo(2.05, 0.15, 1.95, 0.4);
    shape.bezierCurveTo(1.82, 0.85, 1.2, 1.06, 0.65, 1.0);
    shape.quadraticCurveTo(0.22, 0.95, 0.1, 0.58);
  }
  shape.closePath();
  return shape;
}

function membraneHeight(x, z) {
  const radial = THREE.MathUtils.clamp(x / 2.55, 0, 1);
  return 0.025 + radial * radial * 0.16 + Math.sin((z + 0.36) * 2.4) * 0.018 * radial;
}

function makeMembraneGeometry(shape) {
  const geometry = new THREE.ShapeGeometry(shape, 36);
  geometry.rotateX(-Math.PI / 2);
  const position = geometry.attributes.position;
  for (let i = 0; i < position.count; i += 1) {
    position.setY(i, membraneHeight(position.getX(i), position.getZ(i)));
  }
  geometry.computeBoundingBox();
  const box = geometry.boundingBox;
  const uv = geometry.attributes.uv;
  for (let i = 0; i < position.count; i += 1) {
    const u = (position.getX(i) - box.min.x) / (box.max.x - box.min.x);
    const v = (position.getZ(i) - box.min.z) / (box.max.z - box.min.z);
    uv.setXY(i, u, v);
  }
  uv.needsUpdate = true;
  geometry.computeVertexNormals();
  return geometry;
}

function makeTube(points, radius, material, segments = 48, closed = false) {
  const curve = new THREE.CatmullRomCurve3(points, closed, 'catmullrom', 0.25);
  const geometry = new THREE.TubeGeometry(curve, segments, radius, 5, closed);
  return new THREE.Mesh(geometry, material);
}

function addRivetRing(parent, { radius, yScale = 1, z = 0, count = 18, size = 0.018, offset = 0, material }) {
  const rivets = new THREE.InstancedMesh(new THREE.SphereGeometry(size, 7, 5), material, count);
  const matrix = new THREE.Matrix4();
  for (let i = 0; i < count; i += 1) {
    const angle = (i / count) * TAU + offset;
    matrix.makeTranslation(Math.cos(angle) * radius, Math.sin(angle) * radius * yScale, z);
    rivets.setMatrixAt(i, matrix);
  }
  rivets.instanceMatrix.needsUpdate = true;
  parent.add(rivets);
}

function addGlowSprite(parent, texture, color, position, scale, opacity = 0.8) {
  const material = new THREE.SpriteMaterial({
    map: texture,
    color,
    transparent: true,
    opacity,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    depthTest: true,
  });
  const sprite = new THREE.Sprite(material);
  sprite.position.copy(position);
  sprite.scale.setScalar(scale);
  parent.add(sprite);
  return sprite;
}

export function createMoth(glowTexture) {
  const root = new THREE.Group();
  root.name = 'AetherMoth';
  root.position.y = 1.82;

  const body = new THREE.Group();
  root.add(body);

  const wingTexture = makeWingTexture(13);
  const wingTextureHind = makeWingTexture(29);
  const metalWear = makeWeatheredMetalTexture(512);

  const materials = {
    brass: new THREE.MeshPhysicalMaterial({
      color: 0xa46d36,
      metalness: 1,
      roughness: 0.24,
      clearcoat: 0.5,
      clearcoatRoughness: 0.24,
      envMapIntensity: 1.85,
    }),
    brightBrass: new THREE.MeshPhysicalMaterial({
      color: 0xd2a25f,
      metalness: 1,
      roughness: 0.13,
      clearcoat: 0.75,
      clearcoatRoughness: 0.1,
      envMapIntensity: 2.1,
    }),
    copper: new THREE.MeshPhysicalMaterial({
      color: 0x8d4b29,
      metalness: 1,
      roughness: 0.28,
      clearcoat: 0.25,
      envMapIntensity: 1.7,
    }),
    iron: new THREE.MeshStandardMaterial({
      color: 0x2a241d,
      metalness: 0.9,
      roughness: 0.48,
      roughnessMap: metalWear,
      bumpMap: metalWear,
      bumpScale: 0.012,
      envMapIntensity: 1.15,
    }),
    blackIron: new THREE.MeshStandardMaterial({
      color: 0x0d0c0a,
      metalness: 0.88,
      roughness: 0.4,
      envMapIntensity: 1,
    }),
    verdigris: new THREE.MeshPhysicalMaterial({
      color: 0x3b5b4d,
      metalness: 0.82,
      roughness: 0.52,
      clearcoat: 0.2,
      envMapIntensity: 1.2,
    }),
    wing: new THREE.MeshPhysicalMaterial({
      map: wingTexture,
      color: 0xffe0aa,
      metalness: 0.04,
      roughness: 0.14,
      iridescence: 1,
      iridescenceIOR: 1.32,
      iridescenceThicknessRange: [80, 640],
      clearcoat: 1,
      clearcoatRoughness: 0.06,
      envMapIntensity: 1.72,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide,
      depthWrite: false,
      emissive: 0x4a230c,
      emissiveIntensity: 0.28,
    }),
    wingHind: new THREE.MeshPhysicalMaterial({
      map: wingTextureHind,
      color: 0xecba75,
      metalness: 0.04,
      roughness: 0.15,
      iridescence: 1,
      iridescenceIOR: 1.28,
      iridescenceThicknessRange: [100, 580],
      clearcoat: 1,
      clearcoatRoughness: 0.07,
      envMapIntensity: 1.6,
      transparent: true,
      opacity: 0.86,
      side: THREE.DoubleSide,
      depthWrite: false,
      emissive: 0x3b1b08,
      emissiveIntensity: 0.24,
    }),
    eye: new THREE.MeshPhysicalMaterial({
      color: 0x1e0e05,
      emissive: 0xb8480f,
      emissiveIntensity: 0.55,
      metalness: 0.3,
      roughness: 0.17,
      clearcoat: 1,
      clearcoatRoughness: 0.07,
      flatShading: true,
    }),
    eyeIris: new THREE.MeshStandardMaterial({
      color: 0xf0aa62,
      emissive: 0xe87920,
      emissiveIntensity: 1.3,
      metalness: 0.1,
      roughness: 0.3,
    }),
    amberGlass: new THREE.MeshPhysicalMaterial({
      color: 0xc26b1e,
      emissive: 0xff862b,
      emissiveIntensity: 1.1,
      roughness: 0.08,
      metalness: 0.15,
      clearcoat: 1,
      transparent: true,
      opacity: 0.88,
    }),
    glow: new THREE.MeshStandardMaterial({
      color: 0xffbf74,
      emissive: 0xff7a1a,
      emissiveIntensity: 3.6,
      roughness: 0.2,
      metalness: 0.1,
    }),
    darkGlass: new THREE.MeshPhysicalMaterial({
      color: 0x0b0a08,
      metalness: 0.5,
      roughness: 0.08,
      clearcoat: 1,
      envMapIntensity: 1.6,
    }),
  };

  // Thorax: a dark iron shell clad in brass rings and plates.
  const profile = [
    [0.035, -0.83],
    [0.25, -0.8],
    [0.47, -0.67],
    [0.62, -0.43],
    [0.7, -0.08],
    [0.72, 0.24],
    [0.61, 0.5],
    [0.4, 0.69],
    [0.16, 0.79],
    [0.025, 0.82],
  ].map(([radius, y]) => new THREE.Vector2(radius, y));
  const thoraxGeometry = new THREE.LatheGeometry(profile, 48);
  thoraxGeometry.rotateX(Math.PI / 2);
  const thorax = new THREE.Mesh(thoraxGeometry, materials.iron);
  thorax.castShadow = true;
  thorax.receiveShadow = true;
  body.add(thorax);

  const bandData = [
    { z: 0.55, radius: 0.43, tube: 0.026, material: materials.brass },
    { z: 0.28, radius: 0.64, tube: 0.022, material: materials.copper },
    { z: -0.12, radius: 0.705, tube: 0.028, material: materials.brass },
    { z: -0.48, radius: 0.585, tube: 0.022, material: materials.copper },
  ];
  bandData.forEach((band, index) => {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(band.radius, band.tube, 7, 48),
      band.material,
    );
    ring.position.z = band.z;
    ring.scale.y = 0.86;
    ring.castShadow = true;
    body.add(ring);
    addRivetRing(body, {
      radius: band.radius + band.tube * 0.4,
      yScale: 0.86,
      z: band.z + 0.002,
      count: 20,
      size: index === 2 ? 0.02 : 0.014,
      material: materials.brightBrass,
      offset: index * 0.13,
    });
  });

  // Carapace ridges framing the clockwork aperture.
  [
    { z: 0.55, scaleX: 1.1, scaleZ: 0.58 },
    { z: -0.5, scaleX: 0.92, scaleZ: 0.68 },
  ].forEach((item) => {
    const plate = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 8), materials.brass);
    plate.scale.set(item.scaleX, 0.28, item.scaleZ);
    plate.position.set(0, 0.66, item.z);
    plate.castShadow = true;
    body.add(plate);
  });

  // Side canisters and exposed shoulder gears.
  const sideGears = [];
  const sideGearPivots = [];
  [-1, 1].forEach((side) => {
    const canister = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.11, 0.35, 5, 12),
      materials.verdigris,
    );
    canister.rotation.x = Math.PI / 2;
    canister.position.set(side * 0.56, -0.1, 0.08);
    canister.scale.set(1, 1, 0.72);
    canister.castShadow = true;
    body.add(canister);

    [-0.2, 0.38].forEach((z, index) => {
      const collar = new THREE.Mesh(new THREE.TorusGeometry(0.118, 0.024, 6, 20), materials.copper);
      collar.position.set(side * 0.56, -0.1, z);
      body.add(collar);

      const gearPivot = new THREE.Group();
      gearPivot.position.set(side * 0.65, 0.19 + index * 0.02, z * 0.8 + 0.04);
      gearPivot.rotation.y = (side * Math.PI) / 2;
      body.add(gearPivot);
      sideGearPivots.push(gearPivot);
      const gear = new THREE.Mesh(
        createGearGeometry({
          radius: index === 0 ? 0.16 : 0.115,
          teeth: index === 0 ? 15 : 11,
          toothDepth: 0.035,
          thickness: 0.045,
          lighteningHoles: index === 0 ? 4 : 0,
        }),
        index === 0 ? materials.brightBrass : materials.copper,
      );
      gear.castShadow = true;
      gearPivot.add(gear);
      sideGears.push({ mesh: gear, speed: side * (index === 0 ? 0.8 : -1.35) });
    });
  });

  // Exposed clockwork aperture on the dorsal shell.
  const aperture = new THREE.Group();
  aperture.position.set(0, 0.655, 0.03);
  body.add(aperture);
  const apertureRim = new THREE.Mesh(new THREE.TorusGeometry(0.275, 0.035, 8, 40), materials.brightBrass);
  apertureRim.rotation.x = Math.PI / 2;
  apertureRim.castShadow = true;
  aperture.add(apertureRim);
  const apertureBack = new THREE.Mesh(new THREE.CircleGeometry(0.258, 36), materials.darkGlass);
  apertureBack.rotation.x = -Math.PI / 2;
  apertureBack.position.y = -0.018;
  aperture.add(apertureBack);
  const innerGlow = new THREE.Mesh(new THREE.CircleGeometry(0.18, 28), materials.glow);
  innerGlow.rotation.x = -Math.PI / 2;
  innerGlow.position.y = -0.012;
  innerGlow.material = materials.glow.clone();
  innerGlow.material.opacity = 0.34;
  innerGlow.material.transparent = true;
  innerGlow.material.depthWrite = false;
  aperture.add(innerGlow);

  const apertureGears = [];
  [
    { x: -0.1, z: 0.04, radius: 0.11, teeth: 12, speed: 0.85, material: materials.copper },
    { x: 0.07, z: -0.05, radius: 0.145, teeth: 16, speed: -0.52, material: materials.brass },
    { x: 0.12, z: 0.12, radius: 0.075, teeth: 9, speed: 1.2, material: materials.brightBrass },
  ].forEach((item) => {
    const gear = new THREE.Mesh(
      createGearGeometry({
        radius: item.radius,
        teeth: item.teeth,
        toothDepth: 0.022,
        thickness: 0.025,
        lighteningHoles: 0,
      }),
      item.material,
    );
    gear.rotation.x = -Math.PI / 2;
    gear.position.set(item.x, 0.012, item.z);
    aperture.add(gear);
    apertureGears.push({ mesh: gear, speed: item.speed });
  });
  const coreLight = new THREE.PointLight(0xffa552, 3.6, 2.2, 2);
  coreLight.position.set(0, 0.18, 0);
  aperture.add(coreLight);
  addGlowSprite(
    aperture,
    glowTexture,
    0xffb15f,
    new THREE.Vector3(0, 0.035, 0),
    0.85,
    0.56,
  );

  // Head, compound eyes and brass faceplate.
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 0.12, 0.88);
  body.add(headGroup);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.35, 32, 22), materials.iron);
  head.scale.set(0.98, 0.9, 0.95);
  head.castShadow = true;
  headGroup.add(head);

  const helmet = new THREE.Mesh(
    new THREE.SphereGeometry(0.36, 28, 14, 0, TAU, 0, Math.PI * 0.52),
    materials.brass,
  );
  helmet.scale.set(1.02, 0.92, 0.98);
  helmet.castShadow = true;
  headGroup.add(helmet);

  const brow = new THREE.Mesh(new THREE.TorusGeometry(0.315, 0.022, 6, 40), materials.brightBrass);
  brow.rotation.x = Math.PI / 2;
  brow.position.y = 0.08;
  brow.scale.z = 0.92;
  headGroup.add(brow);

  const eyeMaterials = [];
  const eyeIrisMaterials = [];
  const eyeHalos = [];
  const facetMaterial = new THREE.MeshBasicMaterial({
    color: 0x9d7643,
    wireframe: true,
    transparent: true,
    opacity: 0.17,
    depthWrite: false,
  });

  [-1, 1].forEach((side) => {
    const socket = new THREE.Group();
    socket.position.set(side * 0.205, 0.035, 0.245);
    socket.rotation.y = side * 0.28;
    socket.rotation.x = 0.08;
    headGroup.add(socket);

    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.03, 8, 32), materials.brass);
    rim.castShadow = true;
    socket.add(rim);
    const outerRim = new THREE.Mesh(new THREE.TorusGeometry(0.188, 0.008, 5, 32), materials.brightBrass);
    outerRim.position.z = -0.003;
    socket.add(outerRim);

    const eyeMaterial = materials.eye.clone();
    const eyeGeometry = new THREE.IcosahedronGeometry(0.132, 2);
    const eye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    eye.position.z = 0.012;
    socket.add(eye);
    eyeMaterials.push(eyeMaterial);

    const facets = new THREE.Mesh(eyeGeometry, facetMaterial);
    facets.position.z = 0.012;
    facets.scale.setScalar(1.008);
    socket.add(facets);

    const irisMaterial = materials.eyeIris.clone();
    const iris = new THREE.Mesh(new THREE.CircleGeometry(0.056, 24), irisMaterial);
    iris.position.z = 0.15;
    socket.add(iris);
    eyeIrisMaterials.push(irisMaterial);

    const irisRing = new THREE.Mesh(new THREE.TorusGeometry(0.058, 0.007, 5, 24), materials.brightBrass);
    irisRing.position.z = 0.153;
    socket.add(irisRing);

    const pupil = new THREE.Mesh(
      new THREE.CircleGeometry(0.018, 16),
      new THREE.MeshBasicMaterial({ color: 0x090503 }),
    );
    pupil.position.z = 0.154;
    socket.add(pupil);

    const eyeHalo = addGlowSprite(
      socket,
      glowTexture,
      0xff9540,
      new THREE.Vector3(0, 0, 0.12),
      0.42,
      0.17,
    );
    eyeHalos.push(eyeHalo);

    addRivetRing(socket, {
      radius: 0.178,
      yScale: 1,
      z: 0.018,
      count: 14,
      size: 0.0085,
      material: materials.copper,
    });
  });

  const faceplate = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.19, 0.075), materials.iron);
  faceplate.position.set(0, -0.14, 0.27);
  faceplate.rotation.x = -0.2;
  faceplate.castShadow = true;
  headGroup.add(faceplate);
  const faceTrim = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.018, 0.082), materials.brightBrass);
  faceTrim.position.set(0, -0.06, 0.278);
  faceTrim.rotation.x = -0.2;
  headGroup.add(faceTrim);

  const mouthCurves = [];
  [-1, 1].forEach((side) => {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(side * 0.06, -0.2, 0.27),
      new THREE.Vector3(side * 0.11, -0.3, 0.36),
      new THREE.Vector3(side * 0.17, -0.38, 0.29),
      new THREE.Vector3(side * 0.19, -0.43, 0.19),
    ]);
    const mandible = new THREE.Mesh(
      new THREE.TubeGeometry(curve, 18, 0.016, 5, false),
      materials.copper,
    );
    headGroup.add(mandible);
    mouthCurves.push(curve);
  });
  const mouthVent = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.06, 0.08, 12), materials.brass);
  mouthVent.rotation.x = Math.PI / 2;
  mouthVent.position.set(0, -0.22, 0.3);
  headGroup.add(mouthVent);
  const mouthGlow = new THREE.Mesh(new THREE.CircleGeometry(0.035, 18), materials.glow);
  mouthGlow.position.set(0, -0.22, 0.345);
  headGroup.add(mouthGlow);

  const gauge = new THREE.Group();
  gauge.position.set(0, -0.085, 0.325);
  gauge.rotation.x = -0.08;
  headGroup.add(gauge);
  const gaugeRim = new THREE.Mesh(new THREE.TorusGeometry(0.063, 0.011, 6, 26), materials.brightBrass);
  gauge.add(gaugeRim);
  const gaugeFace = new THREE.Mesh(
    new THREE.CircleGeometry(0.055, 26),
    new THREE.MeshStandardMaterial({ color: 0x6e593b, metalness: 0.38, roughness: 0.52 }),
  );
  gaugeFace.position.z = 0.002;
  gauge.add(gaugeFace);
  const needlePivot = new THREE.Group();
  needlePivot.position.z = 0.008;
  needlePivot.rotation.z = -0.77;
  gauge.add(needlePivot);
  const gaugeNeedle = new THREE.Mesh(new THREE.BoxGeometry(0.005, 0.044, 0.002), materials.brightBrass);
  gaugeNeedle.position.y = 0.017;
  needlePivot.add(gaugeNeedle);
  const gaugeCap = new THREE.Mesh(new THREE.SphereGeometry(0.009, 8, 6), materials.copper);
  gaugeCap.position.z = 0.008;
  gauge.add(gaugeCap);
  for (let i = 0; i < 7; i += 1) {
    const angle = Math.PI * 0.18 + (i / 6) * Math.PI * 0.64;
    const tick = new THREE.Mesh(new THREE.BoxGeometry(0.003, 0.009, 0.0015), materials.copper);
    tick.position.set(Math.cos(angle) * 0.043, Math.sin(angle) * 0.043, 0.006);
    tick.rotation.z = angle - Math.PI / 2;
    gauge.add(tick);
  }

  // Plumed antennae with luminous tips.
  const antennae = [];
  [-1, 1].forEach((side) => {
    const antennaGroup = new THREE.Group();
    headGroup.add(antennaGroup);
    const points = [
      new THREE.Vector3(side * 0.09, 0.28, 0.08),
      new THREE.Vector3(side * 0.22, 0.49, 0.1),
      new THREE.Vector3(side * 0.46, 0.64, 0.19),
      new THREE.Vector3(side * 0.68, 0.63, 0.36),
      new THREE.Vector3(side * 0.83, 0.53, 0.5),
    ];
    const curve = new THREE.CatmullRomCurve3(points);
    const stem = new THREE.Mesh(new THREE.TubeGeometry(curve, 32, 0.014, 5, false), materials.brass);
    stem.castShadow = true;
    antennaGroup.add(stem);

    for (let i = 0; i < 5; i += 1) {
      const t = 0.45 + i * 0.09;
      const point = curve.getPoint(t);
      const tip = curve.getPoint(Math.min(1, t + 0.06));
      const direction = tip.clone().sub(point);
      const feather = new THREE.Mesh(
        new THREE.CylinderGeometry(0.004, 0.015, 0.12 + i * 0.018, 5),
        materials.copper,
      );
      feather.position.copy(point);
      feather.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
      feather.rotateX(Math.PI / 2);
      antennaGroup.add(feather);
    }

    const tip = curve.getPoint(1);
    const tipOrb = new THREE.Mesh(new THREE.SphereGeometry(0.035, 12, 8), materials.glow);
    tipOrb.position.copy(tip);
    antennaGroup.add(tipOrb);
    addGlowSprite(antennaGroup, glowTexture, 0xffb15d, tip, 0.56, 0.62);
    antennae.push({ group: antennaGroup, side, baseZ: antennaGroup.rotation.z });
  });

  // A collar of fine brass filaments suggests the moth's thoracic fur.
  const fuzzCount = 88;
  const fuzzGeometry = new THREE.CylinderGeometry(0.0014, 0.0066, 1, 3);
  const fuzzMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    metalness: 0.58,
    roughness: 0.6,
    envMapIntensity: 0.95,
  });
  const fuzz = new THREE.InstancedMesh(fuzzGeometry, fuzzMaterial, fuzzCount);
  const fuzzMatrix = new THREE.Matrix4();
  const fuzzQuaternion = new THREE.Quaternion();
  const fuzzScale = new THREE.Vector3();
  const fuzzPosition = new THREE.Vector3();
  const fuzzDirection = new THREE.Vector3();
  const fuzzColors = [0x9d6d3e, 0x6d4627, 0xb78b58, 0x81572e];
  for (let i = 0; i < fuzzCount; i += 1) {
    const angle = (i / fuzzCount) * TAU + (Math.random() - 0.5) * 0.07;
    const length = 0.075 + Math.random() * 0.115;
    fuzzPosition.set(
      Math.cos(angle) * 0.55,
      Math.sin(angle) * 0.47 + 0.02,
      0.63 + (Math.random() - 0.5) * 0.12,
    );
    fuzzDirection
      .set(
        Math.cos(angle) * (0.6 + Math.random() * 0.4),
        Math.sin(angle) * (0.38 + Math.random() * 0.32),
        -0.08 - Math.random() * 0.14,
      )
      .normalize();
    fuzzQuaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), fuzzDirection);
    fuzzScale.set(1, length, 1);
    fuzzPosition.addScaledVector(fuzzDirection, length * 0.5);
    fuzzMatrix.compose(fuzzPosition, fuzzQuaternion, fuzzScale);
    fuzz.setMatrixAt(i, fuzzMatrix);
    fuzz.setColorAt(i, new THREE.Color(fuzzColors[i % fuzzColors.length]));
  }
  fuzz.instanceMatrix.needsUpdate = true;
  if (fuzz.instanceColor) fuzz.instanceColor.needsUpdate = true;
  fuzz.castShadow = false;
  fuzz.frustumCulled = false;
  body.add(fuzz);

  const radiusForZ = (z) => {
    for (let i = 0; i < profile.length - 1; i += 1) {
      const a = profile[i];
      const b = profile[i + 1];
      if (z >= a.y && z <= b.y) {
        return THREE.MathUtils.lerp(a.x, b.x, (z - a.y) / Math.max(0.0001, b.y - a.y));
      }
    }
    return 0;
  };

  const coatCount = 124;
  const coatGeometry = new THREE.CylinderGeometry(0.001, 0.0048, 1, 2);
  const coatMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    metalness: 0.4,
    roughness: 0.64,
    envMapIntensity: 0.8,
  });
  const coat = new THREE.InstancedMesh(coatGeometry, coatMaterial, coatCount);
  const coatColors = [0x76532e, 0x51361f, 0x8e683d, 0x624224];
  for (let i = 0; i < coatCount; i += 1) {
    let angle = Math.random() * TAU;
    if (Math.sin(angle) > 0.48) angle += Math.PI;
    const z = -0.55 + Math.random() * 1.02;
    const radius = Math.max(0.12, radiusForZ(z)) * 0.985;
    const length = 0.028 + Math.random() * 0.06;
    fuzzDirection
      .set(
        Math.cos(angle),
        Math.sin(angle) * 0.82,
        -0.12 - Math.random() * 0.34,
      )
      .normalize();
    fuzzPosition.set(Math.cos(angle) * radius, Math.sin(angle) * radius, z);
    fuzzQuaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), fuzzDirection);
    fuzzScale.set(1, length, 1);
    fuzzPosition.addScaledVector(fuzzDirection, length * 0.4);
    fuzzMatrix.compose(fuzzPosition, fuzzQuaternion, fuzzScale);
    coat.setMatrixAt(i, fuzzMatrix);
    coat.setColorAt(i, new THREE.Color(coatColors[i % coatColors.length]));
  }
  coat.instanceMatrix.needsUpdate = true;
  if (coat.instanceColor) coat.instanceColor.needsUpdate = true;
  coat.frustumCulled = false;
  body.add(coat);

  // Segmented abdomen trailing behind the thorax.
  const abdomen = new THREE.Group();
  abdomen.rotation.x = -0.34;
  body.add(abdomen);
  const abdomenRivets = new THREE.InstancedMesh(
    new THREE.SphereGeometry(0.012, 7, 5),
    materials.brightBrass,
    72,
  );
  const abdomenRivetMatrix = new THREE.Matrix4();
  let abdomenRivetIndex = 0;
  let abdomenZ = -0.73;
  for (let i = 0; i < 6; i += 1) {
    const t = i / 5;
    const radius = 0.35 * (1 - t * 0.68);
    const length = 0.25 - i * 0.012;
    const segment = new THREE.Mesh(
      new THREE.CylinderGeometry(radius * 0.86, radius, length, 22),
      i % 2 === 0 ? materials.brass : materials.iron,
    );
    segment.rotation.x = Math.PI / 2;
    segment.position.set(0, -0.08 - t * 0.32, abdomenZ - length / 2);
    segment.castShadow = true;
    abdomen.add(segment);

    const seam = new THREE.Mesh(
      new THREE.TorusGeometry(radius * 0.9, 0.018, 6, 26),
      materials.copper,
    );
    seam.position.set(0, -0.08 - t * 0.32, abdomenZ - length);
    seam.scale.y = 0.9;
    abdomen.add(seam);
    for (let r = 0; r < 12; r += 1) {
      const angle = (r / 12) * TAU;
      abdomenRivetMatrix.makeTranslation(
        Math.cos(angle) * radius * 0.9,
        Math.sin(angle) * radius * 0.82 + seam.position.y,
        seam.position.z + 0.01,
      );
      abdomenRivets.setMatrixAt(abdomenRivetIndex, abdomenRivetMatrix);
      abdomenRivetIndex += 1;
    }

    abdomenZ -= length + 0.026;
  }
  abdomenRivets.instanceMatrix.needsUpdate = true;
  abdomen.add(abdomenRivets);

  const tailGlow = new THREE.Mesh(new THREE.SphereGeometry(0.065, 14, 10), materials.glow);
  tailGlow.position.set(0, -0.4, abdomenZ + 0.04);
  abdomen.add(tailGlow);
  addGlowSprite(abdomen, glowTexture, 0xff9b45, tailGlow.position, 0.9, 0.7);

  // Six articulated legs tucked beneath the body.
  [0.34, -0.04, -0.38].forEach((z, row) => {
    [-1, 1].forEach((side) => {
      const hip = new THREE.Vector3(side * 0.42, -0.25, z);
      const knee = new THREE.Vector3(
        side * (0.83 + row * 0.05),
        -0.7 + row * 0.05,
        z - 0.08 + row * 0.03,
      );
      const ankle = new THREE.Vector3(side * 0.68, -1.03 + row * 0.03, z + 0.15);
      const claw = new THREE.Vector3(side * 0.57, -1.17 + row * 0.03, z + 0.32);
      const curve = new THREE.CatmullRomCurve3([hip, knee, ankle, claw]);
      const leg = new THREE.Mesh(new THREE.TubeGeometry(curve, 28, 0.017, 5, false), materials.brass);
      leg.castShadow = true;
      body.add(leg);

      [knee, ankle].forEach((point, jointIndex) => {
        const joint = new THREE.Mesh(
          new THREE.SphereGeometry(jointIndex === 0 ? 0.046 : 0.034, 10, 7),
          materials.copper,
        );
        joint.position.copy(point);
        body.add(joint);
      });

      const foot = new THREE.Mesh(new THREE.ConeGeometry(0.027, 0.11, 6), materials.brightBrass);
      foot.position.copy(claw);
      foot.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(side * 0.15, -1, 0.25).normalize());
      body.add(foot);
    });
  });

  // Four membrane wings, each with a fan of brass ribs and an eyespot.
  const wings = [];
  const wingRoots = [];
  ['fore', 'hind'].forEach((kind) => {
    [-1, 1].forEach((side) => {
      const pivot = new THREE.Group();
      pivot.position.set(
        side * (kind === 'fore' ? 0.46 : 0.4),
        kind === 'fore' ? 0.34 : 0.17,
        kind === 'fore' ? 0.34 : -0.01,
      );
      pivot.scale.x = side;
      pivot.rotation.y = kind === 'fore' ? 0.2 : 0.28;
      root.add(pivot);

      const wing = new THREE.Group();
      wing.name = `wing-${kind}-${side > 0 ? 'right' : 'left'}`;
      pivot.add(wing);

      const shape = createWingShape(kind);
      const geometry = makeMembraneGeometry(shape);
      const membrane = new THREE.Mesh(geometry, kind === 'fore' ? materials.wing : materials.wingHind);
      membrane.renderOrder = 2;
      wing.add(membrane);

      const boundary = shape.getPoints(64).map((point) => {
        const x = point.x;
        const z = -point.y;
        return new THREE.Vector3(x, membraneHeight(x, z) + 0.004, z);
      });
      const border = makeTube(boundary, kind === 'fore' ? 0.021 : 0.017, materials.brass, 96, true);
      border.castShadow = true;
      wing.add(border);

      const leadingEdge = boundary.slice(0, 34).map((point) => point.clone());
      const leading = makeTube(leadingEdge, 0.034, materials.brightBrass, 48, false);
      leading.castShadow = true;
      wing.add(leading);

      const fringeGeometry = new THREE.CylinderGeometry(0.0011, 0.0038, 1, 3);
      const fringeMaterial = new THREE.MeshStandardMaterial({
        color: 0x8a6138,
        metalness: 0.88,
        roughness: 0.42,
      });
      const fringeCandidates = boundary.filter((point) => point.x > 0.4);
      const fringeCount = Math.min(30, fringeCandidates.length);
      const wingFringe = new THREE.InstancedMesh(fringeGeometry, fringeMaterial, fringeCount);
      const fringeMatrix = new THREE.Matrix4();
      const fringeDirection = new THREE.Vector3();
      const fringePosition = new THREE.Vector3();
      const fringeQuaternion = new THREE.Quaternion();
      const fringeScale = new THREE.Vector3();
      for (let i = 0; i < fringeCount; i += 1) {
        const sample = fringeCandidates[Math.floor((i / fringeCount) * fringeCandidates.length)];
        const length = 0.03 + Math.random() * 0.052;
        fringeDirection
          .set(sample.x - 1.14, 0, sample.z + 0.08)
          .normalize();
        fringePosition.copy(sample).addScaledVector(fringeDirection, length * 0.5);
        fringePosition.y += 0.008;
        fringeQuaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), fringeDirection);
        fringeScale.set(1, length, 1);
        fringeMatrix.compose(fringePosition, fringeQuaternion, fringeScale);
        wingFringe.setMatrixAt(i, fringeMatrix);
      }
      wingFringe.instanceMatrix.needsUpdate = true;
      wingFringe.frustumCulled = false;
      wing.add(wingFringe);

      const rootPoint = new THREE.Vector3(0.16, 0.08, kind === 'fore' ? 0.16 : -0.02);
      const ribEnds =
        kind === 'fore'
          ? [
              [0.72, 0.38],
              [1.15, 0.48],
              [1.64, 0.4],
              [2.07, 0.22],
              [2.21, -0.08],
              [1.84, -0.34],
              [1.32, -0.48],
              [0.75, -0.44],
            ]
          : [
              [0.62, -0.2],
              [1.05, -0.08],
              [1.48, -0.02],
              [1.82, -0.12],
              [1.84, -0.4],
              [1.5, -0.67],
              [1.04, -0.78],
              [0.5, -0.63],
            ];

      ribEnds.forEach(([x, z], index) => {
        const end = new THREE.Vector3(x, membraneHeight(x, z) + 0.014, z);
        const start = rootPoint.clone();
        start.y = membraneHeight(start.x, start.z) + 0.01;
        const control = start
          .clone()
          .lerp(end, 0.52)
          .add(new THREE.Vector3(0, 0.02, (index % 2 === 0 ? 1 : -1) * 0.035));
        const curve = new THREE.QuadraticBezierCurve3(start, control, end);
        const rib = new THREE.Mesh(
          new THREE.TubeGeometry(curve, 20, kind === 'fore' ? 0.011 : 0.009, 5, false),
          materials.brass,
        );
        wing.add(rib);
      });

      if (kind === 'fore') {
        const spotX = 1.42;
        const spotZ = -0.08;
        const spotY = membraneHeight(spotX, spotZ) + 0.025;
        const spot = new THREE.Group();
        spot.position.set(spotX, spotY, spotZ);
        wing.add(spot);

        const spotDisc = new THREE.Mesh(new THREE.CircleGeometry(0.21, 32), materials.amberGlass);
        spotDisc.rotation.x = -Math.PI / 2;
        spot.add(spotDisc);
        const spotInner = new THREE.Mesh(new THREE.CircleGeometry(0.115, 28), materials.copper);
        spotInner.rotation.x = -Math.PI / 2;
        spotInner.position.y = 0.006;
        spot.add(spotInner);
        const spotRim = new THREE.Mesh(new THREE.TorusGeometry(0.245, 0.025, 6, 32), materials.brightBrass);
        spotRim.rotation.x = Math.PI / 2;
        spot.add(spotRim);
        const spotRimInner = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.009, 5, 28), materials.copper);
        spotRimInner.rotation.x = Math.PI / 2;
        spotRimInner.position.y = 0.01;
        spot.add(spotRimInner);

        const spotRivets = new THREE.InstancedMesh(
          new THREE.SphereGeometry(0.01, 6, 4),
          materials.copper,
          12,
        );
        const spotRivetMatrix = new THREE.Matrix4();
        for (let i = 0; i < 12; i += 1) {
          const angle = (i / 12) * TAU;
          spotRivetMatrix.makeTranslation(Math.cos(angle) * 0.3, 0.018, Math.sin(angle) * 0.3);
          spotRivets.setMatrixAt(i, spotRivetMatrix);
        }
        spotRivets.instanceMatrix.needsUpdate = true;
        spot.add(spotRivets);

        const arc = new THREE.Mesh(
          new THREE.TorusGeometry(0.4, 0.006, 5, 40, Math.PI * 1.45),
          materials.brass,
        );
        arc.rotation.x = Math.PI / 2;
        arc.rotation.z = 0.55;
        arc.position.y = 0.012;
        spot.add(arc);

        addGlowSprite(
          spot,
          glowTexture,
          0xffa24d,
          new THREE.Vector3(0, 0.05, 0),
          0.42,
          0.2,
        );
      }

      const swirlA = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0.23, membraneHeight(0.23, 0.24) + 0.012, 0.24),
        new THREE.Vector3(0.4, membraneHeight(0.4, 0.09) + 0.014, 0.09),
        new THREE.Vector3(0.62, membraneHeight(0.62, 0.17) + 0.013, 0.17),
        new THREE.Vector3(0.52, membraneHeight(0.52, 0.36) + 0.012, 0.36),
      ]);
      wing.add(new THREE.Mesh(new THREE.TubeGeometry(swirlA, 22, 0.006, 4, false), materials.brightBrass));

      const rootDrum = new THREE.Mesh(
        new THREE.CylinderGeometry(0.155, 0.155, 0.22, 18),
        materials.iron,
      );
      rootDrum.rotation.z = Math.PI / 2;
      rootDrum.position.x = 0.1;
      rootDrum.castShadow = true;
      pivot.add(rootDrum);

      const rootRing = new THREE.Mesh(
        new THREE.TorusGeometry(0.155, 0.024, 6, 24),
        materials.brightBrass,
      );
      rootRing.rotation.y = Math.PI / 2;
      rootRing.position.x = 0.215;
      pivot.add(rootRing);
      addGlowSprite(
        pivot,
        glowTexture,
        0xff9c43,
        new THREE.Vector3(0.22, -0.02, 0),
        0.5,
        0.3,
      );

      wing.scale.set(1.09, 1, 1.09);
      wingRoots.push({ pivot, kind, side });
      wings.push({
        pivot,
        kind,
        side,
        root: wing,
        gain: kind === 'fore' ? 1 : 0.78,
        phase: (kind === 'fore' ? 0 : 0.32) + (side > 0 ? 0 : 0.04),
        rest: kind === 'fore' ? 0.12 : 0.02,
        pitch: kind === 'fore' ? 0.26 : 0.21,
        sweep: pivot.rotation.y,
      });
    });
  });

  // Steam pipes linking head to abdomen.
  [-1, 1].forEach((side) => {
    const pipeCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(side * 0.52, 0.22, 0.55),
      new THREE.Vector3(side * 0.56, 0.4, 0.24),
      new THREE.Vector3(side * 0.52, 0.33, -0.24),
      new THREE.Vector3(side * 0.4, 0.13, -0.68),
    ]);
    const pipe = new THREE.Mesh(new THREE.TubeGeometry(pipeCurve, 34, 0.025, 6, false), materials.copper);
    pipe.castShadow = true;
    body.add(pipe);

    [0.22, 0.95].forEach((t) => {
      const point = pipeCurve.getPoint(t);
      const collar = new THREE.Mesh(new THREE.TorusGeometry(0.032, 0.012, 6, 16), materials.brightBrass);
      collar.position.copy(point);
      collar.rotation.y = Math.PI / 2;
      body.add(collar);
    });
  });

  // One slow halo behind the specimen, for a sense of contained energy.
  const auraGroup = new THREE.Group();
  auraGroup.position.set(0, 0.04, -0.08);
  body.add(auraGroup);
  const auraMaterial = new THREE.SpriteMaterial({
    map: glowTexture,
    color: 0x8e4b21,
    transparent: true,
    opacity: 0.2,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const aura = new THREE.Sprite(auraMaterial);
  aura.scale.set(5.6, 3.0, 1);
  auraGroup.add(aura);

  const burstRingMaterial = new THREE.MeshBasicMaterial({
    color: 0xe3a45d,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const burstRing = new THREE.Mesh(new THREE.RingGeometry(1.4, 1.45, 80), burstRingMaterial);
  burstRing.position.set(0, 0.32, 0.34);
  root.add(burstRing);

  // Static detail is batched by material; this keeps the articulated groups
  // intact while turning hundreds of small parts into a few dozen draws.
  mergeStaticChildren(headGroup, {
    preserve: [...antennae.map((antenna) => antenna.group), needlePivot],
  });
  antennae.forEach((antenna) => mergeStaticChildren(antenna.group));
  mergeStaticChildren(abdomen);
  wings.forEach((wing) => mergeStaticChildren(wing.root));
  mergeStaticChildren(body, {
    preserve: [headGroup, aperture, abdomen, ...sideGearPivots],
  });

  const state = {
    time: 0,
    beatPhase: 0,
    pulse: 0,
    beatHz: 0.7,
  };

  function triggerBurst() {
    state.pulse = 1;
    burstRing.visible = true;
    burstRing.scale.setScalar(0.7);
    burstRingMaterial.opacity = 0.26;
  }

  function update(dt, time, energy = 0, pointer = { x: 0, y: 0 }) {
    state.time = time;
    state.pulse = Math.max(0, state.pulse - dt * 0.5);
    const pulse = state.pulse;
    const breathing = Math.sin(time * 0.33);
    const targetSpeed = 4.25 + breathing * 0.22 + energy * 9.6 + pulse * 3.6;
    state.beatPhase += dt * targetSpeed;
    const beat = state.beatPhase;
    state.beatHz = targetSpeed / TAU;

    const floatY =
      1.82 +
      Math.sin(time * 0.76) * 0.062 +
      Math.sin(time * 1.73) * 0.014 +
      Math.sin(beat * 2) * 0.012 * (0.35 + energy);
    root.position.set(
      Math.sin(time * 0.41) * 0.045 + Math.sin(time * 0.87) * 0.012,
      floatY,
      Math.cos(time * 0.34) * 0.035,
    );
    root.rotation.y =
      -0.56 + Math.sin(time * 0.23) * 0.02 + pointer.x * 0.025 + Math.sin(beat * 0.5) * 0.004;
    root.rotation.x =
      Math.sin(time * 0.47) * 0.011 + pointer.y * 0.012 + Math.sin(beat) * 0.007 * (0.3 + energy);
    root.rotation.z =
      Math.sin(time * 0.36) * 0.011 + Math.sin(beat) * 0.016 * (0.3 + energy * 0.7);

    headGroup.rotation.x =
      0.04 + Math.sin(time * 0.7) * 0.02 + Math.sin(time * 1.63 + 1.2) * 0.006 + pointer.y * 0.04;
    headGroup.rotation.y = 0.075 + pointer.x * 0.08 + Math.sin(time * 0.28) * 0.025;
    headGroup.rotation.z = Math.sin(time * 0.52 + 0.8) * 0.008;

    antennae.forEach((antenna) => {
      antenna.group.rotation.z =
        Math.sin(time * 0.78 + antenna.side) * 0.04 +
        antenna.side * (0.02 + Math.sin(time * 0.31) * 0.01) +
        Math.sin(beat * 0.5 + antenna.side * 0.4) * 0.013;
      antenna.group.rotation.x =
        Math.sin(time * 0.53 + antenna.side * 0.7) * 0.018 + Math.sin(beat * 0.5 + 0.5) * 0.009;
    });

    const amplitude =
      (0.27 + energy * 0.13 + pulse * 0.06) * (0.94 + Math.sin(time * 0.43) * 0.06);
    wings.forEach((wing, index) => {
      const phase = beat + wing.phase;
      // A second harmonic gives the stroke a living, slightly asymmetric beat.
      const flap = Math.sin(phase + Math.sin(phase * 2 + 0.55) * 0.14);
      const feather = Math.cos(phase - 0.38);
      const microFlutter = Math.sin(time * 2.1 + index * 1.7) * 0.0025 * (0.5 + energy);
      wing.pivot.rotation.z =
        wing.rest + flap * amplitude * wing.gain * (wing.side > 0 ? 1 : 0.988) + microFlutter;
      wing.pivot.rotation.x = wing.pitch + feather * 0.06 * wing.gain + Math.sin(phase * 0.5) * 0.01;
      wing.pivot.rotation.y =
        wing.sweep + Math.sin(phase * 0.5 + 0.7) * 0.028 + (wing.side > 0 ? 1 : -1) * 0.005;
    });

    abdomen.rotation.x = -0.34 + Math.sin(time * 0.8 + 0.4) * 0.014 + Math.sin(beat) * 0.008;
    abdomen.rotation.z = Math.sin(time * 0.43) * 0.012;

    sideGears.forEach((gear) => {
      gear.mesh.rotation.z += gear.speed * dt * (1 + energy * 1.8);
    });
    apertureGears.forEach((gear) => {
      gear.mesh.rotation.z += gear.speed * dt * (1 + energy * 2.2);
    });

    const glowPulse = 0.9 + Math.sin(time * 2.1) * 0.08 + energy * 0.4 + pulse * 0.18;
    eyeMaterials.forEach((material) => {
      material.emissiveIntensity = 0.35 * glowPulse;
    });
    eyeIrisMaterials.forEach((material, index) => {
      material.emissiveIntensity =
        1.3 * (0.88 + Math.sin(time * 1.8 + index * 1.4) * 0.1 + energy * 0.35);
    });
    materials.glow.emissiveIntensity = 3.3 * (0.82 + Math.sin(time * 1.8) * 0.08 + energy * 0.3);
    materials.amberGlass.emissiveIntensity = 0.8 * (0.85 + Math.sin(time * 1.3) * 0.12 + energy * 0.35);
    eyeHalos.forEach((halo, index) => {
      halo.material.opacity = 0.14 + Math.sin(time * 2.1 + index * 1.5) * 0.035 + energy * 0.1;
    });
    auraMaterial.opacity = 0.15 + energy * 0.1 + Math.sin(time * 0.9) * 0.022;
    aura.scale.setScalar(1 + Math.sin(time * 0.7) * 0.025);
    aura.scale.x = 5.6 * (1 + Math.sin(time * 0.55) * 0.02);
    aura.scale.y = 3.0 * (1 + Math.sin(time * 0.55 + 1) * 0.02);
    coreLight.intensity = 3.6 * (0.8 + Math.sin(time * 2.2) * 0.08 + energy * 0.4);
    innerGlow.material.opacity = 0.26 + energy * 0.16 + Math.sin(time * 1.4) * 0.03;
    needlePivot.rotation.z = -0.77 + Math.sin(time * 0.55) * 0.08 + energy * 0.42;

    if (pulse > 0.001) {
      const ringT = 1 - pulse;
      burstRing.scale.setScalar(0.7 + ringT * 2.2);
      burstRingMaterial.opacity = pulse * 0.26;
    } else {
      burstRing.visible = false;
      burstRingMaterial.opacity = 0;
    }
  }

  function getMouthWorldPosition(target = new THREE.Vector3()) {
    mouthGlow.getWorldPosition(target);
    return target;
  }

  return {
    group: root,
    update,
    triggerBurst,
    getMouthWorldPosition,
    getBeatHz: () => state.beatHz,
    materials,
  };
}
