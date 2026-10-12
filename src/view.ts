import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import {
  Game,
  WORLDS,
  rng,
  hashSeed,
  type GameEvent,
  type Platform,
} from "./engine";

type Frog = {
  group: THREE.Group;
  head: THREE.Group;
  legs: THREE.Group[];
  arms: THREE.Group[];
  lids: THREE.Mesh[];
  mouth: THREE.Mesh;
  smile: THREE.Mesh;
  frown: THREE.Mesh;
  shirt: THREE.Mesh;
};
type Particle = {
  mesh: THREE.Mesh;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  max: number;
};
const V = new THREE.Vector3();
const GEO = {
  sphere: new THREE.SphereGeometry(1, 16, 11),
  small: new THREE.SphereGeometry(1, 10, 7),
  box: new THREE.BoxGeometry(1, 1, 1),
  cylinder: new THREE.CylinderGeometry(1, 1, 1, 16),
  cone: new THREE.ConeGeometry(1, 1, 7),
  crystal: new THREE.OctahedronGeometry(1),
  ring: new THREE.TorusGeometry(1, 0.07, 6, 24),
};
const materials = new Map<string, THREE.MeshStandardMaterial>();
function material(color: string, glow = 0, roughness = 0.72) {
  const key = color + glow + roughness;
  if (!materials.has(key))
    materials.set(
      key,
      new THREE.MeshStandardMaterial({
        color,
        roughness,
        metalness: roughness < 0.4 ? 0.22 : 0,
        emissive: color,
        emissiveIntensity: glow,
      }),
    );
  return materials.get(key)!;
}
function shape(
  parent: THREE.Object3D,
  geo: THREE.BufferGeometry,
  color: string,
  x: number,
  y: number,
  z: number,
  sx: number,
  sy = sx,
  sz = sx,
  glow = 0,
) {
  const mesh = new THREE.Mesh(geo, material(color, glow));
  mesh.position.set(x, y, z);
  mesh.scale.set(sx, sy, sz);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}
function ball(
  parent: THREE.Object3D,
  color: string,
  x: number,
  y: number,
  z: number,
  sx: number,
  sy = sx,
  sz = sx,
  glow = 0,
) {
  return shape(parent, GEO.sphere, color, x, y, z, sx, sy, sz, glow);
}
function box(
  parent: THREE.Object3D,
  color: string,
  x: number,
  y: number,
  z: number,
  sx: number,
  sy: number,
  sz: number,
  glow = 0,
) {
  return shape(parent, GEO.box, color, x, y, z, sx, sy, sz, glow);
}
function cylinder(
  parent: THREE.Object3D,
  color: string,
  x: number,
  y: number,
  z: number,
  sx: number,
  sy: number,
  sz = sx,
  glow = 0,
) {
  return shape(parent, GEO.cylinder, color, x, y, z, sx, sy, sz, glow);
}
function group(parent: THREE.Object3D, x = 0, y = 0, z = 0) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  parent.add(g);
  return g;
}

/** Batch static scenery by material. Characters and gameplay objects stay independent. */
function batch(root: THREE.Group) {
  root.updateMatrixWorld(true);
  const byMaterial = new Map<
    THREE.Material,
    { geos: THREE.BufferGeometry[]; shadow: boolean }
  >();
  const inv = root.matrixWorld.clone().invert();
  root.traverse((o) => {
    if (!(o instanceof THREE.Mesh) || !(o.material instanceof THREE.Material))
      return;
    const entry = byMaterial.get(o.material) || { geos: [], shadow: true };
    const geo = o.geometry.clone();
    geo.applyMatrix4(inv.clone().multiply(o.matrixWorld));
    entry.geos.push(geo);
    byMaterial.set(o.material, entry);
  });
  root.clear();
  for (const [mat, entry] of byMaterial) {
    const geo = mergeGeometries(entry.geos, false);
    entry.geos.forEach((g) => g.dispose());
    if (geo) {
      const m = new THREE.Mesh(geo, mat);
      m.castShadow = true;
      m.receiveShadow = true;
      m.userData.batched = true;
      root.add(m);
    }
  }
}
function disposeGroup(root: THREE.Group) {
  root.traverse((o) => {
    if (o instanceof THREE.Mesh && o.userData.batched) o.geometry.dispose();
  });
  root.clear();
}

