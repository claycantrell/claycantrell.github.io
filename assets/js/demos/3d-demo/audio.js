// Audio management

// Initialize audio
function initAudio() {
    // Audio setup
    listener = new THREE.AudioListener();
    camera.add(listener);

    audio = new THREE.Audio(listener);

    audioLoader = new THREE.AudioLoader();
    // Load background audio
    audioLoader.load('../assets/media/audio/background.mp3', function (buffer) {
        audio.setBuffer(buffer);
        audio.setLoop(true);
        audio.setVolume(0.5);
        // Do not autoplay to comply with mobile browser policies
    }, undefined, function (err) {
        console.error('An error happened while loading the audio.');
    });

    // Audio Icon Event Listener
    audioIcon.addEventListener('click', toggleAudio);

    // Ensure audio context is resumed on user interaction
    document.body.addEventListener('click', resumeAudioContext, false);
    document.body.addEventListener('touchstart', resumeAudioContext, false);
}

// Function to toggle audio on/off
function toggleAudio() {
    resumeAudioContext(); // Ensure audio context is resumed
    if (isAudioPlaying) {
        audio.pause();
        audioIcon.src = 'https://img.icons8.com/ios-glyphs/30/ffffff/mute.png';
    } else {
        audio.play();
        audioIcon.src = 'https://img.icons8.com/ios-glyphs/30/ffffff/speaker.png';
    }
    isAudioPlaying = !isAudioPlaying;
}

// Function to resume audio context
function resumeAudioContext() {
    if (audio.context && audio.context.state === 'suspended') {
        audio.context.resume();
    }
}

