// Tree system - procedural low-poly trees, planted per terrain chunk
// Trees are generated per chunk from a seeded RNG (same trees on revisit and for
// every player) and sit on the rendered ground surface. Each tree type has a few
// procedurally built model variants. Trees near the player are 3D (one shared
// InstancedMesh per model, casting shadows); beyond the LOD distance they become
// flat camera-facing sprites - a deliberate style - drawn from an atlas of the
// same models rendered once at startup.
// Uses Systems registry pattern for organized update loop

const TreeSystem = {
    init() {
        // Trees are set up after terrain is ready, called from core.js
    },

    update(delta) {
        if (treeMaterial && treeMaterial.userData.shader) {
            treeMaterial.userData.shader.uniforms.time.value += delta;
        }
        // Cheap unless chunks changed or the player crossed into another chunk
        updateTreeLOD();
    },

    // Throttled LOD update (called separately for performance)
    updateLOD() {
        updateTreeLOD();
    }
};

// Register with Systems registry
if (typeof Systems !== 'undefined') {
    Systems.register('trees', TreeSystem);
}

// ============================================================================
// Geometry helpers - every part is non-indexed, flat-shaded, vertex-colored
// ============================================================================

const _up = new THREE.Vector3(0, 1, 0);

function makeRngTrees(seed) {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6D2B79F5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

// Deterministic per-position jitter so shared vertices of a solid move together
function jitterGeometry(geometry, amount, seed) {
    const pos = geometry.attributes.position;
    for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
        const h = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719 + seed) * 43758.5453;
        const f = (h - Math.floor(h)) - 0.5;
        const k = 1 + f * amount * 2;
        pos.setXYZ(i, x * k, y * (1 + f * amount), z * k);
    }
    return geometry;
}

// Collects parts of one tree model and merges them into a single geometry
class TreeModel {
    constructor(r) {
        this.r = r;
        this.parts = [];
    }

    // Add a geometry with a base color; shade darkens toward the bottom of the part
    add(geometry, color, { position, quaternion, scale, jitter, shade = 0.3, faceVar = 0.08 } = {}) {
        let g = geometry.index ? geometry.toNonIndexed() : geometry;
        if (jitter) jitterGeometry(g, jitter, this.r() * 100);
        const m = new THREE.Matrix4().compose(
            position || new THREE.Vector3(),
            quaternion || new THREE.Quaternion(),
            scale || new THREE.Vector3(1, 1, 1)
        );
        g.applyMatrix4(m);
        g.computeVertexNormals();

        const pos = g.attributes.position;
        g.computeBoundingBox();
        const minY = g.boundingBox.min.y, span = Math.max(0.001, g.boundingBox.max.y - minY);
        const base = new THREE.Color(color);
        const colors = new Float32Array(pos.count * 3);
        for (let f = 0; f < pos.count; f += 3) {
            const fv = 1 + (this.r() - 0.5) * 2 * faceVar;
            for (let v = f; v < f + 3 && v < pos.count; v++) {
                const t = (pos.getY(v) - minY) / span;
                const k = (1 - shade + shade * t) * fv;
                colors[v * 3] = base.r * k;
                colors[v * 3 + 1] = base.g * k;
                colors[v * 3 + 2] = base.b * k;
            }
        }
        g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        g.deleteAttribute('uv');
        this.parts.push(g);
        return this;
    }

    // Cylinder between two points (trunks, branches, roots)
    limb(from, to, rBottom, rTop, color, segs = 6, opts = {}) {
        const dir = new THREE.Vector3().subVectors(to, from);
        const len = dir.length();
        const g = new THREE.CylinderGeometry(rTop, rBottom, len, segs, 1);
        g.translate(0, len / 2, 0);
        const q = new THREE.Quaternion().setFromUnitVectors(_up, dir.normalize());
        return this.add(g, color, { position: from, quaternion: q, shade: 0.25, ...opts });
    }

    // Jittered blob of foliage
    clump(center, radius, color, detail = 1, squash = 0.8, opts = {}) {
        const g = new THREE.IcosahedronGeometry(1, detail);
        return this.add(g, color, {
            position: center,
            scale: new THREE.Vector3(radius, radius * squash, radius),
            jitter: 0.18,
            shade: 0.45,
            ...opts
        });
    }

    merge() {
        let count = 0;
        for (const p of this.parts) count += p.attributes.position.count;
        const position = new Float32Array(count * 3);
        const normal = new Float32Array(count * 3);
        const color = new Float32Array(count * 3);
        let offset = 0;
        let top = 0;
        for (const p of this.parts) {
            position.set(p.attributes.position.array, offset * 3);
            normal.set(p.attributes.normal.array, offset * 3);
            color.set(p.attributes.color.array, offset * 3);
            offset += p.attributes.position.count;
            p.computeBoundingBox();
            top = Math.max(top, p.boundingBox.max.y);
            p.dispose();
        }
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.BufferAttribute(position, 3));
        g.setAttribute('normal', new THREE.BufferAttribute(normal, 3));
        g.setAttribute('color', new THREE.BufferAttribute(color, 3));
        g.computeBoundingSphere();
        g.userData.height = top;
        return g;
    }
}

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const range = (r, a, b) => a + r() * (b - a);
const pick = (r, list) => list[Math.floor(r() * list.length)];

// A slightly crooked trunk as a chain of limbs; returns the top point
function crookedTrunk(m, height, rBottom, rTop, color, bend, steps, segs) {
    const r = m.r;
    let p = V(0, -0.5, 0);
    const lean = V(range(r, -1, 1), 0, range(r, -1, 1)).normalize().multiplyScalar(bend);
    for (let i = 0; i < steps; i++) {
        const t0 = i / steps, t1 = (i + 1) / steps;
        const next = V(
            lean.x * t1 * t1 + range(r, -0.3, 0.3) * bend,
            height * t1,
            lean.z * t1 * t1 + range(r, -0.3, 0.3) * bend
        );
        m.limb(p, next, rBottom + (rTop - rBottom) * t0, rBottom + (rTop - rBottom) * t1, color, segs);
        p = next;
    }
    return p;
}

// Ring of tapering cones (conifer tiers); snow adds white caps
function coniferTiers(m, startY, height, baseR, tiers, colors, segs, snow) {
    const r = m.r;
    for (let i = 0; i < tiers; i++) {
        const t = i / tiers;
        const radius = baseR * (1 - t * 0.8) * range(r, 0.9, 1.1);
        const h = height / tiers * 1.9;
        const y = startY + height * t;
        const g = new THREE.ConeGeometry(radius, h, segs, 1);
        g.translate(0, h / 2, 0);
        m.add(g, colors[i % colors.length], { position: V(0, y, 0), jitter: 0.08, shade: 0.5, quaternion: new THREE.Quaternion().setFromAxisAngle(_up, r() * 6) });
        if (snow) {
            const sg = new THREE.ConeGeometry(radius * 0.75, h * 0.45, segs, 1);
            sg.translate(0, h * 0.55 + h * 0.225, 0);
            m.add(sg, 0xF2F6FA, { position: V(0, y, 0), jitter: 0.06, shade: 0.15 });
        }
    }
}

