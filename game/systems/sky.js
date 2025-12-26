// Sky System - Beautiful procedural sky with clouds
// Handles day/night transitions with cotton candy sunsets/sunrises

const SkySystem = {
    dome: null,
    clouds: [],
    cloudGroup: null,
    stars: null,

    init() {
        initSky();
    },

    update(delta) {
        updateSky(delta);
    }
};

// Register with Systems
if (typeof Systems !== 'undefined') {
    Systems.register('sky', SkySystem);
}

// Sky color palettes for different times of day
const SKY_COLORS = {
    // Dawn/Sunrise (phase 0.85-0.95 coming from night, or 0.05-0.15 going to day)
    dawn: {
        horizon: { r: 255, g: 140, b: 100 },  // Warm orange-pink
        mid: { r: 255, g: 180, b: 150 },       // Soft peach
        zenith: { r: 135, g: 170, b: 220 }     // Light blue
    },
    // Morning (phase 0.0-0.15)
    morning: {
        horizon: { r: 180, g: 210, b: 255 },  // Light blue-white
        mid: { r: 135, g: 190, b: 255 },       // Sky blue
        zenith: { r: 80, g: 140, b: 220 }      // Deeper blue
    },
    // Midday (phase 0.15-0.35)
    midday: {
        horizon: { r: 150, g: 200, b: 255 },  // Pale blue
        mid: { r: 100, g: 170, b: 255 },       // Bright blue
        zenith: { r: 50, g: 120, b: 200 }      // Deep sky blue
    },
    // Afternoon (phase 0.35-0.45)
    afternoon: {
        horizon: { r: 200, g: 200, b: 230 },  // Hazy
        mid: { r: 130, g: 175, b: 240 },       // Warm blue
        zenith: { r: 70, g: 130, b: 210 }      // Blue
    },
    // Sunset (phase 0.45-0.55) - COTTON CANDY!
    sunset: {
        horizon: { r: 255, g: 100, b: 80 },   // Deep orange-red
        mid: { r: 255, g: 150, b: 120 },       // Coral pink
        zenith: { r: 180, g: 100, b: 180 }     // Purple
    },
    // Dusk (phase 0.55-0.65)
    dusk: {
        horizon: { r: 180, g: 80, b: 100 },   // Deep rose
        mid: { r: 120, g: 70, b: 140 },        // Purple
        zenith: { r: 40, g: 50, b: 100 }       // Dark blue-purple
    },
    // Night (phase 0.65-0.85)
    night: {
        horizon: { r: 20, g: 25, b: 50 },     // Dark blue
        mid: { r: 10, g: 15, b: 40 },          // Darker
        zenith: { r: 5, g: 8, b: 25 }          // Almost black
    }
};

// Cloud configuration
const CLOUD_CONFIG = {
    count: 25,
    minHeight: 150,
    maxHeight: 250,
    minSize: 30,
    maxSize: 80,
    spread: 800,
    speed: 5,           // Base wind speed
    windAngle: 0.3,     // Wind direction in radians
    opacity: {
        day: 0.9,
        sunset: 0.95,
        night: 0.3
    }
};

// Star configuration
const STAR_CONFIG = {
    count: 500,
    radius: 900
};

function initSky() {
    if (!GAME.scene) return;

    // Create sky dome
    createSkyDome();

    // Create clouds
    createClouds();

    // Create stars
    createStars();
}

