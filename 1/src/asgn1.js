// David Ho dho20ucsc.edu
// for awesome points, added color preview and a rainbow mode+++

// ColoredPoint.js (c) 2012 matsuda
// Vertex shader program
var VSHADER_SOURCE = `
  attribute vec4 a_Position;
  uniform float size;
  void main() {
    gl_Position = a_Position;
    gl_PointSize = size;

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
let a_Position
let u_FragColor
let currentColor = [1.0, 0.0, 0.0, 1.0];
let size
let drawMode = 'point';
let rainbowMode = false;
let hueCounter = 0;

function toggleRainbowMode() {
  rainbowMode = !rainbowMode;
  console.log("Rainbow mode:", rainbowMode ? "ON" : "OFF");
}

function setupWebGL(){
  // Retrieve <canvas> element
  canvas = document.getElementById('webgl');

  // Get the rendering context for WebGL
  gl = canvas.getContext("webgl", { preserveDrawingBuffer: true });
  if (!gl) {
    console.log('Failed to get the rendering context for WebGL');
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
  size = gl.getUniformLocation(gl.program, 'size');
  if (!size){
    console.log('Failed to get the storage location of size');
    return;
  }

}

function main() {
  setupWebGL();
  connectVariablesToGLSL();

  canvas.onmousedown = click;
  canvas.onmousemove = function(ev) {
    if (ev.buttons === 1) { 
      click(ev);
    }
  };

  document.getElementById('red').addEventListener('input', updateColorPreview);
  document.getElementById('green').addEventListener('input', updateColorPreview);
  document.getElementById('blue').addEventListener('input', updateColorPreview);

  updateColorPreview();

  gl.clearColor(0.0, 0.0, 0.0, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT);
}

function updateColorPreview() {
  const r = parseFloat(document.getElementById('red').value) * 255;
  const g = parseFloat(document.getElementById('green').value) * 255;
  const b = parseFloat(document.getElementById('blue').value) * 255;

  const colorPreview = document.getElementById('colorPreview');
  colorPreview.style.backgroundColor = `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
}

function setDrawMode(mode) {
  drawMode = mode;
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

function click(ev) {
  [x, y] = convertCoordinatesEventToGL(ev);

  let r, g, b;

  if (rainbowMode) {
    [r, g, b] = HSVtoRGB(hueCounter % 360, 1, 1);
    hueCounter += 30;
  } else {
    r = parseFloat(document.getElementById('red').value);
    g = parseFloat(document.getElementById('green').value);
    b = parseFloat(document.getElementById('blue').value);
  }

  const pointSize = parseFloat(document.getElementById('size').value);
  const segments = parseInt(document.getElementById('segments').value);
  let shape;

  if (drawMode === 'point') {
    shape = new Point();
  } else if (drawMode === 'triangle') {
    shape = new Triangle();
  } else if (drawMode === 'circle') {
    shape = new Circle(segments);
  }

  shape.position = [x, y];
  shape.color = [r, g, b, 1.0];
  shape.size = pointSize;
  g_shapesList.push(shape);
  renderAllShapes();
}


function convertCoordinatesEventToGL(ev){
  var x = ev.clientX; // x coordinate of a mouse pointer
  var y = ev.clientY; // y coordinate of a mouse pointer
  var rect = ev.target.getBoundingClientRect();

  x = ((x - rect.left) - canvas.width/2)/(canvas.width/2);
  y = (canvas.height/2 - (y - rect.top))/(canvas.height/2);

  return([x,y]);
}

function renderAllShapes(){
  // Clear <canvas>
  gl.clear(gl.COLOR_BUFFER_BIT);

  var len = g_shapesList.length;
  for(var i = 0; i < len; i++) {
    g_shapesList[i].render();
  }
}

function clearCanvas() {
  g_shapesList = [];  // Clear the list of shapes
  renderAllShapes();  // Re-render to clear the canvas
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

function drawRubiksCube() {
  gl.clear(gl.COLOR_BUFFER_BIT);

  const cubeSize = 0.2;
  const spacing = 0.01;
  const colors = [
    [1.0, 0.0, 0.0],
    [0.0, 1.0, 0.0],
    [0.0, 0.0, 1.0],
    [1.0, 1.0, 0.0],
    [1.0, 0.5, 0.0],
    [1.0, 1.0, 1.0] 
  ];

  let startX = -0.5;
  let startY = 0.5;
  
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      const x = startX + (col * (cubeSize + spacing));
      const y = startY - (row * (cubeSize + spacing));
      const color = colors[(row * 3 + col) % colors.length];

      drawCubeFace(x, y, cubeSize, color);
    }
  }
}

function drawScene() {
  gl.clear(gl.COLOR_BUFFER_BIT);

  drawTable(-0.6, -0.5, 1.2, 0.4, [0.5, 0.3, 0.1]); 

  drawRubiksCube(-0.2, 0.1, 0.2);
}

function drawTable(x, y, width, height, color) {
  const [r, g, b] = color;

  const vertices = new Float32Array([
    x, y,
    x + width, y,
    x, y + height,

    x, y + height,
    x + width, y,
    x + width, y + height
  ]);

  drawShape(vertices, r, g, b);
}

function drawRubiksCube(startX, startY, cubeSize) {
  const spacing = 0.01;
  const colors = [
    [1.0, 0.0, 0.0],
    [0.0, 1.0, 0.0],
    [0.0, 0.0, 1.0],
    [1.0, 1.0, 0.0],
    [1.0, 0.5, 0.0],
    [1.0, 1.0, 1.0]
  ];

  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      const x = startX + (col * (cubeSize + spacing));
      const y = startY - (row * (cubeSize + spacing));
      const color = colors[(row * 3 + col) % colors.length];

      drawCubeFace(x, y, cubeSize, color);
    }
  }
}

function drawCubeFace(x, y, size, color) {
  const [r, g, b] = color;

  const vertices = new Float32Array([
    x, y,
    x + size, y,
    x, y - size,

    x, y - size,
    x + size, y,
    x + size, y - size
  ]);

  drawShape(vertices, r, g, b);
}

function drawShape(vertices, r, g, b) {

  const vertexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

  gl.vertexAttribPointer(a_Position, 2, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(a_Position);

  gl.uniform4f(u_FragColor, r, g, b, 1.0);

  gl.drawArrays(gl.TRIANGLES, 0, 6);
}