// Branches with foliage clumps at their tips (deciduous canopy)
function branchyCanopy(m, trunkTop, opts) {
    const r = m.r;
    const { branches, spread, rise, branchR, barkColor, leafColors, clumpR, detail, extraClumps = 2, squash = 0.75 } = opts;
    const tips = [];
    for (let i = 0; i < branches; i++) {
        const a = (i / branches) * Math.PI * 2 + range(r, -0.4, 0.4);
        const from = V(trunkTop.x, trunkTop.y - range(r, 0, rise * 0.6), trunkTop.z);
        const tip = V(trunkTop.x + Math.cos(a) * spread * range(r, 0.6, 1), trunkTop.y + rise * range(r, 0.4, 1), trunkTop.z + Math.sin(a) * spread * range(r, 0.6, 1));
        if (branchR > 0) m.limb(from, tip, branchR, branchR * 0.5, barkColor, 5);
        tips.push(tip);
    }
    for (const tip of tips) m.clump(tip, clumpR * range(r, 0.8, 1.15), pick(r, leafColors), detail, squash);
    for (let i = 0; i < extraClumps; i++) {
        m.clump(V(trunkTop.x + range(r, -1, 1) * spread * 0.4, trunkTop.y + rise * range(r, 0.6, 1.2), trunkTop.z + range(r, -1, 1) * spread * 0.4), clumpR * range(r, 0.9, 1.2), pick(r, leafColors), detail, squash);
    }
    return tips;
}

// Thin hanging strands (willow, moss, vines, aerial roots)
function strands(m, center, radius, y, count, minLen, maxLen, color, thickness = 0.12) {
    const r = m.r;
    for (let i = 0; i < count; i++) {
        const a = r() * Math.PI * 2, d = radius * Math.sqrt(range(r, 0.4, 1));
        const top = V(center.x + Math.cos(a) * d, y - range(r, 0, 1), center.z + Math.sin(a) * d);
        const bottom = V(top.x * 1.03, top.y - range(r, minLen, maxLen), top.z * 1.03);
        m.limb(bottom, top, thickness, thickness, color, 3, { shade: 0.2 });
    }
}

// ============================================================================
// Tree types - build(m, lod) where lod 0 = near/detailed, 1 = far/simple
// ============================================================================

