document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('magnet-container');
    if (!container) return;

    const words = [
        "Hi,", "I'm", "Clay!",
        "Musician,", "Developer,",
        "Designer,", "Artist,",
        "Analyst,", "and",
        "Life", "Enthusiast."
    ];

    const initialLayout = [
        // Desktop Layout (Spread out)
        { x: 100, y: 150 }, { x: 200, y: 150 }, { x: 300, y: 150 },
        { x: 100, y: 250 }, { x: 250, y: 250 }, { x: 400, y: 250 },
        { x: 100, y: 350 }, { x: 250, y: 350 }, { x: 400, y: 350 },
        { x: 100, y: 450 }, { x: 300, y: 450 }
    ];

    // Mobile Column Layout Overrides
    const isMobile = window.innerWidth <= 768; // Standard tablet/mobile breakpoint
    if (isMobile) {
        // Create a staggered grid layout with some rows having 2 magnets
        const leftOffset = 60; // Distance from left edge
        const startY = 160; // Moved down even more (was 120)
        const gapY = 40; // Vertical spacing
        const gapX = 120; // Horizontal spacing for side-by-side magnets

        // Custom layout: mix single and double rows
        const mobileLayout = [
            // Row 1: Single
            { x: leftOffset, y: startY },
            // Row 2: Two side by side
            { x: leftOffset, y: startY + gapY },
            { x: leftOffset + gapX, y: startY + gapY },
            // Row 3: Single
            { x: leftOffset, y: startY + (gapY * 2) },
            // Row 4: Two side by side
            { x: leftOffset, y: startY + (gapY * 3) },
            { x: leftOffset + gapX, y: startY + (gapY * 3) },
            // Row 5: Single
            { x: leftOffset, y: startY + (gapY * 4) },
            // Row 6: Two side by side
            { x: leftOffset, y: startY + (gapY * 5) },
            { x: leftOffset + gapX, y: startY + (gapY * 5) },
            // Row 7: Single
            { x: leftOffset, y: startY + (gapY * 6) },
            // Row 8: Two side by side
            { x: leftOffset, y: startY + (gapY * 7) },
            { x: leftOffset + gapX, y: startY + (gapY * 7) }
        ];

        // Apply the custom mobile layout
        words.forEach((_, i) => {
            if (mobileLayout[i]) {
                initialLayout[i] = mobileLayout[i];
            }
        });
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

    // Create Magnets
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
            frictionAir: 0.15, // Higher air friction to stop quickly (simulates table friction)
            density: 0.001,    // Light density
            angle: (Math.random() * 0.2) - 0.1
        });

        // Ensure rotation is easy
        Body.setInertia(body, (width * height * body.mass) / 12); 

        World.add(world, body);
        magnets.push({ element: magnet, body: body, width, height });
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
    Events.on(engine, 'beforeUpdate', function() {
        const margin = 20;
        const w = window.innerWidth;
        const h = window.innerHeight;

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

    // Create walls for the screen edges
    const wallThickness = 100; // Invisible thick walls outside view
    const walls = [
        Bodies.rectangle(window.innerWidth / 2, -wallThickness / 2, window.innerWidth * 2, wallThickness, { isStatic: true, render: { visible: false } }), // Top
        Bodies.rectangle(window.innerWidth / 2, window.innerHeight + wallThickness / 2, window.innerWidth * 2, wallThickness, { isStatic: true, render: { visible: false } }), // Bottom
        Bodies.rectangle(window.innerWidth + wallThickness / 2, window.innerHeight / 2, wallThickness, window.innerHeight * 2, { isStatic: true, render: { visible: false } }), // Right
        Bodies.rectangle(-wallThickness / 2, window.innerHeight / 2, wallThickness, window.innerHeight * 2, { isStatic: true, render: { visible: false } }) // Left
    ];
    World.add(world, walls);

    // Keep walls updated on resize
    window.addEventListener('resize', () => {
        render.canvas.width = window.innerWidth;
        render.canvas.height = window.innerHeight;
        
        // Remove old walls
        World.remove(world, walls);
        walls.length = 0; // Clear array
        
        // Add new walls
        const w = window.innerWidth;
        const h = window.innerHeight;
        walls.push(
            Bodies.rectangle(w / 2, -wallThickness / 2, w * 2, wallThickness, { isStatic: true, render: { visible: false } }),
            Bodies.rectangle(w / 2, h + wallThickness / 2, w * 2, wallThickness, { isStatic: true, render: { visible: false } }),
            Bodies.rectangle(w + wallThickness / 2, h / 2, wallThickness, h * 2, { isStatic: true, render: { visible: false } }),
            Bodies.rectangle(-wallThickness / 2, h / 2, wallThickness, h * 2, { isStatic: true, render: { visible: false } })
        );
        World.add(world, walls);
    });
});
