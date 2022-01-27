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

function setup() {
    var canvas = createCanvas(window.innerWidth, window.innerHeight);
    canvas.id('mycanvas');
    canvas.parent('sketch-holder');
    engine = Engine.create();
    // var defaultGravity = .001;
    // engine.gravity.scale = defaultGravity;
    world = engine.world;

    boundaries.push(new Boundary(width / 2, height, width, 1, 0, true, false));

    //Bridge(width / 2, height / 6, 10, 40);

    let stack = Composites.stack(width / 2, height - (width / 2.9), 4, 4, width / 10, width / 10, function (x, y) {
        boundaries.push(new Boundary(x, y, width / 10, width / 10, 0, false, true));
    });
    World.add(world, stack);

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