function createSkyDome() {
    // Large inverted sphere for sky gradient
    const geometry = new THREE.SphereGeometry(950, 32, 32);

    // Custom shader material for gradient sky with retro color banding
    const material = new THREE.ShaderMaterial({
        uniforms: {
            topColor: { value: new THREE.Color(0.2, 0.4, 0.8) },
            midColor: { value: new THREE.Color(0.4, 0.6, 0.9) },
            bottomColor: { value: new THREE.Color(0.7, 0.8, 1.0) },
            sunPosition: { value: new THREE.Vector3(0, 1, 0) },
            sunColor: { value: new THREE.Color(1, 0.9, 0.7) },
            sunIntensity: { value: 0.5 },
            colorBands: { value: 24.0 } // Number of color bands for retro look (higher = smoother)
        },
        vertexShader: `
            varying vec3 vWorldPosition;
            varying vec3 vNormal;

            void main() {
                vec4 worldPosition = modelMatrix * vec4(position, 1.0);
                vWorldPosition = worldPosition.xyz;
                vNormal = normalize(normalMatrix * normal);
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            uniform vec3 topColor;
            uniform vec3 midColor;
            uniform vec3 bottomColor;
            uniform vec3 sunPosition;
            uniform vec3 sunColor;
            uniform float sunIntensity;
            uniform float colorBands;

            varying vec3 vWorldPosition;
            varying vec3 vNormal;

            // Posterize/quantize a value to create color banding
            vec3 posterize(vec3 color, float bands) {
                return floor(color * bands) / bands;
            }

            void main() {
                // Normalized height from -1 (bottom) to 1 (top)
                float h = normalize(vWorldPosition).y;

                // Quantize height for banded gradient (retro look)
                float bandedH = floor(h * colorBands) / colorBands;

                // Three-color gradient using banded height
                vec3 color;
                if (bandedH < 0.0) {
                    // Below horizon - blend bottom to mid
                    float t = (bandedH + 1.0);
                    color = mix(bottomColor, midColor, t);
                } else if (bandedH < 0.5) {
                    // Lower sky - blend mid to top
                    float t = bandedH * 2.0;
                    color = mix(midColor, topColor, t);
                } else {
                    // Upper sky - mostly top color
                    color = topColor;
                }

                // Sun glow effect (also posterized)
                vec3 sunDir = normalize(sunPosition);
                vec3 viewDir = normalize(vWorldPosition);
                float sunDot = max(0.0, dot(viewDir, sunDir));
                float sunGlow = pow(sunDot, 8.0) * sunIntensity;
                float sunHalo = pow(sunDot, 2.0) * sunIntensity * 0.3;

                color += sunColor * (sunGlow + sunHalo);

                // Final posterization for retro color palette
                color = posterize(color, colorBands);

                gl_FragColor = vec4(color, 1.0);
            }
        `,
        side: THREE.BackSide,
        depthWrite: false
    });

    SkySystem.dome = new THREE.Mesh(geometry, material);
    SkySystem.dome.renderOrder = -1000; // Render first
    GAME.scene.add(SkySystem.dome);
}

function createClouds() {
    SkySystem.cloudGroup = new THREE.Group();

    // Cloud material - soft white with transparency
    const cloudTexture = createCloudTexture();

    for (let i = 0; i < CLOUD_CONFIG.count; i++) {
        const cloud = createCloud(cloudTexture);

        // Random position
        cloud.position.x = (Math.random() - 0.5) * CLOUD_CONFIG.spread * 2;
        cloud.position.y = CLOUD_CONFIG.minHeight + Math.random() * (CLOUD_CONFIG.maxHeight - CLOUD_CONFIG.minHeight);
        cloud.position.z = (Math.random() - 0.5) * CLOUD_CONFIG.spread * 2;

        // Random rotation
        cloud.rotation.y = Math.random() * Math.PI * 2;

        // Store velocity for movement - all clouds drift in same wind direction
        const speedVariation = 0.7 + Math.random() * 0.6; // 0.7 to 1.3x speed
        cloud.userData.velocity = {
            x: Math.cos(CLOUD_CONFIG.windAngle) * CLOUD_CONFIG.speed * speedVariation,
            z: Math.sin(CLOUD_CONFIG.windAngle) * CLOUD_CONFIG.speed * speedVariation
        };

        SkySystem.clouds.push(cloud);
        SkySystem.cloudGroup.add(cloud);
    }

    GAME.scene.add(SkySystem.cloudGroup);
}

