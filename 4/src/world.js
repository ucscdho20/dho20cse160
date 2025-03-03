// David Ho dho20ucsc.edu
// Grader Note: I decided instead of the render being pitch black when both
// lights are turned off, there should be a little ambient light to show that
// shapes are still there but not illuminated. This ambient light is not present
// when one of the lights are turned on, to exaggerate the presence of the light.

// ColoredPoint.js (c) 2012 matsuda
// Vertex shader program

var VSHADER_SOURCE = `
  precision mediump float;
  attribute vec4 a_Position;
  attribute vec2 a_UV;
  attribute vec3 a_Normal;
  varying vec2 v_UV;
  varying vec3 v_Normal;
  uniform mat4 u_ModelMatrix;
  uniform mat4 u_GlobalRotateMatrix;
  uniform mat4 u_ViewMatrix;
  uniform mat4 u_ProjectionMatrix;
  varying vec4 v_VertPos;
  uniform vec3 u_lightPos;
  void main() {
    gl_Position = u_ProjectionMatrix * u_ViewMatrix * u_GlobalRotateMatrix * u_ModelMatrix * a_Position;
    v_UV = a_UV;
    v_Normal = a_Normal;
    v_VertPos = u_ModelMatrix * a_Position;
  }`

// Fragment shader program
var FSHADER_SOURCE = `
precision mediump float;
varying vec2 v_UV;
varying vec3 v_Normal;
uniform vec4 u_FragColor;
uniform sampler2D u_Sampler0;
uniform sampler2D u_Sampler1;
uniform sampler2D u_Sampler2;
uniform int u_whichTexture;
uniform vec3 u_lightPos;
uniform vec3 u_cameraPos;
uniform bool u_lightOn;
uniform vec3 u_lightColor;
varying vec4 v_VertPos;
uniform vec3 u_spotLightPos;
uniform vec3 u_spotLightDir;
uniform bool u_spotLightOn;

void main() {
    // Set base color based on texture
    if (u_whichTexture == -2) {
        gl_FragColor = u_FragColor;
    } else if (u_whichTexture == -1) {
        gl_FragColor = texture2D(u_Sampler0, v_UV);
    } else if (u_whichTexture == 0) {
        gl_FragColor = texture2D(u_Sampler1, v_UV);
    } else if (u_whichTexture == -3) {
        gl_FragColor = texture2D(u_Sampler2, v_UV);
    } else if (u_whichTexture == -4) {
        gl_FragColor = vec4((v_Normal + 1.0) / 2.0, 1.0);
    }

    vec3 normal = normalize(v_Normal);
    vec3 finalLighting = vec3(0.0);

    // Standard Light (Omnidirectional)
    if (u_lightOn) {
        vec3 lightDir = normalize(u_lightPos - vec3(v_VertPos));
        float diff = max(dot(normal, lightDir), 0.0);
        
        vec3 viewDir = normalize(u_cameraPos - vec3(v_VertPos));
        vec3 reflectDir = reflect(-lightDir, normal);
        float spec = pow(max(dot(viewDir, reflectDir), 0.0), 20.0);
        
        vec3 ambient = vec3(gl_FragColor) * 0.3;
        vec3 diffuse = vec3(gl_FragColor) * diff * 0.7 * u_lightColor;
        vec3 specular = vec3(1.0) * spec * 0.5;
        
        finalLighting += ambient + diffuse + specular;
    }

    // Spotlight (Directional Cone)
    if (u_spotLightOn) {
        vec3 spotDir = normalize(u_spotLightPos - vec3(v_VertPos));
        float theta = dot(spotDir, normalize(-u_spotLightDir));

        // Define the spotlight cutoff angle (cosine of the angle threshold)
        float cutoff = cos(radians(80.0));

        if (theta > cutoff) { // Only apply lighting if inside the spotlight cone
            float diff = max(dot(normal, spotDir), 0.0);
            
            vec3 viewDir = normalize(u_cameraPos - vec3(v_VertPos));
            vec3 reflectDir = reflect(-spotDir, normal);
            float spec = pow(max(dot(viewDir, reflectDir), 0.0), 20.0);
            
            vec3 ambient = vec3(gl_FragColor) * 0.3;
            vec3 diffuse = vec3(gl_FragColor) * diff * 0.7;
            vec3 specular = vec3(1.0) * spec * 0.5;

            // Fade effect for edges of the cone
            float intensity = smoothstep(cutoff, 1.0, theta);
            finalLighting += (ambient + diffuse + specular) * intensity;
        }
    }

    if (!u_lightOn && !u_spotLightOn) {
        finalLighting = vec3(gl_FragColor) * 0.2;
    }

    gl_FragColor = vec4(finalLighting, 1.0);
}



`

