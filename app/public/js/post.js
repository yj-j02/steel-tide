/**
 * Steel Tide — post-processing: HDR render target with 4x MSAA, gentle bloom (muzzle flashes, fires, sun glint),
 * ACES filmic tone mapping and a light grade + vignette. Toggle in settings; off = the old direct render.
 */
import { THREE, renderer, scene, camera, ovScene, ovCam, U } from "./core.js";
import { EffectComposer } from "/vendor/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "/vendor/addons/postprocessing/RenderPass.js";
import { ShaderPass } from "/vendor/addons/postprocessing/ShaderPass.js";
import { UnrealBloomPass } from "/vendor/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "/vendor/addons/postprocessing/OutputPass.js";

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
