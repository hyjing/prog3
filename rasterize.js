/* GLOBAL CONSTANTS AND VARIABLES */

/* assignment specific globals */
const WIN_Z = 0;  // default graphics window z coord in world space
const WIN_LEFT = 0; const WIN_RIGHT = 1;  // default left and right x coords in world space
const WIN_BOTTOM = 0; const WIN_TOP = 1;  // default top and bottom y coords in world space
const INPUT_TRIANGLES_URL = "https://ncsucgclass.github.io/prog3/triangles.json"; // triangles file loc
const INPUT_LIGHTS_URL = "https://ncsucgclass.github.io/prog3/lights.json";
const INPUT_SPHERES_URL = "https://ncsucgclass.github.io/prog3/spheres.json"; // spheres file loc
var Eye = new vec4.fromValues(0.5,0.5,-0.5,1.0); // default eye position in world space
var EyeVec = new vec3.fromValues(0.5,0.5,-0.5);
var lookAt = new vec3.fromValues(0,0,1);
var lookUp = new vec4.fromValues(0,1,0);

/* webgl globals */
var gl = null; // the all powerful gl object. It's all here folks!
var vertexBuffer; // this contains vertex coordinates in triples
var triangleBuffer; // this contains indices into vertexBuffer in triples
var triBufferSize = 0; // the number of indices in the triangle buffer
var vertexPositionAttrib; // where to put position for vertex shader
var normalVectorAttrib;
var ambientAttrib;
var diffuseAttrib;
var specularAttrib;
var nAttrib;
var inputTriangles;
var modelMatrixULoc;

// ASSIGNMENT HELPER FUNCTIONS

// get the JSON file from the passed URL
function getJSONFile(url,descr) {
    try {
        if ((typeof(url) !== "string") || (typeof(descr) !== "string"))
            throw "getJSONFile: parameter not a string";
        else {
            var httpReq = new XMLHttpRequest(); // a new http request
            httpReq.open("GET",url,false); // init the request
            httpReq.send(null); // send the request
            var startTime = Date.now();
            while ((httpReq.status !== 200) && (httpReq.readyState !== XMLHttpRequest.DONE)) {
                if ((Date.now()-startTime) > 3000)
                    break;
            } // until its loaded or we time out after three seconds
            if ((httpReq.status !== 200) || (httpReq.readyState !== XMLHttpRequest.DONE))
                throw "Unable to open "+descr+" file!";
            else
                return JSON.parse(httpReq.response); 
        } // end if good params
    } // end try    
    
    catch(e) {
        console.log(e);
        return(String.null);
    }
} // end get input spheres

// set up the webGL environment
function setupWebGL() {

    // Get the canvas and context
    var canvas = document.getElementById("myWebGLCanvas"); // create a js canvas
    gl = canvas.getContext("webgl"); // get a webgl object from it
    
    try {
      if (gl == null) {
        throw "unable to create gl context -- is your browser gl ready?";
      } else {
        gl.clearColor(0.0, 0.0, 0.0, 1.0); // use black when we clear the frame buffer
        gl.clearDepth(1.0); // use max when we clear the depth buffer
        gl.enable(gl.DEPTH_TEST); // use hidden surface removal (with zbuffering)
      }
    } // end try
    
    catch(e) {
      console.log(e);
    } // end catch
 
} // end setupWebGL

