/**
 * Steel Tide — post-processing: HDR render target with 4x MSAA, gentle bloom (muzzle flashes, fires, sun glint),
 * ACES filmic tone mapping and a light grade + vignette. Toggle in settings; off = the old direct render.
 */
import { THREE, renderer, scene, camera, ovScene, ovCam, U, sky, sea, seaPatch } from "./core.js";
import { EffectComposer } from "../vendor/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "../vendor/addons/postprocessing/RenderPass.js";
import { ShaderPass } from "../vendor/addons/postprocessing/ShaderPass.js";
import { UnrealBloomPass } from "../vendor/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "../vendor/addons/postprocessing/OutputPass.js";

const rt = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 4 });
const composer = new EffectComposer(renderer, rt);
const main = new RenderPass(scene, camera), over = new RenderPass(ovScene, ovCam); over.clear = false; over.clearDepth = true;
const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.3, 0.45, 0.86);
const grade = new ShaderPass({
  uniforms: { tDiffuse: { value: null }, vig: { value: 0.3 } },
  vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
  fragmentShader: `uniform sampler2D tDiffuse; uniform float vig; varying vec2 vUv;
    void main(){ vec4 c = texture2D(tDiffuse, vUv); vec3 col = c.rgb;
      float l = dot(col, vec3(0.299, 0.587, 0.114)); col = mix(vec3(l), col, 1.03);   // a touch more saturation
      col = (col - 0.5) * 1.05 + 0.5;                                                // and contrast
      vec2 d = vUv - 0.5; col *= 1.0 - vig * smoothstep(0.35, 0.85, length(d * vec2(1.25, 1.0)));
      gl_FragColor = vec4(clamp(col, 0.0, 1.0), c.a); }`,
});
composer.addPass(main); composer.addPass(over); composer.addPass(bloom); composer.addPass(new OutputPass()); composer.addPass(grade);
export const post = { on: true };
try { post.on = localStorage.getItem("steeltide:post") !== "0"; } catch {}
let mode = null;
// Neutral tone mapping keeps the hand-tuned sky and sea colours.
function setMode(on) { if (mode === on) return; mode = on; renderer.toneMapping = on ? THREE.NeutralToneMapping : THREE.NoToneMapping; renderer.toneMappingExposure = 1.0; U.uLin.value = on ? 1 : 0; }
function fit() { composer.setPixelRatio(renderer.getPixelRatio()); composer.setSize(innerWidth, innerHeight); }
addEventListener("resize", fit); fit();
/** Draw the world, then the first-person overlay scene (cockpit, gun view models) when `overlay`. */
export function renderFrame(overlay) {
  setMode(post.on);
  if (post.on) { over.enabled = overlay; composer.render(); return; }
  renderer.render(scene, camera);
  if (overlay) { renderer.autoClear = false; renderer.clearDepth(); renderer.render(ovScene, ovCam); renderer.autoClear = true; }
}
const _sv = new THREE.Vector3(), _ev = new THREE.Vector3(), _pv = new THREE.Vector3(), PSTEP = 2800 / 256;
let _rt = null, _px = null, _img = null;
/** Render camera `cam` into a small 2D canvas (fd: { ctx, w, h }) through an off-screen target: used by the CIC big view's two EO/IR monitors, which sit outside the shrunken battle canvas. */
export function renderToCanvas(cam, fd) {
  const w = fd.w, h = fd.h; if (!cam || !fd.ctx) return;
  if (!_rt || _rt.width !== w || _rt.height !== h) { _rt?.dispose(); _rt = new THREE.WebGLRenderTarget(w, h, { depthBuffer: true }); _rt.texture.colorSpace = THREE.SRGBColorSpace; _px = new Uint8Array(w * h * 4); _img = new ImageData(w, h); }
  cam.aspect = w / h; cam.updateProjectionMatrix();
  _sv.copy(sky.position); _ev.copy(sea.position); _pv.copy(seaPatch.position);
  const p = cam.position; sky.position.copy(p); sea.position.set(p.x, 0, p.z); seaPatch.position.set(Math.round(p.x / PSTEP) * PSTEP, 0, Math.round(p.z / PSTEP) * PSTEP);
  const prevTm = renderer.toneMapping, prevLin = U.uLin.value; U.uLin.value = 0; renderer.toneMapping = THREE.NoToneMapping;
  renderer.setRenderTarget(_rt); renderer.clear(); renderer.render(scene, cam); renderer.readRenderTargetPixels(_rt, 0, 0, w, h, _px); renderer.setRenderTarget(null);
  U.uLin.value = prevLin; renderer.toneMapping = prevTm; sky.position.copy(_sv); sea.position.copy(_ev); seaPatch.position.copy(_pv);
  const d = _img.data, row = w * 4; for (let y = 0; y < h; y++) d.set(_px.subarray((h - 1 - y) * row, (h - y) * row), y * row); /* WebGL rows are bottom-up */
  fd.ctx.putImageData(_img, 0, 0);
}
/** Render a secondary EO/IR PiP viewport onto the main framebuffer inside `rect` (DOMRect). */
export function renderPiP(pipCam, rect) {
  if (!pipCam || !rect || rect.width < 12 || rect.height < 12) return;
  const x = Math.round(rect.left), y = Math.round(window.innerHeight - rect.bottom), w = Math.round(rect.width), h = Math.round(rect.height);
  if (w <= 0 || h <= 0) return;
  pipCam.aspect = w / h; pipCam.updateProjectionMatrix();
  _sv.copy(sky.position); _ev.copy(sea.position); _pv.copy(seaPatch.position);
  const p = pipCam.position;
  sky.position.copy(p); sea.position.set(p.x, 0, p.z); seaPatch.position.set(Math.round(p.x / PSTEP) * PSTEP, 0, Math.round(p.z / PSTEP) * PSTEP);
  const prevTm = renderer.toneMapping, prevLin = U.uLin.value;
  U.uLin.value = 0; renderer.toneMapping = THREE.NoToneMapping;
  renderer.setRenderTarget(null);
  renderer.setScissorTest(true); renderer.setScissor(x, y, w, h); renderer.setViewport(x, y, w, h);
  renderer.autoClear = false; renderer.clearDepth(); renderer.render(scene, pipCam); renderer.autoClear = true;
  renderer.setScissorTest(false); renderer.setViewport(0, 0, window.innerWidth, window.innerHeight);
  U.uLin.value = prevLin; renderer.toneMapping = prevTm;
  sky.position.copy(_sv); sea.position.copy(_ev); seaPatch.position.copy(_pv);
}
