
const ATTRIBUTE_VERTEX_POSITION_NAME = 'aVertexPosition'

const createGLContext = (canvas) => {
  const names = ['webgl', 'experimental-webgl'];
  let ctx = null;

  // get webgl context
  for (let i = 0; i < names.length; i += 1) {
    try {
      ctx = canvas.getContext(names[i]);
    } catch (e) {}

    if (ctx) break;
  }

  // set size
  if (ctx) {
    ctx.viewportWidth = canvas.width;
    ctx.viewportHeight = canvas.height;
  } else {
    const msg = 'Failed to create WebGL context!!';
    console.error(msg);

    if (!window.WebGLRenderingContext) {
      alert('WebGL Not Supported...!!, please check: http://get.webgl.org')
    }
  }

  return ctx;
}

const loadShader = (gl, type, shaderSource) => {
  // 소스 로드 및 컴파일
  const shader = gl.createShader(type);
  gl.shaderSource(shader, shaderSource);
  gl.compileShader(shader);

  // 컴파일 상태 체크
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error(`Error compiling shader ${gl.getShaderInfoLog(shader)}`)
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

const setupShaders = (gl) => {
  // attribute 는  WebGL API에서 vertex shader로 데이터를 보낼 수 있게 해줌
  const vertexShaderSource =
    `
      attribute vec3 ${ATTRIBUTE_VERTEX_POSITION_NAME};
      void main() {
        gl_Position = vec4(${ATTRIBUTE_VERTEX_POSITION_NAME}, 1.0);
      }
    `;

  // 아래 gl_FragColor 값으로 삼각형의 색상 변경 가능, 아래코드에서는 빨강색 + alpha로 분홍색 표현함
  const fragmentShaderSource =
    `
      precision mediump float;
      void main() {
        gl_FragColor = vec4(1.0, 0.0, 0.0, 0.2);
      }
    `;

  const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
  const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);

  // 프로그램 객체 생성 및 셰이더 링크
  const shaderProgram = gl.createProgram();
  gl.attachShader(shaderProgram, vertexShader);
  gl.attachShader(shaderProgram, fragmentShader);
  gl.linkProgram(shaderProgram);

  if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
    console.error('Failed to setup shaders')
    return;
  }

  gl.useProgram(shaderProgram); // 랜더링에서, 해당 프로그램 객체를 사용하도록 함
  // 버텍스 셰이더의 attribute변수 위치를 '제네릭 attribute' 인덱스에할당함.
  // 이 과정이 있어야, 그리기 과정에서 버퍼의 버텍스 데이터를 버텍스 셰이더의 attribute와 일치 시킴
  // WebGL에는 고정된 수량의 attribute slot이 있음.
  shaderProgram.vertexPositionAttribute =
    gl.getAttribLocation(shaderProgram, ATTRIBUTE_VERTEX_POSITION_NAME);

  // getAttribLocation는 자동으로 인덱스 지정하고, 지정된 인덱스를 리턴해줌
  // gl.bindAttribLocation() 은 링크 전에 인덱스 지정 가능

  return shaderProgram;
}

const setupBuffers = (gl) => {
  const vertexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);

  // 버텍스 정의. 1 ~ -1
  // z좌표를 클리핑 되게 (1 보다 크게 or -1보다 작게) 이동시키면 사라진다.
  // 1 ~ -1 을 넘어서면 제거한다.
  const triangleVertices = [
     0.0,  0.5, 0.0,
    -0.5, -0.5, 0.0,
     0.5, -0.5, 0.0,
  ];
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(triangleVertices), gl.STATIC_DRAW);

  vertexBuffer.itemSize = 3; // item당 정보 크기
  vertexBuffer.numberOfItems = 3; /// 총 item 수, 즉 총 vertex수

  return vertexBuffer;
}

const draw = (gl, shaderProgram, vertexBuffer) => {
  // viewport설정, 그리기 버퍼에 그려지는 랜더링 결과의 위치 결정
  // WebGL Context생성시, 원점 0.0 넓이, 높이가 canvas와 동일한 크기로 설정, viewport설정으로 크기 & 위치 조정됨
  // gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
  // gl.viewport(low-left-x 캔버스의, low-left-y 캔버스의, webgl판의 w 크기, webgl판의 h 크기)
  gl.viewport(0, 0, gl.viewportWidth / 2, gl.viewportHeight / 2);

  // gl.clearColor()함수로 설정된 값으로 색상 버퍼를 채움
  gl.clear(gl.COLOR_BUFFER_BIT);

  // 첫번째 인자인 vertex attribute에 현재 gl.ARRAY_BUFFER 타겟에 바인드된 WebGLBuffer객체를 할당
  gl.vertexAttribPointer(
    shaderProgram.vertexPositionAttribute,
    vertexBuffer.itemSize, // attribute 1개의 요소개수 혹은 크기 설정, 이 예제에서는 x,y,z 3개사이즈임
    gl.FLOAT, // vertex buffer의 값을 어떻게 해석할까 설정, float으로 해석하도록 함.
    false, // 정규화 플래그, float값이 아닐때 변환 유무 결정
    0, // stride 0이면 메모리에 연속값으로 저장
    0, // 버퍼의 offset 예제 데이터는 버퍼시작부터 이기 때문에 0
  );

  gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);

  gl.drawArrays(gl.TRIANGLES, 0, vertexBuffer.numberOfItems);
}

function logGLCall (functionName, args) {
  // console.log('gl.' + functionName + '(' + WebGLDebugUtils.glFunctionArgsToString(functionName, args) + ')');
}

function throwOnGLError (err, funcName, args) {
  throw new Error(WebGLDebugUtils.glEnumToString(err) + ' was caused by call to ' + funcName + ' ' + Object.keys(args).map((i) => `"${args[i]}"`));
}

const startup = () => {
  const canvas = document.createElement('canvas');
  canvas.width = 500;
  canvas.height = 500;

  const gl = WebGLDebugUtils.makeDebugContext(createGLContext(canvas), throwOnGLError, logGLCall);
  const shaderProgram = setupShaders(gl);
  const vertexBuffer = setupBuffers(gl);

  gl.clearColor(1.0, 1.0, 1.0, 1.0); // 배경화면 색상 변경 - 흰색
  draw(gl, shaderProgram, vertexBuffer);

  document.body.appendChild(canvas);
}

// start
window.addEventListener('DOMContentLoaded', () => {
  console.log('hwi start!!');
  /**
   * 요약 순서
   * 1. canvas 생성 및 WebGL rendering context생성
   * 2. vertex shader 와 fragment shader 코드 작성
   * 3. vertex shader 와 fragment shader 을 관리하는 셰이더 객체 생성 WebGL API 코드 작성
   *    shader code을 로드하고, 객체 컴파일을 한다.
   * 4. 프로그램 객체를 만들고, 셰이더 객체를 붙이고(attach), 링크(link)을 한다.
   * 5. WebGL 버퍼 객체를 만ㄷ르고, 기하정보을 가지는 vertex data을 버퍼에 넣는다.
   * 6. 셰이더의 어떤 attribute에 버퍼를 연결할지 지정하고, 기하정보를 화면에 그린다.
   */
  /**
   * WebGL 코딩 스타일
   * - webgl context는 gl, 보통 전역에 할당
   * - 함수, 변수 작성은 카멜케이스(camelCase)
   * - 셰이더 코드에서, 접두사, e.g) aVertexPositions, vColor, uMVMatrix
   *   - a, attribute
   *   - u, uniform
   *   - v, varying
   */
  startup();
})
