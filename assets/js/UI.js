var GravS = false;
document.querySelectorAll('.btn')[0].addEventListener('click', function (event) {
    console.log('gravity');
    GravS = !GravS;
    if (GravS) {
        engine.gravity.scale = 0;
    } else {
        engine.gravity.scale = .001;
    }

    document.querySelectorAll('.btn')[0].classList.toggle('brand');
});

var FireS = false;
document.querySelectorAll('.btn')[1].addEventListener('click', function (event) {
    console.log('fire');
    FireS = !FireS;
    if (FireS) {
        mouseReturn = true;
    } else {
        mouseReturn = false;
    }

    document.querySelectorAll('.btn')[1].classList.toggle('brand');
});

var XPS = false;
document.querySelectorAll('.btn')[2].addEventListener('click', function (event) {
    console.log('XP');
    XPS = !XPS;
    if (XPS) {
        isClear = false;
    } else {
        isClear = true;
    }

    document.querySelectorAll('.btn')[2].classList.toggle('brand');
});