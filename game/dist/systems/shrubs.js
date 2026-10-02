// Shrub system - biome-specific ground vegetation (grass, flowers, bushes, rocks...)
// Shrubs are generated per terrain chunk from a seeded RNG, so the same plants are
// there when you come back and every player sees the same ones. Each chunk is one
// InstancedMesh of camera-facing quads; sprites come from a procedurally drawn
// pixel-art atlas. Heights come from the chunk's own heightmap using the same
// triangles the ground mesh renders, so sprites sit on the visible surface.
// Uses Systems registry pattern for organized update loop

const ShrubSystem = {
    init() {
        // Shrubs are set up after terrain via createShrubs()
    },

    update(delta) {
        if (shrubMaterial && shrubMaterial.userData.shader) {
            shrubMaterial.userData.shader.uniforms.time.value += delta;
        }
        if (shrubMaterial) updateDetailLayers();
    }
};

// Register with Systems registry
if (typeof Systems !== 'undefined') {
    Systems.register('shrubs', ShrubSystem);
}

// ============================================================================
// Sprite art - each sprite is drawn on a 32x32 pixel grid (y=31 is the ground)
// ============================================================================

const SPRITE_PX = 32;
const ATLAS_COLS = 16;
const ATLAS_ROWS = 8;
const SPRITE_VARIANTS = 2;

// Pixel drawing helpers for a 32x32 tile
function makePainter(ctx, ox, oy) {
    const p = {
        set(x, y, c) {
            x = Math.round(x); y = Math.round(y);
            if (x < 0 || y < 0 || x >= SPRITE_PX || y >= SPRITE_PX) return;
            ctx.fillStyle = c;
            ctx.fillRect(ox + x, oy + y, 1, 1);
        },
        line(x0, y0, x1, y1, c) {
            const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
            for (let i = 0; i <= steps; i++) {
                p.set(x0 + (x1 - x0) * i / steps, y0 + (y1 - y0) * i / steps, c);
            }
        },
        ellipse(cx, cy, rx, ry, c) {
            for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
                for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
                    const dx = (x - cx) / rx, dy = (y - cy) / ry;
                    if (dx * dx + dy * dy <= 1) p.set(x, y, c);
                }
            }
        },
        rect(x, y, w, h, c) {
            for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) p.set(x + i, y + j, c);
        },
        // Curved grass blade from the ground up
        blade(x, h, lean, c, tip) {
            for (let i = 0; i <= h; i++) {
                const t = i / h;
                p.set(x + lean * t * t, 31 - i, (tip && t > 0.75) ? tip : c);
            }
        }
    };
    return p;
}

function shadeHex(hex, f) {
    const n = parseInt(hex.slice(1), 16);
    const ch = s => Math.max(0, Math.min(255, Math.round(((n >> s) & 255) * f)));
    return `rgb(${ch(16)},${ch(8)},${ch(0)})`;
}

