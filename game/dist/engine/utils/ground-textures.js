// Ground Texture System - Procedural hand-painted style textures
// Creates a texture atlas for terrain with slope-based rock blending

const GROUND_TEXTURES = {
    atlas: null,
    atlasTexture: null,
    ready: false,
    enabled: true, // On by default

    // Texture types and their atlas positions
    types: {
        grass: { x: 0, y: 0 },
        dirt: { x: 1, y: 0 },
        sand: { x: 2, y: 0 },
        snow: { x: 0, y: 1 },
        rock: { x: 1, y: 1 },
        mud: { x: 2, y: 1 }
    },

    // Atlas dimensions
    tileSize: 128,
    tilesX: 3,
    tilesY: 2
};

// Initialize the ground texture system
function initGroundTextures() {
    const tileSize = GROUND_TEXTURES.tileSize;
    const atlasWidth = tileSize * GROUND_TEXTURES.tilesX;
    const atlasHeight = tileSize * GROUND_TEXTURES.tilesY;

    // Create atlas canvas
    const canvas = document.createElement('canvas');
    canvas.width = atlasWidth;
    canvas.height = atlasHeight;
    const ctx = canvas.getContext('2d');

    // Generate each texture type
    generateGrassTexture(ctx, 0, 0, tileSize);
    generateDirtTexture(ctx, tileSize, 0, tileSize);
    generateSandTexture(ctx, tileSize * 2, 0, tileSize);
    generateSnowTexture(ctx, 0, tileSize, tileSize);
    generateRockTexture(ctx, tileSize, tileSize, tileSize);
    generateMudTexture(ctx, tileSize * 2, tileSize, tileSize);

    // Create Three.js texture from canvas
    GROUND_TEXTURES.atlas = canvas;
    GROUND_TEXTURES.atlasTexture = new THREE.CanvasTexture(canvas);
    GROUND_TEXTURES.atlasTexture.wrapS = THREE.ClampToEdgeWrapping;
    GROUND_TEXTURES.atlasTexture.wrapT = THREE.ClampToEdgeWrapping;
    GROUND_TEXTURES.atlasTexture.magFilter = THREE.NearestFilter;
    GROUND_TEXTURES.atlasTexture.minFilter = THREE.NearestFilter;
    GROUND_TEXTURES.atlasTexture.generateMipmaps = false;
    GROUND_TEXTURES.ready = true;

    gameLog('Ground textures initialized');
}

// Helper to draw a shape at position, wrapping around edges for seamless tiling
function drawWrapped(ctx, x, y, size, drawFunc) {
    // Draw at original position
    drawFunc(x, y);
    // Wrap horizontally
    drawFunc(x - size, y);
    drawFunc(x + size, y);
    // Wrap vertically
    drawFunc(x, y - size);
    drawFunc(x, y + size);
    // Wrap diagonally
    drawFunc(x - size, y - size);
    drawFunc(x + size, y - size);
    drawFunc(x - size, y + size);
    drawFunc(x + size, y + size);
}

// Hand-painted grass texture - lighter to work with vertex color tinting
function generateGrassTexture(ctx, x, y, size) {
    // Lighter base green (closer to biome colors)
    ctx.fillStyle = '#7cb83d';
    ctx.fillRect(x, y, size, size);

    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, size, size);
    ctx.clip();

    // Add subtle brush stroke variations (wrapped for seamless tiling)
    const strokes = 50;
    for (let i = 0; i < strokes; i++) {
        const sx = Math.random() * size;
        const sy = Math.random() * size;
        const length = 6 + Math.random() * 14;
        const width = 2 + Math.random() * 3;
        const angle = -0.3 + Math.random() * 0.6;
        const shade = Math.floor(Math.random() * 30) - 15;

        drawWrapped(ctx, sx, sy, size, (px, py) => {
            ctx.fillStyle = `rgb(${124 + shade}, ${184 + shade}, ${61 + shade})`;
            ctx.save();
            ctx.translate(x + px, y + py);
            ctx.rotate(angle);
            ctx.fillRect(-width / 2, 0, width, length);
            ctx.restore();
        });
    }

    // Subtle darker accents (wrapped)
    for (let i = 0; i < 15; i++) {
        const sx = Math.random() * size;
        const sy = Math.random() * size;
        const radius = 2 + Math.random() * 3;

        drawWrapped(ctx, sx, sy, size, (px, py) => {
            ctx.fillStyle = 'rgba(80, 140, 50, 0.3)';
            ctx.beginPath();
            ctx.arc(x + px, y + py, radius, 0, Math.PI * 2);
            ctx.fill();
        });
    }

    ctx.restore();
}

