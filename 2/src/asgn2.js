// David Ho dho20ucsc.edu
// just a chill guy

// ColoredPoint.js (c) 2012 matsuda
// Vertex shader program
var VSHADER_SOURCE = `
  attribute vec4 a_Position;
  uniform mat4 u_ModelMatrix;
  uniform mat4 u_GlobalRotateMatrix;
  void main() {
    gl_Position = u_GlobalRotateMatrix * u_ModelMatrix * a_Position;
  }`

// Fragment shader program
var FSHADER_SOURCE = `
  precision mediump float;
  uniform vec4 u_FragColor;
  void main() {
    gl_FragColor = u_FragColor;
  }`

// Global Variables
let canvas;
let gl;
let a_Position;
let u_FragColor;
let u_ModelMatrix;
let u_GlobalRotateMatrix;
let eardegree = 0;
let nosedegree = 0;
let animation = false;
let vertexBuffer;
let isDragging = false;
let lastMouseX = 0, lastMouseY = 0;
let rotationSpeed = 0.5;
let g_globalAngleX = 0;
let g_globalAngleY = 45;
let helicopter = 0;
let girth = 0;
let headheight = 0;
function setupWebGL(){
  // Retrieve <canvas> element
  canvas = document.getElementById('webgl');

  // Get the rendering context for WebGL
  gl = canvas.getContext("webgl", { preserveDrawingBuffer: true });
  if (!gl) {
    console.log('Failed to get the rendering context for WebGL');
    return;
  }  
  gl.enable(gl.DEPTH_TEST);
  vertexBuffer = gl.createBuffer();
  if (!vertexBuffer) {
      console.log('Failed to create the vertex buffer');
      return;
  }
}

function connectVariablesToGLSL(){
  // Initialize shaders
  if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
    console.log('Failed to intialize shaders.');
    return;
  }

  // // Get the storage location of a_Position
  a_Position = gl.getAttribLocation(gl.program, 'a_Position');
  if (a_Position < 0) {
    console.log('Failed to get the storage location of a_Position');
    return;
  }

  // Get the storage location of u_FragColor
  u_FragColor = gl.getUniformLocation(gl.program, 'u_FragColor');
  if (!u_FragColor) {
    console.log('Failed to get the storage location of u_FragColor');
    return;
  }
  u_ModelMatrix = gl.getUniformLocation(gl.program, 'u_ModelMatrix');
  if (!u_ModelMatrix) {
    console.log('Failed model matrix')
    return;
  }

  u_GlobalRotateMatrix = gl.getUniformLocation(gl.program, 'u_GlobalRotateMatrix');
  if (!u_GlobalRotateMatrix) {
    console.log('Failed global rotate');
    return;
  }

  var identityM = new Matrix4();
  gl.uniformMatrix4fv(u_ModelMatrix, false, identityM.elements);

}

function initMouseControls() {
  let canvas = document.getElementById("webgl");

  canvas.addEventListener("mousedown", function (event) {
    isDragging = true;
    lastMouseX = event.clientX;
    lastMouseY = event.clientY;
  });

  canvas.addEventListener("mousemove", function (event) {
    if (isDragging) {
      let dx = event.clientX - lastMouseX;
      let dy = event.clientY - lastMouseY;

      g_globalAngleY -= dx * rotationSpeed;
      g_globalAngleX -= dy * rotationSpeed;

      g_globalAngleX = Math.max(-90, Math.min(90, g_globalAngleX));

      lastMouseX = event.clientX;
      lastMouseY = event.clientY;
      
      renderScene();
    }
  });

  canvas.addEventListener("mouseup", function () {
    isDragging = false;
  });

  canvas.addEventListener("mouseleave", function () {
    isDragging = false;
  });

  canvas.addEventListener("click", function (event) {
    if (event.shiftKey) {
      unleashthebeast();
      console.log("Beast Unleashed");
    }
});
}