// Mulberry32 seeded RNG
function makeRng(seed) {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6D2B79F5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

// Shared drawing building blocks
function drawGrass(p, r, n, h, colors, spread = 22) {
    for (let i = 0; i < n; i++) {
        const x = 16 - spread / 2 + r() * spread;
        p.blade(x, h * (0.55 + r() * 0.45), (r() - 0.5) * 8, colors[i % colors.length], colors.tip);
    }
}

function drawBlob(p, r, cx, cy, rx, ry, base, light, dark, lumps = 5) {
    p.ellipse(cx, cy + 1, rx, ry, dark);
    for (let i = 0; i < lumps; i++) {
        const a = (i / lumps) * Math.PI - Math.PI;
        p.ellipse(cx + Math.cos(a) * rx * 0.55, cy + Math.sin(a) * ry * 0.45, rx * 0.5, ry * 0.5, base);
    }
    p.ellipse(cx - rx * 0.25, cy - ry * 0.35, rx * 0.35, ry * 0.3, light);
}

function drawRock(p, r, w, h, base, light, dark) {
    const cx = 16, top = 31 - h;
    for (let x = Math.round(cx - w / 2); x <= cx + w / 2; x++) {
        const t = (x - (cx - w / 2)) / w;
        const colTop = top + (1 - Math.sin(t * Math.PI)) * h * 0.8 + (r() - 0.5) * 2;
        for (let y = Math.round(colTop); y <= 31; y++) {
            const c = y < colTop + 2 ? light : (x > cx + w * 0.15 || y > 29 ? dark : base);
            p.set(x, y, c);
        }
    }
}

function drawFlowers(p, r, n, petal, center, stem = '#3f7d2e', h = 14) {
    drawGrass(p, r, 6, h * 0.7, ['#4f8a34', '#3f7428']);
    for (let i = 0; i < n; i++) {
        const x = 6 + r() * 20, y = 31 - h * (0.5 + r() * 0.5);
        p.line(x, 31, x + (r() - 0.5) * 2, y, stem);
        p.set(x - 1, y, petal); p.set(x + 1, y, petal); p.set(x, y - 1, petal); p.set(x, y + 1, petal);
        p.set(x, y, center);
    }
}

function drawSpikes(p, r, n, h, stem, bloom) {
    for (let i = 0; i < n; i++) {
        const x = 8 + r() * 16, top = 31 - h * (0.6 + r() * 0.4);
        p.line(x, 31, x, top, stem);
        for (let y = top; y < top + h * 0.35; y += 1) {
            if (r() > 0.2) { p.set(x - 1, y, bloom); p.set(x + 1, y, bloom); }
            p.set(x, y, bloom);
        }
    }
}

function drawFronds(p, r, n, len, c, dark) {
    for (let i = 0; i < n; i++) {
        const ang = -Math.PI / 2 + (i / (n - 1) - 0.5) * 2.4;
        let x = 16, y = 31;
        for (let s = 0; s < len; s++) {
            const droop = (s / len) * (s / len) * 6;
            x += Math.cos(ang); y += Math.sin(ang) + droop / len * 2;
            p.set(x, y, c);
            if (s % 2 === 0 && s > 2) { p.set(x + 1, y + 1, dark); p.set(x - 1, y + 1, dark); }
        }
    }
}

function drawMushroom(p, cx, h, capR, cap, spot, stem) {
    p.rect(cx - 1, 31 - h, 3, h, stem);
    p.ellipse(cx, 31 - h, capR, capR * 0.6, cap);
    if (spot) { p.set(cx - capR * 0.4, 31 - h - 1, spot); p.set(cx + capR * 0.3, 31 - h, spot); p.set(cx, 31 - h - capR * 0.4, spot); }
}

// Sprite library: draw(p, r) paints one variant; w/h are world size in units;
// sway is how much wind moves the top (0 for rocks)
const SPRITES = {
    // --- Grasses ---
    grassTuft: { w: 1.8, h: 1.6, sway: 1, draw: (p, r) => drawGrass(p, r, 12, 14, ['#5d9b3a', '#4c8a2f', '#71ad45']) },
    tallGrass: { w: 1.6, h: 2.8, sway: 1.2, draw: (p, r) => drawGrass(p, r, 10, 28, ['#6a9a3c', '#5a8a30', '#7fae4a']) },
    dryGrass: { w: 1.8, h: 2.2, sway: 1, draw: (p, r) => drawGrass(p, r, 11, 24, Object.assign(['#c2a95e', '#a98f48', '#d6c07a'], { tip: '#e3d49a' })) },
    frostGrass: { w: 1.6, h: 1.6, sway: 0.7, draw: (p, r) => drawGrass(p, r, 10, 16, Object.assign(['#7d9a86', '#6b8a76'], { tip: '#eef4f8' })) },
    beachGrass: { w: 1.8, h: 2.4, sway: 1.3, draw: (p, r) => drawGrass(p, r, 9, 26, Object.assign(['#b9b47a', '#a39f64'], { tip: '#ddd6a2' }), 16) },
    ashGrass: { w: 1.6, h: 1.4, sway: 0.6, draw: (p, r) => drawGrass(p, r, 7, 14, ['#5c5650', '#47423e', '#6e6862']) },
    sedge: { w: 1.8, h: 2.2, sway: 1, draw: (p, r) => drawGrass(p, r, 12, 24, ['#4a5e2a', '#3b4d22', '#5a6e34']) },
    reeds: {
        w: 1.6, h: 4, sway: 1.2, draw: (p, r) => {
            drawGrass(p, r, 8, 30, ['#6f8a3c', '#5b7631'], 12);
            for (let i = 0; i < 3; i++) { const x = 11 + r() * 10; p.line(x, 31, x, 3 + r() * 6, '#8a8a4a'); p.rect(x, 2 + r() * 4, 1, 3, '#8a6a3a'); }
        }
    },
    cattails: {
        w: 1.6, h: 4, sway: 1, draw: (p, r) => {
            drawGrass(p, r, 7, 26, ['#5f7d32', '#4f6b2a'], 14);
            for (let i = 0; i < 3; i++) { const x = 11 + r() * 10, top = 3 + r() * 6; p.line(x, 31, x, top, '#6b7d3a'); p.rect(x - 1, top + 2, 3, 6, '#6b4026'); }
        }
    },

    // --- Flowers ---
    daisies: { w: 1.8, h: 1.6, sway: 0.9, draw: (p, r) => drawFlowers(p, r, 6, '#f6f4ea', '#e8c53a') },
    poppies: { w: 1.8, h: 1.8, sway: 0.9, draw: (p, r) => drawFlowers(p, r, 5, '#d8322a', '#2a1a14', '#4c7a30', 16) },
    bluebells: { w: 1.6, h: 1.6, sway: 0.9, draw: (p, r) => drawFlowers(p, r, 6, '#5a6fd6', '#3c4fb0') },
    buttercups: { w: 1.6, h: 1.4, sway: 0.9, draw: (p, r) => drawFlowers(p, r, 7, '#f3d23a', '#c99a1a', '#4c7a30', 12) },
    wildflowers: {
        w: 2, h: 1.8, sway: 0.9, draw: (p, r) => {
            const cols = ['#e8659a', '#f3d23a', '#f6f4ea', '#8e6ad8', '#e8853a'];
            drawGrass(p, r, 7, 12, ['#4f8a34', '#3f7428']);
            for (let i = 0; i < 8; i++) { const x = 5 + r() * 22, y = 31 - 7 - r() * 9, c = cols[Math.floor(r() * cols.length)]; p.line(x, 31, x, y, '#3f7d2e'); p.ellipse(x, y, 1.2, 1.2, c); }
        }
    },
    lavender: { w: 1.6, h: 2, sway: 1, draw: (p, r) => drawSpikes(p, r, 7, 22, '#6a8a5a', '#9a7ad6') },
    fireweed: { w: 1.6, h: 2.6, sway: 1, draw: (p, r) => drawSpikes(p, r, 5, 28, '#5a7a3a', '#d65aa0') },
    sunflower: {
        w: 1.6, h: 4.2, sway: 0.6, draw: (p, r) => {
            const x = 15 + r() * 2; p.line(x, 31, x, 8, '#4f7d2a');
            p.ellipse(x - 3, 20, 3, 1.5, '#4f8a34'); p.ellipse(x + 3, 16, 3, 1.5, '#4f8a34');
            p.ellipse(x, 7, 6, 6, '#f2c21e'); p.ellipse(x, 7, 3, 3, '#5a3a1a');
        }
    },
    cherryPetals: {
        w: 2, h: 1.2, sway: 0.5, draw: (p, r) => {
            drawGrass(p, r, 8, 9, ['#6aa048', '#5a9040']);
            for (let i = 0; i < 18; i++) p.set(3 + r() * 26, 31 - r() * 6, r() > 0.5 ? '#f3b6cb' : '#e897b5');
        }
    },
    tundraBloom: {
        w: 1.6, h: 0.9, sway: 0.4, draw: (p, r) => {
            p.ellipse(16, 30, 12, 3, '#7a8a5e');
            for (let i = 0; i < 7; i++) { const x = 6 + r() * 20, y = 27 + r() * 3; p.ellipse(x, y, 1.2, 1, r() > 0.5 ? '#f2f0f6' : '#b48ad6'); }
        }
    },
    orchids: {
        w: 1.6, h: 2, sway: 0.8, draw: (p, r) => {
            drawFronds(p, r, 4, 10, '#2f7a2a', '#245e20');
            for (let i = 0; i < 4; i++) { const x = 10 + r() * 12, y = 8 + r() * 10; p.line(16, 26, x, y, '#4a6a2a'); p.ellipse(x, y, 2, 1.5, '#d23aa8'); p.set(x, y, '#f6e04a'); }
        }
    },
    desertBloom: {
        w: 1.6, h: 1.4, sway: 0.4, draw: (p, r) => {
            p.ellipse(16, 28, 7, 4, '#6b8a4a'); p.ellipse(15, 27, 4, 2, '#82a05a');
            for (let i = 0; i < 4; i++) p.ellipse(10 + r() * 12, 22 + r() * 4, 1.5, 1.5, r() > 0.5 ? '#f08a2a' : '#f2c84a');
        }
    },

    // --- Bushes ---
    bush: { w: 3, h: 2.6, sway: 0.3, draw: (p, r) => drawBlob(p, r, 16, 22, 13, 9, '#3f7a2e', '#5e9a3e', '#2c5a20') },
    berryBush: {
        w: 3, h: 2.6, sway: 0.3, draw: (p, r) => {
            drawBlob(p, r, 16, 22, 13, 9, '#356b2c', '#4f8a3a', '#244e1e');
            for (let i = 0; i < 12; i++) p.set(5 + r() * 22, 15 + r() * 14, r() > 0.3 ? '#c22a3a' : '#7a2ab0');
        }
    },
    flowerBush: {
        w: 3, h: 2.6, sway: 0.3, draw: (p, r) => {
            drawBlob(p, r, 16, 22, 13, 9, '#3f7a2e', '#5e9a3e', '#2c5a20');
            for (let i = 0; i < 14; i++) p.ellipse(5 + r() * 22, 14 + r() * 14, 1, 1, '#f2a6c8');
        }
    },
    azalea: {
        w: 3, h: 2.4, sway: 0.3, draw: (p, r) => {
            drawBlob(p, r, 16, 23, 13, 8, '#d0609a', '#ec8ab8', '#a8407a');
            for (let i = 0; i < 6; i++) p.set(5 + r() * 22, 18 + r() * 10, '#3f6a2e');
        }
    },
    dryBush: {
        w: 2.6, h: 2, sway: 0.4, draw: (p, r) => {
            for (let i = 0; i < 9; i++) p.line(16, 31, 6 + r() * 20, 14 + r() * 8, '#7a6440');
            drawBlob(p, r, 16, 22, 11, 7, '#8a8a4a', '#a6a45e', '#6a6a3a', 4);
        }
    },
    deadBush: {
        w: 2.4, h: 2, sway: 0.2, draw: (p, r) => {
            for (let i = 0; i < 8; i++) {
                const x = 4 + r() * 24, y = 10 + r() * 10;
                p.line(16, 31, x, y, '#7a5a34');
                p.line(x, y, x + (r() - 0.5) * 6, y - 3, '#8a6a42');
            }
        }
    },
    heather: {
        w: 2.4, h: 1.2, sway: 0.4, draw: (p, r) => {
            drawBlob(p, r, 16, 26, 13, 5, '#5a5a3a', '#6a6a44', '#44442c', 6);
            for (let i = 0; i < 20; i++) p.set(4 + r() * 24, 21 + r() * 7, r() > 0.5 ? '#a05aa8' : '#c07ac0');
        }
    },
    juniper: {
        w: 2, h: 2.4, sway: 0.2, draw: (p, r) => {
            for (let y = 4; y <= 31; y++) { const w = (y - 4) / 27 * 9; p.line(16 - w, y, 16 + w, y, y % 3 === 0 ? '#3a5a4a' : '#2e4a3c'); }
            for (let i = 0; i < 6; i++) p.set(10 + r() * 12, 10 + r() * 18, '#6a7aa8');
        }
    },
    snowyBush: {
        w: 2.6, h: 2, sway: 0.2, draw: (p, r) => {
            drawBlob(p, r, 16, 23, 12, 8, '#3a5a40', '#4a6a4a', '#2a4430');
            p.ellipse(13, 16, 7, 2.5, '#eef3f7'); p.ellipse(20, 18, 5, 2, '#dfe8ef');
        }
    },
    swampShrub: {
        w: 2.6, h: 2.4, sway: 0.4, draw: (p, r) => {
            drawBlob(p, r, 16, 21, 12, 8, '#4a5a2a', '#5a6a34', '#33401e');
            for (let i = 0; i < 6; i++) { const x = 6 + r() * 20; p.line(x, 22, x, 26 + r() * 5, '#6a7a4a'); }
        }
    },

    // --- Ferns & tropical ---
    fern: { w: 2.4, h: 1.8, sway: 0.8, draw: (p, r) => drawFronds(p, r, 7, 15, '#3f8a34', '#2f6a28') },
    largeFern: { w: 3.2, h: 2.6, sway: 0.8, draw: (p, r) => drawFronds(p, r, 9, 20, '#2e7a2e', '#205a22') },
    tropicalLeaves: {
        w: 3, h: 2.8, sway: 0.7, draw: (p, r) => {
            for (let i = 0; i < 5; i++) {
                const tx = 4 + i * 6 + (r() - 0.5) * 3, ty = 5 + r() * 10;
                p.line(16, 31, tx, ty + 6, '#2a5a1e');
                p.ellipse(tx, ty + 4, 3.5, 6, i % 2 ? '#2f8a2a' : '#3a9a34');
                p.line(tx, ty, tx, ty + 9, '#5ab04a');
            }
        }
    },
    bromeliad: {
        w: 2, h: 1.6, sway: 0.4, draw: (p, r) => {
            for (let i = 0; i < 7; i++) { const a = -Math.PI + (i / 6) * Math.PI; p.line(16, 30, 16 + Math.cos(a) * 13, 30 + Math.sin(a) * 12, '#3a8a3a'); }
            p.ellipse(16, 22, 3, 5, '#d8303a'); p.set(16, 18, '#f2c84a');
        }
    },
    bambooShoots: {
        w: 1.8, h: 4.5, sway: 0.6, draw: (p, r) => {
            for (let i = 0; i < 4; i++) {
                const x = 8 + i * 5 + r() * 2, top = 2 + r() * 10;
                p.rect(x, top, 2, 32 - top, '#7ab04a');
                for (let y = top + 5; y < 31; y += 6) p.rect(x, y, 2, 1, '#4a7a2a');
                p.line(x + 2, top + 4, x + 6, top + 1, '#5a9a3a');
            }
        }
    },
    palmetto: {
        w: 2.6, h: 2, sway: 0.6, draw: (p, r) => {
            for (let i = 0; i < 9; i++) { const a = -Math.PI * 0.95 + (i / 8) * Math.PI * 0.9; p.line(16, 31, 16 + Math.cos(a) * 15, 26 + Math.sin(a) * 18, i % 2 ? '#4a7a3a' : '#5a8a44'); }
        }
    },

    // --- Desert ---
    saguaro: {
        w: 2.2, h: 6, sway: 0, draw: (p, r) => {
            p.rect(14, 2, 5, 30, '#3f7a3a'); p.rect(14, 2, 1, 30, '#5a9a4a');
            const la = 10 + r() * 6, ra = 6 + r() * 8;
            p.rect(8, la, 6, 3, '#3f7a3a'); p.rect(8, la - 7, 3, 9, '#3f7a3a');
            p.rect(19, ra, 6, 3, '#3f7a3a'); p.rect(22, ra - 6, 3, 8, '#3f7a3a');
            for (let y = 4; y < 31; y += 3) p.set(16, y, '#2e5e2a');
        }
    },
    barrelCactus: {
        w: 1.4, h: 1.4, sway: 0, draw: (p, r) => {
            p.ellipse(16, 23, 8, 9, '#3f7a3a');
            for (let x = 10; x <= 22; x += 3) p.line(x, 16, x, 30, '#2e5e2a');
            p.ellipse(16, 14, 3, 1.5, r() > 0.5 ? '#e8a03a' : '#e05a7a');
        }
    },
    pricklyPear: {
        w: 2.2, h: 2.2, sway: 0, draw: (p, r) => {
            p.ellipse(16, 25, 5, 7, '#5a8a3a'); p.ellipse(10, 15, 4, 6, '#5a8a3a'); p.ellipse(22, 14, 4, 6, '#6a9a44');
            for (let i = 0; i < 4; i++) p.ellipse(8 + r() * 16, 8 + r() * 3, 1.3, 1.3, '#c2306a');
            for (let i = 0; i < 14; i++) p.set(8 + r() * 18, 10 + r() * 20, '#d8d8a0');
        }
    },
    agave: {
        w: 2.4, h: 1.8, sway: 0, draw: (p, r) => {
            for (let i = 0; i < 9; i++) { const a = -Math.PI * 0.92 + (i / 8) * Math.PI * 0.84; p.line(16, 31, 16 + Math.cos(a) * 14, 31 + Math.sin(a) * 22, i % 2 ? '#6a9a8a' : '#7aaa96'); }
        }
    },
    tumbleweed: {
        w: 1.8, h: 1.6, sway: 0.2, draw: (p, r) => {
            for (let i = 0; i < 26; i++) { const a = r() * Math.PI * 2, b = r() * Math.PI * 2; p.line(16 + Math.cos(a) * 9, 21 + Math.sin(a) * 9, 16 + Math.cos(b) * 9, 21 + Math.sin(b) * 9, i % 3 ? '#a08050' : '#80603a'); }
        }
    },

    // --- Rocks ---
    rock: { w: 2.4, h: 1.6, sway: 0, draw: (p, r) => drawRock(p, r, 20, 14, '#7a7a76', '#a2a29c', '#5c5c58') },
    boulder: { w: 5, h: 3.6, sway: 0, draw: (p, r) => drawRock(p, r, 30, 26, '#72706a', '#9a9890', '#54524e') },
    pebbles: {
        w: 1.8, h: 0.6, sway: 0, draw: (p, r) => {
            for (let i = 0; i < 6; i++) { const x = 4 + r() * 24; p.ellipse(x, 29, 2 + r() * 2, 1.5 + r(), r() > 0.5 ? '#8a8882' : '#6e6c66'); }
        }
    },
    mossyRock: {
        w: 2.6, h: 1.8, sway: 0, draw: (p, r) => {
            drawRock(p, r, 22, 16, '#6e6e68', '#8e8e86', '#52524e');
            for (let i = 0; i < 30; i++) p.set(6 + r() * 20, 15 + r() * 5, r() > 0.5 ? '#5a8a3a' : '#4a7a30');
        }
    },
    sandstone: {
        w: 2.8, h: 2.2, sway: 0, draw: (p, r) => {
            drawRock(p, r, 24, 20, '#c07a48', '#d8986a', '#9a5a34');
            for (let y = 14; y < 31; y += 4) p.line(5, y, 27, y, '#a8603a');
        }
    },
    snowRock: {
        w: 2.6, h: 1.8, sway: 0, draw: (p, r) => {
            drawRock(p, r, 22, 16, '#7e828a', '#9aa0a8', '#5e626a');
            p.ellipse(15, 16, 9, 3, '#f2f6fa'); p.ellipse(18, 17, 6, 2, '#e2eaf0');
        }
    },
    lavaRock: {
        w: 2.4, h: 1.6, sway: 0, draw: (p, r) => {
            drawRock(p, r, 22, 14, '#2e2a2a', '#4a4442', '#1e1a1a');
            for (let i = 0; i < 3; i++) { let x = 8 + r() * 16, y = 20 + r() * 6; for (let s = 0; s < 5; s++) { p.set(x, y, s % 2 ? '#f0702a' : '#ffa040'); x += (r() - 0.5) * 3; y += 1; } }
        }
    },
    obsidian: {
        w: 1.6, h: 2, sway: 0, draw: (p, r) => {
            for (let i = 0; i < 3; i++) { const x = 10 + i * 6, top = 6 + r() * 12; for (let y = top; y <= 31; y++) { const w = (y - top) / (31 - top) * 3; p.line(x - w, y, x + w, y, '#1a1424'); } p.line(x, top, x - 1, top + 8, '#5a4a7a'); }
        }
    },
    iceShard: {
        w: 1.6, h: 2.6, sway: 0, draw: (p, r) => {
            for (let i = 0; i < 3; i++) { const x = 9 + i * 7, top = 2 + r() * 14; for (let y = top; y <= 31; y++) { const w = (y - top) / (31 - top) * 3.5; p.line(x - w, y, x + w, y, '#9ad4e8'); } p.line(x, top + 1, x - 2, 31, '#e4f6fc'); }
        }
    },

    // --- Fungi ---
    toadstool: { w: 1.4, h: 1.4, sway: 0, draw: (p, r) => { drawMushroom(p, 16, 14, 9, '#c8282a', '#f6f4ea', '#ece4d4'); drawMushroom(p, 24, 7, 4, '#c8282a', '#f6f4ea', '#ece4d4'); } },
    brownMushrooms: {
        w: 1.4, h: 1, sway: 0, draw: (p, r) => {
            for (let i = 0; i < 4; i++) drawMushroom(p, 7 + i * 6 + r() * 2, 5 + r() * 6, 3 + r() * 2, '#8a5a34', null, '#d8ccb4');
        }
    },
    glowShrooms: {
        w: 1.6, h: 1.6, sway: 0, draw: (p, r) => {
            for (let i = 0; i < 3; i++) drawMushroom(p, 8 + i * 8, 8 + r() * 10, 4 + r() * 2, i % 2 ? '#5ae0d8' : '#a86ae8', '#e8fcff', '#cfc4e0');
        }
    },
    myceliumShrooms: {
        w: 2, h: 2.4, sway: 0, draw: (p, r) => {
            drawMushroom(p, 14, 22, 11, '#8a4ab0', '#d8b8ea', '#e6dcef');
            drawMushroom(p, 25, 9, 5, '#a05ac0', null, '#e6dcef');
        }
    },

    // --- Ground cover & misc ---
    moss: { w: 2, h: 0.6, sway: 0, draw: (p, r) => { p.ellipse(16, 30, 13, 4, '#4a6a2e'); for (let i = 0; i < 20; i++) p.set(4 + r() * 24, 27 + r() * 4, r() > 0.5 ? '#5e823a' : '#3a5824'); } },
    lichen: { w: 2, h: 0.5, sway: 0, draw: (p, r) => { p.ellipse(16, 30, 12, 3, '#8a948a'); for (let i = 0; i < 16; i++) p.set(5 + r() * 22, 28 + r() * 3, r() > 0.5 ? '#a8b0a0' : '#c2b86a'); } },
    driftwood: {
        w: 2.8, h: 0.8, sway: 0, draw: (p, r) => {
            p.rect(3, 26, 26, 4, '#9a8a6a'); p.rect(3, 26, 26, 1, '#bcae8e'); p.line(22, 26, 27, 20, '#9a8a6a');
            for (let x = 5; x < 28; x += 5) p.set(x, 28, '#7a6a4e');
        }
    },
    seaweed: { w: 1.4, h: 1.2, sway: 1, draw: (p, r) => { for (let i = 0; i < 6; i++) { const x = 8 + r() * 16; for (let y = 31; y > 16 + r() * 6; y--) p.set(x + Math.sin(y * 0.6 + i) * 1.5, y, i % 2 ? '#2e6a4a' : '#3a7a3a'); } } },
    shells: {
        w: 1.4, h: 0.4, sway: 0, draw: (p, r) => {
            for (let i = 0; i < 5; i++) p.ellipse(5 + r() * 22, 29 + r() * 2, 1.6, 1.2, ['#f2e6d8', '#e8b8a0', '#d8d0c8'][i % 3]);
        }
    },
    mangroveRoots: {
        w: 2.6, h: 1.8, sway: 0, draw: (p, r) => {
            for (let i = 0; i < 6; i++) { const x0 = 3 + i * 5, x1 = x0 + 6 + r() * 4; for (let s = 0; s <= 10; s++) { const t = s / 10; p.set(x0 + (x1 - x0) * t, 31 - Math.sin(t * Math.PI) * (8 + r() * 4), '#5a4430'); } }
            p.rect(14, 4, 4, 18, '#5a4430');
        }
    },
    charredStump: {
        w: 1.6, h: 1.4, sway: 0, draw: (p, r) => {
            p.rect(11, 14, 10, 18, '#2a2422'); p.rect(11, 14, 2, 18, '#3e3634');
            for (let i = 0; i < 4; i++) p.set(12 + r() * 8, 16 + r() * 14, '#d8602a');
            p.line(11, 14, 14, 11, '#2a2422'); p.line(21, 14, 19, 9, '#2a2422');
        }
    },
    fallenLog: {
        w: 3.2, h: 1, sway: 0, draw: (p, r) => {
            p.rect(2, 23, 28, 7, '#6a4a2e'); p.rect(2, 23, 28, 2, '#8a6a44'); p.ellipse(29, 26, 2, 3.5, '#b08a5a');
            for (let i = 0; i < 10; i++) p.set(4 + r() * 22, 22 + r() * 2, '#4a7a30');
        }
    }
};

// Biome planting tables: density scales candidates per chunk; types are
// [spriteName, weight]. snowy/cold high ground switches to the alpine table.
const BIOME_SHRUBS = {
    // Frozen
    snowyPeaks: { density: 0.25, types: [['snowRock', 3], ['boulder', 1], ['iceShard', 0.5], ['lichen', 1]] },
    iceSpikes: { density: 0.35, types: [['iceShard', 4], ['snowRock', 2], ['frostGrass', 1]] },
    snowySlopes: { density: 0.35, types: [['snowRock', 2], ['frostGrass', 2], ['snowyBush', 1.5], ['lichen', 1]] },
    tundra: { density: 0.5, types: [['lichen', 3], ['frostGrass', 3], ['tundraBloom', 2], ['moss', 2], ['pebbles', 1], ['snowyBush', 0.6]] },
    taiga: { density: 0.75, types: [['juniper', 2], ['moss', 2.5], ['fern', 2], ['brownMushrooms', 1], ['frostGrass', 1.5], ['fallenLog', 0.6], ['mossyRock', 0.8], ['berryBush', 0.5]] },

    // Cold
    coldForest: { density: 0.8, types: [['fern', 3], ['moss', 2], ['brownMushrooms', 1], ['toadstool', 0.5], ['juniper', 1], ['fallenLog', 0.8], ['mossyRock', 1], ['bluebells', 0.8]] },
    coldPlains: { density: 0.7, types: [['grassTuft', 4], ['dryGrass', 2], ['heather', 2], ['fireweed', 1], ['pebbles', 0.6], ['juniper', 0.6]] },

    // Temperate
    mountains: { density: 0.4, types: [['rock', 3], ['boulder', 1.2], ['pebbles', 2], ['heather', 1], ['lichen', 1.5], ['juniper', 0.6]] },
    highlands: { density: 0.65, types: [['heather', 3], ['grassTuft', 3], ['mossyRock', 1.5], ['rock', 1], ['fireweed', 0.8], ['bluebells', 0.6]] },
    forest: { density: 1.0, types: [['fern', 3], ['bush', 2], ['berryBush', 1.2], ['brownMushrooms', 1], ['toadstool', 0.6], ['fallenLog', 0.8], ['mossyRock', 0.8], ['bluebells', 1], ['grassTuft', 1.5]] },
    plains: { density: 0.9, types: [['grassTuft', 5], ['tallGrass', 3], ['daisies', 1.5], ['buttercups', 1.5], ['poppies', 0.8], ['bush', 0.8], ['rock', 0.3]] },
    meadow: { density: 1.0, types: [['wildflowers', 3], ['daisies', 2], ['poppies', 1.5], ['lavender', 1.2], ['buttercups', 1.5], ['tallGrass', 2], ['grassTuft', 2], ['flowerBush', 0.5]] },
    cherryGrove: { density: 1.0, types: [['cherryPetals', 4], ['azalea', 2], ['grassTuft', 2], ['daisies', 1], ['flowerBush', 1], ['mossyRock', 0.5]] },
    mushroomFields: { density: 0.9, types: [['myceliumShrooms', 2], ['glowShrooms', 2.5], ['brownMushrooms', 2], ['toadstool', 1], ['moss', 1.5]] },

    // Warm
    grassland: { density: 0.9, types: [['tallGrass', 4], ['grassTuft', 3], ['dryGrass', 2], ['wildflowers', 1], ['sunflower', 0.5], ['bush', 0.6]] },
    savanna: { density: 0.7, types: [['dryGrass', 5], ['tallGrass', 2], ['dryBush', 1.5], ['deadBush', 0.8], ['rock', 0.5], ['agave', 0.4]] },
    warmForest: { density: 1.0, types: [['fern', 3], ['largeFern', 1.5], ['bush', 2], ['flowerBush', 1], ['toadstool', 0.5], ['fallenLog', 0.6], ['wildflowers', 1]] },

    // Hot
    desert: { density: 0.35, types: [['deadBush', 3], ['tumbleweed', 1.5], ['barrelCactus', 1.5], ['saguaro', 1], ['pricklyPear', 1.2], ['agave', 1], ['desertBloom', 0.8], ['pebbles', 1]] },
    badlands: { density: 0.4, types: [['sandstone', 3], ['deadBush', 2.5], ['dryGrass', 1.5], ['pebbles', 1.5], ['barrelCactus', 0.6], ['tumbleweed', 0.6]] },
    jungle: { density: 1.0, types: [['tropicalLeaves', 3], ['largeFern', 3], ['bromeliad', 1.5], ['orchids', 1], ['palmetto', 1.5], ['fern', 2], ['glowShrooms', 0.2]] },
    bambooJungle: { density: 1.0, types: [['bambooShoots', 4], ['tropicalLeaves', 2], ['largeFern', 2], ['fern', 1.5], ['bromeliad', 0.6]] },
    swamp: { density: 0.95, types: [['cattails', 3], ['reeds', 2.5], ['sedge', 3], ['swampShrub', 2], ['brownMushrooms', 1], ['fallenLog', 0.8], ['moss', 1]] },
    mangroveSwamp: { density: 0.9, types: [['mangroveRoots', 3], ['reeds', 2], ['sedge', 2], ['palmetto', 1], ['swampShrub', 1]] },
    volcanicPeaks: { density: 0.45, types: [['lavaRock', 3], ['obsidian', 2], ['charredStump', 1.5], ['ashGrass', 2], ['boulder', 0.5]] },

    // Coastal
    beach: { density: 0.45, types: [['beachGrass', 4], ['driftwood', 1.2], ['shells', 2], ['seaweed', 1], ['palmetto', 0.5]] },
    stonyShore: { density: 0.5, types: [['rock', 3], ['pebbles', 3], ['seaweed', 1.5], ['lichen', 1], ['driftwood', 0.6]] }
};

const ALPINE_SHRUBS = { density: 0.35, types: [['snowRock', 3], ['frostGrass', 2], ['lichen', 1.5], ['snowyBush', 1]] };

// Water's edge planting (lake shores, river banks) by shore climate
const SHORE_SHRUBS = {
    temperate: { density: 1.0, types: [['cattails', 3], ['reeds', 3], ['sedge', 3], ['bluebells', 1], ['mossyRock', 0.6], ['fallenLog', 0.3], ['swampShrub', 0.5]] },
    cold: { density: 0.6, types: [['sedge', 3], ['frostGrass', 2], ['pebbles', 2], ['mossyRock', 1.5], ['lichen', 1], ['snowRock', 0.5]] },
    arid: { density: 0.9, types: [['reeds', 3], ['palmetto', 2.5], ['beachGrass', 2], ['desertBloom', 1], ['tallGrass', 1]] },
    tropical: { density: 1.0, types: [['reeds', 2], ['tropicalLeaves', 2], ['bromeliad', 1.5], ['mangroveRoots', 1], ['sedge', 2], ['orchids', 0.5]] }
};

// Small ground-cover sprites are planted densely, but only in chunks near the
// player (detail layer); everything else is planted in every loaded chunk
const DETAIL_SPRITES = new Set(['grassTuft', 'tallGrass', 'dryGrass', 'frostGrass', 'beachGrass', 'ashGrass',
    'sedge', 'daisies', 'poppies', 'bluebells', 'buttercups', 'wildflowers', 'lavender', 'cherryPetals',
    'tundraBloom', 'desertBloom', 'moss', 'lichen', 'pebbles', 'shells', 'brownMushrooms', 'seaweed']);

// Split each planting table into its feature and detail halves
for (const table of [...Object.values(BIOME_SHRUBS), ALPINE_SHRUBS, ...Object.values(SHORE_SHRUBS)]) {
    table.feature = table.types.filter(t => !DETAIL_SPRITES.has(t[0]));
    table.detail = table.types.filter(t => DETAIL_SPRITES.has(t[0]));
}

// Configuration
const SHRUB_CONFIG = {
    layers: {
        feature: { candidates: 420, salt: 0x51 },   // Every loaded chunk
        detail: { candidates: 3200, salt: 0xd7 }    // Only chunks near the player
    },
    detailChunkRadius: 1,    // Detail layer in a (2r+1)^2 block of chunks around the player
    minSlopeSkip: 1.4,       // Skip spots steeper than this (rise/run) - no plants on cliff faces
    sizeScale: 2.4,          // World size multiplier for sprite w/h
    scaleMin: 0.8,
    scaleMax: 1.35,
    baseSink: 0.08           // Push bases slightly into the ground
};

// ============================================================================
// Atlas + material
// ============================================================================

let shrubAtlas = null;      // CanvasTexture
let shrubMaterial = null;
let shrubGeometry = null;
const spriteTiles = {};     // name -> [{u, v}] per variant
const chunkShrubs = new Map(); // chunk key -> { cx, cz, data, feature, detail } (layers: { mesh, entries })

function buildShrubAtlas() {
    const canvas = document.createElement('canvas');
    canvas.width = ATLAS_COLS * SPRITE_PX;
    canvas.height = ATLAS_ROWS * SPRITE_PX;
    const ctx = canvas.getContext('2d');

    let tile = 0;
    for (const [name, def] of Object.entries(SPRITES)) {
        spriteTiles[name] = [];
        for (let v = 0; v < SPRITE_VARIANTS; v++) {
            if (tile >= ATLAS_COLS * ATLAS_ROWS) {
                console.warn('Shrub atlas full, skipping', name);
                break;
            }
            const col = tile % ATLAS_COLS, row = Math.floor(tile / ATLAS_COLS);
            const seed = [...name].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 7) + v * 977;
            def.draw(makePainter(ctx, col * SPRITE_PX, row * SPRITE_PX), makeRng(seed));
            spriteTiles[name].push({ u: col / ATLAS_COLS, v: 1 - (row + 1) / ATLAS_ROWS });
            tile++;
        }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    texture.generateMipmaps = false;
    return texture;
}

function buildShrubMaterial(atlas) {
    const material = new THREE.MeshLambertMaterial({
        map: atlas,
        alphaTest: 0.5,
        side: THREE.DoubleSide
    });

    // Cylindrical billboarding, atlas tile lookup and wind sway in the vertex shader
    material.onBeforeCompile = (shader) => {
        shader.uniforms.time = { value: 0 };
        shader.uniforms.tileSize = { value: new THREE.Vector2(1 / ATLAS_COLS, 1 / ATLAS_ROWS) };

        shader.vertexShader = shader.vertexShader
            .replace('#include <common>', `#include <common>
            attribute vec2 spriteTile;
            attribute float spriteSway;
            uniform float time;
            uniform vec2 tileSize;`)
            .replace('#include <uv_vertex>', `#include <uv_vertex>
            vMapUv = spriteTile + vMapUv * tileSize;`)
            .replace('#include <begin_vertex>', `#include <begin_vertex>
            vec3 instPos = instanceMatrix[3].xyz;
            vec2 toCam = cameraPosition.xz - instPos.xz;
            float ang = atan(toCam.x, toCam.y);
            float sway = sin(time * 1.6 + instPos.x * 0.35 + instPos.z * 0.25) * spriteSway * position.y * 0.12;
            transformed = vec3((position.x + sway) * cos(ang), position.y, -(position.x + sway) * sin(ang));`);

        material.userData.shader = shader;
    };

    return material;
}

function buildShrubGeometry() {
    // Unit quad anchored at its bottom center; normals point up so sprites are
    // lit like the ground they stand on
    const geometry = new THREE.PlaneGeometry(1, 1);
    geometry.translate(0, 0.5, 0);
    const normals = geometry.attributes.normal;
    for (let i = 0; i < normals.count; i++) normals.setXYZ(i, 0, 1, 0);
    return geometry;
}

// ============================================================================
// Placement
// ============================================================================

// Height of the rendered ground mesh at a point inside a chunk - same triangle
// split as THREE.PlaneGeometry, so sprites sit exactly on the visible surface
function chunkSurfaceHeight(chunkData, x, z) {
    const segments = CHUNK_CONFIG.segments;
    const size = CHUNK_CONFIG.size;
    const b = chunkData.bounds;
    const lx = Math.max(0, Math.min(segments - 1e-6, ((x - b.minX) / size) * segments));
    const lz = Math.max(0, Math.min(segments - 1e-6, ((z - b.minZ) / size) * segments));
    const x0 = Math.floor(lx), z0 = Math.floor(lz);
    const dx = lx - x0, dz = lz - z0;
    const hm = chunkData.heightmap;
    const h00 = hm[z0][x0], h10 = hm[z0][x0 + 1], h01 = hm[z0 + 1][x0], h11 = hm[z0 + 1][x0 + 1];

    if (dx + dz <= 1) return h00 + (h10 - h00) * dx + (h01 - h00) * dz;
    return h11 + (h01 - h11) * (1 - dx) + (h10 - h11) * (1 - dz);
}

// Ground height under a sprite: the lowest point under its footprint, so on a
// slope the base never hangs in the air (the uphill side tucks into the ground)
function spriteBaseHeight(chunkData, x, z, halfWidth) {
    let h = chunkSurfaceHeight(chunkData, x, z);
    for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        h = Math.min(h, chunkSurfaceHeight(chunkData, x + Math.cos(a) * halfWidth, z + Math.sin(a) * halfWidth));
    }
    return h - SHRUB_CONFIG.baseSink;
}