// Global Variables
let canvas;
let gl;
let a_Position;
let a_UV;
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
let g_cameraRotation = 0;
let g_redBlocksRemoved = 0;
let g_normalOn = false;
let g_lightPos = [0,2.5,-2];
let u_lightPos;
let u_cameraPos;
let lightOn = true;
let lightColor = [1.0, 1.0, 1.0];
let u_lightOn;
let u_lightColor;
let g_spotLightPos = [0, 3, -2];
let g_spotLightDir = [0, -1, 0];
let spotLightOn = true;
let u_spotLightPos, u_spotLightDir, u_spotLightOn;

document.getElementById("toggleLight").addEventListener("click", function () {
  lightOn = !lightOn;
  gl.uniform1i(u_lightOn, lightOn ? 1 : 0);
  renderScene();
});

document.getElementById("lightColorPicker").addEventListener("input", function (event) {
    let hexColor = event.target.value;
    lightColor = [
        parseInt(hexColor.substring(1, 3), 16) / 255.0,
        parseInt(hexColor.substring(3, 5), 16) / 255.0,
        parseInt(hexColor.substring(5, 7), 16) / 255.0,
    ];
    renderScene();
});

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

  a_UV = gl.getAttribLocation(gl.program, 'a_UV');
  if (a_UV < 0) {
    console.log('Failed to get the storage location of a_UV');
    return;
  }
  u_lightOn = gl.getUniformLocation(gl.program, 'u_lightOn');
  u_lightColor = gl.getUniformLocation(gl.program, 'u_lightColor');
  a_Normal = gl.getAttribLocation(gl.program, 'a_Normal');
  if (a_Normal < 0) {
    console.log('Failed to get the storage location of a_Normal');
    return;
  }

  u_lightPos = gl.getUniformLocation(gl.program, 'u_lightPos');
  if (!u_lightPos) {
    console.log('Failed to get the storage location of u_lightPos');
    return;
  }

  u_cameraPos = gl.getUniformLocation(gl.program, 'u_cameraPos');
  if (!u_cameraPos) {
    console.log('Failed to get the storage location of u_cameraPos');
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

  u_whichTexture = gl.getUniformLocation(gl.program, 'u_whichTexture');
  if (!u_whichTexture) {
    console.log('Failed to get the storage location of u_whichTexture');
    return;
  }
  
  u_Sampler0 = gl.getUniformLocation(gl.program, 'u_Sampler0');
  if (!u_Sampler0) {
    console.log('Failed to get the storage location of u_Sampler0');
    return;
  }

  u_Sampler1 = gl.getUniformLocation(gl.program, 'u_Sampler1');
  if (!u_Sampler1) {
    console.log('Failed to get the storage location of u_Sampler1');
    return;
  }

  u_Sampler2 = gl.getUniformLocation(gl.program, 'u_Sampler2');
  if (!u_Sampler2) {
    console.log('Failed to get the storage location of u_Sampler2');
    return;
  }

  u_ProjectionMatrix = gl.getUniformLocation(gl.program, 'u_ProjectionMatrix');
  if (!u_ProjectionMatrix) {
    console.log('Failed to get the storage location of u_ProjectionMatrix');
    return;
  }

  u_ViewMatrix = gl.getUniformLocation(gl.program, 'u_ViewMatrix');
  if (!u_ViewMatrix) {
    console.log('Failed to get the storage location of u_ViewMatrix');
    return;
  }

  u_spotLightPos = gl.getUniformLocation(gl.program, 'u_spotLightPos');
  u_spotLightDir = gl.getUniformLocation(gl.program, 'u_spotLightDir');
  u_spotLightOn = gl.getUniformLocation(gl.program, 'u_spotLightOn');
  

  var identityM = new Matrix4();
  gl.uniformMatrix4fv(u_ModelMatrix, false, identityM.elements);

}

