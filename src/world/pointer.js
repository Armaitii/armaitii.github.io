import * as THREE from 'three';

/**
 * pointer.js — tracks the mouse / touch and answers one question per frame:
 * "where on the terrain plane is the cursor?"
 * Returns smoothed target coords for lossField.updateCursor + parallax NDC.
 */

const PLANE = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const RAY = new THREE.Raycaster();
const NDC = new THREE.Vector2();
const HIT = new THREE.Vector3();

export function createPointer(getCamera, getView) {
  const state = {
    clientX: 0, clientY: 0,
    on: false,      // pointer currently over the page
    ndcX: 0, ndcY: 0,
    wx: 0, wz: 0,   // last world hit (plane y=0)
    seen: false,
  };

  const onMove = (e) => {
    state.clientX = e.clientX;
    state.clientY = e.clientY;
    state.on = true;
    state.seen = true;
  };
  const onLeave = () => { state.on = false; };
  const onDown = (e) => { state.on = true; state.clientX = e.clientX; state.clientY = e.clientY; };

  window.addEventListener('pointermove', onMove, { passive: true });
  window.addEventListener('pointerdown', onDown, { passive: true });
  document.documentElement.addEventListener('pointerleave', onLeave);
  document.addEventListener('visibilitychange', () => { if (document.hidden) state.on = false; });

  /** Compute world hit on the terrain plane; call once per frame. */
  state.solve = () => {
    if (!state.on) return false;
    const { w, h } = getView();
    if (w < 2 || h < 2) return false;
    state.ndcX = (state.clientX / w) * 2 - 1;
    state.ndcY = -(state.clientY / h) * 2 + 1;
    NDC.set(state.ndcX, state.ndcY);
    RAY.setFromCamera(NDC, getCamera());
    if (RAY.ray.intersectPlane(PLANE, HIT)) {
      state.wx = HIT.x;
      state.wz = HIT.z;
      return true;
    }
    return false;
  };

  state.dispose = () => {
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerdown', onDown);
    document.documentElement.removeEventListener('pointerleave', onLeave);
  };

  return state;
}