function pickWeighted(types, r) {
    let total = 0;
    for (const t of types) total += t[1];
    let roll = r() * total;
    for (const t of types) {
        roll -= t[1];
        if (roll <= 0) return t[0];
    }
    return types[0][0];
}

function chunkSeed(cx, cz) {
    let h = 2166136261;
    for (const n of [cx, cz, 0x5eed]) {
        h = Math.imul(h ^ (n & 0xffff), 16777619);
        h = Math.imul(h ^ (n >>> 16), 16777619);
    }
    return h >>> 0;
}

// Plant one layer of a chunk; returns { mesh, entries } (mesh null if empty)
function buildShrubLayer(cx, cz, chunkData, layerName) {
    const layer = SHRUB_CONFIG.layers[layerName];
    const r = makeRng(chunkSeed(cx, cz) ^ layer.salt);
    const segments = CHUNK_CONFIG.segments;
    const size = CHUNK_CONFIG.size;
    const b = chunkData.bounds;
    const step = size / segments;
    const placed = [];

    for (let i = 0; i < layer.candidates; i++) {
        const x = b.minX + r() * size;
        const z = b.minZ + r() * size;
        const roll = r(), pickRoll = r(), blendRoll = r();

        // Nearest grid vertex carries biome, water and snow info
        const gx = Math.round((x - b.minX) / step), gz = Math.round((z - b.minZ) / step);
        const data = chunkData.biomeData[gz][gx];
        if (!data || data.isWater || data.isCaveEntrance || !data.biome) continue;

        // Dry land only
        const waterLevel = data.waterLevel ?? -5;
        if (chunkSurfaceHeight(chunkData, x, z) < waterLevel + 0.15) continue;

        // No plants on cliff faces
        const hx = chunkSurfaceHeight(chunkData, x + 1, z) - chunkSurfaceHeight(chunkData, x - 1, z);
        const hz = chunkSurfaceHeight(chunkData, x, z + 1) - chunkSurfaceHeight(chunkData, x, z - 1);
        if (Math.sqrt(hx * hx + hz * hz) / 2 > SHRUB_CONFIG.minSlopeSkip) continue;

        // Near borders, plant from the neighbor biome too so vegetation mixes
        let biome = data.biome;
        if (data.blendBiome && blendRoll < data.blendWeight) biome = data.blendBiome;
        const ground = chunkSurfaceHeight(chunkData, x, z);
        let table;
        if ((data.snow || 0) > 0.5) table = ALPINE_SHRUBS;
        else if (typeof isShoreHeight === 'function' && isShoreHeight(ground, 2.5, waterLevel) && !SHORE_BIOMES.has(biome.id)) table = SHORE_SHRUBS[getShoreClass(data.climate, ground)];
        else table = BIOME_SHRUBS[biome.id] || BIOME_SHRUBS.plains;
        const types = table[layerName];
        if (types.length === 0 || roll > table.density) continue;

        const name = pickWeighted(types, () => pickRoll);
        const def = SPRITES[name];
        const tiles = spriteTiles[name];
        if (!def || !tiles || tiles.length === 0) continue;

        const s = (SHRUB_CONFIG.scaleMin + r() * (SHRUB_CONFIG.scaleMax - SHRUB_CONFIG.scaleMin)) * SHRUB_CONFIG.sizeScale;
        placed.push({
            x, z, name,
            w: def.w * s,
            h: def.h * s,
            tile: tiles[Math.floor(r() * tiles.length)],
            sway: def.sway,
            tint: 0.85 + r() * 0.25
        });
    }

    if (placed.length === 0) return { mesh: null, entries: [] };

    // Per-layer geometry shares the quad buffers and adds per-instance attributes
    const tileAttr = new Float32Array(placed.length * 2);
    const swayAttr = new Float32Array(placed.length);
    const geometry = new THREE.BufferGeometry();
    geometry.setIndex(shrubGeometry.index);
    for (const name of ['position', 'normal', 'uv']) geometry.setAttribute(name, shrubGeometry.attributes[name]);
    geometry.setAttribute('spriteTile', new THREE.InstancedBufferAttribute(tileAttr, 2));
    geometry.setAttribute('spriteSway', new THREE.InstancedBufferAttribute(swayAttr, 1));

    const mesh = new THREE.InstancedMesh(geometry, shrubMaterial, placed.length);
    const matrix = new THREE.Matrix4();
    const color = new THREE.Color();
    const entries = [];

    placed.forEach((sp, i) => {
        const y = spriteBaseHeight(chunkData, sp.x, sp.z, sp.w * 0.35);
        matrix.makeScale(sp.w, sp.h, sp.w).setPosition(sp.x, y, sp.z);
        mesh.setMatrixAt(i, matrix);
        mesh.setColorAt(i, color.setScalar(sp.tint));
        tileAttr[i * 2] = sp.tile.u;
        tileAttr[i * 2 + 1] = sp.tile.v;
        swayAttr[i] = sp.sway;
        entries.push({ position: new THREE.Vector3(sp.x, y, sp.z), index: i, w: sp.w, h: sp.h, type: sp.name });
    });

    mesh.computeBoundingSphere();
    mesh.boundingSphere.radius += 8;
    mesh.receiveShadow = true;
    mesh.castShadow = false;
    mesh.name = `shrubs_${layerName}_${cx},${cz}`;
    scene.add(mesh);
    return { mesh, entries };
}

