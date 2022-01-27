function huePicker(startingHue, hueRangeNum) {
    //create hue array
    let hueArray = [];
    //huePicker array min max range
    let min = startingHue;
    let max = startingHue + hueRangeNum;
    //push whole range of hues to array
    for (let i = min; i < max; i++) {
        hueArray.push(i);
    }

    let hueRand = hueArray[Math.floor(Math.random() * hueArray.length)];
    let hslString = "hsl( " + hueRand + ", 60%, 50%)";

    return hslString;
}