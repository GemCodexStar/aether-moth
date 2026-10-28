import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const KEEP_ATTRIBUTES = new Set(['position', 'normal', 'uv']);

export function mergeStaticChildren(root, { preserve = [] } = {}) {
  root.updateWorldMatrix(true, true);
  const inverseRoot = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const preserved = new Set(preserve);
  const meshes = [];

  function collect(parent) {
    parent.children.forEach((child) => {
      if (preserved.has(child)) return;
      if (child.isMesh && !child.isInstancedMesh && !child.isSkinnedMesh) {
        meshes.push(child);
        return;
      }
      if (!child.isSprite && !child.isPoints && !child.isLight) collect(child);
    });
  }
  collect(root);

  const byMaterial = new Map();
  meshes.forEach((mesh) => {
    if (!mesh.material || Array.isArray(mesh.material)) return;
    const list = byMaterial.get(mesh.material);
    if (list) list.push(mesh);
    else byMaterial.set(mesh.material, [mesh]);
  });

  const merged = [];
  const remove = [];
  byMaterial.forEach((list, material) => {
    if (list.length < 2) return;
    const geometries = [];
    list.forEach((mesh) => {
      mesh.updateWorldMatrix(true, false);
      const matrix = new THREE.Matrix4().multiplyMatrices(inverseRoot, mesh.matrixWorld);
      const source = mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry.clone();
      Object.keys(source.attributes).forEach((name) => {
        if (!KEEP_ATTRIBUTES.has(name)) source.deleteAttribute(name);
      });
      if (!source.getAttribute('normal')) source.computeVertexNormals();
      if (!source.getAttribute('uv')) {
        const count = source.getAttribute('position').count;
        source.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(count * 2), 2));
      }
      source.clearGroups();
      source.applyMatrix4(matrix);
      geometries.push(source);
    });

    const geometry = mergeGeometries(geometries, false);
    geometries.forEach((item) => item.dispose());
    if (!geometry) return;

    geometry.computeBoundingSphere();
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    root.add(mesh);
    merged.push(mesh);
    remove.push(...list);
  });

  remove.forEach((mesh) => mesh.removeFromParent());
  return { merged: merged.length, removed: remove.length };
}
