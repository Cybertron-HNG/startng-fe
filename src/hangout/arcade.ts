// The arcade (Ziki #41): a row of machines in the park, one start.ng game each. Walk up to one and press play to open
// the game; the park stays where you left it, in its own tab. The machines stand in an arc between the outer benches
// (16.8 m out) and the first trees (21 m), facing the middle, so they never block the path or a seat.
import * as THREE from "three";
import type { Game } from "../games";

export const ARCADE_MACHINES = 6;
const RADIUS = 19.4;
const MIDDLE = Math.PI * 1.5; // the arc's middle, opposite where the camera starts on a fresh visit
const GAP = 0.105; // radians between machines: about 2 m apart
const REACH = 1.7; // how close (in front) you have to be to play
const BODY_RADIUS = 0.55; // for walking into them: a circle around each machine

type Machine = { x: number; z: number; ry: number; screen: THREE.MeshStandardMaterial; game: Game | null };

/** The machine's screen: the game's own colours and its name, drawn here (game covers are on other addresses, and a
 * picture from another address can't be used in WebGL without CORS headers the game hosts don't send). */
function screenTexture(game: Game | null): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 192;
  const g = c.getContext("2d")!;
  const [a, b] = game ? game.colors : ["#33342c", "#292a23"];
  const grad = g.createLinearGradient(0, 0, 256, 192);
  grad.addColorStop(0, a);
  grad.addColorStop(1, b);
  g.fillStyle = grad;
  g.fillRect(0, 0, 256, 192);
  g.fillStyle = "rgba(0, 0, 0, .28)";
  g.fillRect(0, 128, 256, 64);
  g.fillStyle = "#fff";
  g.textAlign = "center";
  g.font = "900 64px system-ui, sans-serif";
  g.fillText(game ? game.title.charAt(0) : "?", 128, 92);
  g.font = "700 22px system-ui, sans-serif";
  let title = game ? game.title : "Soon";
  while (g.measureText(title).width > 236 && title.length > 3) title = title.slice(0, -2) + "…";
  g.fillText(title, 128, 168);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function outOfCircle(x: number, z: number, r: number, cx: number, cz: number, cr: number): [number, number] {
  const dx = x - cx, dz = z - cz;
  const d = Math.hypot(dx, dz);
  const min = r + cr;
  if (d >= min) return [x, z];
  if (d < 1e-6) return [cx + min, z];
  return [cx + (dx / d) * min, cz + (dz / d) * min];
}

/** Adds the machines to the scene. setGames fills their screens; near(x, z) is the machine in reach, if any. */
export function buildArcade(scene: THREE.Scene) {
  const body = new THREE.MeshStandardMaterial({ color: "#2b2d3a", roughness: 0.55, metalness: 0.2 });
  const trim = new THREE.MeshStandardMaterial({ color: "#d8fd71", emissive: "#d8fd71", emissiveIntensity: 0.35, roughness: 0.4 });
  const machines: Machine[] = [];
  const textures: THREE.Texture[] = [];
  for (let i = 0; i < ARCADE_MACHINES; i++) {
    const a = MIDDLE + (i - (ARCADE_MACHINES - 1) / 2) * GAP;
    const x = Math.cos(a) * RADIUS, z = Math.sin(a) * RADIUS;
    const ry = Math.atan2(-x, -z); // +z faces the middle
    const m = new THREE.Group();
    const cabinet = new THREE.Mesh(new THREE.BoxGeometry(0.86, 1.86, 0.72), body);
    cabinet.position.y = 0.93;
    const marquee = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.2, 0.06), trim);
    marquee.position.set(0, 1.76, 0.36);
    const deck = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.08, 0.32), body);
    deck.position.set(0, 0.98, 0.46);
    deck.rotation.x = 0.25;
    const screen = new THREE.MeshStandardMaterial({ map: screenTexture(null), emissive: "#ffffff", emissiveMap: null, emissiveIntensity: 0.25, roughness: 0.3 });
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(0.68, 0.51), screen);
    glass.position.set(0, 1.36, 0.37);
    glass.rotation.x = -0.12;
    m.add(cabinet, marquee, deck, glass);
    m.traverse((o) => { o.castShadow = o.receiveShadow = true; });
    m.position.set(x, 0, z);
    m.rotation.y = ry;
    scene.add(m);
    machines.push({ x, z, ry, screen, game: null });
  }

  // "ARCADE" over the middle of the row, so it's easy to find from the path.
  const sign = document.createElement("canvas");
  sign.width = 512;
  sign.height = 96;
  const s = sign.getContext("2d")!;
  s.fillStyle = "#292a23";
  s.fillRect(0, 0, 512, 96);
  s.fillStyle = "#d8fd71";
  s.font = "900 64px system-ui, sans-serif";
  s.textAlign = "center";
  s.fillText("ARCADE", 256, 72);
  const signTex = new THREE.CanvasTexture(sign);
  signTex.colorSpace = THREE.SRGBColorSpace;
  textures.push(signTex);
  const board = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.5), new THREE.MeshStandardMaterial({ map: signTex, emissive: "#ffffff", emissiveMap: signTex, emissiveIntensity: 0.5, side: THREE.DoubleSide }));
  const ma = MIDDLE, sx = Math.cos(ma) * (RADIUS + 0.6), sz = Math.sin(ma) * (RADIUS + 0.6);
  board.position.set(sx, 2.75, sz);
  board.rotation.y = Math.atan2(-sx, -sz);
  const posts = new THREE.MeshStandardMaterial({ color: "#2f3a2c", roughness: 0.5, metalness: 0.4 });
  for (const side of [-1, 1]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 3, 6), posts);
    post.position.set(sx + Math.cos(ma + Math.PI / 2) * 1.25 * side, 1.5, sz + Math.sin(ma + Math.PI / 2) * 1.25 * side);
    post.castShadow = true;
    scene.add(post);
  }
  scene.add(board);

  return {
    /** Up to ARCADE_MACHINES games, most played first. Machines without a game say "Soon". */
    setGames(games: Game[]) {
      machines.forEach((m, i) => {
        m.game = games[i] ?? null;
        m.screen.map?.dispose();
        const tex = screenTexture(m.game);
        m.screen.map = tex;
        m.screen.emissiveMap = tex;
        m.screen.needsUpdate = true;
      });
    },
    /** The machine you're standing at (in front of it, within reach), with a game on it. */
    near(x: number, z: number): Game | null {
      let best: Machine | null = null;
      let bestD = REACH;
      for (const m of machines) {
        const d = Math.hypot(x - m.x, z - m.z);
        // in front: the player is on the side the screen faces (towards the middle)
        const front = (x - m.x) * Math.sin(m.ry) + (z - m.z) * Math.cos(m.ry) > 0;
        if (m.game && front && d < bestD) { best = m; bestD = d; }
      }
      return best?.game ?? null;
    },
    /** Push a player out of the machines (like benches and trees in world.ts). */
    collide(x: number, z: number, r: number): { x: number; z: number } {
      for (const m of machines) {
        if (Math.abs(x - m.x) < 1.5 && Math.abs(z - m.z) < 1.5) [x, z] = outOfCircle(x, z, r, m.x, m.z, BODY_RADIUS);
      }
      return { x, z };
    },
    dispose() {
      for (const m of machines) m.screen.map?.dispose();
      for (const t of textures) t.dispose();
    },
  };
}

/** The games the arcade shows: the most played in the last 7 days, never the Hangout itself. */
export function arcadeGames(games: Game[]): Game[] {
  return games.filter((g) => g.slug !== "hangout").sort((a, b) => b.plays - a.plays).slice(0, ARCADE_MACHINES);
}


