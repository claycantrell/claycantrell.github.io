// Performance configuration
const PERFORMANCE = {
    terrain: {
        segments: 48,
        size: 512,
        renderDistance: 6,
        unloadDistance: 8
    },
    trees: {
        count: 5000,
        radius: 3000,
        exclusionRadius: 50,
        minSpacing: 12,
        maxAttempts: 15000
    },
    rendering: {
        maxDrawDistance: 3000,
        lodEnabled: true,
        lodDistance: 400,
        lodUpdateInterval: 350,
        frustumCulling: true
    },
    entities: {
        maxDeer: 80,
        maxBunnies: 100,
        maxBirds: 120
    }
};

export default PERFORMANCE;