// read triangles in, load them into webgl buffers
function loadTriangles() {
    inputTriangles = getJSONFile(INPUT_TRIANGLES_URL,"triangles");
    if (inputTriangles != String.null) { 
        var whichSetVert; // index of vertex in current triangle set
        var whichSetTri; // index of triangle in current triangle set
        var vtxBufferSize = 0;
        var coordArray = []; // 1D array of vertex coords for WebGL
        var normalArray = [];
        var ambientArray = [];
        var diffuseArray = [];
        var specularArray = [];
        var nArray = [];
        var indexArray = [];
        var vtxToAdd = [];
        var indexOffset = vec3.create();
        var triToAdd = vec3.create();

        for (var whichSet=0; whichSet<inputTriangles.length; whichSet++) {
            vec3.set(indexOffset,vtxBufferSize,vtxBufferSize,vtxBufferSize);
            // set up the vertex coord array
            for (whichSetVert=0; whichSetVert<inputTriangles[whichSet].vertices.length; whichSetVert++){
                vtxToAdd = inputTriangles[whichSet].vertices[whichSetVert];
                coordArray = coordArray.concat(inputTriangles[whichSet].vertices[whichSetVert]);
                normalArray = normalArray.concat(inputTriangles[whichSet].normals[whichSetVert]);

                for (i=0; i<3; i++) {
                    ambientArray = ambientArray.concat(inputTriangles[whichSet].material.ambient[i]);
                    diffuseArray = diffuseArray.concat(inputTriangles[whichSet].material.diffuse[i]);
                    specularArray = specularArray.concat(inputTriangles[whichSet].material.specular[i]);
                }
                nArray = nArray.concat(inputTriangles[whichSet].material.n);
                // console.log(inputTriangles[whichSet].vertices[whichSetVert]);
            }

            for (whichSetTri=0; whichSetTri<inputTriangles[whichSet].triangles.length; whichSetTri++){
                vec3.add(triToAdd,indexOffset,inputTriangles[whichSet].triangles[whichSetTri]);
                indexArray.push(triToAdd[0],triToAdd[1],triToAdd[2]);
            }

            vtxBufferSize += inputTriangles[whichSet].vertices.length;
            triBufferSize += inputTriangles[whichSet].triangles.length;
        } // end for each triangle set 
        // console.log(coordArray.length);
        // send the vertex coords to webGL
        triBufferSize *= 3;
        vertexBuffer = gl.createBuffer(); // init empty vertex coord buffer
        gl.bindBuffer(gl.ARRAY_BUFFER,vertexBuffer); // activate that buffer
        gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(coordArray),gl.STATIC_DRAW); // coords to that buffer
        
        triangleBuffer = gl.createBuffer(); // init empty triangle index buffer
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,triangleBuffer); // activate that buffer
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(indexArray),gl.STATIC_DRAW); // indices to that buffer

        normalBuffer = gl.createBuffer(); // init empty vertex coord buffer
        gl.bindBuffer(gl.ARRAY_BUFFER,normalBuffer); // activate that buffer
        gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(normalArray),gl.STATIC_DRAW);

        ambientBuffer = gl.createBuffer(); // init empty vertex coord buffer
        gl.bindBuffer(gl.ARRAY_BUFFER,ambientBuffer); // activate that buffer
        gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(ambientArray),gl.STATIC_DRAW);

        diffuseBuffer = gl.createBuffer(); // init empty vertex coord buffer
        gl.bindBuffer(gl.ARRAY_BUFFER,diffuseBuffer); // activate that buffer
        gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(diffuseArray),gl.STATIC_DRAW);

        specularBuffer = gl.createBuffer(); // init empty vertex coord buffer
        gl.bindBuffer(gl.ARRAY_BUFFER,specularBuffer); // activate that buffer
        gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(specularArray),gl.STATIC_DRAW);

        nBuffer = gl.createBuffer(); // init empty vertex coord buffer
        gl.bindBuffer(gl.ARRAY_BUFFER,nBuffer); // activate that buffer
        gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(nArray),gl.STATIC_DRAW);
    } // end if triangles found
} // end load triangles

// function translate(out, a, b, v){
//     let p = [], r=[];

//     p[0] = a[0] - b[0];
//     p[1] = a[1] - b[1];
//     p[2] = a[2] - b[2];

//     r[0] = p[0] + v[0];
//     r[1] = p[1] + v[1];
//     r[2] = p[2] + v[2];

