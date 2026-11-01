import * as THREE from 'three';

// Pick within a screen-space radius so tiny dots remain usable at any zoom.
export function pickObject({meshes, camera, earth, width, height, x, y, radius = 12}) {
  camera.updateMatrixWorld();
  earth.updateMatrixWorld();
  const raycaster = new THREE.Raycaster();
  let nearest = null;
  let nearestPixels = radius;
  for (const mesh of meshes) {
    if (!mesh.visible) continue;
    const world = mesh.getWorldPosition(new THREE.Vector3());
    const projected = world.clone().project(camera);
    if (projected.z < -1 || projected.z > 1) continue;
    const pixels = Math.hypot((projected.x + 1) * width / 2 - x,
      (1 - projected.y) * height / 2 - y);
    if (pixels > nearestPixels) continue;
    // Test the ray toward the dot itself, preventing picks through Earth.
    raycaster.setFromCamera(new THREE.Vector2(projected.x, projected.y), camera);
    const obstruction = raycaster.intersectObject(earth)[0];
    if (obstruction && obstruction.distance < camera.position.distanceTo(world) - 0.02) continue;
    nearest = mesh;
    nearestPixels = pixels;
  }
  return nearest;
}
