let randyCircle = Math.floor(Math.random() * 180 + 1)

function Circle(x, y, r) {
    var options = {
        friction: .01,
        restitution: 1
    }
    this.body = Bodies.circle(x, y, r, options);
    this.r = r;
    World.add(world, this.body);

    this.isOffScreen = function () {
        var pos = this.body.position;
        return (pos.y > height + 100);
    }

    this.removeFromWorld = function () {
        World.remove(world, this.body);
    }

    let hueStrokeCircle = huePicker(randyCircle, 80);


    this.show = function () {
        var pos = this.body.position;
        var angle = this.body.angle;

        push();
        translate(pos.x, pos.y);
        rotate(angle);
        rectMode(CENTER);
        stroke(0, 0, 0, 0);
        fill(hueStrokeCircle);
        ellipse(0, 0, this.r * 2);
        line(0, 0, this.r, 0);
        pop();
    }
}