const TREE_TYPES = {
    // --- Conifers ---
    pine: {
        radius: 1.2,
        build(m, lod) {
            const r = m.r, h = range(r, 24, 34);
            crookedTrunk(m, h * 0.55, 1.3, 0.8, 0x6B4423, 0.6, lod ? 1 : 2, lod ? 5 : 7);
            coniferTiers(m, h * 0.3, h * 0.7, range(r, 6, 7.5), lod ? 3 : 5, [0x1F5A2A, 0x2A6A32, 0x245F2C], lod ? 6 : 8, false);
        }
    },
    spruce: {
        radius: 1,
        build(m, lod) {
            const r = m.r, h = range(r, 30, 44);
            crookedTrunk(m, h * 0.4, 1.1, 0.6, 0x4E3A2C, 0.3, 1, lod ? 5 : 6);
            coniferTiers(m, h * 0.12, h * 0.88, range(r, 5, 6), lod ? 4 : 7, [0x1C4A3A, 0x22564A, 0x1A4234], lod ? 6 : 8, false);
        }
    },
    snowyPine: {
        radius: 1.1,
        build(m, lod) {
            const r = m.r, h = range(r, 20, 30);
            crookedTrunk(m, h * 0.45, 1.2, 0.7, 0x5E4E40, 0.4, 1, lod ? 5 : 6);
            coniferTiers(m, h * 0.2, h * 0.8, range(r, 5, 6), lod ? 3 : 5, [0x3A5A4A, 0x44664F], lod ? 6 : 8, true);
        }
    },
    redwood: {
        radius: 2.4,
        build(m, lod) {
            const r = m.r, h = range(r, 48, 62);
            crookedTrunk(m, h * 0.92, 3.2, 1.2, 0x8A3E24, 0.6, lod ? 2 : 4, lod ? 6 : 9);
            const n = lod ? 6 : 16;
            for (let i = 0; i < n; i++) {
                const t = i / n, y = h * (0.42 + t * 0.55), a = r() * Math.PI * 2, d = range(r, 1.5, 3.5) * (1.1 - t * 0.6);
                m.clump(V(Math.cos(a) * d, y, Math.sin(a) * d), range(r, 5.5, 8) * (1.15 - t * 0.6), pick(r, [0x2A4A2A, 0x355A30, 0x2E522C]), lod ? 0 : 1, 0.6);
            }
            m.clump(V(0, h * 0.98, 0), 3.2, 0x2E522C, lod ? 0 : 1, 1.3);
        }
    },
    cypress: {
        radius: 0.8,
        build(m, lod) {
            const r = m.r, h = range(r, 22, 30);
            m.limb(V(0, -0.5, 0), V(0, h * 0.3, 0), 0.8, 0.6, 0x5A4030, 5);
            const n = lod ? 3 : 6;
            for (let i = 0; i < n; i++) {
                const t = i / n;
                m.clump(V(range(r, -0.3, 0.3), h * (0.2 + t * 0.75), range(r, -0.3, 0.3)), 3.2 * (1 - t * 0.55), pick(r, [0x1E4A24, 0x24542A]), lod ? 0 : 1, 1.6);
            }
        }
    },
    deadwood: {
        radius: 0.9,
        build(m, lod) {
            const r = m.r, h = range(r, 14, 24);
            const top = crookedTrunk(m, h, 1.1, 0.35, 0x5A5450, 2.5, lod ? 2 : 4, 5);
            for (let i = 0; i < (lod ? 3 : 6); i++) {
                const from = V(top.x * 0.6, h * range(r, 0.45, 0.9), top.z * 0.6), a = r() * Math.PI * 2, len = range(r, 4, 8);
                const tip = V(from.x + Math.cos(a) * len, from.y + range(r, 1, 5), from.z + Math.sin(a) * len);
                m.limb(from, tip, 0.35, 0.1, 0x625C56, 4);
                if (!lod) m.limb(tip, V(tip.x + range(r, -2, 2), tip.y + range(r, 1, 3), tip.z + range(r, -2, 2)), 0.12, 0.05, 0x625C56, 3);
            }
        }
    },
    charred: {
        radius: 1,
        build(m, lod) {
            const r = m.r, h = range(r, 16, 26);
            const top = crookedTrunk(m, h, 1.3, 0.4, 0x1E1A1A, 1.5, lod ? 2 : 3, 5);
            for (let i = 0; i < (lod ? 2 : 4); i++) {
                const from = V(top.x * 0.5, h * range(r, 0.5, 0.85), top.z * 0.5), a = r() * Math.PI * 2;
                m.limb(from, V(from.x + Math.cos(a) * 4, from.y + 2, from.z + Math.sin(a) * 4), 0.35, 0.15, 0x262020, 4);
            }
            if (!lod) for (let i = 0; i < 6; i++) {
                const y = range(r, 1, h * 0.7), a = r() * Math.PI * 2;
                m.add(new THREE.BoxGeometry(0.5, 0.8, 0.3), pick(r, [0xE0601E, 0xF08A2A]), { position: V(Math.cos(a) * 1.1, y, Math.sin(a) * 1.1), shade: 0 });
            }
        }
    },

    // --- Deciduous ---
    oak: {
        radius: 1.6,
        build(m, lod) {
            const r = m.r, h = range(r, 13, 18);
            const top = crookedTrunk(m, h, 1.9, 1.2, 0x4A3728, 1, lod ? 1 : 3, lod ? 5 : 7);
            branchyCanopy(m, top, { branches: lod ? 3 : 5, spread: range(r, 6, 8), rise: 5, branchR: lod ? 0 : 0.7, barkColor: 0x4A3728, leafColors: [0x2F6A2A, 0x3A7A30, 0x2A5E26], clumpR: range(r, 5, 6.5), detail: lod ? 0 : 1, extraClumps: lod ? 1 : 3 });
        }
    },
    maple: {
        radius: 1.4,
        build(m, lod) {
            const r = m.r, h = range(r, 14, 19);
            const palette = pick(r, [[0xC0392B, 0xD9502E, 0xA8302A], [0xE07B24, 0xF09A30, 0xD06A1E], [0xE8B52E, 0xD99A26, 0xF0C850]]);
            const top = crookedTrunk(m, h, 1.5, 0.9, 0x4A3A30, 0.8, lod ? 1 : 3, lod ? 5 : 7);
            branchyCanopy(m, top, { branches: lod ? 3 : 5, spread: range(r, 5, 6.5), rise: 6, branchR: lod ? 0 : 0.55, barkColor: 0x4A3A30, leafColors: palette, clumpR: range(r, 4.5, 5.5), detail: lod ? 0 : 1, extraClumps: lod ? 1 : 3, squash: 0.85 });
        }
    },
    birch: {
        radius: 0.9,
        build(m, lod) {
            const r = m.r, h = range(r, 18, 25);
            const top = crookedTrunk(m, h, 0.95, 0.6, 0xE4DED0, 1.2, lod ? 1 : 3, lod ? 5 : 7);
            if (!lod) for (let i = 0; i < 9; i++) {
                const y = range(r, 1, h * 0.9), t = y / h;
                m.add(new THREE.CylinderGeometry(0.98 - t * 0.35, 0.98 - t * 0.35, 0.35, 7, 1), 0x2A2624, { position: V(top.x * t * t, y, top.z * t * t), shade: 0 });
            }
            branchyCanopy(m, top, { branches: lod ? 2 : 4, spread: range(r, 3, 4.5), rise: 5, branchR: 0, leafColors: [0x7AA83A, 0x8AB84A, 0x6A9A32], clumpR: range(r, 3.5, 4.5), detail: lod ? 0 : 1, extraClumps: 2, squash: 1.1 });
        }
    },
    aspen: {
        radius: 0.8,
        build(m, lod) {
            const r = m.r, h = range(r, 16, 22);
            const top = crookedTrunk(m, h, 0.8, 0.5, 0xD8D4C4, 0.6, lod ? 1 : 2, lod ? 5 : 6);
            if (!lod) for (let i = 0; i < 6; i++) m.add(new THREE.CylinderGeometry(0.82, 0.82, 0.3, 6, 1), 0x3A3634, { position: V(top.x * 0.3, range(r, 1, h * 0.8), top.z * 0.3), shade: 0 });
            branchyCanopy(m, top, { branches: lod ? 2 : 3, spread: 2.5, rise: 6, branchR: 0, leafColors: [0xE8C232, 0xF0D24A, 0xD8AE26], clumpR: range(r, 3, 3.8), detail: lod ? 0 : 1, extraClumps: 2, squash: 1.4 });
        }
    },
    cherry: {
        radius: 1.3,
        build(m, lod) {
            const r = m.r, h = range(r, 12, 17);
            const top = crookedTrunk(m, h, 1.4, 0.8, 0x3A2620, 2, lod ? 1 : 3, lod ? 5 : 7);
            branchyCanopy(m, top, { branches: lod ? 3 : 6, spread: range(r, 6, 8), rise: 4, branchR: lod ? 0 : 0.5, barkColor: 0x3A2620, leafColors: [0xF2A8C4, 0xF7C0D4, 0xE88AB0], clumpR: range(r, 4, 5), detail: lod ? 0 : 1, extraClumps: lod ? 1 : 3, squash: 0.7 });
        }
    },
    acacia: {
        radius: 1.2,
        build(m, lod) {
            const r = m.r, h = range(r, 11, 16);
            const fork = crookedTrunk(m, h * 0.5, 1.4, 1, 0x6B4423, 1.5, lod ? 1 : 2, 6);
            const crowns = lod ? 2 : 3;
            for (let i = 0; i < crowns; i++) {
                const a = (i / crowns) * Math.PI * 2 + r(), d = range(r, 3, 6);
                const tip = V(fork.x + Math.cos(a) * d, h + range(r, -1, 2), fork.z + Math.sin(a) * d);
                m.limb(fork, tip, 0.8, 0.5, 0x6B4423, 5);
                m.clump(tip, range(r, 6, 8), pick(r, [0x6A7A2A, 0x7A8A30, 0x5E6E26]), lod ? 0 : 1, 0.28);
            }
        }
    },
    baobab: {
        radius: 3,
        build(m, lod) {
            const r = m.r, h = range(r, 16, 22);
            const pts = [];
            const w = range(r, 3.5, 4.5);
            for (const [t, k] of [[0, 1.05], [0.15, 1.15], [0.5, 1.0], [0.8, 0.7], [1, 0.45]]) pts.push(new THREE.Vector2(w * k, h * t - 0.5));
            m.add(new THREE.LatheGeometry(pts, lod ? 7 : 11), 0x9A8070, { jitter: 0.04, shade: 0.3 });
            const top = V(0, h, 0);
            for (let i = 0; i < (lod ? 3 : 6); i++) {
                const a = (i / 6) * Math.PI * 2 + r(), tip = V(Math.cos(a) * range(r, 4, 6), h + range(r, 2, 5), Math.sin(a) * range(r, 4, 6));
                m.limb(V(Math.cos(a) * 1.2, h - 0.5, Math.sin(a) * 1.2), tip, 0.7, 0.3, 0x8A7064, 4);
                m.clump(tip, range(r, 1.8, 2.6), 0x5A7A2A, 0, 0.6);
            }
            m.clump(top, 2.2, 0x5A7A2A, 0, 0.5);
        }
    },
    willow: {
        radius: 1.5,
        build(m, lod) {
            const r = m.r, h = range(r, 12, 16);
            const top = crookedTrunk(m, h, 1.8, 1.1, 0x4A3E2E, 1.5, lod ? 1 : 3, 6);
            m.clump(V(top.x, top.y + 2, top.z), range(r, 7, 8.5), 0x6A9A3A, lod ? 0 : 1, 0.65);
            strands(m, top, 7.5, top.y + 1, lod ? 10 : 40, 6, h * 0.75, lod ? 0x6A9A3A : 0x7AAA44, lod ? 0.6 : 0.22);
        }
    },
    swampTree: {
        radius: 1.8,
        build(m, lod) {
            const r = m.r, h = range(r, 18, 26);
            const top = crookedTrunk(m, h, 2.4, 1.2, 0x3D3A2A, 2, lod ? 2 : 3, 6);
            if (!lod) for (let i = 0; i < 5; i++) { const a = r() * 6.28; m.limb(V(0, 2.5, 0), V(Math.cos(a) * 4, -0.5, Math.sin(a) * 4), 0.7, 0.3, 0x3D3A2A, 4); }
            branchyCanopy(m, top, { branches: lod ? 3 : 4, spread: 7, rise: 3, branchR: lod ? 0 : 0.6, barkColor: 0x3D3A2A, leafColors: [0x4A5E2E, 0x55682F, 0x405428], clumpR: 5.5, detail: lod ? 0 : 1, extraClumps: 1, squash: 0.6 });
            if (!lod) strands(m, top, 7, top.y + 1, 24, 3, 9, 0x8A947A, 0.18);
        }
    },
    jungleTree: {
        radius: 2.2,
        build(m, lod) {
            const r = m.r, h = range(r, 28, 38);
            const top = crookedTrunk(m, h, 2.4, 1.4, 0x4A3A28, 1.5, lod ? 2 : 4, lod ? 6 : 8);
            if (!lod) for (let i = 0; i < 5; i++) { const a = (i / 5) * 6.28 + r(); m.add(new THREE.BoxGeometry(0.4, 5, 3.2), 0x4A3A28, { position: V(Math.cos(a) * 2.2, 1.8, Math.sin(a) * 2.2), quaternion: new THREE.Quaternion().setFromAxisAngle(_up, -a), shade: 0.3 }); }
            branchyCanopy(m, top, { branches: lod ? 3 : 5, spread: range(r, 8, 10), rise: 3, branchR: lod ? 0 : 0.8, barkColor: 0x4A3A28, leafColors: [0x1E6A24, 0x2A7A2A, 0x1A5A20], clumpR: range(r, 5.5, 7), detail: lod ? 0 : 1, extraClumps: lod ? 1 : 3, squash: 0.5 });
            if (!lod) strands(m, top, 8, top.y, 16, 6, 16, 0x3A6A2A, 0.15);
        }
    },
    banyan: {
        radius: 3,
        build(m, lod) {
            const r = m.r, h = range(r, 16, 22);
            const top = crookedTrunk(m, h, 3, 2, 0x6A5A48, 1, lod ? 1 : 3, 7);
            branchyCanopy(m, top, { branches: lod ? 4 : 7, spread: range(r, 11, 14), rise: 2, branchR: lod ? 0 : 0.9, barkColor: 0x6A5A48, leafColors: [0x2A6A2A, 0x357A30, 0x245E24], clumpR: range(r, 5, 6), detail: lod ? 0 : 1, extraClumps: 2, squash: 0.55 });
            strands(m, top, 12, top.y - 1, lod ? 4 : 14, h - 2, h, 0x7A6A54, lod ? 0.5 : 0.35);
        }
    },
    mangrove: {
        radius: 1.4,
        build(m, lod) {
            const r = m.r, h = range(r, 10, 15), rootH = 4;
            for (let i = 0; i < (lod ? 4 : 7); i++) {
                const a = (i / 7) * 6.28 + r(), d = range(r, 3.5, 5);
                const curve = new THREE.QuadraticBezierCurve3(V(0, rootH, 0), V(Math.cos(a) * d * 0.7, rootH * 0.9, Math.sin(a) * d * 0.7), V(Math.cos(a) * d, -0.6, Math.sin(a) * d));
                m.add(new THREE.TubeGeometry(curve, lod ? 3 : 6, 0.35, 4, false), 0x4A3C2A, { shade: 0.3 });
            }
            const top = crookedTrunk(m, h, 1.2, 0.9, 0x4A3C2A, 1, 2, 6);
            m.limb(V(0, rootH - 0.5, 0), V(0, rootH + 1, 0), 1.2, 1.2, 0x4A3C2A, 6);
            branchyCanopy(m, V(top.x, top.y + rootH, top.z), { branches: lod ? 3 : 4, spread: 5, rise: 3, branchR: 0, leafColors: [0x2F4F2F, 0x3A5F3A], clumpR: 4.5, detail: lod ? 0 : 1, extraClumps: 2, squash: 0.65 });
        }
    },
    palm: {
        radius: 0.9,
        build(m, lod) {
            const r = m.r, h = range(r, 18, 26);
            const lean = V(range(r, -1, 1), 0, range(r, -1, 1)).normalize();
            let p = V(0, -0.5, 0);
            const steps = lod ? 4 : 9;
            for (let i = 1; i <= steps; i++) {
                const t = i / steps;
                const next = V(lean.x * 5 * t * t, h * t, lean.z * 5 * t * t);
                m.limb(p, next, 0.95 - t * 0.3, 0.95 - t * 0.3, i % 2 ? 0x8A7458 : 0x7A6448, 6);
                p = next;
            }
            const fronds = lod ? 6 : 10;
            for (let i = 0; i < fronds; i++) {
                const a = (i / fronds) * Math.PI * 2 + r() * 0.3;
                let q = p.clone();
                const segs = lod ? 2 : 4;
                for (let s = 1; s <= segs; s++) {
                    const t = s / segs;
                    const next = V(p.x + Math.cos(a) * 9 * t, p.y + 2 * t - 7 * t * t, p.z + Math.sin(a) * 9 * t);
                    const len = q.distanceTo(next);
                    const g = new THREE.BoxGeometry(2.4 * (1 - t * 0.6), 0.15, len);
                    g.translate(0, 0, len / 2);
                    const dir = new THREE.Vector3().subVectors(next, q).normalize();
                    m.add(g, pick(r, [0x3A8A3A, 0x2F7A30, 0x48963E]), { position: q, quaternion: new THREE.Quaternion().setFromUnitVectors(V(0, 0, 1), dir), shade: 0.2 });
                    q = next;
                }
            }
            if (!lod) for (let i = 0; i < 3; i++) m.add(new THREE.IcosahedronGeometry(0.6, 0), 0x5A4028, { position: V(p.x + range(r, -0.8, 0.8), p.y - 0.8, p.z + range(r, -0.8, 0.8)) });
        }
    },
    joshuaTree: {
        radius: 0.9,
        build(m, lod) {
            const r = m.r, h = range(r, 8, 12);
            const top = crookedTrunk(m, h, 1, 0.7, 0x7A6A50, 1, 2, 6);
            const arms = lod ? 3 : 5;
            for (let i = 0; i < arms; i++) {
                const a = (i / arms) * 6.28 + r();
                const mid = V(top.x + Math.cos(a) * 3, top.y + range(r, 0, 2), top.z + Math.sin(a) * 3);
                const tip = V(mid.x + Math.cos(a) * 2, mid.y + range(r, 2, 4), mid.z + Math.sin(a) * 2);
                m.limb(V(top.x, top.y - 1, top.z), mid, 0.6, 0.5, 0x7A6A50, 5);
                m.limb(mid, tip, 0.5, 0.45, 0x7A6A50, 5);
                for (let s = 0; s < (lod ? 1 : 3); s++) {
                    const g = new THREE.ConeGeometry(1.4, 2.6, 6, 1);
                    m.add(g, pick(r, [0x5A7A3A, 0x6A8A44]), { position: V(tip.x, tip.y + 1, tip.z), quaternion: new THREE.Quaternion().setFromEuler(new THREE.Euler(range(r, -0.5, 0.5), r() * 6, range(r, -0.5, 0.5))), jitter: 0.2, shade: 0.4 });
                }
            }
        }
    },
    bamboo: {
        radius: 1.5,
        build(m, lod) {
            const r = m.r;
            const stalks = lod ? 3 : 6;
            for (let s = 0; s < stalks; s++) {
                const a = r() * 6.28, d = range(r, 0, 1.8), h = range(r, 30, 45);
                const base = V(Math.cos(a) * d, -0.5, Math.sin(a) * d), top = V(base.x + range(r, -2, 2), h, base.z + range(r, -2, 2));
                const nodes = lod ? 2 : 7;
                for (let i = 0; i < nodes; i++) {
                    const p0 = base.clone().lerp(top, i / nodes), p1 = base.clone().lerp(top, (i + 1) / nodes);
                    m.limb(p0, p1, 0.45, 0.4, i % 2 ? 0x7AA040 : 0x6A9038, 5, { shade: 0.15 });
                }
                for (let i = 0; i < (lod ? 1 : 3); i++) {
                    const p = base.clone().lerp(top, range(r, 0.6, 1));
                    m.clump(p, range(r, 1.6, 2.4), pick(r, [0x4A9A30, 0x5AAA3A]), 0, 0.5);
                }
            }
        }
    },

    // --- Fantasy ---
    giantMushroom: {
        radius: 2,
        build(m, lod) {
            const r = m.r, h = range(r, 14, 22);
            const top = crookedTrunk(m, h, 2.4, 1.8, 0xE8DCC8, 1.5, lod ? 1 : 3, lod ? 6 : 8);
            const capR = range(r, 9, 12);
            const cap = new THREE.SphereGeometry(capR, lod ? 8 : 14, lod ? 4 : 7, 0, Math.PI * 2, 0, Math.PI / 2);
            m.add(cap, pick(r, [0xB82A2A, 0xA82424, 0xC23A2A]), { position: V(top.x, top.y - 1, top.z), scale: V(1, 0.55, 1), shade: 0.35 });
            m.add(new THREE.CircleGeometry(capR * 0.98, lod ? 8 : 14).rotateX(Math.PI / 2), 0xEADCC0, { position: V(top.x, top.y - 1.05, top.z), shade: 0 });
            if (!lod) for (let i = 0; i < 10; i++) {
                const a = r() * 6.28, d = range(r, 0.2, 0.85) * capR, y = Math.sqrt(Math.max(0, 1 - (d / capR) ** 2)) * capR * 0.55;
                m.add(new THREE.IcosahedronGeometry(range(r, 0.7, 1.3), 0), 0xF6F0DC, { position: V(top.x + Math.cos(a) * d, top.y - 1 + y, top.z + Math.sin(a) * d), scale: V(1, 0.4, 1), shade: 0 });
            }
        }
    },
    glowShroomTree: {
        radius: 1.2,
        build(m, lod) {
            const r = m.r, h = range(r, 16, 24);
            const top = crookedTrunk(m, h, 1.2, 0.8, 0xD8D0E8, 3, lod ? 2 : 4, 6);
            const capR = range(r, 5, 7);
            const bell = new THREE.ConeGeometry(capR, capR * 1.2, lod ? 7 : 12, 1);
            m.add(bell, pick(r, [0x8A4AE0, 0x4AC8D8, 0xB05AE8]), { position: V(top.x, top.y + capR * 0.4, top.z), shade: 0.2 });
            if (!lod) strands(m, top, capR * 0.9, top.y, 10, 2, 5, 0x9AF0F0, 0.12);
        }
    },
    crystalTree: {
        radius: 1,
        build(m, lod) {
            const r = m.r, h = range(r, 12, 18);
            const top = crookedTrunk(m, h, 1, 0.5, 0xA8C8D8, 1, 2, 5);
            for (let i = 0; i < (lod ? 4 : 9); i++) {
                const a = r() * 6.28, d = range(r, 1, 4), y = top.y + range(r, -3, 3);
                m.add(new THREE.OctahedronGeometry(1, 0), pick(r, [0xA8E0F0, 0xC8F0FA, 0x88C8E8]), { position: V(top.x + Math.cos(a) * d, y, top.z + Math.sin(a) * d), scale: V(range(r, 0.8, 1.4), range(r, 2, 3.5), range(r, 0.8, 1.4)), quaternion: new THREE.Quaternion().setFromEuler(new THREE.Euler(range(r, -0.4, 0.4), r() * 6, range(r, -0.4, 0.4))), shade: 0.2 });
            }
        }
    }
};