function initTextures() {
  loadTexture('iron.png', gl.TEXTURE0, u_Sampler0);
  loadTexture('wood.jpg', gl.TEXTURE1, u_Sampler1);
  loadTexture('dollar.png', gl.TEXTURE2, u_Sampler2);
}

function loadTexture(url, textureUnit, samplerUniform) {
  var image = new Image();
  image.onload = function() {
    var texture = gl.createTexture();
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
    gl.activeTexture(textureUnit);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    
    gl.uniform1i(samplerUniform, textureUnit - gl.TEXTURE0);

    console.log("Texture loaded:", url);
    renderScene();
  };
  
  image.onerror = function() {
    console.error("Failed to load texture:", url);
  };

  image.src = url;
}

let camera;

function updateLightPos() {
  g_lightPos[0] = parseFloat(document.getElementById("lightSlideX").value) / 100;
  g_lightPos[1] = parseFloat(document.getElementById("lightSlideY").value) / 100;
  g_lightPos[2] = parseFloat(document.getElementById("lightSlideZ").value) / 100;

  console.log("Updated Light Position:", g_lightPos);

  renderScene();
}

document.getElementById("lightSlideX").addEventListener("input", updateLightPos);
document.getElementById("lightSlideY").addEventListener("input", updateLightPos);
document.getElementById("lightSlideZ").addEventListener("input", updateLightPos);

document.getElementById("toggleSpotlight").addEventListener("click", function () {
  spotLightOn = !spotLightOn;
  gl.uniform1i(u_spotLightOn, spotLightOn ? 1 : 0);
  renderScene();
});

function toggleNormals(state) {
  g_normalOn = state;
  renderScene();
}

let lightSpeed = 0.01;
let lightDirection = 1;

function tick() {
  g_lightPos[0] += lightSpeed * lightDirection;
  if (g_lightPos[0] > 5 || g_lightPos[0] < -5) {
    lightDirection *= -1;
  }
  gl.uniform3f(u_lightPos, g_lightPos[0], g_lightPos[1], g_lightPos[2]);
  renderScene();
  requestAnimationFrame(tick);
}

function main() {
  setupWebGL();
  connectVariablesToGLSL();
  camera = new Camera(gl);
  gl.clearColor(0.5, 0.5, 0.5, 1.0);
  initTextures();
  renderScene();
  document.onkeydown = keydown;
  canvas.addEventListener("mousedown", onMouseDown);
  canvas.addEventListener("mouseup", onMouseUp);
  canvas.addEventListener("mousemove", onMouseMove);
  tick();
}

function onMouseDown(event) {
  isDragging = true;
  lastMouseX = event.clientX;
}

function onMouseUp() {
  isDragging = false;
}

function onMouseMove(event) {
  if (isDragging) {
    let deltaX = event.clientX - lastMouseX;
    if (deltaX > 0) {
      camera.panRight(5);
    } else if (deltaX < 0) {
      camera.panLeft(5);
    }
    lastMouseX = event.clientX;
    renderScene();
  }
}