let lastFrameTime = performance.now();
let frameCount = 0;
let fps = 0;
function unleashthebeast(){
  let interval = setInterval(() => {
    if (girth < 5) {
      girth += 0.02;
    } else {
      if (helicopter < 200) {
        helicopter += 2;
      } else if (helicopter < 500){
        helicopter += 4;
      } else if (helicopter < 1000) {
        helicopter += 6;
      } else if (helicopter < 8000) {
        helicopter += 10;
        
        if (helicopter > 3500) {
          headheight += 0.01;
        }
        if (helicopter > 5750) {
          headheight -= 0.01;
        }
      } else {
        let returnInterval = setInterval(() => {
          if (headheight > 0) {
            headheight = Math.max(headheight - 0.001, 0);
          } else {
            clearInterval(returnInterval);
            helicopter = 0;
            girth = 0;
            clearInterval(interval);
          }
        }, 10);
      }
    } 
  }, 10);
}


function main() {
  setupWebGL();
  connectVariablesToGLSL();
  g_globalAngle = 45;
  document.getElementById('angleSlider').addEventListener('input', function() { g_globalAngleY = this.value; renderScene(); });
  document.getElementById('Earslider').addEventListener('input', function() { eardegree = this.value; renderScene(); });
  document.getElementById('animationOn').onclick = function() {animation = true};
  document.getElementById('animationOff').onclick = function() {animation = false};
  document.getElementById('Noseslider').addEventListener('input', function() { nosedegree = this.value; renderScene(); });
  initMouseControls();
  gl.clearColor(0.5, 0.5, 0.5, 1.0);
  requestAnimationFrame(tick);
}

var g_startTime=performance.now()/1000;
var g_seconds=performance.now()/1000-g_startTime;

function tick() {
  let now = performance.now();
  frameCount++;
  if (now - lastFrameTime >= 1000) {
      fps = frameCount;
      frameCount = 0;
      lastFrameTime = now;
      document.getElementById("fpsValue").innerText = fps;
  }
  if (animation) {
      g_seconds = (now / 1000) - g_startTime;
  }
  renderScene();
  requestAnimationFrame(tick);
}

class Point{
  constructor(){
    this.type='point';
    this.position = [0.0, 0.0, 0.0];
    this.color = [1.0,1.0,1.0,1.0];
    this.size = 10.0;
  }

  render() {
    var xy = this.position;
    var rgba = this.color;
    var xsize = this.size * 2;

    gl.disableVertexAttribArray(a_Position);
    // Pass the position of a point to a_Position variable
    gl.vertexAttrib3f(a_Position, xy[0], xy[1], 0.0);
    // Pass the color of a point to u_FragColor variable
    gl.uniform4f(u_FragColor, rgba[0], rgba[1], rgba[2], rgba[3]);

    gl.uniform1f(size, xsize);
    // Draw
    gl.drawArrays(gl.POINTS, 0, 1);
  }
}

class Triangle {
  constructor() {
    this.type = 'triangle';
    this.position = [0.0, 0.0, 0.0];
    this.color = [1.0, 1.0, 1.0, 1.0];
    this.size = 5.0;
  }

  render() {
    var xy = this.position;
    var rgba = this.color;
    var xsize = this.size * 0.01;  // Scale size appropriately

    // Pass the color of a point to u_FragColor variable
    gl.uniform4f(u_FragColor, rgba[0], rgba[1], rgba[2], rgba[3]);

    // Adjust the vertices based on size
    let vertices = [
      xy[0], xy[1],                        // Vertex 1
      xy[0] + xsize, xy[1],                 // Vertex 2
      xy[0], xy[1] + xsize                   // Vertex 3
    ];

    drawTriangle(vertices);
  }
}

class Circle {
  constructor(segments) {
    this.type = 'circle';
    this.position = [0.0, 0.0, 0.0];
    this.color = [1.0, 1.0, 1.0, 1.0];
    this.size = 10.0;
    this.segments = segments;
  }