// Hand-painted dirt texture - lighter browns
function generateDirtTexture(ctx, x, y, size) {
    ctx.fillStyle = '#a08060';
    ctx.fillRect(x, y, size, size);

    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, size, size);
    ctx.clip();

    // Add earth tone variations (wrapped)
    for (let i = 0; i < 35; i++) {
        const px = Math.random() * size;
        const py = Math.random() * size;
        const psize = 5 + Math.random() * 12;
        const r = 140 + Math.floor(Math.random() * 40);
        const g = 110 + Math.floor(Math.random() * 30);
        const b = 80 + Math.floor(Math.random() * 25);
        const angle = Math.random() * Math.PI;

        drawWrapped(ctx, px, py, size, (wx, wy) => {
            ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.5)`;
            ctx.beginPath();
            ctx.ellipse(x + wx, y + wy, psize, psize * 0.7, angle, 0, Math.PI * 2);
            ctx.fill();
        });
    }

    // Small pebbles (wrapped)
    for (let i = 0; i < 20; i++) {
        const px = Math.random() * size;
        const py = Math.random() * size;
        const r = 120 + Math.random() * 40;
        const g = 95 + Math.random() * 30;
        const b = 70 + Math.random() * 20;
        const w = 2 + Math.random() * 3;
        const h = 1.5 + Math.random() * 2;
        const angle = Math.random() * Math.PI;

        drawWrapped(ctx, px, py, size, (wx, wy) => {
            ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.6)`;
            ctx.beginPath();
            ctx.ellipse(x + wx, y + wy, w, h, angle, 0, Math.PI * 2);
            ctx.fill();
        });
    }

    ctx.restore();
}

// Hand-painted sand texture - warm tan
function generateSandTexture(ctx, x, y, size) {
    ctx.fillStyle = '#e0d0a0';
    ctx.fillRect(x, y, size, size);

    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, size, size);
    ctx.clip();

    // Scattered grains (wrapped)
    for (let i = 0; i < 60; i++) {
        const gx = Math.random() * size;
        const gy = Math.random() * size;
        const shade = Math.floor(Math.random() * 30) - 15;
        const w = 1 + Math.random() * 3;
        const h = 1 + Math.random() * 3;

        drawWrapped(ctx, gx, gy, size, (wx, wy) => {
            ctx.fillStyle = `rgba(${220 + shade}, ${200 + shade}, ${160 + shade}, 0.4)`;
            ctx.fillRect(x + wx, y + wy, w, h);
        });
    }

    ctx.restore();
}

// Hand-painted snow texture
function generateSnowTexture(ctx, x, y, size) {
    ctx.fillStyle = '#eef4f8';
    ctx.fillRect(x, y, size, size);

    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, size, size);
    ctx.clip();

    // Soft crystalline patches (wrapped)
    for (let i = 0; i < 35; i++) {
        const sx = Math.random() * size;
        const sy = Math.random() * size;
        const ssize = 8 + Math.random() * 20;
        const blue = Math.floor(Math.random() * 20);

        drawWrapped(ctx, sx, sy, size, (wx, wy) => {
            ctx.fillStyle = `rgba(${235 - blue}, ${240 - blue / 2}, ${255}, 0.5)`;
            ctx.beginPath();
            ctx.arc(x + wx, y + wy, ssize, 0, Math.PI * 2);
            ctx.fill();
        });
    }

    // Sparkle points (wrapped)
    for (let i = 0; i < 20; i++) {
        const sx = Math.random() * size;
        const sy = Math.random() * size;

        drawWrapped(ctx, sx, sy, size, (wx, wy) => {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.fillRect(x + wx, y + wy, 2, 2);
        });
    }

    ctx.restore();
}

