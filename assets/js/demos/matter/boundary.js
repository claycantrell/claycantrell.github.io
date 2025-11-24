let randy = Math.floor(Math.random() * 180 + 1)

function Boundary(x, y, w, h, a, s, show) {
    var options = {
        friction: .5, // Increased friction for stability
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

    this.show = function () {
        if (show == true) {
            var pos = this.body.position;
            var angle = this.body.angle;

            push();
            translate(pos.x, pos.y);
            rotate(angle);
            
            if (typeof fridgeImg !== 'undefined' && fridgeImg) {
                 imageMode(CENTER);
                 image(fridgeImg, 0, 0, this.w, this.h);
            } else {
                rectMode(CENTER);
                // Fallback Draw Fridge Body
                stroke(100);
                strokeWeight(2);
                fill(240); // Off-white / Silver body
                rect(0, 0, this.w, this.h, 4); // Main body with rounded corners

                // Draw Divider (Freezer vs Fridge) - assuming top freezer
                stroke(150);
                strokeWeight(1);
                line(-this.w/2, -this.h * 0.2, this.w/2, -this.h * 0.2);

                // Draw Handles
                noStroke();
                fill(180); // Handle color
                rect(this.w * 0.35, -this.h * 0.35, this.w * 0.08, this.h * 0.15, 2);
                rect(this.w * 0.35, this.h * 0.1, this.w * 0.08, this.h * 0.3, 2);
            }
            
            pop();
        }
    }
}