  render() {
    var xy = this.position;
    var rgba = this.color;
    var radius = this.size * 0.005; 

    gl.uniform4f(u_FragColor, rgba[0], rgba[1], rgba[2], rgba[3]);

    let angleStep = (2 * Math.PI) / this.segments;

    for (var i = 0; i < this.segments; i++) {
      let angle1 = i * angleStep;
      let angle2 = (i + 1) * angleStep;

      let pt1 = [xy[0] + Math.cos(angle1) * radius, xy[1] + Math.sin(angle1) * radius];
      let pt2 = [xy[0] + Math.cos(angle2) * radius, xy[1] + Math.sin(angle2) * radius];

      drawTriangle([xy[0], xy[1], pt1[0], pt1[1], pt2[0], pt2[1]]);
    }
  }
}

class Cube {
  constructor(){
    this.type='cube';
    this.color = [1.0,1.0,1.0,1.0];
    this.matrix = new Matrix4();
  }

  render(){
    var rgba = this.color;
    gl.uniform4f(u_FragColor, rgba[0], rgba[1], rgba[2], rgba[3]);
    gl.uniformMatrix4fv(u_ModelMatrix, false, this.matrix.elements);
    drawCube(this.matrix);
  }
}

class Cylinder {
  constructor(segments = 36) {
    this.type = 'cylinder';
    this.color = [1.0, 1.0, 1.0, 1.0];
    this.matrix = new Matrix4();
    this.segments = segments;
    this.height = 1.0;
    this.radius = 0.5;
  }

  render() {
    gl.uniform4fv(u_FragColor, this.color);
    gl.uniformMatrix4fv(u_ModelMatrix, false, this.matrix.elements);
    drawCylinder(this.segments, this.radius, this.height);
  }
}

function drawCylinder(segments, radius, height) {
  let angleStep = (2 * Math.PI) / segments;
  let vertices = [];

  let topCenter = [0, height / 2, 0];
  let bottomCenter = [0, -height / 2, 0];

  for (let i = 0; i <= segments; i++) {
    let angle = i * angleStep;
    let x = Math.cos(angle) * radius;
    let z = Math.sin(angle) * radius;
    if (i > 0) {
      drawTriangle3D([
        ...topCenter,
        ...vertices[vertices.length - 3],
        x, height / 2, z,
      ]);
    }
    if (i > 0) {
      drawTriangle3D([
        ...bottomCenter,
        x, -height / 2, z,
        ...vertices[vertices.length - 3],
      ]);
    }

    vertices.push(x, height / 2, z);
    vertices.push(x, -height / 2, z);
  }

  for (let i = 0; i < vertices.length - 2; i += 2) {
    let top1 = vertices.slice(i, i + 3);
    let bottom1 = vertices.slice(i + 3, i + 6);
    let top2 = vertices.slice(i + 2, i + 5);
    let bottom2 = vertices.slice(i + 5, i + 8);

    drawTriangle3D([...top1, ...bottom1, ...top2]);
    drawTriangle3D([...bottom1, ...bottom2, ...top2]);
  }
}

function HSVtoRGB(h, s, v) {
  let c = v * s;
  let x = c * (1 - Math.abs((h / 60) % 2 - 1));
  let m = v - c;

  let r = 0, g = 0, b = 0;
  if (h >= 0 && h < 60) {
    r = c; g = x; b = 0;
  } else if (h >= 60 && h < 120) {
    r = x; g = c; b = 0;
  } else if (h >= 120 && h < 180) {
    r = 0; g = c; b = x;
  } else if (h >= 180 && h < 240) {
    r = 0; g = x; b = c;
  } else if (h >= 240 && h < 300) {
    r = x; g = 0; b = c;
  } else {
    r = c; g = 0; b = x;
  }

  return [r + m, g + m, b + m];
}

var g_shapesList = [];