function keydown(ev) {

  if (ev.key === "w" || ev.key === "W") {
    camera.moveForward(0.1);
  } else if (ev.key === "s" || ev.key === "S") {
    camera.moveBackwards(0.1);
  } else if (ev.key === "a" || ev.key === "A") {
    camera.moveLeft(0.1);
  } else if (ev.key === "d" || ev.key === "D") {
    camera.moveRight(0.1);
  } else if (ev.key === "q" || ev.key === "Q") {
    camera.panLeft(5);
  } else if (ev.key === "e" || ev.key === "E") {
    camera.panRight(5);
  } else if (ev.key === "f" || ev.key === "F") {
    let [mapX, mapY] = getMapPosition(camera.at.elements[0], camera.at.elements[2]);

    if (mapX > 0 && mapX < 31 && mapY > 0 && mapY < 31) {
        if (g_cameraRotation >= 345 || g_cameraRotation <= 15) {
            g_map[mapX][mapY] = { type: "red", height: 1 };
        } else if ((g_cameraRotation >= 75 && g_cameraRotation <= 105) && (mapX + 1 < 31 && mapY + 1 < 31)) {
            g_map[mapX + 1][mapY + 1] = { type: "red", height: 1 };
        } else if ((g_cameraRotation >= 255 && g_cameraRotation <= 285) && (mapX - 1 > 0 && mapY + 1 < 31)) {
            g_map[mapX - 1][mapY + 1] = { type: "red", height: 1 };
        } else if ((g_cameraRotation >= 165 && g_cameraRotation <= 195) && (mapY + 2 < 31)) {
            g_map[mapX][mapY + 2] = { type: "red", height: 1 };
        }
    }
  } else if (ev.key === "g" || ev.key === "G") {
    let [mapX, mapY] = getMapPosition(camera.at.elements[0], camera.at.elements[2]);

    if (mapX > 0 && mapX < 31 && mapY > 0 && mapY < 31) {
        if (g_cameraRotation >= 345 || g_cameraRotation <= 15) {
            delete g_map[mapX][mapY];
        } else if ((g_cameraRotation >= 75 && g_cameraRotation <= 105) && (mapX + 1 < 31 && mapY + 1 < 31)) {
            delete g_map[mapX + 1][mapY + 1];
        } else if ((g_cameraRotation >= 255 && g_cameraRotation <= 285) && (mapX - 1 > 0 && mapY + 1 < 31)) {
            delete g_map[mapX - 1][mapY + 1];
        } else if ((g_cameraRotation >= 165 && g_cameraRotation <= 195) && (mapY + 2 < 31)) {
            delete g_map[mapX][mapY + 2];
        }
    }
}
  renderScene();
  console.log(`Key pressed: ${ev.key}`);
}



class Camera {
    constructor(canvas) {
        this.fov = 60;
        this.eye = new Vector3([0, 0, 0]);
        this.at = new Vector3([0, 0, -1]);
        this.up = new Vector3([0, 1, 0]);
        
        this.viewMatrix = new Matrix4();
        this.updateViewMatrix();

        this.projectionMatrix = new Matrix4();
        this.projectionMatrix.setPerspective(
            this.fov, 
            canvas.width / canvas.height, 
            0.1, 
            1000
        );
    }

    updateViewMatrix() {
        this.viewMatrix.setLookAt(
            this.eye.elements[0], this.eye.elements[1], this.eye.elements[2],
            this.at.elements[0], this.at.elements[1], this.at.elements[2],
            this.up.elements[0], this.up.elements[1], this.up.elements[2]
        );
        console.log(`Eye Position: (${this.eye.elements[0]}, ${this.eye.elements[1]}, ${this.eye.elements[2]})`);
        console.log(`At Position: (${this.at.elements[0]}, ${this.at.elements[1]}, ${this.at.elements[2]})`);
        console.log(g_cameraRotation);
    }