function createCloudTexture() {
    // Create low-res pixelated cloud texture for retro look
    const canvas = document.createElement('canvas');
    canvas.width = 16;  // Low res for pixelated look
    canvas.height = 16;
    const ctx = canvas.getContext('2d');

    // Draw a simple blocky cloud shape
    ctx.fillStyle = 'rgba(255, 255, 255, 0)';
    ctx.fillRect(0, 0, 16, 16);

    // Blocky cloud pattern - center is solid, edges fade in steps
    const pattern = [
        [0, 0, 0, 0, 0.3, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.3, 0, 0, 0, 0],
        [0, 0, 0, 0.5, 0.8, 1, 1, 1, 1, 1, 1, 0.8, 0.5, 0, 0, 0],
        [0, 0, 0.5, 0.8, 1, 1, 1, 1, 1, 1, 1, 1, 0.8, 0.5, 0, 0],
        [0, 0.3, 0.8, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0.8, 0.3, 0],
        [0.3, 0.8, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0.8, 0.3],
        [0.5, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0.5],
        [0.5, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0.5],
        [0.5, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0.5],
        [0.5, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0.5],
        [0.5, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0.5],
        [0.5, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0.5],
        [0.3, 0.8, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0.8, 0.3],
        [0, 0.3, 0.8, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0.8, 0.3, 0],
        [0, 0, 0.5, 0.8, 1, 1, 1, 1, 1, 1, 1, 1, 0.8, 0.5, 0, 0],
        [0, 0, 0, 0.5, 0.8, 1, 1, 1, 1, 1, 1, 0.8, 0.5, 0, 0, 0],
        [0, 0, 0, 0, 0.3, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.3, 0, 0, 0, 0]
    ];

    const imageData = ctx.createImageData(16, 16);
    for (let y = 0; y < 16; y++) {
        for (let x = 0; x < 16; x++) {
            const i = (y * 16 + x) * 4;
            const alpha = pattern[y][x];
            imageData.data[i] = 255;     // R
            imageData.data[i + 1] = 255; // G
            imageData.data[i + 2] = 255; // B
            imageData.data[i + 3] = Math.floor(alpha * 255); // A
        }
    }
    ctx.putImageData(imageData, 0, 0);

    const texture = new THREE.CanvasTexture(canvas);
    texture.magFilter = THREE.NearestFilter; // Pixelated scaling
    texture.minFilter = THREE.NearestFilter;
    texture.needsUpdate = true;
    return texture;
}

function createCloud(texture) {
    const cloud = new THREE.Group();

    // Simpler clouds - fewer, blockier puffs for retro look
    const puffCount = 2 + Math.floor(Math.random() * 2); // 2-3 puffs
    const baseSize = CLOUD_CONFIG.minSize + Math.random() * (CLOUD_CONFIG.maxSize - CLOUD_CONFIG.minSize);

    for (let i = 0; i < puffCount; i++) {
        const material = new THREE.SpriteMaterial({
            map: texture,
            transparent: true,
            opacity: 0.9,
            depthWrite: false,
            fog: false
        });

        const sprite = new THREE.Sprite(material);

        // Larger, blockier puffs with less overlap
        const puffSize = baseSize * (0.8 + Math.random() * 0.4);
        sprite.scale.set(puffSize, puffSize * 0.5, 1);

        // Less random positioning - more uniform cloud shape
        sprite.position.x = (i - (puffCount - 1) / 2) * baseSize * 0.4;
        sprite.position.y = (Math.random() - 0.5) * baseSize * 0.1;
        sprite.position.z = 0;

        cloud.add(sprite);
    }

    return cloud;
}

function createStars() {
    const geometry = new THREE.BufferGeometry();
    const positions = [];
    const sizes = [];

    for (let i = 0; i < STAR_CONFIG.count; i++) {
        // Random position on sphere, but only upper hemisphere
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.random() * Math.PI * 0.5; // Only upper half

        const x = STAR_CONFIG.radius * Math.sin(phi) * Math.cos(theta);
        const y = STAR_CONFIG.radius * Math.cos(phi);
        const z = STAR_CONFIG.radius * Math.sin(phi) * Math.sin(theta);

        positions.push(x, y, z);
        sizes.push(1 + Math.random() * 2);
    }

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1));

    const material = new THREE.PointsMaterial({
        color: 0xFFFFFF,
        size: 2,
        transparent: true,
        opacity: 0,
        sizeAttenuation: false,
        fog: false
    });

    SkySystem.stars = new THREE.Points(geometry, material);
    SkySystem.stars.renderOrder = -999;
    GAME.scene.add(SkySystem.stars);
}