// Biome planting: density scales candidates per chunk; types are [type, weight]
const BIOME_TREES = {
    // Frozen
    snowyPeaks: { density: 0.02, types: [['snowyPine', 1]] },
    snowySlopes: { density: 0.08, types: [['snowyPine', 0.65], ['spruce', 0.35]] },
    tundra: { density: 0.03, types: [['deadwood', 0.5], ['snowyPine', 0.5]] },
    taiga: { density: 0.6, types: [['spruce', 0.5], ['snowyPine', 0.25], ['pine', 0.25]] },
    iceSpikes: { density: 0.06, types: [['crystalTree', 0.7], ['snowyPine', 0.3]] },

    // Cold
    coldForest: { density: 0.65, types: [['spruce', 0.3], ['birch', 0.2], ['redwood', 0.2], ['maple', 0.2], ['pine', 0.1]] },
    coldPlains: { density: 0.15, types: [['aspen', 0.45], ['birch', 0.35], ['spruce', 0.2]] },

    // Temperate
    mountains: { density: 0.08, types: [['spruce', 0.6], ['pine', 0.3], ['deadwood', 0.1]] },
    highlands: { density: 0.2, types: [['pine', 0.35], ['spruce', 0.25], ['aspen', 0.2], ['oak', 0.2]] },
    forest: { density: 0.8, types: [['oak', 0.4], ['maple', 0.2], ['birch', 0.25], ['pine', 0.15]] },
    plains: { density: 0.12, types: [['oak', 0.5], ['birch', 0.2], ['willow', 0.15], ['cypress', 0.15]] },
    meadow: { density: 0.08, types: [['birch', 0.4], ['oak', 0.3], ['willow', 0.2], ['aspen', 0.1]] },
    cherryGrove: { density: 0.7, types: [['cherry', 0.85], ['birch', 0.15]] },
    mushroomFields: { density: 0.4, types: [['giantMushroom', 0.55], ['glowShroomTree', 0.45]] },

    // Warm
    grassland: { density: 0.1, types: [['oak', 0.4], ['acacia', 0.4], ['cypress', 0.2]] },
    savanna: { density: 0.15, types: [['acacia', 0.7], ['baobab', 0.3]] },
    warmForest: { density: 0.7, types: [['oak', 0.45], ['jungleTree', 0.25], ['cypress', 0.3]] },

    // Hot
    desert: { density: 0.04, types: [['joshuaTree', 0.5], ['palm', 0.4], ['deadwood', 0.1]] },
    badlands: { density: 0.02, types: [['deadwood', 0.6], ['joshuaTree', 0.4]] },
    jungle: { density: 0.9, types: [['jungleTree', 0.55], ['banyan', 0.25], ['palm', 0.2]] },
    bambooJungle: { density: 0.8, types: [['bamboo', 0.85], ['jungleTree', 0.15]] },
    volcanicPeaks: { density: 0.05, types: [['charred', 0.75], ['deadwood', 0.25]] },

    // Coastal & wetlands
    beach: { density: 0.04, types: [['palm', 1]] },
    stonyShore: { density: 0, types: [] },
    swamp: { density: 0.55, types: [['swampTree', 0.45], ['willow', 0.4], ['oak', 0.15]] },
    mangroveSwamp: { density: 0.65, types: [['mangrove', 0.9], ['swampTree', 0.1]] }
};

