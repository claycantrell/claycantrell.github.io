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
        { x: 100, y: 100 }, { x: 200, y: 100 }, { x: 300, y: 100 },
        { x: 100, y: 200 }, { x: 250, y: 200 }, { x: 400, y: 200 },
        { x: 100, y: 300 }, { x: 250, y: 300 }, { x: 400, y: 300 },
        { x: 100, y: 400 }, { x: 300, y: 400 }
    ];

    // Mobile Column Layout Overrides
    const isMobile = window.innerWidth <= 768; // Standard tablet/mobile breakpoint
    if (isMobile) {
        // Stack them in a column on the left side
        const leftOffset = 60; // Distance from left edge (reduced from 80 for smaller screens)
        const startY = 80;
        const gapY = 40; // Tighter vertical spacing
        
        words.forEach((_, i) => {
            initialLayout[i] = { x: leftOffset, y: startY + (i * gapY) };
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

    // Track mouse
    window.addEventListener('mousemove', (e) => {
        // Move the anchor point to mouse position
        Body.setPosition(mouseAnchor, { x: e.clientX, y: e.clientY });
        
        // Wake up nearby bodies
        const buffer = 100;
        const x = e.clientX;
        const y = e.clientY;
        const bounds = { 
            min: { x: x - buffer, y: y - buffer }, 
            max: { x: x + buffer, y: y + buffer } 
        };
        const bodies = Matter.Query.region(magnets.map(m => m.body), bounds);
        bodies.forEach(body => Body.setAwake(body, true));
    });

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
