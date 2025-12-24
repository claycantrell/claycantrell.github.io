// Audio management

// Initialize audio
function initAudio() {
    // Audio setup
    listener = new THREE.AudioListener();
    camera.add(listener);

    audio = new THREE.Audio(listener);

    audioLoader = new THREE.AudioLoader();
    // Load background audio
    audioLoader.load('assets/audio/background.mp3', function (buffer) {
        audio.setBuffer(buffer);
        audio.setLoop(true);
        audio.setVolume(0.5);
        // Do not autoplay to comply with mobile browser policies
    }, undefined, function (err) {
        console.error('An error happened while loading the audio.');
    });

    // Audio Icon Event Listener
    const audioIcon = document.getElementById('audio-icon');
    if (audioIcon) {
        audioIcon.addEventListener('click', toggleAudio);
        audioIcon.addEventListener('touchstart', (e) => {
            e.preventDefault(); // Prevent double firing on some devices
            toggleAudio();
        }, { passive: false });
    }

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
    resumeAudioContext(); // Ensure audio context is resumed
    
    const audioIcon = document.getElementById('audio-icon');
    
    if (isAudioPlaying) {
        audio.pause();
        if (audioIcon) audioIcon.src = 'https://img.icons8.com/ios-glyphs/30/ffffff/mute.png';
    } else {
        audio.play();
        if (audioIcon) audioIcon.src = 'https://img.icons8.com/ios-glyphs/30/ffffff/speaker.png';
    }
    isAudioPlaying = !isAudioPlaying;
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

// Make available globally
window.initAudio = initAudio;
window.toggleAudio = toggleAudio;
window.resumeAudioContext = resumeAudioContext;

