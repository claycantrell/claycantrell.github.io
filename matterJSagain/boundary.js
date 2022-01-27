let randy = Math.floor(Math.random() * 180 + 1)

function Boundary(x, y, w, h, a, s, show) {
    var options = {
        friction: .01,
        angle: a,
        isStatic: s,
    }
    this.body = Bodies.rectangle(x, y, w, h, options);
    this.w = w;
    this.h = h;
    World.add(world, this.body);

    this.removeFromWorld = function () {
        World.remove(world, this.body);
    }

    let hueStroke = huePicker(randy, 80);

    this.show = function () {
        if (show == true) {
            var pos = this.body.position;
            var angle = this.body.angle;

            push();
            translate(pos.x, pos.y);
            rotate(angle);
            rectMode(CENTER);
            stroke(hueStroke);
            strokeWeight(4);
            fill(0, 0, 0, 0);
            rect(0, 0, this.w, this.h);
            pop();

        }

    }
}