export function frog(parent: THREE.Object3D, king = false): Frog {
  const g = group(parent),
    skin = king ? "#799b4b" : "#84b94e",
    dark = king ? "#54783d" : "#61943c";
  const shirt = ball(
    g,
    king ? "#655375" : "#528fa0",
    0,
    0.58,
    0,
    0.44,
    0.47,
    0.3,
  );
  ball(g, king ? "#9a7a4c" : "#86b7b9", 0, 0.56, 0.235, 0.32, 0.27, 0.1);
  const legs: THREE.Group[] = [],
    arms: THREE.Group[] = [];
  for (const d of [-1, 1]) {
    const leg = group(g, d * 0.25, 0.23, 0);
    ball(leg, skin, 0, -0.05, 0.02, 0.17, 0.21, 0.19);
    ball(leg, skin, d * 0.04, -0.19, 0.14, 0.24, 0.095, 0.31);
    legs.push(leg);
    const arm = group(g, d * 0.37, 0.78, 0.03);
    ball(arm, dark, d * 0.1, -0.12, 0, 0.15, 0.25, 0.15);
    ball(arm, skin, d * 0.13, -0.28, 0.08, 0.18, 0.14, 0.18);
    arms.push(arm);
  }
  const head = group(g, 0, 1.05, 0.02);
  ball(head, skin, 0, 0.12, 0, 0.59, 0.39, 0.37);
  ball(head, dark, 0, -0.015, 0.24, 0.51, 0.25, 0.2);
  ball(head, skin, 0, 0.07, 0.29, 0.5, 0.23, 0.2);
  const lids: THREE.Mesh[] = [];
  for (const d of [-1, 1]) {
    ball(head, skin, d * 0.255, 0.42, 0.1, 0.285, 0.29, 0.26);
    ball(head, "#f2efd4", d * 0.255, 0.405, 0.255, 0.225, 0.22, 0.095);
    ball(head, "#273e29", d * 0.225, 0.38, 0.347, 0.075, 0.102, 0.033);
    ball(head, "#111f20", d * 0.215, 0.38, 0.371, 0.035, 0.075, 0.013);
    ball(head, "#fff9db", d * 0.23, 0.422, 0.38, 0.021, 0.024, 0.009);
    const lid = ball(head, skin, d * 0.255, 0.53, 0.28, 0.237, 0.113, 0.12);
    lid.rotation.z = d * 0.08;
    lids.push(lid);
  }
  ball(head, "#6c392e", 0, -0.025, 0.427, 0.445, 0.115, 0.085);
  const mouth = ball(head, "#a76342", 0, -0.075, 0.45, 0.45, 0.082, 0.078);
  mouth.rotation.z = 0.04;
  const smile = new THREE.Mesh(
    new THREE.TubeGeometry(
      new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(-0.38, -0.035, 0.515),
        new THREE.Vector3(0, -0.105, 0.52),
        new THREE.Vector3(0.38, 0.015, 0.515),
      ),
      16,
      0.015,
      5,
      false,
    ),
    material("#3e3827"),
  );
  const frown = new THREE.Mesh(
    new THREE.TubeGeometry(
      new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(-0.37, -0.07, 0.515),
        new THREE.Vector3(0, 0.055, 0.52),
        new THREE.Vector3(0.37, -0.07, 0.515),
      ),
      16,
      0.017,
      5,
      false,
    ),
    material("#3e3827"),
  );
  head.add(smile, frown);
  frown.visible = false;
  ball(head, skin, 0.445, 0.017, 0.378, 0.09, 0.08, 0.06);
  if (king) {
    cylinder(head, "#d9ac53", 0, 0.8, 0.04, 0.36, 0.17);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      shape(
        head,
        GEO.cone,
        "#f6d878",
        Math.cos(a) * 0.31,
        1.01,
        0.04 + Math.sin(a) * 0.31,
        0.12,
        0.4,
        0.12,
      );
    }
    ball(head, "#f0846c", 0, 0.85, 0.39, 0.07, 0.08, 0.04, 0.2);
  }
  return { group: g, head, legs, arms, lids, mouth, smile, frown, shirt };
}