//     out[0] = r[0] + b[0];
//     out[1] = r[1] + b[1];
//     out[2] = r[2] + b[2];
//     return out;
//   }

// setup the webGL shaders
function setupShaders() {
    
    // define fragment shader in essl using es6 template strings
    var fShaderCode = `
        precision mediump float;
        varying vec3 mAmbient;
        varying vec3 mDiffuse;
        varying vec3 mSpecular;
        varying vec3 normal;
        varying float n;
        varying vec3 lightPos;
        varying vec3 vertexPos;
        varying vec3 lightA;
        varying vec3 lightD;
        varying vec3 lightS;
        varying vec3 eyeLoc;

        void main(void) {
            // vec3 eye = vec3(0.5,0.5,-0.5);
            vec3 a = vec3(mAmbient[0] * lightA[0], mAmbient[1] * lightA[1], mAmbient[2] * lightA[2]);
            
            vec3 L = normalize(lightPos - vertexPos);
            vec3 normN = normal;
            vec3 d = vec3(mDiffuse[0] * lightD[0] * dot(normN, L), mDiffuse[1] * lightD[1] * dot(normN, L), mDiffuse[2] * lightD[2] * dot(normN, L));

            vec3 V = normalize(eyeLoc - vertexPos);
            vec3 scale1 = vec3(dot(normN, L) * normN[0], dot(normN, L) * normN[1], dot(normN, L) * normN[2]);
            vec3 R = vec3(2.0 * scale1[0], 2.0 * scale1[1], 2.0 * scale1[2]) - L;
            float sToMultiply = pow(max(dot(R, V), 0.0), n);
            vec3 s = vec3(mSpecular[0] * lightS[0] * sToMultiply, mSpecular[1] * lightS[1] * sToMultiply, mSpecular[2] * lightS[2] * sToMultiply);

            gl_FragColor = vec4(a[0] + d[0] + s[0], a[1] + d[1] + s[1], a[2] + d[2] + s[2], 1.0); // all fragments are white
        }
    `;
    
    // define vertex shader in essl using es6 template strings
    var vShaderCode = `
        uniform vec3 lightLoc;
        uniform vec3 lAmbient;
        uniform vec3 lDiffuse;
        uniform vec3 lSpecular;
        uniform vec4 eyePos;
        uniform mat4 uModelMatrix; // the model matrix
        attribute vec3 vertexPosition;
        attribute vec3 normalVector;
        attribute vec3 mAmbienta;
        attribute vec3 mDiffusea;
        attribute vec3 mSpeculara;
        attribute float na;
        
        varying vec3 vertexPos;
        varying vec3 mAmbient;
        varying vec3 mDiffuse;
        varying vec3 mSpecular;
        varying vec3 normal;
        varying float n;
        varying vec3 lightPos;
        varying vec3 lightA;
        varying vec3 lightD;
        varying vec3 lightS;
        varying vec3 eyeLoc;

        void main(void) {
            gl_Position = uModelMatrix * vec4(vertexPosition, 1.0); // use the untransformed position
            vertexPos = vec3(gl_Position[0], gl_Position[1], gl_Position[2]);
            vec4 eyePosition = uModelMatrix * eyePos;
            normal = normalVector;
            mAmbient = mAmbienta;
            mDiffuse = mDiffusea;
            mSpecular = mSpeculara;
            n = na;
            eyeLoc = vec3(eyePosition[0], eyePosition[1], eyePosition[2]);
            lightPos = lightLoc;
            lightA = lAmbient;
            lightD = lDiffuse;
            lightS = lSpecular;
        }
    `;
    
    try {

        // console.log("fragment shader: "+fShaderCode);
        var fShader = gl.createShader(gl.FRAGMENT_SHADER); // create frag shader
        gl.shaderSource(fShader,fShaderCode); // attach code to shader
        gl.compileShader(fShader); // compile the code for gpu execution

        // console.log("vertex shader: "+vShaderCode);
        var vShader = gl.createShader(gl.VERTEX_SHADER); // create vertex shader
        gl.shaderSource(vShader,vShaderCode); // attach code to shader
        gl.compileShader(vShader); // compile the code for gpu execution
            
        if (!gl.getShaderParameter(fShader, gl.COMPILE_STATUS)) { // bad frag shader compile
            throw "error during fragment shader compile: " + gl.getShaderInfoLog(fShader);  
            gl.deleteShader(fShader);
        } else if (!gl.getShaderParameter(vShader, gl.COMPILE_STATUS)) { // bad vertex shader compile
            throw "error during vertex shader compile: " + gl.getShaderInfoLog(vShader);  
            gl.deleteShader(vShader);
        } else { // no compile errors
            var shaderProgram = gl.createProgram(); // create the single shader program
            gl.attachShader(shaderProgram, fShader); // put frag shader in program
            gl.attachShader(shaderProgram, vShader); // put vertex shader in program
            gl.linkProgram(shaderProgram); // link program into gl context

            if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) { // bad program link
                throw "error during shader program linking: " + gl.getProgramInfoLog(shaderProgram);
            } else { // no shader program link errors
                gl.useProgram(shaderProgram); // activate shader program (frag and vert)
                vertexPositionAttrib = // get pointer to vertex shader input
                    gl.getAttribLocation(shaderProgram, "vertexPosition");
                gl.enableVertexAttribArray(vertexPositionAttrib); // input to shader from array

                normalVectorAttrib = gl.getAttribLocation(shaderProgram, "normalVector");
                gl.enableVertexAttribArray(normalVectorAttrib); // input to shader from array

                ambientAttrib = gl.getAttribLocation(shaderProgram, "mAmbienta");
                gl.enableVertexAttribArray(ambientAttrib); // input to shader from array

                diffuseAttrib = gl.getAttribLocation(shaderProgram, "mDiffusea");
                gl.enableVertexAttribArray(diffuseAttrib); // input to shader from array

                specularAttrib = gl.getAttribLocation(shaderProgram, "mSpeculara");
                gl.enableVertexAttribArray(specularAttrib); // input to shader from array

                nAttrib = gl.getAttribLocation(shaderProgram, "na");
                gl.enableVertexAttribArray(nAttrib); // input to shader from array
                
                
                var inputLight = getJSONFile(INPUT_LIGHTS_URL,"light");
                if (inputLight != String.null) {
                    var lightArray = [inputLight[0].x, inputLight[0].y, inputLight[0].z];
                    var lAmbientArray = [inputLight[0].ambient[0], inputLight[0].ambient[1], inputLight[0].ambient[2]];
                    var lDiffuseArray = [inputLight[0].diffuse[0], inputLight[0].diffuse[1], inputLight[0].diffuse[2]];
                    var lSpecularArray = [inputLight[0].specular[0], inputLight[0].specular[2], inputLight[0].specular[2]];
                
                    var lightPosition = gl.getUniformLocation(shaderProgram, "lightLoc");
                    gl.uniform3fv(lightPosition, new Float32Array(lightArray));

                    var lightAmbient = gl.getUniformLocation(shaderProgram, "lAmbient");
                    gl.uniform3fv(lightAmbient, new Float32Array(lAmbientArray));

                    var lightDiffuse = gl.getUniformLocation(shaderProgram, "lDiffuse");
                    gl.uniform3fv(lightDiffuse, new Float32Array(lDiffuseArray));

                    var lightSpecular = gl.getUniformLocation(shaderProgram, "lSpecular");
                    gl.uniform3fv(lightSpecular, new Float32Array(lSpecularArray));

                }

                var aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
                var zNear = 0.0001;
                var zFar = 2000;
                var projectionMatrix = mat4.create();
                projectionMatrix = mat4.perspective(projectionMatrix, Math.PI / 2, aspect, zNear, zFar);
                var lookAtMatrix = mat4.create();
                lookAtMatrix = mat4.lookAt(lookAtMatrix, EyeVec, lookAt, lookUp);
                var eyePosition = gl.getUniformLocation(shaderProgram, "eyePos");
                gl.uniform4fv(eyePosition, Eye);
                
                modelMatrixULoc = gl.getUniformLocation(shaderProgram, "uModelMatrix"); // ptr to mmat

                var mMatrix = mat4.create();
                mMatrix = mat4.multiply(mMatrix,projectionMatrix,lookAtMatrix);
                var setCenter = vec3.fromValues(0,0,0);
                gl.uniformMatrix4fv(modelMatrixULoc, false, mMatrix);
                // mat4.fromTranslation(mMatrix,vec3.negate(vec3.create(),setCenter));
                document.addEventListener('keypress', function(event) {
                    if (event.key === 'a') {
                        setCenter = vec3.fromValues(.01,0,0);

                        // Eye = new vec4.fromValues(Eye[0] - .01,Eye[1],Eye[2],1.0);
                        // gl.uniform4fv(eyePosition, Eye);
                        Eye = vec4.dot(Eye, mat4.fromTranslation(mat4.create(), setCenter));
                        var view = mat4.create();
                        mat4.invert(view, Eye);
                        // EyeVec = new vec3.fromValues(EyeVec[0] + .01, EyeVec[1], EyeVec[2]);
                        mat4.multiply(projectionMatrix, view, projectionMatrix);
                        mMatrix = mat4.multiply(mMatrix,projectionMatrix,lookAtMatrix);
                    }
                    if (event.key === 'd') {
                        setCenter = vec3.fromValues(-.01,0,0);
                        EyeVec = new vec3.fromValues(EyeVec[0] - .01, EyeVec[1], EyeVec[2]);
                        lookAtMatrix = mat4.lookAt(lookAtMatrix, EyeVec, lookAt, lookUp);
                        mMatrix = mat4.multiply(mMatrix,projectionMatrix,lookAtMatrix);
                    }
                    if (event.key === 'q') {
                        setCenter = vec3.fromValues(0,.01,0);
                        mat4.multiply(mMatrix,
                            mMatrix,
                            mat4.fromTranslation(mat4.create(),setCenter));
                        gl.uniformMatrix4fv(modelMatrixULoc, false, mMatrix);
                    }
                    if (event.key === 'e') {
                        setCenter = vec3.fromValues(0,-.01,0);
                        mat4.multiply(mMatrix,
                            mMatrix,
                            mat4.fromTranslation(mat4.create(),setCenter));
                    }
                    if (event.key === 's') {
                        setCenter = vec3.fromValues(0,0,.01);
                        mat4.multiply(mMatrix,
                            mMatrix,
                            mat4.fromTranslation(mat4.create(),setCenter));
                    }
                    if (event.key === 'w') {
                        setCenter = vec3.fromValues(0,0,-.01);
                        mat4.multiply(mMatrix,
                            mMatrix,
                            mat4.fromTranslation(mat4.create(),setCenter));
                    }
                    if (event.key === 'A') {
                        vec3.rotateY(lookAt, lookAt, EyeVec, Math.PI/40);
                        lookAtMatrix = mat4.lookAt(lookAtMatrix, EyeVec, lookAt, lookUp);
                        mMatrix = mat4.multiply(mMatrix,projectionMatrix,lookAtMatrix);
                    }
                    if (event.key === 'D') {
                        vec3.rotateY(lookAt, lookAt, EyeVec, -Math.PI/40);
                        lookAtMatrix = mat4.lookAt(lookAtMatrix, EyeVec, lookAt, lookUp);
                        mMatrix = mat4.multiply(mMatrix,projectionMatrix,lookAtMatrix);
                    }
                    if (event.key === 'W') {
                        vec3.rotateX(lookUp, lookUp, EyeVec, Math.PI/40);
                        vec3.rotateX(lookAt, lookAt, EyeVec, Math.PI/40);
                        lookAtMatrix = mat4.lookAt(lookAtMatrix, EyeVec, lookAt, lookUp);
                        mMatrix = mat4.multiply(mMatrix,projectionMatrix,lookAtMatrix);
                    }
                    if (event.key === 'S') {
                        vec3.rotateX(lookUp, lookUp, EyeVec, -Math.PI/40);
                        vec3.rotateX(lookAt, lookAt, EyeVec, -Math.PI/40);
                        lookAtMatrix = mat4.lookAt(lookAtMatrix, EyeVec, lookAt, lookUp);
                        mMatrix = mat4.multiply(mMatrix,projectionMatrix,lookAtMatrix);
                    }
                    gl.uniformMatrix4fv(modelMatrixULoc, false, mMatrix);
                });
            } // end if no shader program link errors
        } // end if no compile errors
    } // end try 
    
    catch(e) {
        console.log(e);
    } // end catch
} // end setup shaders