function disposeShrubLayer(layer) {
    if (!layer || !layer.mesh) return;
    scene.remove(layer.mesh);
    // Only dispose the per-layer instance attributes, not the shared quad
    const geometry = layer.mesh.geometry;
    geometry.deleteAttribute('position');
    geometry.deleteAttribute('normal');
    geometry.deleteAttribute('uv');
    geometry.setIndex(null);
    geometry.dispose();
    layer.mesh.dispose();
}

// Add the feature layer for a newly loaded chunk (detail follows the player)
function addChunkShrubs(cx, cz, chunkData) {
    if (!shrubMaterial || !Number.isFinite(cx) || !Number.isFinite(cz)) return;
    const key = `${cx},${cz}`;
    if (chunkShrubs.has(key)) return;
    chunkShrubs.set(key, { cx, cz, data: chunkData, feature: buildShrubLayer(cx, cz, chunkData, 'feature'), detail: null });
    lastDetailChunk = null; // Re-evaluate detail layers
}

// Remove a chunk's shrubs when the chunk unloads
function removeChunkShrubs(key) {
    const chunk = chunkShrubs.get(key);
    if (!chunk) return;
    disposeShrubLayer(chunk.feature);
    disposeShrubLayer(chunk.detail);
    chunkShrubs.delete(key);
}