    moveForward(speed) {
        let f = new Vector3();
        f.set(this.at);
        f.sub(this.eye);
        f.normalize();
        f.mul(speed);
        
        this.eye.add(f);
        this.at.add(f);
        
        this.updateViewMatrix();
    }
    moveBackwards(speed) {
      let b = new Vector3();
      b.set(this.eye);
      b.sub(this.at);
      b.normalize();
      b.mul(speed);
      
      this.eye.add(b);
      this.at.add(b);
      
      this.updateViewMatrix();
  }
  moveLeft(speed) {
    let f = new Vector3();
    f.set(this.at);
    f.sub(this.eye);
    f.normalize();
    
    let s = Vector3.cross(this.up, f);
    s.normalize();
    s.mul(speed);
    
    this.eye.add(s);
    this.at.add(s);
    
    this.updateViewMatrix();
  }
  moveRight(speed) {
    let f = new Vector3();
    f.set(this.at);
    f.sub(this.eye);
    f.normalize();
    
    let s = Vector3.cross(f, this.up);
    s.normalize();
    s.mul(speed);
    
    this.eye.add(s);
    this.at.add(s);
    
    this.updateViewMatrix();
  }
  panLeft(alpha) {
    let f = new Vector3();
    f.set(this.at);
    f.sub(this.eye);
    
    let rotationMatrix = new Matrix4();
    rotationMatrix.setRotate(alpha, this.up.elements[0], this.up.elements[1], this.up.elements[2]);
    
    let f_prime = rotationMatrix.multiplyVector3(f);
    
    this.at.set(this.eye);
    this.at.add(f_prime);
    g_cameraRotation = (g_cameraRotation - alpha + 360) % 360;
    this.updateViewMatrix();
  }
  panRight(alpha) {
    let f = new Vector3();
    f.set(this.at);
    f.sub(this.eye);
    
    let rotationMatrix = new Matrix4();
    rotationMatrix.setRotate(-alpha, this.up.elements[0], this.up.elements[1], this.up.elements[2]);
    
    let f_prime = rotationMatrix.multiplyVector3(f);
    
    this.at.set(this.eye);
    this.at.add(f_prime);
    g_cameraRotation += alpha;
    if (g_cameraRotation == 360) {
      g_cameraRotation = 0;
    }
    this.updateViewMatrix();
  }
}

class Sphere {
  constructor(subdivisions = 20) {
      this.color = [1.0, 1.0, 1.0, 1.0];
      this.matrix = new Matrix4();
      this.textureNum = 0;
      this.subdivisions = subdivisions;

      this.initSphereData();
  }

  initSphereData() {
      let latitudeBands = this.subdivisions;
      let longitudeBands = this.subdivisions;
      let radius = 0.5;

      this.vertices = [];
      this.normals = [];
      this.uvs = [];
      this.indices = [];

      for (let lat = 0; lat <= latitudeBands; lat++) {
          let theta = (lat * Math.PI) / latitudeBands;
          let sinTheta = Math.sin(theta);
          let cosTheta = Math.cos(theta);

          for (let lon = 0; lon <= longitudeBands; lon++) {
              let phi = (lon * 2 * Math.PI) / longitudeBands;
              let sinPhi = Math.sin(phi);
              let cosPhi = Math.cos(phi);

              let x = cosPhi * sinTheta;
              let y = cosTheta;
              let z = sinPhi * sinTheta;

              this.vertices.push(radius * x, radius * y, radius * z);
              this.normals.push(x, y, z);
              this.uvs.push(lon / longitudeBands, lat / latitudeBands);
          }
      }

      for (let lat = 0; lat < latitudeBands; lat++) {
          for (let lon = 0; lon < longitudeBands; lon++) {
              let first = lat * (longitudeBands + 1) + lon;
              let second = first + longitudeBands + 1;

              this.indices.push(first, second, first + 1);
              this.indices.push(second, second + 1, first + 1);
          }
      }
  }

  render() {
      gl.uniform1i(u_whichTexture, this.textureNum);
      gl.uniform4f(u_FragColor, this.color[0], this.color[1], this.color[2], this.color[3]);
      gl.uniformMatrix4fv(u_ModelMatrix, false, this.matrix.elements);

      this.drawSphere();
  }

  drawSphere() {
      let vertexBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.vertices), gl.STATIC_DRAW);
      gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
      gl.enableVertexAttribArray(a_Position);

      let normalBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.normals), gl.STATIC_DRAW);
      gl.vertexAttribPointer(a_Normal, 3, gl.FLOAT, false, 0, 0);
      gl.enableVertexAttribArray(a_Normal);

      let uvBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.uvs), gl.STATIC_DRAW);
      gl.vertexAttribPointer(a_UV, 2, gl.FLOAT, false, 0, 0);
      gl.enableVertexAttribArray(a_UV);

      let indexBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(this.indices), gl.STATIC_DRAW);

      gl.drawElements(gl.TRIANGLES, this.indices.length, gl.UNSIGNED_SHORT, 0);
  }
}


class Cube {
  constructor() {
      this.color = [1.0, 1.0, 1.0, 1.0];
      this.matrix = new Matrix4();
      this.textureNum = 0;
  }