function lily(
  parent: THREE.Object3D,
  x: number,
  y: number,
  z: number,
  scale = 1,
  color = "#6eaa57",
  flower = false,
) {
  const g = group(parent, x, y, z);
  cylinder(g, color, 0, 0, 0, scale, 0.11, scale * 0.75);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const vein = box(
      g,
      "#9bb85b",
      Math.cos(a) * scale * 0.42,
      0.063,
      Math.sin(a) * scale * 0.32,
      0.025,
      0.015,
      scale * 0.6,
    );
    vein.rotation.y = -a + Math.PI / 2;
  }
  if (flower) {
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2;
      const petal = ball(
        g,
        "#f1d2af",
        Math.cos(a) * 0.25,
        0.2,
        Math.sin(a) * 0.25,
        0.18,
        0.09,
        0.33,
      );
      petal.rotation.y = -a;
    }
    ball(g, "#eebf64", 0, 0.24, 0, 0.18, 0.14, 0.18, 0.15);
  }
  return g;
}
function reed(
  parent: THREE.Object3D,
  x: number,
  y: number,
  z: number,
  scale: number,
  color: string,
) {
  const g = group(parent, x, y, z);
  g.scale.setScalar(scale);
  for (let i = 0; i < 4; i++) {
    const a = (i - 1.5) * 0.23;
    const leaf = ball(
      g,
      color,
      a * 0.4,
      0.6 + Math.abs(a) * 0.2,
      0,
      0.055,
      0.66,
      0.07,
    );
    leaf.rotation.z = -a;
  }
  cylinder(g, "#8eaa64", 0.12, 1.15, 0, 0.025, 1.5);
  ball(g, "#b79b5d", 0.12, 1.7, 0, 0.08, 0.25, 0.08);
  return g;
}
function mushroom(
  parent: THREE.Object3D,
  x: number,
  y: number,
  z: number,
  size: number,
  color: string,
) {
  const g = group(parent, x, y, z);
  g.scale.setScalar(size);
  cylinder(g, "#d0c39c", 0, 0.5, 0, 0.16, 1);
  ball(g, color, 0, 1.03, 0, 0.67, 0.29, 0.6);
  for (const [a, b] of [
    [-0.3, 0.1],
    [0.24, 0.23],
    [0.12, -0.28],
  ])
    ball(g, "#f0dda5", a, 1.27, b, 0.075, 0.016, 0.07);
  return g;
}
function tree(
  parent: THREE.Object3D,
  x: number,
  y: number,
  z: number,
  size: number,
  color: string,
) {
  const g = group(parent, x, y, z);
  g.scale.setScalar(size);
  const trunk = cylinder(g, "#34554a", 0, 1.6, 0, 0.23, 3.2);
  trunk.rotation.z = 0.12;
  for (const d of [-1, 1]) {
    const branch = cylinder(g, "#34554a", d * 0.42, 2.55, 0, 0.13, 1.5);
    branch.rotation.z = -d * 0.65;
  }
  ball(g, color, -0.7, 3.25, 0, 1.2, 0.85, 0.65);
  ball(g, color, 0.6, 3.5, -0.1, 1.1, 1.2, 0.8);
  ball(g, color, -0.1, 4.1, -0.1, 1.1, 1, 0.7);
}
function crystal(
  parent: THREE.Object3D,
  x: number,
  y: number,
  z: number,
  s: number,
  color: string,
) {
  for (let i = -1; i <= 1; i++) {
    const m = shape(
      parent,
      GEO.crystal,
      color,
      x + i * s * 0.35,
      y + s * 0.8,
      z,
      0.28 * s,
      (1 - Math.abs(i) * 0.25) * s,
      0.32 * s,
      0.17,
    );
    m.rotation.z = -i * 0.22;
  }
}
function beetle(parent: THREE.Object3D, snail = false) {
  const g = group(parent);
  ball(g, snail ? "#cd9975" : "#8b7654", 0, 0.23, 0, 0.51, 0.21, 0.3);
  ball(g, snail ? "#706d9e" : "#364e58", 0, 0.4, -0.05, 0.43, 0.34, 0.32);
  if (snail) {
    const ring = shape(
      g,
      GEO.ring,
      "#b3accc",
      0,
      0.43,
      0.275,
      0.25,
      0.25,
      0.25,
    );
    ring.rotation.z = 0.4;
    for (let i = 0; i < 5; i++) {
      const a = (i / 4) * Math.PI;
      const spike = shape(
        g,
        GEO.cone,
        "#e9dec9",
        Math.cos(a) * 0.42,
        0.43 + Math.sin(a) * 0.34,
        -0.01,
        0.09,
        0.32,
        0.1,
      );
      spike.rotation.z = a - Math.PI / 2;
    }
  } else {
    box(g, "#c69a5f", 0, 0.55, 0.26, 0.055, 0.3, 0.04);
    for (const d of [-1, 1])
      for (let i = 0; i < 3; i++)
        ball(g, "#bb9c6c", d * 0.34, 0.08, (i - 1) * 0.23, 0.17, 0.075, 0.1);
  }
  for (const d of [-1, 1]) {
    ball(g, "#dec597", d * 0.16, 0.49, 0.29, 0.12, 0.13, 0.08);
    ball(g, "#202e2c", d * 0.16, 0.5, 0.362, 0.045, 0.07, 0.02);
  }
  return g;
}
function fly(parent: THREE.Object3D) {
  const g = group(parent);
  ball(g, "#f8d370", 0, 0, 0, 0.13, 0.18, 0.13, 0.65);
  const wings: THREE.Mesh[] = [];
  for (const d of [-1, 1])
    wings.push(
      ball(g, "#faedd0", d * 0.18, 0.12, 0.03, 0.18, 0.055, 0.095, 0.2),
    );
  return g;
}
function powerArt(parent: THREE.Object3D, kind: string) {
  const g = group(parent);
  if (kind === "tea") {
    cylinder(g, "#e8deb2", 0, 0, 0, 0.27, 0.4);
    cylinder(g, "#805d41", 0, 0.215, 0, 0.245, 0.02);
    const handle = shape(g, GEO.ring, "#e8deb2", 0.3, 0.03, 0, 0.16);
    handle.rotation.y = Math.PI / 2;
    mushroom(g, 0, 0.22, 0, 0.45, "#ee9d76");
  } else if (kind === "fire") {
    ball(g, "#f4a354", 0, 0, 0, 0.25, 0.34, 0.21, 0.65);
    for (const d of [-1, 1])
      ball(g, "#ffd27b", d * 0.25, 0.15, 0, 0.24, 0.08, 0.1, 0.4);
    shape(g, GEO.cone, "#fff0a1", 0, 0.38, 0, 0.17, 0.4, 0.17, 0.6);
  } else {
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      const petal = ball(
        g,
        ["#fff0ac", "#d9e893", "#8ce0cf", "#d7b8f0", "#f0b5bd"][i],
        Math.sin(a) * 0.25,
        Math.cos(a) * 0.25,
        0,
        0.14,
        0.32,
        0.1,
        0.4,
      );
      petal.rotation.z = -a;
    }
    ball(g, "#ffe38a", 0, 0, 0.11, 0.17, 0.17, 0.07, 0.5);
  }
  return g;
}

