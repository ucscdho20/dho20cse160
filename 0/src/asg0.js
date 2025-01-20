// DrawRectangle.js
function main() {
    // Retrieve <canvas> element                                  <- (1)
    var canvas = document.getElementById('example');
    if (!canvas) {
    console.log('Failed to retrieve the <canvas> element');
    return;
    }
    
// Get the rendering context for 2DCG                          <- (2)
var ctx = canvas.getContext('2d');
ctx.translate(canvas.width / 2, canvas.height / 2);
}

function drawVector(ctx, v, color) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;

    ctx.beginPath();
    ctx.moveTo(0, 0);

    ctx.lineTo(v.elements[0] * 20, -v.elements[1] * 20);
    ctx.stroke();
}

function angleBetween(v1, v2) {
    let dotProduct = Vector3.dot(v1, v2);
    let magnitudeV1 = v1.magnitude();
    let magnitudeV2 = v2.magnitude();
    let cos = dotProduct / (magnitudeV1 * magnitudeV2);
    let angle = Math.acos(cos);
    return (angle * 180) / Math.PI;
}

function areaTriangle(v1, v2) {
    let crossProduct = Vector3.cross(v1, v2);
    let area = crossProduct.magnitude() / 2;
    return area;
}

function handleDrawEvent() {
    var canvas = document.getElementById('example');
    var ctx = canvas.getContext('2d');

    ctx.clearRect(-canvas.width / 2, -canvas.height / 2, canvas.width, canvas.height);

    var v1x = parseFloat(document.getElementById('v1xInput').value);
    var v1y = parseFloat(document.getElementById('v1yInput').value);
    var v1 = new Vector3([v1x, v1y, 0]);

    var v2x = parseFloat(document.getElementById('v2xInput').value);
    var v2y = parseFloat(document.getElementById('v2yInput').value);
    var v2 = new Vector3([v2x, v2y, 0]);

    drawVector(ctx, v1, "red");
    drawVector(ctx, v2, "blue");
}

function handleDrawOperationEvent() {
    var canvas = document.getElementById('example');
    var ctx = canvas.getContext('2d');

    ctx.clearRect(-canvas.width / 2, -canvas.height / 2, canvas.width, canvas.height);
    handleDrawEvent()

    var operation = document.getElementById('operation').value;
    var scalar = parseFloat(document.getElementById('scalarInput').value);

    var v1x = parseFloat(document.getElementById('v1xInput').value);
    var v1y = parseFloat(document.getElementById('v1yInput').value);
    v1 = new Vector3([v1x, v1y, 0]);

    var v2x = parseFloat(document.getElementById('v2xInput').value);
    var v2y = parseFloat(document.getElementById('v2yInput').value);
    v2 = new Vector3([v2x, v2y, 0]);

    if (operation === "add") {
        let v3 = new Vector3(v1.elements);
        v3.add(v2);
        drawVector(ctx, v3, "green");
    } else if (operation === "sub") {
        let v3 = new Vector3(v1.elements);
        v3.sub(v2);
        drawVector(ctx, v3, "green");
    } else if (operation === "mul") {
        let v3 = new Vector3(v1.elements);
        v3.mul(scalar);
        drawVector(ctx, v3, "green");
        let v4 = new Vector3(v2.elements);
        v4.mul(scalar);
        drawVector(ctx, v4, "green");
    } else if (operation === "div") {
        if (scalar !== 0) {
            let v3 = new Vector3(v1.elements);
            v3.div(scalar);
            drawVector(ctx, v3, "green");
            let v4 = new Vector3(v2.elements);
            v4.div(scalar);
            drawVector(ctx, v4, "green");
        } else {
            alert("Do not divide by zero.");
        }
    } else if (operation === "magnitude") {
        console.log("Magnitude of v1:", v1.magnitude());
        console.log("Magnitude of v2:", v2.magnitude());
    } else if (operation === "normalize") {
        let v1Normalized = new Vector3(v1.elements);
        v1Normalized.normalize();
        drawVector(ctx, v1Normalized, "green");

        let v2Normalized = new Vector3(v2.elements);
        v2Normalized.normalize();
        drawVector(ctx, v2Normalized, "green");
    } else if (operation === "angle") {
        let angle = angleBetween(v1, v2);
        console.log("Angle:", angle);
    } else if (operation === "area") {
        let area = areaTriangle(v1, v2);
        console.log("Area of the triangle:", area);
    }
}