// Water's edge trees (lake shores, river banks) by shore climate: willows by
// temperate water, palm oases in deserts, mangroves and palms in the tropics
const SHORE_TREES = {
    temperate: { density: 0.3, types: [['willow', 0.55], ['birch', 0.3], ['swampTree', 0.15]] },
    cold: { density: 0.2, types: [['birch', 0.5], ['spruce', 0.5]] },
    arid: { density: 0.35, types: [['palm', 0.85], ['acacia', 0.15]] },
    tropical: { density: 0.4, types: [['palm', 0.4], ['mangrove', 0.3], ['banyan', 0.3]] }
};

const TREE_CONFIG = {
    modelVariants: 3,
    candidatesPerChunk: 130,
    minSpacing: 9,
    lodDistance: 200,       // 3D within this distance, sprites beyond (PERFORMANCE.rendering.lodDistance wins)
    rebuildMoveDistance: 20, // Re-split 3D/sprite trees after the player moves this far
    scaleMin: 0.85,
    scaleMax: 1.2,
    trunkSink: 0.4,
    spriteTile: { w: 64, h: 128, cols: 16 }
};

// ============================================================================
// Models, material, instancing
// ============================================================================

let treeMaterial = null;
let treeSpriteMaterial = null;
let treeSpriteMesh = null;
const treeModels = {};          // type -> [{ geometry, height, sprite }] per variant
const treeMeshes = new Map();   // "type|variant" -> InstancedMesh (3D trees)
const chunkTrees = new Map();   // chunk key -> { cx, cz, trees: [...] }
let treeLandingProxies = [];
let treesDirty = false;
let lastTreeCenter = null;      // Player position at the last rebuild