  render() {
      gl.uniform1i(u_whichTexture, this.textureNum);
      gl.uniform4f(u_FragColor, this.color[0], this.color[1], this.color[2], this.color[3]);
      gl.uniformMatrix4fv(u_ModelMatrix, false, this.matrix.elements);

      let vertices = [
          // Front face
          0, 0, 0,  1, 1, 0,  1, 0, 0,  
          0, 0, 0,  0, 1, 0,  1, 1, 0,
          // Back face
          0, 0, 1,  1, 0, 1,  1, 1, 1,  
          0, 0, 1,  1, 1, 1,  0, 1, 1,
          // Left face
          0, 0, 0,  0, 0, 1,  0, 1, 1,  
          0, 0, 0,  0, 1, 1,  0, 1, 0,
          // Right face
          1, 0, 0,  1, 1, 0,  1, 1, 1,  
          1, 0, 0,  1, 1, 1,  1, 0, 1,
          // Bottom face
          0, 0, 0,  1, 0, 0,  1, 0, 1,  
          0, 0, 0,  1, 0, 1,  0, 0, 1,
          // Top face
          0, 1, 0,  0, 1, 1,  1, 1, 1,  
          0, 1, 0,  1, 1, 1,  1, 1, 0
      ];

      let normals = [
          // Front face
          0, 0, -1,  0, 0, -1,  0, 0, -1,  
          0, 0, -1,  0, 0, -1,  0, 0, -1,
          // Back face
          0, 0, 1,  0, 0, 1,  0, 0, 1,  
          0, 0, 1,  0, 0, 1,  0, 0, 1,
          // Left face
          -1, 0, 0,  -1, 0, 0,  -1, 0, 0,  
          -1, 0, 0,  -1, 0, 0,  -1, 0, 0,
          // Right face
          1, 0, 0,  1, 0, 0,  1, 0, 0,  
          1, 0, 0,  1, 0, 0,  1, 0, 0,
          // Bottom face
          0, -1, 0,  0, -1, 0,  0, -1, 0,  
          0, -1, 0,  0, -1, 0,  0, -1, 0,
          // Top face
          0, 1, 0,  0, 1, 0,  0, 1, 0,  
          0, 1, 0,  0, 1, 0,  0, 1, 0
      ];

      let uvs = [
          0, 0,  1, 1,  1, 0,  0, 0,  0, 1,  1, 1,
          0, 0,  1, 0,  1, 1,  0, 0,  1, 1,  0, 1,
          0, 0,  1, 0,  1, 1,  0, 0,  1, 1,  0, 1,
          0, 0,  1, 1,  1, 0,  0, 0,  1, 0,  0, 1,
          0, 0,  1, 0,  1, 1,  0, 0,  1, 1,  0, 1,
          0, 0,  0, 1,  1, 1,  0, 0,  1, 1,  1, 0
      ];

      drawTriangles(vertices, uvs, normals);
  }
}

function drawTriangles(vertices, uvs, normals) {
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.DYNAMIC_DRAW);
  gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(a_Position);

  let uvBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(uvs), gl.DYNAMIC_DRAW);
  gl.vertexAttribPointer(a_UV, 2, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(a_UV);

  let normalBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.DYNAMIC_DRAW);
  gl.vertexAttribPointer(a_Normal, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(a_Normal);

  gl.drawArrays(gl.TRIANGLES, 0, vertices.length / 3);
}


var g_eye = [0,0,1];
var g_at = [0,0,0];
var g_up = [0,1,0];

var g_map = [];

for (let x = 0; x < 32; x++) {
  g_map[x] = [];
  for (let y = 0; y < 32; y++) {
      if (x === 0 || x === 31 || y === 0 || y === 31) {
        g_map[x][y] = { type: "wall", height: 5 };
      } else {
        g_map[x][y] = { type: "grass", height: Math.random() < 0.02 ? 1 : 0 };
      }
  }
}

function getMapPosition(x, y) {
  let mapX = Math.floor(x + 16);
  let mapY = Math.floor(y + 15);
  return [mapX, mapY];
}

let grassCount = 0;