var bgColor = 0;
// render the loaded model
function renderTriangles() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); // clear frame/depth buffers
    bgColor = (bgColor < 1) ? (bgColor + 0.001) : 0;
    // bgColor = 0;
    gl.clearColor(bgColor, 0, 0, 1.0);
    requestAnimationFrame(renderTriangles);

    // var numTriangleSets = inputTriangles.length;
    // for (var whichTriSet=0; whichTriSet<numTriangleSets; whichTriSet++) { 
        
    //     // // pass modeling matrix for set to shadeer
    //     // gl.uniformMatrix4fv(modelMatrixULoc, false, inputTriangles[whichTriSet].mMatrix);

    //     // // vertex buffer: activate and feed into vertex shader
    //     // gl.bindBuffer(gl.ARRAY_BUFFER,vertexBuffers[whichTriSet]); // activate
    //     // gl.vertexAttribPointer(vertexPositionAttrib,3,gl.FLOAT,false,0,0); // feed

    //     // // triangle buffer: activate and render
    //     // gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,triangleBuffers[whichTriSet]); // activate
    //     // gl.drawElements(gl.TRIANGLES,3*triSetSizes[whichTriSet],gl.UNSIGNED_SHORT,0); // render
    // } // end for each tri set
    
    // vertex buffer: activate and feed into vertex shader
    gl.bindBuffer(gl.ARRAY_BUFFER,vertexBuffer); // activate
    gl.vertexAttribPointer(vertexPositionAttrib,3,gl.FLOAT,false,0,0); // feed
    gl.bindBuffer(gl.ARRAY_BUFFER,normalBuffer);
    gl.vertexAttribPointer(normalVectorAttrib,3,gl.FLOAT,false,0,0); // feed
    gl.bindBuffer(gl.ARRAY_BUFFER,ambientBuffer);
    gl.vertexAttribPointer(ambientAttrib,3,gl.FLOAT,false,0,0); // feed
    gl.bindBuffer(gl.ARRAY_BUFFER,diffuseBuffer);
    gl.vertexAttribPointer(diffuseAttrib,3,gl.FLOAT,false,0,0); // feed
    gl.bindBuffer(gl.ARRAY_BUFFER,specularBuffer);
    gl.vertexAttribPointer(specularAttrib,3,gl.FLOAT,false,0,0); // feed
    gl.bindBuffer(gl.ARRAY_BUFFER,nBuffer);
    gl.vertexAttribPointer(nAttrib,1,gl.FLOAT,false,0,0); // feed

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, triangleBuffer);
    gl.drawElements(gl.TRIANGLES,triBufferSize,gl.UNSIGNED_SHORT,0);
} // end render triangles

/* MAIN -- HERE is where execution begins after window load */

function main() {
  
  setupWebGL(); // set up the webGL environment
  loadTriangles(); // load in the triangles from tri file
  setupShaders(); // setup the webGL shaders
  renderTriangles(); // draw the triangles using webGL
  
} // end main