// Keep dense ground cover only in chunks around the player
let lastDetailChunk = null;
function updateDetailLayers() {
    const player = typeof character !== 'undefined' && character ? character.position : null;
    if (!player || !Number.isFinite(player.x) || !Number.isFinite(player.z)) return;
    const pc = worldToChunk(player.x, player.z);
    const pcKey = `${pc.x},${pc.z}`;
    if (pcKey === lastDetailChunk) return;
    lastDetailChunk = pcKey;

    const radius = SHRUB_CONFIG.detailChunkRadius;
    chunkShrubs.forEach(chunk => {
        const near = Math.abs(chunk.cx - pc.x) <= radius && Math.abs(chunk.cz - pc.z) <= radius;
        if (near && !chunk.detail) {
            chunk.detail = buildShrubLayer(chunk.cx, chunk.cz, chunk.data, 'detail');
        } else if (!near && chunk.detail) {
            disposeShrubLayer(chunk.detail);
            chunk.detail = null;
        }
    });
}

// Re-seat shrubs after terraforming changes the ground
function updateShrubsInBounds(minX, maxX, minZ, maxZ) {
    const matrix = new THREE.Matrix4();
    chunkShrubs.forEach(chunk => {
        for (const layer of [chunk.feature, chunk.detail]) {
            if (!layer || !layer.mesh) continue;
            let changed = false;
            for (const e of layer.entries) {
                if (e.position.x < minX || e.position.x > maxX || e.position.z < minZ || e.position.z > maxZ) continue;
                e.position.y = spriteBaseHeight(chunk.data, e.position.x, e.position.z, e.w * 0.35);
                matrix.makeScale(e.w, e.h, e.w).setPosition(e.position.x, e.position.y, e.position.z);
                layer.mesh.setMatrixAt(e.index, matrix);
                changed = true;
            }
            if (changed) layer.mesh.instanceMatrix.needsUpdate = true;
        }
    });
}