// Hand-painted rock texture - lighter gray
function generateRockTexture(ctx, x, y, size) {
    ctx.fillStyle = '#909090';
    ctx.fillRect(x, y, size, size);

    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, size, size);
    ctx.clip();

    // Large stone shapes (wrapped)
    for (let i = 0; i < 10; i++) {
        const rx = Math.random() * size;
        const ry = Math.random() * size;
        const rw = 12 + Math.random() * 25;
        const rh = 8 + Math.random() * 20;
        const shade = Math.floor(Math.random() * 40) - 20;
        const angle = Math.random() * Math.PI;

        drawWrapped(ctx, rx, ry, size, (wx, wy) => {
            ctx.fillStyle = `rgba(${140 + shade}, ${140 + shade}, ${140 + shade}, 0.5)`;
            ctx.beginPath();
            ctx.ellipse(x + wx, y + wy, rw, rh, angle, 0, Math.PI * 2);
            ctx.fill();
        });
    }

    // Highlight edges (wrapped)
    for (let i = 0; i < 15; i++) {
        const hx = Math.random() * size;
        const hy = Math.random() * size;
        const w = 3 + Math.random() * 5;
        const h = 1 + Math.random() * 2;

        drawWrapped(ctx, hx, hy, size, (wx, wy) => {
            ctx.fillStyle = 'rgba(170, 170, 170, 0.4)';
            ctx.fillRect(x + wx, y + wy, w, h);
        });
    }

    ctx.restore();
}

// Hand-painted mud texture - darker brown/green
function generateMudTexture(ctx, x, y, size) {
    ctx.fillStyle = '#506040';
    ctx.fillRect(x, y, size, size);

    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, size, size);
    ctx.clip();

    // Wet-looking patches (wrapped)
    for (let i = 0; i < 20; i++) {
        const mx = Math.random() * size;
        const my = Math.random() * size;
        const msize = 8 + Math.random() * 20;
        const r = 60 + Math.random() * 30;
        const g = 80 + Math.random() * 20;
        const b = 50 + Math.random() * 15;
        const angle = Math.random() * Math.PI;

        drawWrapped(ctx, mx, my, size, (wx, wy) => {
            ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.5)`;
            ctx.beginPath();
            ctx.ellipse(x + wx, y + wy, msize, msize * 0.8, angle, 0, Math.PI * 2);
            ctx.fill();
        });
    }

    // Small debris (wrapped)
    for (let i = 0; i < 15; i++) {
        const dx = Math.random() * size;
        const dy = Math.random() * size;
        const r = 70 + Math.random() * 30;
        const g = 90 + Math.random() * 25;
        const b = 60 + Math.random() * 20;
        const w = 1 + Math.random() * 3;
        const h = 1 + Math.random() * 3;

        drawWrapped(ctx, dx, dy, size, (wx, wy) => {
            ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.6)`;
            ctx.fillRect(x + wx, y + wy, w, h);
        });
    }

    ctx.restore();
}

// Get UV coordinates for a texture type in the atlas
function getTextureUV(textureType) {
    const type = GROUND_TEXTURES.types[textureType] || GROUND_TEXTURES.types.grass;
    const tilesX = GROUND_TEXTURES.tilesX;
    const tilesY = GROUND_TEXTURES.tilesY;

    return {
        u: type.x / tilesX,
        v: 1 - (type.y + 1) / tilesY, // Flip Y for WebGL
        uSize: 1 / tilesX,
        vSize: 1 / tilesY
    };
}

// Get the texture atlas
function getGroundTextureAtlas() {
    return GROUND_TEXTURES.atlasTexture;
}

// Check if textures are ready AND enabled
function areGroundTexturesReady() {
    return GROUND_TEXTURES.ready && GROUND_TEXTURES.enabled;
}

// Toggle ground textures on/off (requires chunk reload)
function toggleGroundTextures() {
    GROUND_TEXTURES.enabled = !GROUND_TEXTURES.enabled;

    // Reload chunks to apply change
    if (typeof reloadAllChunks === 'function') {
        reloadAllChunks();
    }

    return GROUND_TEXTURES.enabled;
}