function updateSky(delta) {
    if (!SkySystem.dome || !GAME.camera) return;

    // Get day/night phase
    let phase = 0;
    if (typeof getDayNightPhase === 'function') {
        phase = getDayNightPhase();
    }

    // Center sky dome on camera
    SkySystem.dome.position.copy(GAME.camera.position);

    // Update stars position
    if (SkySystem.stars) {
        SkySystem.stars.position.copy(GAME.camera.position);
    }

    // Update sky colors based on phase
    updateSkyColors(phase);

    // Update clouds
    updateClouds(delta, phase);

    // Update stars visibility
    updateStars(phase);
}

function updateSkyColors(phase) {
    if (!SkySystem.dome) return;

    const uniforms = SkySystem.dome.material.uniforms;

    // Determine which color palette to use based on phase
    let colors1, colors2, blend;

    if (phase < 0.1) {
        // Dawn to morning
        colors1 = SKY_COLORS.dawn;
        colors2 = SKY_COLORS.morning;
        blend = phase / 0.1;
    } else if (phase < 0.25) {
        // Morning to midday
        colors1 = SKY_COLORS.morning;
        colors2 = SKY_COLORS.midday;
        blend = (phase - 0.1) / 0.15;
    } else if (phase < 0.4) {
        // Midday to afternoon
        colors1 = SKY_COLORS.midday;
        colors2 = SKY_COLORS.afternoon;
        blend = (phase - 0.25) / 0.15;
    } else if (phase < 0.5) {
        // Afternoon to sunset
        colors1 = SKY_COLORS.afternoon;
        colors2 = SKY_COLORS.sunset;
        blend = (phase - 0.4) / 0.1;
    } else if (phase < 0.6) {
        // Sunset to dusk
        colors1 = SKY_COLORS.sunset;
        colors2 = SKY_COLORS.dusk;
        blend = (phase - 0.5) / 0.1;
    } else if (phase < 0.75) {
        // Dusk to night
        colors1 = SKY_COLORS.dusk;
        colors2 = SKY_COLORS.night;
        blend = (phase - 0.6) / 0.15;
    } else if (phase < 0.9) {
        // Night
        colors1 = SKY_COLORS.night;
        colors2 = SKY_COLORS.night;
        blend = 0;
    } else {
        // Night to dawn
        colors1 = SKY_COLORS.night;
        colors2 = SKY_COLORS.dawn;
        blend = (phase - 0.9) / 0.1;
    }

    // Interpolate colors
    const topColor = lerpColor(colors1.zenith, colors2.zenith, blend);
    const midColor = lerpColor(colors1.mid, colors2.mid, blend);
    const bottomColor = lerpColor(colors1.horizon, colors2.horizon, blend);

    uniforms.topColor.value.setRGB(topColor.r / 255, topColor.g / 255, topColor.b / 255);
    uniforms.midColor.value.setRGB(midColor.r / 255, midColor.g / 255, midColor.b / 255);
    uniforms.bottomColor.value.setRGB(bottomColor.r / 255, bottomColor.g / 255, bottomColor.b / 255);

    // Update sun position and intensity in shader
    if (GAME.lighting && GAME.lighting.sun) {
        const sunPos = GAME.lighting.sun.position.clone().sub(GAME.camera.position).normalize();
        uniforms.sunPosition.value.copy(sunPos);

        // Sun intensity based on height
        const sunHeight = sunPos.y;
        uniforms.sunIntensity.value = Math.max(0, sunHeight) * 0.8;

        // Sun color changes with time
        if (phase > 0.4 && phase < 0.6) {
            // Sunset - orange/red sun
            uniforms.sunColor.value.setRGB(1.0, 0.5, 0.2);
        } else if (phase > 0.9 || phase < 0.1) {
            // Sunrise - orange/pink
            uniforms.sunColor.value.setRGB(1.0, 0.6, 0.4);
        } else {
            // Normal - warm white
            uniforms.sunColor.value.setRGB(1.0, 0.95, 0.8);
        }
    }

    // Also update scene background to match horizon for seamless blend
    if (GAME.scene) {
        GAME.scene.background.setRGB(bottomColor.r / 255, bottomColor.g / 255, bottomColor.b / 255);
    }
}

