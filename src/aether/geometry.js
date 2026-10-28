import * as THREE from 'three';

export function createGearGeometry({
  radius = 1,
  teeth = 18,
  toothDepth = 0.13,
  thickness = 0.1,
  lighteningHoles = 5,
} = {}) {
  const shape = new THREE.Shape();
  const step = (Math.PI * 2) / teeth;
  const root = radius;
  const tip = radius + toothDepth;

  for (let i = 0; i < teeth; i += 1) {
    const a = i * step;
    const points = [
      [a - step * 0.5, root],
      [a - step * 0.22, root],
      [a - step * 0.14, tip],
      [a + step * 0.14, tip],
      [a + step * 0.22, root],
    ];
    points.forEach(([angle, r], index) => {
      const x = Math.cos(angle) * r;
      const y = Math.sin(angle) * r;
      if (i === 0 && index === 0) shape.moveTo(x, y);
      else shape.lineTo(x, y);
    });
  }
  shape.closePath();

  const hub = new THREE.Path();
  hub.absarc(0, 0, radius * 0.17, 0, Math.PI * 2, true);
  shape.holes.push(hub);

  if (lighteningHoles > 0 && radius > 0.34) {
    const orbit = radius * 0.55;
    const holeRadius = radius * (lighteningHoles > 4 ? 0.115 : 0.15);
    for (let i = 0; i < lighteningHoles; i += 1) {
      const angle = (i / lighteningHoles) * Math.PI * 2 + step * 0.5;
      const hole = new THREE.Path();
      hole.absarc(
        Math.cos(angle) * orbit,
        Math.sin(angle) * orbit,
        holeRadius,
        0,
        Math.PI * 2,
        true,
      );
      shape.holes.push(hole);
    }
  }

  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: thickness,
    bevelEnabled: true,
    bevelThickness: thickness * 0.14,
    bevelSize: Math.min(0.016, radius * 0.018),
    bevelSegments: 1,
    curveSegments: 8,
    steps: 1,
  });
  geometry.translate(0, 0, -thickness * 0.5);
  geometry.computeVertexNormals();
  return geometry;
}

export function createRivetPositions(count, radius, offset = 0) {
  return Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * Math.PI * 2 + offset;
    return new THREE.Vector3(Math.cos(angle) * radius, Math.sin(angle) * radius, 0);
  });
}