function buildTreeModels() {
    for (const [type, def] of Object.entries(TREE_TYPES)) {
        treeModels[type] = [];
        for (let v = 0; v < TREE_CONFIG.modelVariants; v++) {
            const seed = [...type].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 11) + v * 7919;
            const model = new TreeModel(makeRngTrees(seed));
            def.build(model, 0);
            const geometry = model.merge();
            treeModels[type].push({ geometry, height: geometry.userData.height, sprite: null });
        }
    }
}

function buildTreeMaterial() {
    const material = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
    // Gentle wind sway that grows with height above the trunk base
    material.onBeforeCompile = (shader) => {
        shader.uniforms.time = { value: 0 };
        shader.vertexShader = shader.vertexShader
            .replace('#include <common>', `#include <common>
            uniform float time;`)
            .replace('#include <begin_vertex>', `#include <begin_vertex>
            #ifdef USE_INSTANCING
            vec3 treeBase = instanceMatrix[3].xyz;
            float bend = max(0.0, position.y - 6.0) * 0.012;
            transformed.x += sin(time * 0.9 + treeBase.x * 0.05) * bend;
            transformed.z += cos(time * 0.7 + treeBase.z * 0.05) * bend;
            #endif`);
        material.userData.shader = shader;
    };
    return material;
}

// Render every model once from the side into a pixel-art atlas used by the far sprites
function bakeTreeSprites() {
    const renderer = typeof GAME !== 'undefined' ? GAME.renderer : null;
    if (!renderer) return null;

    const { w: tw, h: th, cols } = TREE_CONFIG.spriteTile;
    const models = [];
    for (const type of Object.keys(treeModels)) treeModels[type].forEach(m => models.push(m));
    const rows = Math.ceil(models.length / cols);

    const canvas = document.createElement('canvas');
    canvas.width = cols * tw;
    canvas.height = rows * th;
    const ctx = canvas.getContext('2d');

    const bakeScene = new THREE.Scene();
    bakeScene.add(new THREE.AmbientLight(0xffffff, 0.75));
    const sun = new THREE.DirectionalLight(0xffffff, 1.1);
    sun.position.set(-0.5, 1, 1);
    bakeScene.add(sun);
    const bakeMaterial = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
    const target = new THREE.WebGLRenderTarget(tw, th);
    target.texture.colorSpace = THREE.SRGBColorSpace;
    const pixels = new Uint8Array(tw * th * 4);
    const image = ctx.createImageData(tw, th);

    const prevTarget = renderer.getRenderTarget();
    const prevClear = renderer.getClearColor(new THREE.Color());
    const prevAlpha = renderer.getClearAlpha();
    renderer.setClearColor(0x000000, 0);

    models.forEach((model, i) => {
        model.geometry.computeBoundingBox();
        const box = model.geometry.boundingBox;
        const halfW = Math.max(Math.abs(box.min.x), box.max.x, Math.abs(box.min.z), box.max.z) + 0.5;
        const bottom = box.min.y - 0.2;
        // Fit the tile's 1:2 aspect around the model
        let height = box.max.y - bottom + 0.5;
        let width = height * (tw / th);
        if (halfW * 2 > width) { width = halfW * 2; height = width * (th / tw); }

        const cam = new THREE.OrthographicCamera(-width / 2, width / 2, bottom + height, bottom, -200, 200);
        cam.position.set(0, 0, 50);
        cam.lookAt(0, 0, 0);
        const mesh = new THREE.Mesh(model.geometry, bakeMaterial);
        bakeScene.add(mesh);
        renderer.setRenderTarget(target);
        renderer.clear();
        renderer.render(bakeScene, cam);
        renderer.readRenderTargetPixels(target, 0, 0, tw, th, pixels);
        bakeScene.remove(mesh);

        // Render target rows are bottom-up; canvas rows are top-down
        for (let y = 0; y < th; y++) {
            image.data.set(pixels.subarray((th - 1 - y) * tw * 4, (th - y) * tw * 4), y * tw * 4);
        }
        const col = i % cols, row = Math.floor(i / cols);
        ctx.putImageData(image, col * tw, row * th);
        model.sprite = { u: col / cols, v: 1 - (row + 1) / rows, width, height, bottom };
    });

    renderer.setRenderTarget(prevTarget);
    renderer.setClearColor(prevClear, prevAlpha);
    target.dispose();
    bakeMaterial.dispose();

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    texture.generateMipmaps = false;
    texture.userData = { cols, rows };
    return texture;
}

