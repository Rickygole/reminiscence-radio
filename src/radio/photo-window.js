const VERT = `#version 300 es
in vec2 p;
out vec2 uv;
void main() {
  uv = vec2(p.x * 0.5 + 0.5, 0.5 - p.y * 0.5);
  gl_Position = vec4(p, 0.0, 1.0);
}`

const FRAG = `#version 300 es
precision mediump float;
uniform sampler2D img;
uniform sampler2D depth;
uniform vec2 drift;
in vec2 uv;
out vec4 color;
void main() {
  float d = texture(depth, uv).r - 0.5;
  color = texture(img, clamp(uv + d * drift, 0.0, 1.0));
}`

const load = (src) =>
  new Promise((resolve, reject) => {
    const image = new Image()
    image.crossOrigin = 'anonymous'
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error(`Could not load ${src}`))
    image.src = src
  })

const compile = (gl, type, source) => {
  const shader = gl.createShader(type)
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader))
  return shader
}

const texture = (gl, unit, image) => {
  const tex = gl.createTexture()
  gl.activeTexture(gl.TEXTURE0 + unit)
  gl.bindTexture(gl.TEXTURE_2D, tex)
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
  return tex
}

export const mountDepthPhoto = async (canvas, { src, depthSrc }) => {
  const [image, depth] = await Promise.all([load(src), load(depthSrc)])
  const gl = canvas.getContext('webgl2', { antialias: false, alpha: false })
  if (!gl) throw new Error('WebGL2 is not available')
  const program = gl.createProgram()
  gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, VERT))
  gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, FRAG))
  gl.linkProgram(program)
  gl.useProgram(program)
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer())
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
  const loc = gl.getAttribLocation(program, 'p')
  gl.enableVertexAttribArray(loc)
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)
  texture(gl, 0, image)
  texture(gl, 1, depth)
  gl.uniform1i(gl.getUniformLocation(program, 'img'), 0)
  gl.uniform1i(gl.getUniformLocation(program, 'depth'), 1)
  const drift = gl.getUniformLocation(program, 'drift')

  const fit = () => {
    const ratio = Math.min(2, window.devicePixelRatio || 1)
    const w = Math.max(2, Math.round(canvas.clientWidth * ratio))
    const h = Math.max(2, Math.round(canvas.clientHeight * ratio))
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w
      canvas.height = h
      gl.viewport(0, 0, w, h)
    }
  }

  let raf = 0
  const draw = (now) => {
    fit()
    const phase = (now / 12000) * Math.PI * 2
    gl.uniform2f(drift, Math.cos(phase) * 0.02, Math.sin(phase) * 0.02)
    gl.drawArrays(gl.TRIANGLES, 0, 3)
    raf = requestAnimationFrame(draw)
  }
  raf = requestAnimationFrame(draw)
  return {
    destroy() {
      cancelAnimationFrame(raf)
      gl.getExtension('WEBGL_lose_context')?.loseContext()
    }
  }
}