export class View {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.OrthographicCamera(-10, 10, 6, -6, 0.1, 150);
  private scenery = new THREE.Group();
  private entities = new THREE.Group();
  private particles: Particle[] = [];
  private motes = new THREE.Group();
  private reeds = new THREE.Group();
  private ripples = new THREE.Group();
  private player: Frog;
  private hero: Frog;
  private bossModel?: THREE.Group;
  private bossHalo?: THREE.Mesh;
  private entityMap = new Map<number, THREE.Group>();
  private sun: THREE.Mesh;
  private water: THREE.Mesh;
  private key: THREE.DirectionalLight;
  private seenLevel: Game["level"] | undefined;
  private seenTitle = false;
  private cameraX = 6;
  private shake = 0;
  private time = 0;
  private width = 1000;
  private height = 700;
  private quality: "high" | "low" = "high";
  reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  drawCalls = 0;
  fps = 60;
  private frames = 0;
  private frameTime = 0;
  private adaptiveDone = false;
  constructor(
    private canvas: HTMLCanvasElement,
    private onAutoLow: () => void,
  ) {
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      powerPreference: "high-performance",
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.25;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.scene.add(new THREE.HemisphereLight("#f8e6b5", "#314b48", 2.1));
    this.key = new THREE.DirectionalLight("#ffe2a4", 3.1);
    this.key.position.set(-8, 15, 12);
    this.key.castShadow = true;
    this.key.shadow.mapSize.set(1024, 1024);
    this.key.shadow.camera.left = -17;
    this.key.shadow.camera.right = 17;
    this.key.shadow.camera.top = 13;
    this.key.shadow.camera.bottom = -10;
    this.key.shadow.bias = -0.001;
    this.key.shadow.normalBias = 0.06;
    this.scene.add(this.key, this.key.target);
    const rim = new THREE.DirectionalLight("#a7caca", 1.2);
    rim.position.set(8, 6, -8);
    this.scene.add(rim);
    this.scene.add(
      this.scenery,
      this.entities,
      this.motes,
      this.reeds,
      this.ripples,
    );
    this.player = frog(this.scene);
    this.hero = frog(this.scene);
    this.sun = ball(this.scene, "#ffdda0", 0, 7, -30, 3.2, 3.2, 0.4, 1.2);
    this.sun.castShadow = false;
    this.water = box(this.scene, "#3a8277", 0, -0.55, 0, 500, 0.1, 34);
    this.water.material = new THREE.MeshStandardMaterial({
      color: "#356f65",
      roughness: 0.16,
      metalness: 0.55,
    });
    this.water.receiveShadow = true;
    this.water.castShadow = false;
    const rippleMaterial = new THREE.MeshBasicMaterial({
      color: "#9fc9a0",
      transparent: true,
      opacity: 0.16,
      depthWrite: false,
    });
    for (let i = 0; i < 12; i++) {
      const r = new THREE.Mesh(GEO.ring, rippleMaterial);
      r.rotation.x = -Math.PI / 2;
      r.scale.set(1.7 + (i % 3), 0.55, 0.15);
      r.position.set((i % 6) * 5 - 13, -0.485, 3 + Math.floor(i / 6) * 5);
      this.ripples.add(r);
    }
    const random = rng(192);
    for (let i = 0; i < 40; i++) {
      const m = shape(
        this.motes,
        GEO.small,
        "#ffdfa0",
        (random() - 0.5) * 42,
        random() * 9,
        -2 - random() * 10,
        0.022 + random() * 0.018,
        undefined,
        undefined,
        0.9,
      );
      m.userData = { phase: random() * 7, origin: m.position.clone() };
      m.castShadow = false;
    }
    this.resize();
    new ResizeObserver(() => this.resize()).observe(canvas);
    matchMedia("(prefers-reduced-motion: reduce)").addEventListener(
      "change",
      (e) => {
        this.reduced = e.matches;
      },
    );
  }
  resize() {
    this.width = this.canvas.clientWidth;
    this.height = this.canvas.clientHeight;
    this.renderer.setSize(this.width, this.height, false);
    this.renderer.setPixelRatio(
      Math.min(devicePixelRatio, this.quality === "high" ? 1.65 : 1),
    );
  }
  setQuality(q: "low" | "high") {
    this.quality = q;
    this.renderer.shadowMap.enabled = q === "high";
    this.motes.visible = q === "high";
    this.reeds.visible = q === "high";
    this.ripples.visible = q === "high";
    this.resize();
  }
  private theme(world: number) {
    const w = WORLDS[world];
    this.scene.background = new THREE.Color(w.sky);
    this.scene.fog = new THREE.Fog(w.fog, 24, 73);
    (this.water.material as THREE.MeshStandardMaterial).color.set(
      world === 3
        ? "#ba593c"
        : world === 1
          ? "#564679"
          : world === 2
            ? "#cbdcdb"
            : "#356f65",
    );
    (this.water.material as THREE.MeshStandardMaterial).emissive.set(
      world === 3 ? "#a4311b" : "#000000",
    );
    (this.water.material as THREE.MeshStandardMaterial).emissiveIntensity =
      world === 3 ? 0.6 : 0;
    this.water.visible = world !== 2;
    this.sun.visible = world === 0 || world === 2;
    this.key.color.set(
      world === 1 ? "#e0c8ff" : world === 3 ? "#ffbb93" : "#ffe2a4",
    );
  }
  private background(world: number, length: number, seed: number) {
    const w = WORLDS[world],
      random = rng(seed),
      root = group(this.scenery);
    root.userData.background = true;
    for (let i = -3; i < length / 7 + 5; i++) {
      const g = group(root),
        x = i * 7,
        z = -12 - random() * 19,
        size = 0.8 + random() * 0.95;
      g.userData = { min: x - 7, max: x + 7 };
      if (world === 0) {
        tree(g, x, -1, z, size, random() > 0.5 ? "#416954" : "#305949");
        if (i % 3 === 0) mushroom(g, x + 3, -0.1, -7, 2.5, "#ad9c6b");
      }
      if (world === 1) {
        crystal(
          g,
          x,
          0,
          z,
          3 + random() * 5,
          i % 2 === 0 ? "#806c9f" : "#608795",
        );
        shape(g, GEO.cone, "#4c3e5b", x, 10, z, 2, 7, 2).rotation.z = Math.PI;
      }
      if (world === 2) {
        for (let j = 0; j < 4; j++)
          ball(g, "#e5e8d8", x + j, -3 + random() * 4, z, 3, 1.2, 2);
        if (i % 2 === 0) {
          const island = group(g, x, 2 + random() * 5, z);
          shape(island, GEO.cone, "#82989a", 0, -1.5, 0, 2, 3, 1.4).rotation.z =
            Math.PI;
          cylinder(island, "#a4b989", 0, 0, 0, 2, 0.3, 1.4);
          tree(island, 0, 0, 0, 0.6, "#9dad88");
        }
      }
      if (world === 3) {
        const tower = group(g, x, 0, z);
        box(tower, "#57424b", 0, 2.5, 0, 2.8, 9, 2.8);
        for (const d of [-1, 0, 1])
          box(tower, "#66525b", d * 0.95, 7.1, 0, 0.6, 0.9, 3);
        box(tower, "#df8b51", 0, 4, 1.43, 0.5, 1.1, 0.04, 0.8);
        for (let row = 0; row < 6; row++) {
          box(tower, "#493c43", 0, row * 1.2 - 0.6, 1.415, 2.8, 0.035, 0.025);
          box(
            tower,
            "#493c43",
            row % 2 ? -0.65 : 0.65,
            row * 1.2,
            1.415,
            0.035,
            1.15,
            0.025,
          );
        }
      }
      batch(g);
    }
    for (let i = -3; i < length / 18 + 3; i++) {
      const g = group(root),
        x = i * 18;
      g.userData = { min: x - 20, max: x + 20 };
      ball(g, w.dark, x, -1, -36, 18, 6, 5);
      batch(g);
    }
  }
  private terrain(p: Platform, world: number, random: () => number) {
    const w = WORLDS[world],
      g = group(this.scenery, p.x, p.y, 0);
    g.userData = { min: p.x, max: p.x + p.w };
    if (world === 2) {
      ball(g, w.ground, p.w / 2, -1.15, 0, p.w / 2, 1.3, 1.9);
      cylinder(g, w.grass, p.w / 2, -0.12, 0, p.w / 2, 0.24, 1.95);
      for (let i = 1; i < p.w - 1; i += 2.2) {
        const vein = box(g, "#d3dfa0", i, 0.009, 0, 0.025, 0.012, 2.7);
        vein.rotation.y = (i - p.w / 2) * 0.055;
      }
    } else {
      box(g, w.ground, p.w / 2, -p.h / 2 - 0.1, 0, p.w, p.h, 3.6);
      box(g, w.grass, p.w / 2, -0.11, 0, p.w, 0.24, 3.85);
    }
    for (let i = 0.6; i < p.w; i += 1.3) {
      if (world === 2) continue;
      ball(g, w.grass, i, -0.08, 1.65, 0.75, 0.26, 0.34);
      if (i % 3 < 1.35)
        ball(
          g,
          world === 3 ? "#786871" : "#768157",
          i,
          -0.6,
          1.85,
          0.26,
          0.16,
          0.06,
        );
    }
    for (let i = 1; i < p.w - 1; i += 3.5) {
      const z = -1.3,
        scale = 0.5 + random() * 0.6;
      if (world === 1)
        crystal(g, i, 0, z, scale, random() > 0.5 ? "#a7a1d2" : "#74bcb5");
      else if (world === 3) {
        box(g, "#78636c", i, 0.2, z, 0.7, 0.4, 0.6);
        if (i % 7 < 4) {
          cylinder(g, "#574744", i, 0.8, z, 0.08, 1.5);
          ball(g, "#ffb674", i, 1.5, z, 0.17, 0.32, 0.17, 0.8);
        }
      } else {
        reed(g, i, 0, z, scale, world === 2 ? "#84ab65" : "#769859");
        if (i % 7 < 4)
          mushroom(g, i + 0.8, 0, z, 0.42, world === 2 ? "#d4b2b5" : "#deaa76");
      }
    }
    batch(g);
  }
  private block(p: Platform, world = 0) {
    const g = group(this.entities, p.x + 0.5, p.y - 0.5, 0);
    this.entityMap.set(p.id, g);
    if (p.kind === "pipe") {
      g.position.set(p.x + p.w / 2, 0, 0);
      cylinder(g, "#4d8e76", 0, 0.5, 0, 0.86, 1);
      cylinder(g, "#8cb789", 0, 1.03, 0, 0.98, 0.25);
      cylinder(g, "#234438", 0, 1.17, 0, 0.7, 0.02);
      ball(g, "#dce78a", 0, 0.74, 0.865, 0.15, 0.12, 0.02, 0.25);
    } else if (p.kind === "ledge") {
      g.position.set(p.x + p.w / 2, p.y - 0.2, 0);
      if (world === 2) {
        cylinder(g, WORLDS[world].ground, 0, 0, 0, p.w / 2, 0.4, 1.25);
        cylinder(g, WORLDS[world].grass, 0, 0.2, 0, p.w / 2, 0.12, 1.3);
      } else {
        box(g, WORLDS[world].ground, 0, 0, 0, p.w, 0.4, 2.5);
        box(g, WORLDS[world].grass, 0, 0.2, 0, p.w, 0.12, 2.6);
      }
    } else {
      const mystery = p.kind === "mystery";
      box(
        g,
        mystery ? "#d6a341" : "#9c7250",
        0,
        0,
        0,
        0.94,
        0.94,
        0.9,
        mystery ? 0.08 : 0,
      );
      box(g, mystery ? "#f0c968" : "#ba9166", 0, 0, 0.46, 0.78, 0.78, 0.04);
      if (mystery) {
        // A raised question mark assembled as an intentional pixel-art inlay.
        const pixels = [
          [0, 2],
          [1, 2],
          [-1, 2],
          [2, 1],
          [2, 0],
          [1, -1],
          [0, -2],
          [0, -4],
        ];
        for (const [x, y] of pixels)
          box(
            g,
            "#785132",
            x * 0.09,
            y * 0.09 + 0.08,
            0.49,
            0.105,
            0.105,
            0.035,
          );
        for (const d of [-1, 1])
          for (const e of [-1, 1])
            ball(g, "#fff0ac", d * 0.33, e * 0.33, 0.49, 0.028, 0.028, 0.015);
      } else {
        box(g, "#755338", 0, 0, 0.49, 0.96, 0.055, 0.01);
        box(g, "#755338", -0.2, 0.25, 0.49, 0.04, 0.4, 0.01);
        box(g, "#755338", 0.24, -0.25, 0.49, 0.04, 0.4, 0.01);
      }
    }
    return g;
  }
  private makeTitle() {
    disposeGroup(this.scenery);
    disposeGroup(this.entities);
    this.reeds.clear();
    this.entityMap.clear();
    this.theme(0);
    this.background(0, 55, 34);
    const g = group(this.scenery);
    lily(g, 4, -0.06, 1.6, 3.3, "#6e9658");
    lily(g, 7.6, -0.1, -1, 1.7, "#597f52", true);
    lily(g, 1, 0.04, 3.3, 1.5, "#64894e", true);
    lily(g, -3, -0.2, -1.4, 1.3, "#658a4f");
    lily(g, 9, -0.1, 5, 2, "#648f51");
    reed(this.reeds, 7, -0.2, 3, 1.6, "#709054");
    reed(this.reeds, 1, -0.2, 2, 1.3, "#7a9c59");
    mushroom(g, 7.3, -0.1, 2, 1.4, "#d6a873");
    for (let i = 0; i < 7; i++) {
      const f = fly(g);
      f.position.set(2 + i * 0.8, 4.9 + Math.sin(i * 0.6) * 0.75, -0.2);
      f.scale.setScalar(0.9);
    }
    const p = {
      id: 60000,
      x: 8,
      y: 4.1,
      w: 1,
      h: 1,
      kind: "mystery",
      active: true,
      bump: 0,
    } as Platform;
    this.block(p).rotation.y = -0.18;
    batch(g);
    this.hero.group.visible = true;
    this.player.group.visible = false;
    this.bossModel = undefined;
    this.bossHalo = undefined;
  }
  private makeLevel(game: Game) {
    this.theme(game.level.world);
    disposeGroup(this.scenery);
    disposeGroup(this.entities);
    this.reeds.clear();
    this.entityMap.clear();
    this.hero.group.visible = false;
    this.player.group.visible = true;
    this.bossModel = undefined;
    const level = game.level,
      random = rng(hashSeed(game.seed + level.index));
    this.background(level.world, level.length, hashSeed(game.seed));
    for (const p of level.platforms) {
      if (p.kind === "ground") {
        this.terrain(p, level.world, random);
        if (level.world === 0 || level.world === 2)
          reed(this.reeds, p.x + 2.2, 0, -1.15, 0.7, "#8aa362");
      } else this.block(p, level.world);
    }
    if (!level.bonus) {
      const flag = group(this.scenery, level.length, 0, 0);
      cylinder(flag, "#e2d5a4", 0, 2.8, 0, 0.06, 5.6);
      ball(flag, "#f6d074", 0, 5.65, 0, 0.16, 0.16, 0.16, 0.2);
      const cloth = shape(
        flag,
        GEO.box,
        "#dce888",
        0.57,
        4.98,
        0,
        1.05,
        0.65,
        0.055,
      );
      cloth.rotation.z = -0.06;
      lily(flag, 0.55, 5, 0.05, 0.22, "#648448", true);
      cylinder(flag, "#8b9672", 0, 0.12, 0, 0.45, 0.24);
      if (level.index === 7) {
        const prize = group(flag, 0, 6.4, 0);
        for (let i = 0; i < 7; i++) {
          const a = (i / 7) * Math.PI * 2;
          const petal = ball(
            prize,
            "#f7d279",
            Math.cos(a) * 0.37,
            0,
            Math.sin(a) * 0.22,
            0.19,
            0.12,
            0.46,
            0.5,
          );
          petal.rotation.y = -a;
        }
        ball(prize, "#fff1ac", 0, 0.18, 0, 0.2, 0.2, 0.2, 0.8);
      }
      const checkpoint = group(this.scenery, level.checkpoint, 0, -0.55);
      cylinder(checkpoint, "#b7ad7d", 0, 1.1, 0, 0.055, 2.2);
      box(checkpoint, "#415e4e", 0, 2, 0, 0.5, 0.7, 0.5);
      ball(checkpoint, "#fae5a0", 0, 2, 0.12, 0.16, 0.2, 0.15, 0.5);
      const end = group(this.scenery, level.length + 7, 0, -3);
      if (level.world === 3) {
        for (let i = -1; i <= 1; i++)
          box(end, "#574652", i * 2.5, 2.4, 0, 2, 5 + Math.abs(i), 3);
      } else {
        mushroom(end, 0, 0, 0, 3.2, level.world === 1 ? "#a495c2" : "#bd9568");
        box(end, "#516445", 0, 0.7, 1.01, 0.72, 1.4, 0.1);
      }
    }
    for (const e of level.enemies) {
      const g = beetle(this.entities, e.kind === "snail");
      this.entityMap.set(e.id, g);
    }
    if (level.boss) {
      this.bossHalo = shape(
        this.entities,
        GEO.ring,
        "#dcf18e",
        0,
        0.04,
        0,
        2,
        0.8,
        0.7,
        0.85,
      );
      this.bossHalo.rotation.x = -Math.PI / 2;
      this.bossHalo.visible = false;
      for (const x of [level.length - 28.5, level.length - 3]) {
        const marker = group(this.scenery, x, 0, -1.35);
        cylinder(marker, "#70825b", 0, 0.8, 0, 0.19, 1.6);
        ball(marker, "#f0d28a", 0, 1.65, 0, 0.22, 0.24, 0.22, 0.35);
      }
      if (level.world === 0) this.bossModel = beetle(this.entities);
      else if (level.world === 1) this.bossModel = beetle(this.entities, true);
      else this.bossModel = frog(this.entities, level.world === 3).group;
      this.bossModel.scale.setScalar(
        level.world < 2 ? 2.65 : level.world === 3 ? 1.6 : 1.25,
      );
      if (level.world === 2)
        for (const d of [-1, 1])
          ball(this.bossModel, "#e9e4b6", d * 0.95, 0.8, -0.1, 0.9, 0.13, 0.5);
    }
    this.cameraX = game.player.x + 4;
  }
  event(event: GameEvent) {
    if (
      ["bossHit", "slam", "death", "break"].includes(event.type) &&
      !this.reduced
    )
      this.shake = event.type === "slam" ? 0.2 : 0.12;
    if (this.reduced) return;
    if (
      [
        "collect",
        "stomp",
        "break",
        "power",
        "bossHit",
        "bossDefeated",
        "land",
        "checkpoint",
        "won",
      ].includes(event.type)
    ) {
      const count =
        event.type === "bossDefeated" || event.type === "won"
          ? 28
          : event.type === "land"
            ? 5
            : event.type === "collect"
              ? 5
              : 12;
      for (let i = 0; i < count; i++) {
        const c =
          event.type === "break"
            ? "#bb9762"
            : event.type === "power"
              ? ["#dfe9a6", "#efa989", "#a8d9c3"][i % 3]
              : "#f9d991";
        const m = shape(
          this.scene,
          GEO.small,
          c,
          event.x || 0,
          event.y || 0.1,
          0.3,
          0.045 + Math.random() * 0.035,
          undefined,
          undefined,
          0.4,
        );
        this.particles.push({
          mesh: m,
          vx: (Math.random() - 0.5) * 4,
          vy: 1 + Math.random() * 4,
          vz: (Math.random() - 0.5) * 2,
          life: 0.5 + Math.random() * 0.4,
          max: 1,
        });
      }
    }
  }
  render(game: Game, dt: number) {
    const title = game.mode === "title";
    if (title && !this.seenTitle) this.makeTitle();
    if (!title && (this.seenLevel !== game.level || this.seenTitle)) {
      this.makeLevel(game);
      this.seenLevel = game.level;
    }
    this.seenTitle = title;
    const animated =
      game.mode !== "paused" &&
      !["clear", "gameover", "won"].includes(game.mode);
    if (animated && !this.reduced) this.time += dt;
    const t = this.time,
      aspect = this.width / this.height;
    const visibleHeight = title
      ? aspect < 0.85
        ? 18
        : 12
      : Math.max(10.5, 17 / aspect);
    this.camera.left = (-visibleHeight * aspect) / 2;
    this.camera.right = (visibleHeight * aspect) / 2;
    this.camera.top = visibleHeight / 2;
    this.camera.bottom = -visibleHeight / 2;
    this.camera.updateProjectionMatrix();
    if (title) {
      const mobile = aspect < 0.85;
      this.hero.group.position.set(mobile ? 4 : 4.1, 0, 1.6);
      this.hero.group.scale.setScalar(mobile ? 2.55 : 2.75);
      this.hero.group.rotation.y = -0.24;
      this.hero.head.rotation.z = this.reduced ? 0 : Math.sin(t * 0.9) * 0.025;
      this.hero.arms[0].rotation.z = -0.12;
      this.hero.arms[1].rotation.z = 0.25;
      this.hero.group.position.y = this.reduced ? 0 : Math.sin(t * 1.4) * 0.035;
      this.camera.position.set(mobile ? 4.1 : 0, mobile ? 7.8 : 6.2, 23);
      this.camera.lookAt(mobile ? 4.1 : 0, mobile ? 4.7 : 3, 0);
      this.sun.position.set(mobile ? 6 : 6.5, 7.8, -24);
      this.key.position.set(-4, 15, 14);
      this.key.target.position.set(4, 1, 0);
    } else {
      const p = game.player;
      let target = p.x + Math.min(3.2, visibleHeight * aspect * 0.13);
      if (game.mode === "intro" && game.level.boss)
        target = (p.x + game.level.boss.x) / 2;
      this.cameraX +=
        (target - this.cameraX) * (1 - Math.exp(-dt * (this.reduced ? 80 : 5)));
      const cy = aspect < 0.85 ? visibleHeight * 0.22 : 3.3;
      this.shake = Math.max(0, this.shake - dt * 0.8);
      const shake = this.reduced ? 0 : this.shake;
      this.camera.position.set(
        this.cameraX + Math.sin(t * 91) * shake,
        cy + 3.1 + Math.cos(t * 83) * shake,
        23,
      );
      this.camera.lookAt(this.cameraX, cy, 0);
      this.key.position.set(this.cameraX - 10, 15, 12);
      this.key.target.position.set(this.cameraX, 0, 0);
      this.sun.position.set(this.cameraX * 0.9 + 7, 9, -30);
      this.player.group.position.set(p.x, p.y, 0);
      this.player.group.rotation.y = p.facing * 0.24;
      const base = p.power === "small" ? 0.78 : 1.02;
      const stretch = this.reduced
        ? 0
        : p.grounded
          ? -p.squash * 0.13
          : Math.min(0.12, Math.abs(p.vy) * 0.007);
      this.player.group.scale.set(
        base * (1 - stretch * 0.5),
        base * (1 + stretch),
        base,
      );
      const walk = p.grounded
        ? Math.sin(t * 16) * Math.min(Math.abs(p.vx) / 6, 0.65)
        : 0.3;
      this.player.legs[0].rotation.x = walk;
      this.player.legs[1].rotation.x = -walk;
      this.player.arms[0].rotation.x = -walk * 0.7;
      this.player.arms[1].rotation.x = walk * 0.7;
      this.player.head.rotation.z =
        game.mode === "dying" ? -0.2 : p.grin > 0 ? -0.07 : 0;
      this.player.mouth.rotation.z = game.mode === "dying" ? -0.18 : 0.04;
      this.player.smile.visible = game.mode !== "dying";
      this.player.frown.visible = game.mode === "dying";
      this.player.lids.forEach(
        (l) =>
          (l.scale.y =
            game.mode === "dying" ? 0.15 : p.grin > 0 ? 0.09 : 0.113),
      );
      this.player.group.visible =
        game.mode === "dying" ||
        p.invuln <= 0 ||
        this.reduced ||
        Math.floor(t * 12) % 2 === 0;
      this.player.shirt.material = material(
        p.star > 0
          ? ["#d4d88f", "#f4bb97", "#caafe2", "#8fd0c4"][Math.floor(t * 6) % 4]
          : p.power === "fire"
            ? "#c4854f"
            : "#528fa0",
        p.star > 0 ? 0.35 : 0,
      );
      for (const g of this.scenery.children) {
        if (g.userData.background) {
          for (const part of g.children)
            part.visible =
              part.userData.max > this.cameraX - 30 &&
              part.userData.min < this.cameraX + 30;
        } else if (g.userData.min !== undefined)
          g.visible =
            g.userData.max > this.cameraX - 22 &&
            g.userData.min < this.cameraX + 22;
      }
      for (const b of game.level.platforms) {
        const g = this.entityMap.get(b.id);
        if (!g) continue;
        g.visible = b.active && Math.abs(b.x - this.cameraX) < 24;
        if (b.kind === "used" && g.userData.kind !== "used") {
          g.children.forEach((o) => {
            if (o instanceof THREE.Mesh) o.material = material("#8f8a64");
          });
          g.userData.kind = "used";
        }
        if (["mystery", "brick", "used"].includes(b.kind))
          g.position.y = b.y - 0.5 + Math.sin((b.bump / 0.22) * Math.PI) * 0.2;
      }
      for (const item of game.level.pickups) {
        let g = this.entityMap.get(item.id);
        if (!g && item.active) {
          g =
            item.kind === "fly"
              ? fly(this.entities)
              : powerArt(this.entities, item.kind);
          this.entityMap.set(item.id, g);
        }
        if (g) {
          g.visible = item.active && Math.abs(item.x - this.cameraX) < 22;
          g.position.set(
            item.x,
            item.y + (this.reduced ? 0 : Math.sin(t * 3 + item.id) * 0.065),
            0,
          );
          if (item.kind !== "fly") g.rotation.y = this.reduced ? 0 : t;
        }
      }
      for (const e of game.level.enemies) {
        const g = this.entityMap.get(e.id);
        if (g) {
          g.visible = e.alive && Math.abs(e.x - this.cameraX) < 24;
          g.position.set(e.x, e.y, 0);
          g.rotation.z = this.reduced ? 0 : Math.sin(t * 8 + e.id) * 0.025;
        }
      }
      const b = game.level.boss;
      if (b && this.bossModel) {
        if (this.bossHalo) {
          this.bossHalo.visible = b.hp > 0 && b.phase === "rest";
          this.bossHalo.position.set(b.x, 0.06, 0);
        }
        this.bossModel.visible = b.hp > 0;
        this.bossModel.position.set(b.x, b.y, 0);
        if (game.level.world === 3)
          this.bossModel.scale.y = b.phase === "rest" ? 1.25 : 1.6;
        this.bossModel.rotation.z = this.reduced
          ? 0
          : b.phase === "windup"
            ? Math.sin(t * 25) * 0.04
            : b.phase === "rest"
              ? Math.sin(t * 3) * 0.04
              : 0;
        this.bossModel.traverse((o) => {
          if (o instanceof THREE.Mesh)
            o.visible =
              b.hit <= 0 || this.reduced || Math.floor(t * 12) % 2 === 0;
        });
      }
      const liveShots = new Set(game.shots.map((s) => s.id));
      for (const [id, g] of this.entityMap)
        if (g.userData.shot && !liveShots.has(id)) {
          this.entities.remove(g);
          this.entityMap.delete(id);
        }
      for (const s of game.shots) {
        let g = this.entityMap.get(s.id);
        if (!g) {
          g = group(this.entities);
          ball(
            g,
            s.enemy ? "#dd85ac" : "#ffbe55",
            0,
            0,
            0,
            s.size,
            s.size,
            s.size,
            0.8,
          );
          g.userData.shot = true;
          this.entityMap.set(s.id, g);
        }
        g.position.set(s.x, s.y, 0.1);
      }
      this.motes.position.x = this.cameraX;
      this.ripples.position.x = this.cameraX;
    }
    for (const r of this.reeds.children) {
      r.visible = title || Math.abs(r.position.x - this.cameraX) < 22;
      r.rotation.z = this.reduced ? 0 : Math.sin(t * 1.3 + r.position.x) * 0.04;
    }
    if (!this.reduced)
      for (let i = 0; i < this.ripples.children.length; i++)
        this.ripples.children[i].scale.x =
          1.7 + (i % 3) + Math.sin(t * 0.7 + i) * 0.15;
    this.ripples.visible =
      this.quality === "high" &&
      (title || game.level.world === 0 || game.level.world === 1);
    if (!this.reduced)
      for (const m of this.motes.children) {
        const o = m.userData.origin as THREE.Vector3;
        m.position.set(
          o.x + Math.sin(t * 0.3 + m.userData.phase) * 0.6,
          o.y + Math.sin(t * 0.6 + m.userData.phase) * 0.25,
          o.z,
        );
      }
    if (animated)
      for (const p of this.particles) {
        p.life -= dt;
        p.vy -= 8 * dt;
        p.mesh.position.add(V.set(p.vx * dt, p.vy * dt, p.vz * dt));
        p.mesh.scale.multiplyScalar(Math.pow(0.45, dt));
        if (p.life <= 0) this.scene.remove(p.mesh);
      }
    this.particles = this.particles.filter((p) => p.life > 0);
    this.renderer.render(this.scene, this.camera);
    this.drawCalls = this.renderer.info.render.calls;
    this.frameTime += dt;
    this.frames++;
    if (this.frameTime >= 3) {
      this.fps = this.frames / this.frameTime;
      if (
        !title &&
        !this.adaptiveDone &&
        this.quality === "high" &&
        this.fps < 43
      ) {
        this.adaptiveDone = true;
        this.setQuality("low");
        this.onAutoLow();
      }
      this.frameTime = 0;
      this.frames = 0;
    }
  }
}
