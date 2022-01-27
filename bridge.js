function Bridge(xCor, yCor, beads, beadDist) {

    var prev = null;
    for (var x = 0; x <= beads; x += 1) {
        var fixed = false;
        if (!prev) {
            fixed = true;
        } else if (x == beads) {
            fixed = true;
        }
        var xDist = (beads * beadDist)
        var p = new Particle((xCor - (xDist / 2)) + (x * beadDist), yCor, 25, fixed);
        particles.push(p);

        if (prev) {
            var options = {
                bodyA: p.body,
                bodyB: prev.body,
                length: 70,
                stiffness: .5
            }
            var constraint = Constraint.create(options);
            World.add(world, constraint);
        }

        prev = p;
    }
}