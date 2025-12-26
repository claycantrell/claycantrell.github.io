// Audio management

// Audio variables
let listener = null;
let audio = null;
let audioLoader = null;
let isAudioPlaying = false;
let audioInitialized = false;
let audioBufferLoaded = false;

// Initialize audio
function initAudio() {
    // Prevent multiple initializations
    if (audioInitialized) {
        return;
    }
    
    // Wait for camera to be available
    if (!GAME || !GAME.camera) {
        console.warn('Audio initialization: Camera not ready, retrying...');
        setTimeout(initAudio, 100);
        return;
    }
    
    audioInitialized = true;
    
    // Audio setup
    listener = new THREE.AudioListener();
    GAME.camera.add(listener);
    
    // Store in GAME namespace for easy access
    GAME.audio.listener = listener;

    audio = new THREE.Audio(listener);
    GAME.audio.sound = audio;

    audioLoader = new THREE.AudioLoader();
    GAME.audio.loader = audioLoader;
    
    // Load background audio
    audioLoader.load('assets/audio/background.mp3', function (buffer) {
        if (audio) {
            audio.setBuffer(buffer);
            audio.setLoop(true);
            audio.setVolume(0.5);
            audioBufferLoaded = true;
            console.log('Audio buffer loaded successfully');
            // Do not autoplay to comply with mobile browser policies
        }
    }, undefined, function (err) {
        console.error('An error happened while loading the audio:', err);
        audioBufferLoaded = false;
    });

    // Audio Icon Event Listener
    setupAudioIconListener();

    // Ensure audio context is resumed on user interaction
    const unlockAudio = () => {
        resumeAudioContext();
        // Remove listeners once unlocked
        if (audio.context && audio.context.state === 'running') {
            document.body.removeEventListener('click', unlockAudio);
            document.body.removeEventListener('touchstart', unlockAudio);
        }
    };
    
    document.body.addEventListener('click', unlockAudio, false);
    document.body.addEventListener('touchstart', unlockAudio, false);
}

// Function to toggle audio on/off
function toggleAudio() {
    if (!audio) {
        console.warn('Audio not initialized yet. Initializing...');
        // Try to initialize if not already done
        if (!audioInitialized && typeof initAudio === 'function') {
            initAudio();
        }
        return;
    }
    
    // Check if buffer is loaded
    if (!audioBufferLoaded && !audio.buffer) {
        console.warn('Audio buffer not loaded yet. Please wait...');
        return;
    }
    
    resumeAudioContext(); // Ensure audio context is resumed
    
    const audioIcon = document.getElementById('audio-icon');
    
    if (isAudioPlaying) {
        audio.pause();
        isAudioPlaying = false;
        GAME.audio.isPlaying = false;
        if (audioIcon) audioIcon.src = 'https://img.icons8.com/ios-glyphs/30/ffffff/mute.png';
    } else {
        // Ensure buffer is set before playing
        if (!audio.buffer) {
            console.warn('Audio buffer not set, cannot play.');
            return;
        }
        
        const playPromise = audio.play();
        if (playPromise !== undefined) {
            playPromise.then(() => {
                // Playback started successfully
                isAudioPlaying = true;
                GAME.audio.isPlaying = true;
                if (audioIcon) audioIcon.src = 'https://img.icons8.com/ios-glyphs/30/ffffff/speaker.png';
            }).catch(err => {
                console.error('Error playing audio:', err);
                isAudioPlaying = false;
                GAME.audio.isPlaying = false;
                if (audioIcon) audioIcon.src = 'https://img.icons8.com/ios-glyphs/30/ffffff/mute.png';
            });
        } else {
            // Fallback for older browsers
            isAudioPlaying = true;
            GAME.audio.isPlaying = true;
            if (audioIcon) audioIcon.src = 'https://img.icons8.com/ios-glyphs/30/ffffff/speaker.png';
        }
    }
}

// Function to resume audio context
function resumeAudioContext() {
    if (audio && audio.context && audio.context.state === 'suspended') {
        audio.context.resume().then(() => {
            // Audio context resumed successfully
        }).catch(e => console.error('Could not resume audio context:', e));
    }

    // Also try to unlock speech synthesis for mobile
    if (window.speechSynthesis) {
        if (window.speechSynthesis.paused) {
            window.speechSynthesis.resume();
        }
        // Prime the TTS engine with a silent utterance (helps on iOS)
        if (!window.ttsPrimed) {
            const utterance = new SpeechSynthesisUtterance('');
            utterance.volume = 0;
            window.speechSynthesis.speak(utterance);
            window.ttsPrimed = true;
        }
    }
}

// Setup audio icon click listener (can be called multiple times safely)
function setupAudioIconListener() {
    const audioIcon = document.getElementById('audio-icon');
    if (audioIcon && !audioIcon.dataset.listenerAttached) {
        audioIcon.addEventListener('click', toggleAudio);
        audioIcon.addEventListener('touchstart', (e) => {
            e.preventDefault(); // Prevent double firing on some devices
            toggleAudio();
        }, { passive: false });
        audioIcon.dataset.listenerAttached = 'true';
    }
}

// Setup listener immediately when script loads (in case initAudio is delayed)
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupAudioIconListener);
} else {
    setupAudioIconListener();
}

// Make available globally
window.initAudio = initAudio;
window.toggleAudio = toggleAudio;
window.resumeAudioContext = resumeAudioContext;
window.setupAudioIconListener = setupAudioIconListener;