function buildTreeSpriteMaterial(atlas) {
    const material = new THREE.MeshLambertMaterial({ map: atlas, alphaTest: 0.5, side: THREE.DoubleSide });
    // Cylindrical billboarding and atlas tile lookup in the vertex shader
    material.onBeforeCompile = (shader) => {
        shader.uniforms.tileSize = { value: new THREE.Vector2(1 / atlas.userData.cols, 1 / atlas.userData.rows) };
        shader.vertexShader = shader.vertexShader
            .replace('#include <common>', `#include <common>
            attribute vec2 spriteTile;
            uniform vec2 tileSize;`)
            .replace('#include <uv_vertex>', `#include <uv_vertex>
            vMapUv = spriteTile + vMapUv * tileSize;`)
            .replace('#include <begin_vertex>', `#include <begin_vertex>
            vec3 instPos = instanceMatrix[3].xyz;
            vec2 toCam = cameraPosition.xz - instPos.xz;
            float ang = atan(toCam.x, toCam.y);
            transformed = vec3(position.x * cos(ang), position.y, -position.x * sin(ang));`);
    };
    return material;
}

// One InstancedMesh for every distant tree; grows when needed
function getTreeSpriteMesh(capacity) {
    if (treeSpriteMesh && treeSpriteMesh.instanceMatrix.count >= capacity) return treeSpriteMesh;
    if (treeSpriteMesh) {
        scene.remove(treeSpriteMesh);
        treeSpriteMesh.geometry.dispose();
        treeSpriteMesh.dispose();
    }
    const size = Math.max(256, Math.ceil(capacity * 1.5));
    // Unit quad anchored at its bottom center; normals up so sprites are lit like the ground
    const geometry = new THREE.PlaneGeometry(1, 1);
    geometry.translate(0, 0.5, 0);
    const normals = geometry.attributes.normal;
    for (let i = 0; i < normals.count; i++) normals.setXYZ(i, 0, 1, 0);
    geometry.setAttribute('spriteTile', new THREE.InstancedBufferAttribute(new Float32Array(size * 2), 2));

    treeSpriteMesh = new THREE.InstancedMesh(geometry, treeSpriteMaterial, size);
    treeSpriteMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    treeSpriteMesh.frustumCulled = false;
    treeSpriteMesh.receiveShadow = true;
    treeSpriteMesh.name = 'tree_sprites';
    treeSpriteMesh.count = 0;
    scene.add(treeSpriteMesh);
    return treeSpriteMesh;
}

function getTreeMesh(type, variant, capacity) {
    const key = `${type}|${variant}`;
    let mesh = treeMeshes.get(key);
    if (mesh && mesh.instanceMatrix.count >= capacity) return mesh;

    if (mesh) {
        scene.remove(mesh);
        mesh.dispose();
    }
    const model = treeModels[type][variant];
    const size = Math.max(16, Math.ceil(capacity * 1.5));
    mesh = new THREE.InstancedMesh(model.geometry, treeMaterial, size);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.frustumCulled = false;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.name = `trees_${key}`;
    mesh.count = 0;
    scene.add(mesh);
    treeMeshes.set(key, mesh);
    return mesh;
}

function getLodDistance() {
    return (typeof PERFORMANCE !== 'undefined' && PERFORMANCE.rendering && PERFORMANCE.rendering.lodDistance) || TREE_CONFIG.lodDistance;
}

// Rebuild all instance buffers: 3D models near the player, sprites beyond
function rebuildTreeInstances() {
    treesDirty = false;
    const player = typeof character !== 'undefined' && character ? character.position : null;
    const px = player && Number.isFinite(player.x) ? player.x : 0;
    const pz = player && Number.isFinite(player.z) ? player.z : 0;
    lastTreeCenter = { x: px, z: pz };
    const lod2 = getLodDistance() ** 2;
    const useSprites = !!treeSpriteMaterial &&
        (typeof PERFORMANCE === 'undefined' || !PERFORMANCE.rendering || PERFORMANCE.rendering.lodEnabled !== false);

    const groups = new Map(); // "type|variant" -> [tree] (3D)
    const sprites = [];
    const nearTrees = [];
    chunkTrees.forEach(chunk => {
        for (const t of chunk.trees) {
            const near = !useSprites || (t.position.x - px) ** 2 + (t.position.z - pz) ** 2 < lod2;
            if (near) {
                const key = `${t.type}|${t.variant}`;
                if (!groups.has(key)) groups.set(key, []);
                groups.get(key).push(t);
                nearTrees.push(t);
            } else {
                sprites.push(t);
            }
        }
    });

    treeMeshes.forEach((mesh, key) => { if (!groups.has(key)) mesh.count = 0; });

    const matrix = new THREE.Matrix4();
    const quat = new THREE.Quaternion();
    const scale = new THREE.Vector3();
    const offset = new THREE.Vector3();
    const color = new THREE.Color();
    groups.forEach((trees, key) => {
        const [type, variant] = key.split('|');
        const mesh = getTreeMesh(type, +variant, trees.length);
        trees.forEach((t, i) => {
            quat.setFromAxisAngle(_up, t.yaw);
            scale.setScalar(t.scale);
            matrix.compose(t.position, quat, scale);
            mesh.setMatrixAt(i, matrix);
            mesh.setColorAt(i, color.setScalar(t.tint));
        });
        mesh.count = trees.length;
        mesh.instanceMatrix.needsUpdate = true;
        if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    });

    if (useSprites) {
        const mesh = getTreeSpriteMesh(sprites.length);
        const tiles = mesh.geometry.attributes.spriteTile;
        sprites.forEach((t, i) => {
            const sp = treeModels[t.type][t.variant].sprite;
            offset.set(t.position.x, t.position.y + sp.bottom * t.scale, t.position.z);
            matrix.makeScale(sp.width * t.scale, sp.height * t.scale, sp.width * t.scale).setPosition(offset);
            mesh.setMatrixAt(i, matrix);
            mesh.setColorAt(i, color.setScalar(t.tint));
            tiles.setXY(i, sp.u, sp.v);
        });
        mesh.count = sprites.length;
        mesh.instanceMatrix.needsUpdate = true;
        if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
        tiles.needsUpdate = true;
    } else if (treeSpriteMesh) {
        treeSpriteMesh.count = 0;
    }

    updateTreeLandingProxies(nearTrees);
}

// Lightweight stand-ins so the character can still land on nearby treetops
function updateTreeLandingProxies(nearTrees) {
    if (typeof GAME === 'undefined' || !GAME.world || !GAME.world.objects) return;
    const objects = GAME.world.objects;
    const old = new Set(treeLandingProxies);
    for (let i = objects.length - 1; i >= 0; i--) if (old.has(objects[i])) objects.splice(i, 1);
    treeLandingProxies = nearTrees.map(t => ({
        position: t.position,
        userData: { isTree: true, absoluteTreeHeight: t.position.y + t.height }
    }));
    objects.push(...treeLandingProxies);
}