// Set up the shared atlas/material and plant every chunk that is already loaded
function createShrubs() {
    if (!shrubMaterial) {
        shrubAtlas = buildShrubAtlas();
        shrubMaterial = buildShrubMaterial(shrubAtlas);
        shrubGeometry = buildShrubGeometry();
    }
    if (typeof loadedChunks !== 'undefined') {
        loadedChunks.forEach(chunk => addChunkShrubs(chunk.cx, chunk.cz, chunk.data));
    }
}

// Clean up shrubs
function disposeShrubs() {
    [...chunkShrubs.keys()].forEach(removeChunkShrubs);
}

// Get shrub config for external use
function getShrubConfig() {
    return SHRUB_CONFIG;
}

// Flat list of all shrubs currently placed (for external queries)
function getShrubData() {
    const all = [];
    chunkShrubs.forEach(chunk => {
        if (chunk.feature) all.push(...chunk.feature.entries);
        if (chunk.detail) all.push(...chunk.detail.entries);
    });
    return all;
}

// Make available globally
window.createShrubs = createShrubs;
window.addChunkShrubs = addChunkShrubs;
window.removeChunkShrubs = removeChunkShrubs;
window.updateShrubsInBounds = updateShrubsInBounds;
window.disposeShrubs = disposeShrubs;
window.getShrubConfig = getShrubConfig;
window.getShrubData = getShrubData;