function updateClouds(delta, phase) {
    if (!SkySystem.cloudGroup || !GAME.camera) return;

    const camPos = GAME.camera.position;

    // Determine cloud color based on time of day
    let cloudColor, cloudOpacity;

    if (phase < 0.4) {
        // Day - white clouds
        cloudColor = new THREE.Color(1, 1, 1);
        cloudOpacity = CLOUD_CONFIG.opacity.day;
    } else if (phase < 0.6) {
        // Sunset - pink/orange clouds (cotton candy!)
        const t = (phase - 0.4) / 0.2;
        cloudColor = new THREE.Color(
            1.0,
            0.7 + t * 0.1,
            0.7 - t * 0.3
        );
        cloudOpacity = CLOUD_CONFIG.opacity.sunset;
    } else if (phase < 0.75) {
        // Dusk - purple/gray clouds
        const t = (phase - 0.6) / 0.15;
        cloudColor = new THREE.Color(
            0.6 - t * 0.3,
            0.5 - t * 0.2,
            0.7 - t * 0.2
        );
        cloudOpacity = CLOUD_CONFIG.opacity.sunset - t * 0.3;
    } else if (phase < 0.9) {
        // Night - dark, barely visible
        cloudColor = new THREE.Color(0.2, 0.2, 0.3);
        cloudOpacity = CLOUD_CONFIG.opacity.night;
    } else {
        // Pre-dawn - starting to lighten
        const t = (phase - 0.9) / 0.1;
        cloudColor = new THREE.Color(
            0.2 + t * 0.6,
            0.2 + t * 0.4,
            0.3 + t * 0.3
        );
        cloudOpacity = CLOUD_CONFIG.opacity.night + t * 0.4;
    }

    // Update each cloud
    SkySystem.clouds.forEach(cloud => {
        // Move cloud
        cloud.position.x += cloud.userData.velocity.x * delta;
        cloud.position.z += cloud.userData.velocity.z * delta;

        // Wrap around when too far from camera
        const dx = cloud.position.x - camPos.x;
        const dz = cloud.position.z - camPos.z;

        if (Math.abs(dx) > CLOUD_CONFIG.spread) {
            cloud.position.x = camPos.x - Math.sign(dx) * CLOUD_CONFIG.spread;
        }
        if (Math.abs(dz) > CLOUD_CONFIG.spread) {
            cloud.position.z = camPos.z - Math.sign(dz) * CLOUD_CONFIG.spread;
        }

        // Update cloud puff colors
        cloud.children.forEach(sprite => {
            sprite.material.color.copy(cloudColor);
            sprite.material.opacity = cloudOpacity;
        });
    });
}

function updateStars(phase) {
    if (!SkySystem.stars) return;

    // Stars visible only at night (phase 0.6-0.9)
    let starOpacity = 0;

    if (phase > 0.55 && phase < 0.95) {
        if (phase < 0.7) {
            // Fade in
            starOpacity = (phase - 0.55) / 0.15;
        } else if (phase > 0.85) {
            // Fade out
            starOpacity = (0.95 - phase) / 0.1;
        } else {
            // Full brightness
            starOpacity = 1;
        }
    }

    SkySystem.stars.material.opacity = starOpacity * 0.8;

    // Twinkle effect
    const time = Date.now() * 0.001;
    SkySystem.stars.material.size = 2 + Math.sin(time * 3) * 0.5;
}

function lerpColor(c1, c2, t) {
    return {
        r: c1.r + (c2.r - c1.r) * t,
        g: c1.g + (c2.g - c1.g) * t,
        b: c1.b + (c2.b - c1.b) * t
    };
}

// Make available globally
window.SkySystem = SkySystem;
window.initSky = initSky;
window.updateSky = updateSky;