function renderScene(){
  let globalRotMat = new Matrix4()
    .rotate(g_globalAngleY, 0, 1, 0)
    .rotate(g_globalAngleX, 1, 0, 0);
  gl.uniformMatrix4fv(u_GlobalRotateMatrix, false, globalRotMat.elements);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    let bodyMatrix = new Matrix4();
    bodyMatrix.translate(-.2499, -.2 + (Math.sin(g_seconds)/50), 0.0);
    bodyMatrix.scale(0.499, .35, 0.35);
    drawCube(bodyMatrix, [0.62,0.64,0.64, 1.0]);

    let leftlegMatrix = new Matrix4();
    leftlegMatrix.translate(-0.2499, -0.65 + (Math.sin(g_seconds)/50), 0.03);
    leftlegMatrix.scale(0.238, .457, 0.3);
    drawCube(leftlegMatrix, [0.53,0.73,0.68, 1]);

    let rightlegMatrix = new Matrix4();
    rightlegMatrix.translate(.0101, -0.65+ (Math.sin(g_seconds)/50), 0.03);
    rightlegMatrix.scale(0.239, .457, 0.3);
    drawCube(rightlegMatrix, [0.53,0.73,0.68,1]);

    let leftshoeMatrix = new Matrix4();
    leftshoeMatrix.translate(-0.25, -0.83, -.06);
    leftshoeMatrix.scale(0.24, .2, 0.4);
    drawCube(leftshoeMatrix, [0.67,0.33,0.27, 1]);

    let rightshoeMatrix = new Matrix4();
    rightshoeMatrix.translate(.01, -0.83, -.06);
    rightshoeMatrix.scale(0.24, .2, 0.4);
    drawCube(rightshoeMatrix, [0.67,0.33,0.27,1]);

    let leftArmMatrix = new Matrix4();
    leftArmMatrix.translate(0.25, -.29+ (Math.sin(g_seconds)/50), 0.04);
    leftArmMatrix.rotate(15 -(Math.sin(g_seconds)), 60, 0, 0);
    leftArmMatrix.scale(0.157, 0.45, 0.2);
    drawCube(leftArmMatrix, [0.63,0.67,0.65, 1]);

    let rightArmMatrix = new Matrix4();
    rightArmMatrix.translate(-0.4, -.29+ (Math.sin(g_seconds)/50), 0.04);
    rightArmMatrix.rotate(15 -(Math.sin(g_seconds)), 60, 0, 0);
    rightArmMatrix.scale(0.157, 0.45, 0.2);
    drawCube(rightArmMatrix, [0.63,0.67,0.65, 1]);

    let headMatrix = new Matrix4();
    headMatrix.translate(-.25, .150+ (Math.sin(g_seconds)/50) + headheight, -.1);
    headMatrix.rotate(nosedegree, 1, 0, 0);
    headMatrix.rotate(helicopter, 0, 1, 0);
    headMatrix.scale(0.5, 0.5, 0.5);
    drawCube(headMatrix, [0.68, 0.49, 0.26, 1]);

    let cylinderMatrix = new Matrix4(headMatrix);
    cylinderMatrix.rotate(90, 1, 0, 0);
    cylinderMatrix.translate(.5, -.4, -.55);
    cylinderMatrix.scale(0.425, girth + 1.0, 0.425);
    cylinderMatrix.rotate(-Math.abs((Math.sin(g_seconds))) - eardegree/2 ,1,0,0);
    drawCylinder(cylinderMatrix, [0.64, 0.51, 0.26, 1], 50);

    let cylinder2Matrix = new Matrix4(cylinderMatrix);
    cylinder2Matrix.translate(0, -.25, 0);
    cylinder2Matrix.scale(.99,.99,.99);
    drawCylinder(cylinder2Matrix, [0, 0, 0, 1], 50)

    let leftearMatrix = new Matrix4(headMatrix);
    leftearMatrix.translate(0, 1, .8);
    leftearMatrix.rotate(eardegree, 1, 0, 0);
    leftearMatrix.scale(0.1, .35, 0.2);
    drawCube(leftearMatrix, [0.70,0.51,0.33, 1]);

    let rightearMatrix = new Matrix4(headMatrix);
    rightearMatrix.translate(.9, 1, 0.8);
    rightearMatrix.rotate(eardegree, 1, 0, 0);
    rightearMatrix.scale(0.1, .35, 0.2);
    drawCube(rightearMatrix, [0.70,0.51,0.33, 1]);
    
}

function clearCanvas() {
  g_shapesList = [];  // Clear the list of shapes
  renderScene();  // Re-render to clear the canvas
}