function drawMap(normalMode) {
  grassCount = 0;
  for (let x = 0; x < 32; x++) {
      for (let y = 0; y < 32; y++) {
          let block = g_map[x][y];

          if (!block) continue;

          for (let h = 0; h < block.height; h++) {
              let cube = new Cube();

              if (block.type === "grass") {
                  cube.color = [.5, 0, 0, 1];
                  cube.textureNum = normalMode ? -4 : -2;
                  cube.matrix.translate(0, -0.75, 0);
                  cube.matrix.scale(1, .1, 1);
                  if (block.height == 1) {
                      grassCount += 1;
                  }
              } else if (block.type === "wall") {
                  cube.color = [0.5, 0.5, 0.5, 1]; 
                  cube.textureNum = normalMode ? -4 : 0;
                  cube.matrix.translate(0, -0.75, 0);
                  cube.matrix.scale(1, 1, 1);
              } else if (block.type === "red") {
                  cube.color = [0, 0, 1, 1]; 
                  cube.textureNum = normalMode ? -4 : -2;
                  cube.matrix.translate(0, -0.75, 0);
                  cube.matrix.scale(1, .2, 1);
              }

              cube.matrix.translate(x - 16, h, y - 16);
              cube.render();
          }
      }
  }
}


function updateGrassCount() {
  document.getElementById("grass-value").textContent = grassCount;
}

function drawMinimap() {
  let minimapCanvas = document.getElementById("minimap");
  let ctx = minimapCanvas.getContext("2d");

  let mapSize = 32;
  let cellSize = minimapCanvas.width / mapSize;

  ctx.clearRect(0, 0, minimapCanvas.width, minimapCanvas.height);

  for (let x = 0; x < mapSize; x++) {
      for (let y = 0; y < mapSize; y++) {
          let block = g_map[x][y];

          if (!block || (block.type === "grass" && block.height === 0)) {
              ctx.fillStyle = "green";
          } else if (block.type === "grass") {
              ctx.fillStyle = "black";
          } else if (block.type === "wall") {
              ctx.fillStyle = "gray";
          } else {
              ctx.fillStyle = "green";
          }

          ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
      }
  }

  let [mapX, mapY] = getMapPosition(camera.at.elements[0], camera.at.elements[2]);
  ctx.fillStyle = "red";
  ctx.fillRect(mapX * cellSize, mapY * cellSize, cellSize, cellSize);
}

function renderScene(){
  var projMat = new Matrix4();
  projMat.setPerspective(50, 1 * canvas.width / canvas.height, 1, 100);
  gl.uniformMatrix4fv(u_ProjectionMatrix, false, projMat.elements);

  var viewMat = new Matrix4();
  viewMat.setLookAt(
      camera.eye.elements[0], camera.eye.elements[1], camera.eye.elements[2],
      camera.at.elements[0], camera.at.elements[1], camera.at.elements[2],
      camera.up.elements[0], camera.up.elements[1], camera.up.elements[2]
  );
  gl.uniformMatrix4fv(u_ViewMatrix, false, viewMat.elements);

  var globalRotMat = new Matrix4().rotate(g_globalAngleX, 0, 1, 0);
  gl.uniformMatrix4fv(u_GlobalRotateMatrix, false, globalRotMat.elements);

  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  gl.uniform3f(u_lightPos, g_lightPos[0], g_lightPos[1], g_lightPos[2]);

  gl.uniform3f(u_cameraPos, camera.eye.elements[0], camera.eye.elements[1], camera.eye.elements[2]);
  gl.uniform1i(u_lightOn, lightOn);
  gl.uniform3f(u_lightColor, lightColor[0], lightColor[1], lightColor[2]);
  gl.uniform3f(u_spotLightPos, g_spotLightPos[0], g_spotLightPos[1], g_spotLightPos[2]);
  gl.uniform3f(u_spotLightDir, g_spotLightDir[0], g_spotLightDir[1], g_spotLightDir[2]);
  gl.uniform1i(u_spotLightOn, spotLightOn);

  drawMap(g_normalOn);
  drawMinimap();
  updateGrassCount();

  var sky = new Cube();
  sky.color = [.3, .4, 1, 1];
  sky.textureNum = g_normalOn ? -4 : -2;
  sky.matrix.scale(-50, -50, -50);
  sky.matrix.translate(-.5, -.5, -.5);
  sky.render();

  let sphere = new Sphere(30);
  sphere.color = [0.8, 0.2, 0.2, 1];
  sphere.textureNum = g_normalOn ? -4 : -2;
  sphere.matrix.translate(1, 0, 0);
  sphere.render();

  var light = new Cube();
  light.color = [2,2,0,1];
  light.textureNum = -2;
  light.matrix.translate(g_lightPos[0],g_lightPos[1], g_lightPos[2]);
  light.matrix.scale(-.2,-.2,-.2);
  light.matrix.translate(-.5,-.5,-.5);
  light.render();

  var spotLightCube = new Cube();
  spotLightCube.color = [1, 1, 0, 1];
  spotLightCube.textureNum = -2;
  spotLightCube.matrix.translate(g_spotLightPos[0], g_spotLightPos[1], g_spotLightPos[2]);
  spotLightCube.matrix.scale(-0.2, -0.2, -0.2);
  spotLightCube.render();
  
}