// ============================================================================
// Placement
// ============================================================================

function treeChunkSeed(cx, cz) {
    let h = 2166136261;
    for (const n of [cx, cz, 0x7a3e]) {
        h = Math.imul(h ^ (n & 0xffff), 16777619);
        h = Math.imul(h ^ (n >>> 16), 16777619);
    }
    return h >>> 0;
}

function pickTreeType(types, roll) {
    let total = 0;
    for (const t of types) total += t[1];
    let x = roll * total;
    for (const t of types) {
        x -= t[1];
        if (x <= 0) return t[0];
    }
    return types[0][0];
}

// Ground height under a trunk: lowest point of its footprint, so it never floats
function treeBaseHeight(chunkData, x, z, radius) {
    let h = chunkSurfaceHeight(chunkData, x, z);
    for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        h = Math.min(h, chunkSurfaceHeight(chunkData, x + Math.cos(a) * radius, z + Math.sin(a) * radius));
    }
    return h - TREE_CONFIG.trunkSink;
}

function addChunkTrees(cx, cz, chunkData) {
    if (!treeMaterial || !Number.isFinite(cx) || !Number.isFinite(cz)) return;
    const key = `${cx},${cz}`;
    if (chunkTrees.has(key)) return;

    const r = makeRngTrees(treeChunkSeed(cx, cz));
    const size = CHUNK_CONFIG.size, segments = CHUNK_CONFIG.segments, step = size / segments;
    const b = chunkData.bounds;
    const trees = [];
    const spacing2 = TREE_CONFIG.minSpacing * TREE_CONFIG.minSpacing;

    for (let i = 0; i < TREE_CONFIG.candidatesPerChunk; i++) {
        const x = b.minX + r() * size, z = b.minZ + r() * size;
        const roll = r(), typeRoll = r(), blendRoll = r(), variantRoll = r(), yaw = r() * Math.PI * 2, sRoll = r(), tRoll = r();

        // Keep the spawn plateau clear
        if (x * x + z * z < 50 * 50) continue;

        const data = chunkData.biomeData[Math.round((z - b.minZ) / step)][Math.round((x - b.minX) / step)];
        if (!data || data.isWater || data.isCaveEntrance || !data.biome) continue;

        let biome = data.biome;
        if (data.blendBiome && blendRoll < data.blendWeight) biome = data.blendBiome;
        const ground = chunkSurfaceHeight(chunkData, x, z);
        const table = typeof isShoreHeight === 'function' && isShoreHeight(ground, 3) && !SHORE_BIOMES.has(biome.id)
            ? SHORE_TREES[getShoreClass(data.climate, ground)]
            : (BIOME_TREES[biome.id] || BIOME_TREES.plains);

        // Treeline: forests thin out and stop with altitude (higher where it is warmer)
        const treeline = 240 + (data.climate ? data.climate.temperature : 0) * 100;
        const altitude = 1 - smoothstep(treeline - 30, treeline, ground);
        if (!table.types.length || roll > table.density * altitude) continue;

        // Dry land only
        const seaLevel = typeof getWaterConfig === 'function' ? getWaterConfig().seaLevel : -5;
        if (chunkSurfaceHeight(chunkData, x, z) < seaLevel + 0.6) continue;

        // No trees on cliff faces
        const hx = chunkSurfaceHeight(chunkData, x + 1.5, z) - chunkSurfaceHeight(chunkData, x - 1.5, z);
        const hz = chunkSurfaceHeight(chunkData, x, z + 1.5) - chunkSurfaceHeight(chunkData, x, z - 1.5);
        if (Math.sqrt(hx * hx + hz * hz) / 3 > 1.1) continue;

        if (trees.some(t => (t.position.x - x) ** 2 + (t.position.z - z) ** 2 < spacing2)) continue;

        const type = pickTreeType(table.types, typeRoll);
        const def = TREE_TYPES[type];
        if (!def) continue;
        const variant = Math.floor(variantRoll * TREE_CONFIG.modelVariants);
        const scale = TREE_CONFIG.scaleMin + sRoll * (TREE_CONFIG.scaleMax - TREE_CONFIG.scaleMin);
        const y = treeBaseHeight(chunkData, x, z, def.radius * scale);

        trees.push({
            type, variant, yaw, scale,
            tint: 0.88 + tRoll * 0.2,
            position: new THREE.Vector3(x, y, z),
            height: treeModels[type][variant].height * scale,
            radius: def.radius * scale,
            biome: biome.id
        });
    }

    chunkTrees.set(key, { cx, cz, data: chunkData, trees });
    treesDirty = true;
}

function removeChunkTrees(key) {
    if (chunkTrees.delete(key)) treesDirty = true;
}

// Re-seat trees after terraforming changes the ground
function updateTreesInBounds(minX, maxX, minZ, maxZ) {
    chunkTrees.forEach(chunk => {
        for (const t of chunk.trees) {
            if (t.position.x < minX || t.position.x > maxX || t.position.z < minZ || t.position.z > maxZ) continue;
            t.position.y = treeBaseHeight(chunk.data, t.position.x, t.position.z, t.radius);
            treesDirty = true;
        }
    });
}

// Set up models/material and plant every chunk that is already loaded
function createMoreComplexTrees() {
    if (!treeMaterial) {
        buildTreeModels();
        treeMaterial = buildTreeMaterial();
        const atlas = bakeTreeSprites();
        if (atlas) treeSpriteMaterial = buildTreeSpriteMaterial(atlas);
    }
    if (typeof loadedChunks !== 'undefined') {
        loadedChunks.forEach(chunk => addChunkTrees(chunk.cx, chunk.cz, chunk.data));
    }
    rebuildTreeInstances();
}

// Rebuild when chunks changed or the player moved far enough that trees
// should switch between 3D and sprite
function updateTreeLOD() {
    if (!treeMaterial) return;
    const player = typeof character !== 'undefined' && character ? character.position : null;
    if (player && Number.isFinite(player.x) && lastTreeCenter) {
        const dx = player.x - lastTreeCenter.x, dz = player.z - lastTreeCenter.z;
        if (dx * dx + dz * dz > TREE_CONFIG.rebuildMoveDistance ** 2) treesDirty = true;
    }
    if (treesDirty) rebuildTreeInstances();
}

// Kept for callers of the old sprite system
function updateSpriteBillboards() {}

// Flat list of all trees currently planted (for external queries)
function getTreeData() {
    const all = [];
    chunkTrees.forEach(chunk => all.push(...chunk.trees));
    return all;
}

// Make available globally
window.createMoreComplexTrees = createMoreComplexTrees;
window.updateTreeLOD = updateTreeLOD;
window.updateSpriteBillboards = updateSpriteBillboards;
window.addChunkTrees = addChunkTrees;
window.removeChunkTrees = removeChunkTrees;
window.updateTreesInBounds = updateTreesInBounds;
window.TreeSystem = TreeSystem;
window.TREE_TYPES = TREE_TYPES;
window.getTreeData = getTreeData;
