class Triangle {
    constructor() {
      this.type = 'triangle';
      this.position = [0.0, 0.0, 0.0];
      this.color = [1.0, 1.0, 1.0, 1.0];
      this.size = 10.0;
    }
  
    render() {
      var xy = this.position;
      var rgba = this.color;
      var xsize = this.size;
  
      // Pass the color of a point to u_FragColor variable
      gl.uniform4f(u_FragColor, rgba[0], rgba[1], rgba[2], rgba[3]);
  
      // Pass the color of a point to u_Size variable
      gl.uniform1f(size, xsize);
  
      // Draw the triangle using helper function
      drawTriangle([xy[0], xy[1], xy[0] + 0.1, xy[1], xy[0], xy[1] + 0.1]);
    }
  }