function drawTriangle3DUV(vertices, uv) {
  var n = 3;

  var vertexBuffer = gl.createBuffer();
  if (!vertexBuffer) {
    console.log('Failed to create the buffer object');
    return -1;
  }

  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);

  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.DYNAMIC_DRAW);

  gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);

  gl.enableVertexAttribArray(a_Position);

  var uvBuffer = gl.createBuffer();
  if (!uvBuffer) {
    console.log('Failed to create the buffer object');
    return -1;
  }

  gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffer);

  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(uv), gl.DYNAMIC_DRAW);

  gl.vertexAttribPointer(a_UV, 2, gl.FLOAT, false, 0, 0);

  gl.enableVertexAttribArray(a_UV);

  gl.drawArrays(gl.TRIANGLES, 0, n);  
}

function drawCube(M) {
  gl.uniformMatrix4fv(u_ModelMatrix, false, M.elements);
  

  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);

  drawTriangle3DUV([0.0, 0.0, 0.0,  1.0, 1.0, 0.0,  1.0, 0.0, 0.0], [0,0,1,1,1,0]);
  drawTriangle3DUV([0.0, 0.0, 0.0,  0.0, 1.0, 0.0,  1.0, 1.0, 0.0],[0,0,0,1,1,1]);

  drawTriangle3DUV([0.0, 0.0, 1.0,  1.0, 0.0, 1.0,  1.0, 1.0, 1.0], [0,0,1,1,1,0]);
  drawTriangle3DUV([0.0, 0.0, 1.0,  1.0, 1.0, 1.0,  0.0, 1.0, 1.0],[0,0,0,1,1,1]);

  drawTriangle3DUV([0.0, 0.0, 0.0,  0.0, 0.0, 1.0,  0.0, 1.0, 1.0], [0,0,1,1,1,0]);
  drawTriangle3DUV([0.0, 0.0, 0.0,  0.0, 1.0, 1.0,  0.0, 1.0, 0.0],[0,0,0,1,1,1]);

  drawTriangle3DUV([1.0, 0.0, 0.0,  1.0, 1.0, 0.0,  1.0, 1.0, 1.0], [0,0,1,1,1,0]);
  drawTriangle3DUV([1.0, 0.0, 0.0,  1.0, 1.0, 1.0,  1.0, 0.0, 1.0],[0,0,0,1,1,1]);

  drawTriangle3DUV([0.0, 0.0, 0.0,  1.0, 0.0, 0.0,  1.0, 0.0, 1.0], [0,0,1,1,1,0]);
  drawTriangle3DUV([0.0, 0.0, 0.0,  1.0, 0.0, 1.0,  0.0, 0.0, 1.0],[0,0,0,1,1,1]);

  drawTriangle3DUV([0.0, 1.0, 0.0,  0.0, 1.0, 1.0,  1.0, 1.0, 1.0], [0,0,1,1,1,0]);
  drawTriangle3DUV([0.0, 1.0, 0.0,  1.0, 1.0, 1.0,  1.0, 1.0, 0.0],[0,0,0,1,1,1]);
}