// Get texture index for a texture type
function getTextureIndex(textureType) {
    const typeMap = { grass: 0, dirt: 1, sand: 2, snow: 3, rock: 4, mud: 5 };
    return typeMap[textureType] || 0;
}

// Create terrain material with slope-based rock blending
// Uses MeshLambertMaterial with onBeforeCompile for built-in shadow/fog support
function createTerrainShaderMaterial(atlasTexture) {
    const tilesX = GROUND_TEXTURES.tilesX;
    const tilesY = GROUND_TEXTURES.tilesY;

    const material = new THREE.MeshLambertMaterial({
        vertexColors: true
    });

    // Inject custom texture logic into the Lambert shader
    material.onBeforeCompile = (shader) => {
        // Add our custom uniforms
        shader.uniforms.atlas = { value: atlasTexture };
        shader.uniforms.tilesX = { value: tilesX };
        shader.uniforms.tilesY = { value: tilesY };

        // Add custom attributes as varyings in vertex shader
        shader.vertexShader = shader.vertexShader.replace(
            '#include <common>',
            `#include <common>
            attribute float slope;
            attribute float biomeTexIndex;
            varying float vSlope;
            varying float vBiomeIndex;
            varying vec2 vWorldUv;`
        );

        // Pass values to fragment shader
        shader.vertexShader = shader.vertexShader.replace(
            '#include <begin_vertex>',
            `#include <begin_vertex>
            vSlope = slope;
            vBiomeIndex = biomeTexIndex;
            vWorldUv = uv;`
        );

        // Add uniforms and varyings to fragment shader
        shader.fragmentShader = shader.fragmentShader.replace(
            '#include <common>',
            `#include <common>
            uniform sampler2D atlas;
            uniform float tilesX;
            uniform float tilesY;
            varying float vSlope;
            varying float vBiomeIndex;
            varying vec2 vWorldUv;

            vec2 getAtlasUV(float tileIndex, vec2 localUV) {
                float x = mod(tileIndex, tilesX);
                float y = floor(tileIndex / tilesX);
                vec2 wrappedUV = fract(localUV);
                float u = (x + wrappedUV.x) / tilesX;
                float v = 1.0 - (y + wrappedUV.y) / tilesY;
                return vec2(u, v);
            }`
        );

        // Modify the diffuse color with our texture
        shader.fragmentShader = shader.fragmentShader.replace(
            'vec4 diffuseColor = vec4( diffuse, opacity );',
            `// Sample biome texture
            vec2 biomeUV = getAtlasUV(vBiomeIndex, vWorldUv * 2.0);
            vec4 biomeColor = texture2D(atlas, biomeUV);

            // Sample rock texture (index 4)
            vec2 rockUV = getAtlasUV(4.0, vWorldUv * 2.0);
            vec4 rockColor = texture2D(atlas, rockUV);

            // Slope-based blending
            float slopeBlend = smoothstep(0.3, 0.6, vSlope);
            vec4 texColor = mix(biomeColor, rockColor, slopeBlend);

            // Apply texture to diffuse (vertex colors handled separately by Three.js)
            vec4 diffuseColor = vec4( diffuse * texColor.rgb * 1.4, opacity );`
        );

        // Store shader reference for potential updates
        material.userData.shader = shader;
    };

    // Store reference
    if (!GROUND_TEXTURES.materials) {
        GROUND_TEXTURES.materials = [];
    }
    GROUND_TEXTURES.materials.push(material);

    return material;
}

// Update terrain materials - MeshLambertMaterial handles lighting/fog automatically
function updateTerrainLighting() {
    // MeshLambertMaterial automatically uses scene lights and fog
    // No manual updates needed
}

// Make update function available globally
window.updateTerrainLighting = updateTerrainLighting;

// Make available globally
window.GROUND_TEXTURES = GROUND_TEXTURES;
window.initGroundTextures = initGroundTextures;
window.getTextureUV = getTextureUV;
window.getGroundTextureAtlas = getGroundTextureAtlas;
window.areGroundTexturesReady = areGroundTexturesReady;
window.getTextureIndex = getTextureIndex;
window.createTerrainShaderMaterial = createTerrainShaderMaterial;
window.toggleGroundTextures = toggleGroundTextures;
