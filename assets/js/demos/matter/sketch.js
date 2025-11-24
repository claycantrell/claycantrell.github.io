//module aliases
var Engine = Matter.Engine,
    //Render = Matter.Render,
    World = Matter.World,
    Bodies = Matter.Bodies,
    Constraint = Matter.Constraint,
    Mouse = Matter.Mouse,
    Composites = Matter.Composites,
    MouseConstraint = Matter.MouseConstraint


var engine;
var world;
var circles = [];
var boundaries = [];
var particles = [];

var ground;

var mConstraint;

var fridgeImg;

function preload() {
    fridgeImg = loadImage('../assets/image-from-rawpixel-id-15570520-png.png');
}

function setup() {
    var canvas = createCanvas(window.innerWidth, window.innerHeight);
    canvas.id('mycanvas');
    canvas.parent('sketch-holder');
    engine = Engine.create();
    // var defaultGravity = .001;
    // engine.gravity.scale = defaultGravity;
    world = engine.world;

    boundaries.push(new Boundary(width / 2, height, width, 1, 0, true, false));

    // Fridge Dimensions
    let fWidth = width / 14; 
    let fHeight = fWidth * 1.8; 

    // We use Composites.stack for layout
    // (xx, yy, columns, rows, columnGap, rowGap, callback)
    // We remove gaps (0, 0) so they stack flush
    // We set startY so they sit on the floor
    let startY = height - (4 * fHeight) - 50;

    let stack = Composites.stack(width / 2, startY, 4, 4, 0, 0, function (x, y) {
        let b = new Boundary(x, y, fWidth, fHeight, 0, false, true);
        boundaries.push(b);
        // CRITICAL: We MUST return the body for the stack to work, 
        // BUT Boundary() adds it to World. Stack adds it to World.
        // This causes double-add.
        // FIX: The Boundary class adds it to World. 
        // So we return UNDEFINED here so stack is empty but positions are calculated.
        // OR we just use the stack for positioning and don't add the stack to the world.
        
        // Let's return the body so stack has references, but NOT add stack to world.
        return b.body;
    });
    
    // DO NOT add stack to world, because Boundary constructor already added bodies to world.
    // World.add(world, stack); 

    var canvasmouse = Mouse.create(canvas.elt);
    canvasmouse.pixelRatio = pixelDensity();
    var options = {
        mouse: canvasmouse
    }
    mConstraint = MouseConstraint.create(engine, options);
    //these lines allow for scrolling over the canvas element 
    mConstraint.mouse.element.removeEventListener("mousewheel", mConstraint.mouse.mousewheel);
    mConstraint.mouse.element.removeEventListener("DOMMouseScroll", mConstraint.mouse.mousewheel);

    World.add(world, mConstraint);

}


var mouseReturn = false;

function mouseDragged() {
    if (mouseReturn == true) {
        circles.push(new Circle(mouseX, mouseY, random(15, 30)));
    }
}

var isClear = true;

function draw() {
    //no backround or clear creates cool effect
    //background('rgba(0,255,0, 0.25)');
    //this also creates a cool effect
    if (isClear == true) {
        clear();
    }
    Engine.update(engine);
    for (let i = 0; i < circles.length; i++) {
        circles[i].show();
        if (circles[i].isOffScreen()) {
            circles[i].removeFromWorld();
            circles.splice(i, 1);
            i--;
        }
    }
    for (var i = 0; i < boundaries.length; i++) {
        boundaries[i].show();
    }
    for (var i = 0; i < particles.length; i++) {
        particles[i].show();
    }

    // if (mConstraint.body) {
    //     var pos = mConstraint.body.position;
    //     var offset = mConstraint.constraint.pointB;
    //     var m = mConstraint.mouse.position;
    //     stroke(0, 255, 0);
    //     line(pos.x + offset.x, pos.y + offset.y, m.x, m.y)
    // }

}


window.onresize = function () {
    location.reload();
}
