document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('magnet-container');
    if (!container) return;

    const words = [
        "I", "turn", "messy",
        "real", "world", "problems",
        "into", "software", "that",
        "ships", "fast", "and",
        "runs", "at", "scale"
    ];

    // Lay out magnets as a readable sentence with hand-placed feel
    // Words flow left to right, wrapping to new lines, with slight jitter
    const isMobile = window.innerWidth <= 768;
    const initialLayout = [];
    const screenW = window.innerWidth;
    const screenH = window.innerHeight;

    // Seed for consistent jitter
    let seed = 42;
    function seededRandom() {
        seed = (seed * 16807 + 0) % 2147483647;
        return (seed - 1) / 2147483646;
    }

    const lineHeight = isMobile ? 48 : 60;
    const wordGap = isMobile ? 10 : 16;
    const jitterX = isMobile ? 5 : 10;
    const jitterY = isMobile ? 6 : 12;
    const maxLineWidth = isMobile ? screenW - 60 : screenW * 0.5;

    // Pre-render magnets offscreen to measure actual widths
    const measuredWidths = [];
    words.forEach(word => {
        const tmp = document.createElement('div');
        tmp.textContent = word;
        tmp.className = 'magnet';
        tmp.style.visibility = 'hidden';
        tmp.style.position = 'absolute';
        container.appendChild(tmp);
        measuredWidths.push(tmp.offsetWidth);
        container.removeChild(tmp);
    });

    // Calculate line breaks using real widths
    const lines = [[]];
    const lineWidths = [0];

    for (let i = 0; i < words.length; i++) {
        const w = measuredWidths[i];
        const currentLine = lines.length - 1;

        if (lineWidths[currentLine] + w + (lines[currentLine].length > 0 ? wordGap : 0) > maxLineWidth && lines[currentLine].length > 0) {
            lines.push([]);
            lineWidths.push(0);
        }

        const ln = lines.length - 1;
        const gap = lines[ln].length > 0 ? wordGap : 0;
        lines[ln].push({ word: words[i], width: w });
        lineWidths[ln] += w + gap;
    }

    // Position centered below hero title
    const startY = isMobile ? screenH * 0.55 : screenH * 0.58;

    for (let row = 0; row < lines.length; row++) {
        const lineW = lineWidths[row];
        let cursorX = (screenW - lineW) / 2;
        const cursorY = startY + row * lineHeight;

        for (let col = 0; col < lines[row].length; col++) {
            const w = lines[row][col].width;
            initialLayout.push({
                x: cursorX + w / 2 + (seededRandom() - 0.5) * jitterX,
                y: cursorY + (seededRandom() - 0.5) * jitterY
            });
            cursorX += w + wordGap;
        }
    }

    // Matter.js aliases
    const Engine = Matter.Engine,
          Render = Matter.Render,
          World = Matter.World,
          Bodies = Matter.Bodies,
          Runner = Matter.Runner,
          Events = Matter.Events,
          Constraint = Matter.Constraint,
          Mouse = Matter.Mouse,
          Body = Matter.Body;

    // Create engine
    const engine = Engine.create();
    const world = engine.world;

    // Zero gravity
    engine.world.gravity.y = 0;
    engine.world.gravity.x = 0;

    // Debug renderer (hidden)
    const render = Render.create({
        element: document.body,
        engine: engine,
        options: {
            width: window.innerWidth,
            height: window.innerHeight,
            showAngleIndicator: true,
            wireframes: false, 
            background: 'transparent'
        }
    });
    render.canvas.style.position = 'absolute';
    render.canvas.style.top = '0';
    render.canvas.style.left = '0';
    render.canvas.style.pointerEvents = 'none';
    render.canvas.style.opacity = '0'; 

    const magnets = [];

    // Create Word Magnets
    words.forEach((word, index) => {
        const magnet = document.createElement('div');
        magnet.textContent = word;
        magnet.className = 'magnet';
        container.appendChild(magnet);

        const width = magnet.offsetWidth;
        const height = magnet.offsetHeight;

        const startX = (initialLayout[index]?.x || 100);
        const startY = (initialLayout[index]?.y || 100);

        const body = Bodies.rectangle(startX, startY, width, height, {
            restitution: 0.2,
            friction: 0.5,
            frictionAir: 0.15,
            density: 0.001,
            angle: (Math.random() * 0.15) - 0.075
        });

        Body.setInertia(body, (width * height * body.mass) / 12);

        World.add(world, body);
        magnets.push({ element: magnet, body: body, width, height });
    });

    // Create Photo Magnets — two different proportions, static but collidable
    const photoMagnets = [
        { src: 'assets/media/images/aquarium.jpg', w: isMobile ? 110 : 180, h: isMobile ? 145 : 235, caption: 'My planted aquarium & Cheese the mystery snail', tape: 'tape-top' },
        { src: 'assets/media/images/zoo.jpg', w: isMobile ? 120 : 195, h: isMobile ? 155 : 250, caption: 'w/ Zoë and wallabies at the Santa Barbara Zoo', tape: 'tape-corners' },
    ];

    // Lightbox overlay (created once, reused)
    const lightbox = document.createElement('div');
    lightbox.className = 'photo-lightbox';
    lightbox.innerHTML = '<div class="photo-lightbox-inner"><img src="" alt=""><p class="photo-lightbox-caption"></p></div>';
    document.body.appendChild(lightbox);

    const lbImg = lightbox.querySelector('img');
    const lbCaption = lightbox.querySelector('.photo-lightbox-caption');

    function openLightbox(src, caption) {
        lbImg.src = src;
        lbCaption.textContent = caption;
        lightbox.classList.add('active');
    }

    function closeLightbox() {
        lightbox.classList.remove('active');
    }

    lightbox.addEventListener('click', closeLightbox);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeLightbox(); });

    photoMagnets.forEach((photo, i) => {
        const el = document.createElement('div');
        el.className = 'magnet-photo ' + photo.tape;
        el.style.width = photo.w + 'px';
        el.style.height = photo.h + 'px';
        el.style.pointerEvents = 'auto';
        el.style.cursor = 'pointer';
        const img = document.createElement('img');
        img.src = photo.src;
        img.alt = photo.caption;
        el.appendChild(img);
        container.appendChild(el);

        el.addEventListener('click', () => openLightbox(photo.src, photo.caption));

        const outerW = photo.w;
        const outerH = photo.h;

        // Place them on either side of the word magnets, clamped to stay on screen
        var rawX = i === 0
            ? screenW * (isMobile ? 0.15 : 0.18)
            : screenW * (isMobile ? 0.85 : 0.82);
        const offsetX = Math.max(outerW / 2 + 10, Math.min(screenW - outerW / 2 - 10, rawX));
        const offsetY = screenH * (isMobile ? 0.18 : 0.30);

        // Static so cursor doesn't push them, but word magnets still bounce off
        const body = Bodies.rectangle(offsetX, offsetY, outerW, outerH, {
            isStatic: true,
            restitution: 0.4,
            friction: 0.5,
            angle: (seededRandom() - 0.5) * 0.3
        });

        World.add(world, body);
        magnets.push({ element: el, body: body, width: outerW, height: outerH });
    });

    // --- PHYSICAL CURSOR (Dynamic Body + Constraint) ---
    // Instead of teleporting a static body (which breaks collision physics),
    // we create a dynamic body and pull it to the mouse with a spring.
    // This gives it velocity and momentum to transfer to the magnets.
    
    const cursorBody = Bodies.circle(0, 0, 20, {
        restitution: 0.4,
        friction: 0.1,
        frictionAir: 0.1,
        density: 0.1, // High density so it pushes magnets easily (heavy cursor)
        render: { visible: false }
    });
    World.add(world, cursorBody);

    // Create a dummy body to anchor the mouse constraint
    const mouseAnchor = Bodies.circle(0, 0, 1, { isStatic: true, render: { visible: false } });
    World.add(world, mouseAnchor);

    // Connect cursor body to mouse anchor
    const mouseConstraint = Constraint.create({
        bodyA: mouseAnchor,
        bodyB: cursorBody,
        stiffness: 0.1, // Softer spring for less aggressive cursor tracking
        damping: 0.1,
        render: { visible: false }
    });
    World.add(world, mouseConstraint);

    // Track mouse and TOUCH events
    const updateCursor = (x, y) => {
        // Move the anchor point to input position
        Body.setPosition(mouseAnchor, { x: x, y: y });
        
        // Wake up nearby bodies
        const buffer = 100;
        const bounds = { 
            min: { x: x - buffer, y: y - buffer }, 
            max: { x: x + buffer, y: y + buffer } 
        };
        const bodies = Matter.Query.region(magnets.map(m => m.body), bounds);
        bodies.forEach(body => Body.setAwake(body, true));
    };

    window.addEventListener('mousemove', (e) => {
        updateCursor(e.clientX, e.clientY);
    });

    // Add Touch Support
    window.addEventListener('touchmove', (e) => {
        // Prevent default to stop scrolling while interacting
        // e.preventDefault(); // Commented out to allow scrolling if needed, or selectively prevent
        if (e.touches.length > 0) {
            const touch = e.touches[0];
            updateCursor(touch.clientX, touch.clientY);
        }
    }, { passive: false });
    
    // Also update on touchstart to snap cursor to finger immediately
    window.addEventListener('touchstart', (e) => {
        if (e.touches.length > 0) {
            const touch = e.touches[0];
            updateCursor(touch.clientX, touch.clientY);
        }
    }, { passive: false });

    // Boundary Enforcement (Fallback if they tunnel through walls)
    // Use hero height, not full page height
    function getHeroHeight() {
        const hero = document.querySelector('.hero');
        return hero ? hero.offsetHeight : window.innerHeight;
    }

    Events.on(engine, 'beforeUpdate', function() {
        const margin = 20;
        const w = window.innerWidth;
        const h = getHeroHeight();

        magnets.forEach(m => {
            const b = m.body;
            // Only clamp if WAY out of bounds (tunneling fix)
            if (b.position.x < -100 || b.position.x > w + 100 || b.position.y < -100 || b.position.y > h + 100) {
                 Body.setPosition(b, { 
                     x: Math.max(margin, Math.min(w - margin, b.position.x)),
                     y: Math.max(margin, Math.min(h - margin, b.position.y))
                 });
                 Body.setVelocity(b, { x: 0, y: 0 }); // Stop momentum if respawned
            }
        });
    });

    // Sync DOM
    function updateDOM() {
        magnets.forEach(m => {
            const { x, y } = m.body.position;
            const angle = m.body.angle;
            m.element.style.left = `${x - m.width/2}px`;
            m.element.style.top = `${y - m.height/2}px`;
            m.element.style.transform = `rotate(${angle}rad)`;
        });
        requestAnimationFrame(updateDOM);
    }

    Runner.run(Runner.create(), engine);
    Render.run(render);
    updateDOM();

    // Create walls for the hero section edges
    const wallThickness = 100;
    const heroH = getHeroHeight();
    const walls = [
        Bodies.rectangle(window.innerWidth / 2, -wallThickness / 2, window.innerWidth * 2, wallThickness, { isStatic: true, render: { visible: false } }),
        Bodies.rectangle(window.innerWidth / 2, heroH + wallThickness / 2, window.innerWidth * 2, wallThickness, { isStatic: true, render: { visible: false } }),
        Bodies.rectangle(window.innerWidth + wallThickness / 2, heroH / 2, wallThickness, heroH * 2, { isStatic: true, render: { visible: false } }),
        Bodies.rectangle(-wallThickness / 2, heroH / 2, wallThickness, heroH * 2, { isStatic: true, render: { visible: false } })
    ];
    World.add(world, walls);

    window.addEventListener('resize', () => {
        render.canvas.width = window.innerWidth;
        render.canvas.height = window.innerHeight;
        World.remove(world, walls);
        walls.length = 0;
        const w = window.innerWidth;
        const h = getHeroHeight();
        walls.push(
            Bodies.rectangle(w / 2, -wallThickness / 2, w * 2, wallThickness, { isStatic: true, render: { visible: false } }),
            Bodies.rectangle(w / 2, h + wallThickness / 2, w * 2, wallThickness, { isStatic: true, render: { visible: false } }),
            Bodies.rectangle(w + wallThickness / 2, h / 2, wallThickness, h * 2, { isStatic: true, render: { visible: false } }),
            Bodies.rectangle(-wallThickness / 2, h / 2, wallThickness, h * 2, { isStatic: true, render: { visible: false } })
        );
        World.add(world, walls);
    });
});