function drawTriangle(vertices) {
  var n = 3; // The number of vertices

  // Create a buffer object
  var vertexBuffer = gl.createBuffer();
  if (!vertexBuffer) {
      console.log('Failed to create the buffer object');
      return -1;
  }

  // Bind the buffer object to target
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);

  // Write data into the buffer object
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.DYNAMIC_DRAW);

  // Assign the buffer object to a_Position variable
  gl.vertexAttribPointer(a_Position, 2, gl.FLOAT, false, 0, 0);

  // Enable the assignment to a_Position variable
  gl.enableVertexAttribArray(a_Position);

  gl.drawArrays(gl.TRIANGLES, 0, n);
}

function drawTriangle3D(vertices) {
  var n = 3; // The number of vertices

  // Write data into the buffer object
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.DYNAMIC_DRAW);

  // Assign the buffer object to a_Position variable
  gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);

  // Enable the assignment to a_Position variable
  gl.enableVertexAttribArray(a_Position);

  gl.drawArrays(gl.TRIANGLES, 0, n);
}
let vertices = [
  0.0, 0.0, 0.0,  1.0, 1.0, 0.0,  1.0, 0.0, 0.0,
  0.0, 0.0, 0.0,  0.0, 1.0, 0.0,  1.0, 1.0, 0.0,

  0.0, 0.0, 1.0,  1.0, 0.0, 1.0,  1.0, 1.0, 1.0,
  0.0, 0.0, 1.0,  1.0, 1.0, 1.0,  0.0, 1.0, 1.0,

  0.0, 0.0, 0.0,  0.0, 0.0, 1.0,  0.0, 1.0, 1.0,
  0.0, 0.0, 0.0,  0.0, 1.0, 1.0,  0.0, 1.0, 0.0,

  1.0, 0.0, 0.0,  1.0, 1.0, 0.0,  1.0, 1.0, 1.0,
  1.0, 0.0, 0.0,  1.0, 1.0, 1.0,  1.0, 0.0, 1.0,

  0.0, 0.0, 0.0,  1.0, 0.0, 0.0,  1.0, 0.0, 1.0,
  0.0, 0.0, 0.0,  1.0, 0.0, 1.0,  0.0, 0.0, 1.0,

  0.0, 1.0, 0.0,  0.0, 1.0, 1.0,  1.0, 1.0, 1.0,
  0.0, 1.0, 0.0,  1.0, 1.0, 1.0,  1.0, 1.0, 0.0
];
function drawCube(M, color) {
  gl.uniformMatrix4fv(u_ModelMatrix, false, M.elements);
  gl.uniform4fv(u_FragColor, color);

  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);

  for (let i = 0; i < vertices.length; i += 9) {
      drawTriangle3D(vertices.slice(i, i + 9));
  }
}

function drawCylinder(M, color, segments = 36) {
  gl.uniformMatrix4fv(u_ModelMatrix, false, M.elements);
  gl.uniform4fv(u_FragColor, color);

  let topCenter = [0, 1, 0];
  let bottomCenter = [0, 0, 0];

  let angleStep = (2 * Math.PI) / segments;

  let topVertices = [];
  let bottomVertices = [];

  for (let i = 0; i < segments; i++) {
    let angle = i * angleStep;
    let x = Math.cos(angle);
    let z = Math.sin(angle);

    topVertices.push([x, 1, z]);
    bottomVertices.push([x, 0, z]);
  }

  for (let i = 0; i < segments; i++) {
    let nextIndex = (i + 1) % segments;
    drawTriangle3D([...topCenter, ...topVertices[i], ...topVertices[nextIndex]]);
    drawTriangle3D([...bottomCenter, ...bottomVertices[nextIndex], ...bottomVertices[i]]);
  }

  for (let i = 0; i < segments; i++) {
    let nextIndex = (i + 1) % segments;
    drawTriangle3D([...topVertices[i], ...bottomVertices[i], ...bottomVertices[nextIndex]]);
    drawTriangle3D([...topVertices[i], ...bottomVertices[nextIndex], ...topVertices[nextIndex]]);
  }
}
