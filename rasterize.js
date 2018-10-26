/* GLOBAL CONSTANTS AND VARIABLES */

/* assignment specific globals */
const WIN_Z = 0;  // default graphics window z coord in world space
const WIN_LEFT = 0; const WIN_RIGHT = 1;  // default left and right x coords in world space
const WIN_BOTTOM = 0; const WIN_TOP = 1;  // default top and bottom y coords in world space
const INPUT_TRIANGLES_URL = "https://ncsucgclass.github.io/prog3/triangles.json"; // triangles file loc
const INPUT_LIGHTS_URL = "https://ncsucgclass.github.io/prog3/lights.json";
const INPUT_SPHERES_URL = "https://ncsucgclass.github.io/prog3/spheres.json"; // spheres file loc
var Eye = new vec4.fromValues(0.5,0.5,-0.5,1.0); // default eye position in world space
var lookAt = new vec3.fromValues(0,0,1);
var lookUp = new vec3.fromValues(0,1,0);

/* webgl globals */
var gl = null; // the all powerful gl object. It's all here folks!
var vertexBuffer; // this contains vertex coordinates in triples
var triangleBuffer; // this contains indices into vertexBuffer in triples
var vertexPositionAttrib; // where to put position for vertex shader
var normalVectorAttrib;
var ambientAttrib;
var diffuseAttrib;
var specularAttrib;
var nAttrib;
var inputTriangles;
var modelMatrixULoc;
var vertexBuffers = [];
var triangleBuffers = [];
var normalBuffers = [];
var ambientBuffers = [];
var diffuseBuffers = [];
var specularBuffers = [];
var nBuffers = [];
var numTriangleSets = 0;
var triSetSizes = [];
var pmatrix;
var lmatrix;
var lookAtMatrix = mat4.create();
var projectionMatrix = mat4.create();
var lightSwitchNum = 1;

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
    numTriangleSets = inputTriangles.length;
    if (inputTriangles != String.null) { 
        var whichSetVert; // index of vertex in current triangle set
        var whichSetTri; // index of triangle in current triangle set
        var vtxToAdd = [];
        var triToAdd = vec3.create();

        for (var whichSet=0; whichSet<inputTriangles.length; whichSet++) {
            // set up the vertex coord array
            inputTriangles[whichSet].coordArray = [];
            inputTriangles[whichSet].normalArray = [];
            inputTriangles[whichSet].ambientArray = [];
            inputTriangles[whichSet].diffuseArray = [];
            inputTriangles[whichSet].specularArray = [];
            inputTriangles[whichSet].nArray = [];
            inputTriangles[whichSet].indexArray = [];
            for (whichSetVert=0; whichSetVert<inputTriangles[whichSet].vertices.length; whichSetVert++){
                vtxToAdd = inputTriangles[whichSet].vertices[whichSetVert];
                inputTriangles[whichSet].coordArray = inputTriangles[whichSet].coordArray.concat(vtxToAdd);
                inputTriangles[whichSet].normalArray = inputTriangles[whichSet].normalArray.concat(inputTriangles[whichSet].normals[whichSetVert]);

                for (i=0; i<3; i++) {
                    inputTriangles[whichSet].ambientArray = inputTriangles[whichSet].ambientArray.concat(inputTriangles[whichSet].material.ambient[i]);
                    inputTriangles[whichSet].diffuseArray = inputTriangles[whichSet].diffuseArray.concat(inputTriangles[whichSet].material.diffuse[i]);
                    inputTriangles[whichSet].specularArray = inputTriangles[whichSet].specularArray.concat(inputTriangles[whichSet].material.specular[i]);
                    inputTriangles[whichSet].nArray = inputTriangles[whichSet].nArray.concat(inputTriangles[whichSet].material.n);
                }
                
                // console.log(inputTriangles[whichSet].vertices[whichSetVert]);
            }

             // create a list of tri indices for this tri set
            triSetSizes[whichSet] = inputTriangles[whichSet].triangles.length;
            for (whichSetTri=0; whichSetTri<triSetSizes[whichSet]; whichSetTri++) {
                triToAdd = inputTriangles[whichSet].triangles[whichSetTri];
                inputTriangles[whichSet].indexArray = inputTriangles[whichSet].indexArray.concat(triToAdd[0],triToAdd[1],triToAdd[2]);
            } // end for triangles in set

            // send the vertex coords to webGL
            vertexBuffers[whichSet] = gl.createBuffer(); // init empty vertex coord buffer for current set
            gl.bindBuffer(gl.ARRAY_BUFFER,vertexBuffers[whichSet]); // activate that buffer
            gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(inputTriangles[whichSet].coordArray),gl.STATIC_DRAW); // coords to that buffer

            triangleBuffers[whichSet] = gl.createBuffer(); // init empty triangle index buffer
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,triangleBuffers[whichSet]); // activate that buffer
            gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(inputTriangles[whichSet].indexArray),gl.STATIC_DRAW); // indices to that buffer

            normalBuffers[whichSet] = gl.createBuffer(); // init empty vertex coord buffer
            gl.bindBuffer(gl.ARRAY_BUFFER,normalBuffers[whichSet]); // activate that buffer
            gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(inputTriangles[whichSet].normalArray),gl.STATIC_DRAW);

            ambientBuffers[whichSet] = gl.createBuffer(); // init empty vertex coord buffer
            gl.bindBuffer(gl.ARRAY_BUFFER,ambientBuffers[whichSet]); // activate that buffer
            gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(inputTriangles[whichSet].ambientArray),gl.STATIC_DRAW);

            diffuseBuffers[whichSet] = gl.createBuffer(); // init empty vertex coord buffer
            gl.bindBuffer(gl.ARRAY_BUFFER,diffuseBuffers[whichSet]); // activate that buffer
            gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(inputTriangles[whichSet].diffuseArray),gl.STATIC_DRAW);

            specularBuffers[whichSet] = gl.createBuffer(); // init empty vertex coord buffer
            gl.bindBuffer(gl.ARRAY_BUFFER,specularBuffers[whichSet]); // activate that buffer
            gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(inputTriangles[whichSet].specularArray),gl.STATIC_DRAW);

            nBuffers[whichSet] = gl.createBuffer(); // init empty vertex coord buffer
            gl.bindBuffer(gl.ARRAY_BUFFER,nBuffers[whichSet]); // activate that buffer
            gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(inputTriangles[whichSet].nArray),gl.STATIC_DRAW);
        } // end for each triangle set 
    } // end if triangles found
} // end load triangles

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
        varying float lightSwitchToPass;

        void main(void) {
            if (lightSwitchToPass == 1.0) {
                vec3 a = vec3(lightA[0] * mAmbient[0], lightA[1] * mAmbient[1], lightA[2] * mAmbient[2]);

                vec3 L = normalize(lightPos - vertexPos);
				vec3 d = vec3(lightD[0] * mDiffuse[0] * dot(normal, L), lightD[1] * mDiffuse[1] * dot(normal, L), lightD[2] * mDiffuse[2] * dot(normal, L));

				vec3 V = normalize(eyeLoc - vertexPos);
                vec3 scale1 = vec3(dot(normal, L) * normal[0], dot(normal, L) * normal[1], dot(normal, L) * normal[2]);
                vec3 R = vec3(2.0 * scale1[0], 2.0 * scale1[1], 2.0 * scale1[2]) - L;
                float sToMultiply = pow(max(dot(R, V), 0.0), n);
				vec3 s = vec3(lightS[0] * mSpecular[0] * sToMultiply, lightS[1] * mSpecular[1] * sToMultiply, lightS[2] * mSpecular[2] * sToMultiply);

                gl_FragColor = vec4(a[0] + d[0] + s[0], a[1] + d[1] + s[1], a[2] + d[2] + s[2], 1.0);
            } else if (lightSwitchToPass == 2.0) {
                vec3 a = vec3(lightA[0] * mAmbient[0], lightA[1] * mAmbient[1], lightA[2] * mAmbient[2]);
            
                vec3 L = lightPos - vertexPos;
                vec3 d = vec3(lightD[0] * mDiffuse[0] * dot(normal, normalize(L)), lightD[1] * mDiffuse[1] * dot(normal, normalize(L)), lightD[2] * mDiffuse[2] * dot(normal, normalize(L)));
    
                vec3 V = eyeLoc - vertexPos;
                vec3 H = L + V / (normalize(L) + normalize(V));
                float sToMultiply = pow(max(dot(normalize(normal), normalize(H)), 0.0), n);
                vec3 s = vec3(lightS[0] * mSpecular[0] * sToMultiply, lightS[1] * mSpecular[1] * sToMultiply, lightS[2] * mSpecular[2] * sToMultiply);
    
                gl_FragColor = vec4(a[0] + d[0] + s[0], a[1] + d[1] + s[1], a[2] + d[2] + s[2], 1.0);
            }   
        }
    `;
    
    // define vertex shader in essl using es6 template strings
    var vShaderCode = `
        uniform vec3 lightLoc;
        uniform vec3 lAmbient;
        uniform vec3 lDiffuse;
        uniform vec3 lSpecular;
        uniform int lightSwitch;
        uniform vec4 eyePos;
        uniform mat4 uModelMatrix; // the model matrix
        uniform mat4 pMatrix;
		uniform mat4 lMatrix;
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
        varying float lightSwitchToPass;

        void main(void) {
            vec4 tempVal = uModelMatrix * vec4(vertexPosition, 1.0);
            gl_Position = pMatrix * lMatrix * tempVal; // use the untransformed position
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

            if(lightSwitch == 1) {
				lightSwitchToPass = 1.0;
			} else if (lightSwitch == 2) {
				lightSwitchToPass = 2.0;
			}
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

                modelMatrixULoc = gl.getUniformLocation(shaderProgram, "uModelMatrix");
                pmatrix = gl.getUniformLocation(shaderProgram, "pMatrix"); 
                lmatrix = gl.getUniformLocation(shaderProgram, "lMatrix");

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

                    var lightSwitch = gl.getUniformLocation(shaderProgram, "lightSwitch");
                    gl.uniform1i(lightSwitch, lightSwitchNum);

                }

                var aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
                var zNear = 0.01;
                var zFar = 2000;
                
                var EyeVec = new vec3.fromValues(Eye[0],Eye[1],Eye[2]);
                projectionMatrix = mat4.perspective(projectionMatrix, Math.PI / 2, aspect, zNear, zFar);
                lookAtMatrix = mat4.lookAt(lookAtMatrix, EyeVec, lookAt, lookUp);
                console.log(lookAtMatrix);

                var selectionIndex = 0;
                var lastAction = "";
                
                
                for (var whichTriSet=0; whichTriSet<inputTriangles.length; whichTriSet++) {
                    inputTriangles[whichTriSet].mMatrix = mat4.create();
                    inputTriangles[whichTriSet].highlighted = false;
                }

                var setCenter = vec3.fromValues(0,0,0);
                document.addEventListener('keydown', function(event) {
                    if (event.key === "ArrowLeft") {
                        if (selectionIndex === 0) {
                            selectionIndex = numTriangleSets - 1;
                        } else {
                            selectionIndex--;
                        }
                        inputTriangles[selectionIndex].mMatrix = mat4.multiply(
                            inputTriangles[selectionIndex].mMatrix,
                            mat4.fromScaling(mat4.create(), vec3.fromValues(1.2,1.2,1.2)),
                            inputTriangles[selectionIndex].mMatrix);
                        inputTriangles[selectionIndex].highlighted = true;
                        
                        if (lastAction === "left") {
                            if (selectionIndex === numTriangleSets - 1) {
                                mat4.multiply(
                                    inputTriangles[0].mMatrix,
                                    mat4.fromScaling(mat4.create(), vec3.fromValues(1/1.2,1/1.2,1/1.2)),
                                    inputTriangles[0].mMatrix);
                                inputTriangles[0].highlighted = false;
                            } else {
                                mat4.multiply(
                                    inputTriangles[selectionIndex + 1].mMatrix,
                                    mat4.fromScaling(mat4.create(), vec3.fromValues(1/1.2,1/1.2,1/1.2)),
                                    inputTriangles[selectionIndex + 1].mMatrix);
                                inputTriangles[selectionIndex + 1].highlighted = false;
                            }
                        } else if (lastAction === "right") {
                            if (selectionIndex === 0) {
                                mat4.multiply(
                                    inputTriangles[numTriangleSets - 1].mMatrix,
                                    mat4.fromScaling(mat4.create(), vec3.fromValues(1/1.2,1/1.2,1/1.2)),
                                    inputTriangles[numTriangleSets - 1].mMatrix);
                                inputTriangles[numTriangleSets - 1].highlighted = false;
                            } else {
                                mat4.multiply(
                                    inputTriangles[selectionIndex - 1].mMatrix,
                                    mat4.fromScaling(mat4.create(), vec3.fromValues(1/1.2,1/1.2,1/1.2)),
                                    inputTriangles[selectionIndex - 1].mMatrix);
                                inputTriangles[selectionIndex - 1].highlighted = false;
                            }
                        }

                        lastAction = "left";
                    }
                    if (event.key === 'ArrowRight') {
                        if (selectionIndex === numTriangleSets - 1) {
                            selectionIndex = 0;
                        } else {
                            selectionIndex++;
                        }

                        mat4.multiply(
                            inputTriangles[selectionIndex].mMatrix,
                            mat4.fromScaling(mat4.create(), vec3.fromValues(1.2,1.2,1.2)),
                            inputTriangles[selectionIndex].mMatrix);
                            inputTriangles[selectionIndex].highlighted = true;
                        
                        if (lastAction === "left") {
                            if (selectionIndex === numTriangleSets - 1) {
                                mat4.multiply(
                                    inputTriangles[0].mMatrix,
                                    mat4.fromScaling(mat4.create(), vec3.fromValues(1/1.2,1/1.2,1/1.2)),
                                    inputTriangles[0].mMatrix);
                                inputTriangles[0].highlighted = false;
                            } else {
                                mat4.multiply(
                                    inputTriangles[selectionIndex + 1].mMatrix,
                                    mat4.fromScaling(mat4.create(), vec3.fromValues(1/1.2,1/1.2,1/1.2)),
                                    inputTriangles[selectionIndex + 1].mMatrix);
                                inputTriangles[selectionIndex + 1].highlighted = false;
                            }
                        } else if (lastAction === "right") {
                            if (selectionIndex === 0) {
                                mat4.multiply(
                                    inputTriangles[numTriangleSets - 1].mMatrix,
                                    mat4.fromScaling(mat4.create(), vec3.fromValues(1/1.2,1/1.2,1/1.2)),
                                    inputTriangles[numTriangleSets - 1].mMatrix);
                                inputTriangles[numTriangleSets - 1].highlighted = false;
                            } else {
                                mat4.multiply(
                                    inputTriangles[selectionIndex - 1].mMatrix,
                                    mat4.fromScaling(mat4.create(), vec3.fromValues(1/1.2,1/1.2,1/1.2)),
                                    inputTriangles[selectionIndex - 1].mMatrix);
                                inputTriangles[selectionIndex - 1].highlighted = false;
                            }
                        }

                        lastAction = "right";
                    }
                    if (event.key === ' ' && inputTriangles[selectionIndex].highlighted) {
                        mat4.multiply(
                            inputTriangles[selectionIndex].mMatrix,
                            mat4.fromScaling(mat4.create(), vec3.fromValues(1/1.2,1/1.2,1/1.2)),
                            inputTriangles[selectionIndex].mMatrix);
                        inputTriangles[selectionIndex].highlighted = false;
                        selectionIndex = 0;
                        lastAction = "";
                    }
                    if (event.key === 'a') {
                        EyeVec = new vec3.fromValues(EyeVec[0] + .01,EyeVec[1],EyeVec[2]);
                        lookAt = new vec3.fromValues(lookAt[0] + .01, lookAt[1], lookAt[2]);
                        lookAtMatrix = mat4.lookAt(lookAtMatrix, EyeVec, lookAt, lookUp);
                    }
                    if (event.key === 'd') {
                        EyeVec = new vec3.fromValues(EyeVec[0] - .01,EyeVec[1],EyeVec[2]);
                        lookAt = new vec3.fromValues(lookAt[0] - .01, lookAt[1], lookAt[2]);
                        lookAtMatrix = mat4.lookAt(lookAtMatrix, EyeVec, lookAt, lookUp);
                    }
                    if (event.key === 'q') {
                        EyeVec = new vec3.fromValues(EyeVec[0],EyeVec[1] + .01,EyeVec[2]);
                        lookAt = new vec3.fromValues(lookAt[0], lookAt[1] + .01, lookAt[2]);
                        lookAtMatrix = mat4.lookAt(lookAtMatrix, EyeVec, lookAt, lookUp);
                    }
                    if (event.key === 'e') {
                        EyeVec = new vec3.fromValues(EyeVec[0],EyeVec[1] - .01,EyeVec[2]);
                        lookAt = new vec3.fromValues(lookAt[0], lookAt[1] - .01, lookAt[2]);
                        lookAtMatrix = mat4.lookAt(lookAtMatrix, EyeVec, lookAt, lookUp);
                    }
                    if (event.key === 's') {
                        EyeVec = new vec3.fromValues(EyeVec[0],EyeVec[1],EyeVec[2] + .01);
                        lookAt = new vec3.fromValues(lookAt[0], lookAt[1], lookAt[2] + .01);
                        lookAtMatrix = mat4.lookAt(lookAtMatrix, EyeVec, lookAt, lookUp);
                    }
                    if (event.key === 'w') {
                        EyeVec = new vec3.fromValues(EyeVec[0],EyeVec[1],EyeVec[2] - .01);
                        lookAt = new vec3.fromValues(lookAt[0], lookAt[1], lookAt[2] - .01);
                        lookAtMatrix = mat4.lookAt(lookAtMatrix, EyeVec, lookAt, lookUp);
                    }
                    if (event.key === 'A') {
                        vec3.rotateY(lookAt, lookAt, EyeVec, Math.PI/40);
                        lookAtMatrix = mat4.lookAt(lookAtMatrix, EyeVec, lookAt, lookUp);
                    }
                    if (event.key === 'D') {
                        vec3.rotateY(lookAt, lookAt, EyeVec, -Math.PI/40);
                        lookAtMatrix = mat4.lookAt(lookAtMatrix, EyeVec, lookAt, lookUp);
                    }
                    if (event.key === 'W') {
                        vec3.rotateX(lookUp, lookUp, EyeVec, Math.PI/40);
                        vec3.rotateX(lookAt, lookAt, EyeVec, Math.PI/40);
                        lookAtMatrix = mat4.lookAt(lookAtMatrix, EyeVec, lookAt, lookUp);
                    }
                    if (event.key === 'S') {
                        vec3.rotateX(lookUp, lookUp, EyeVec, -Math.PI/40);
                        vec3.rotateX(lookAt, lookAt, EyeVec, -Math.PI/40);
                        lookAtMatrix = mat4.lookAt(lookAtMatrix, EyeVec, lookAt, lookUp);
                    }
                    if (event.key === 'b') {
                        if(lightSwitchNum == 1) {
                            lightSwitchNum = 2;
                            var lightSwitch = gl.getUniformLocation(shaderProgram, "lightSwitch");
                            gl.uniform1i(lightSwitch, lightSwitchNum);
                        } else {
                            lightSwitchNum = 1;
                            var lightSwitch = gl.getUniformLocation(shaderProgram, "lightSwitch");
                            gl.uniform1i(lightSwitch, lightSwitchNum);
                        }
                    }
                    if (event.key === '1' && !!inputTriangles[selectionIndex].highlighted) {
                        for (var i = 0; i < inputTriangles[selectionIndex].ambientArray.length; i++) {
                            if (inputTriangles[selectionIndex].ambientArray[i] <= 1.0) {
                                inputTriangles[selectionIndex].ambientArray[i] += .1;
                            }
                        }
                        for (var whichSet=0; whichSet<numTriangleSets; whichSet++) {
                            ambientBuffers[whichSet] = gl.createBuffer();
                            gl.bindBuffer(gl.ARRAY_BUFFER,ambientBuffers[whichSet]);
                            gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(inputTriangles[whichSet].ambientArray),gl.STATIC_DRAW);
                        }
                    }
                    if (event.key === '2' && !!inputTriangles[selectionIndex].highlighted) {
                        for (var i = 0; i < inputTriangles[selectionIndex].diffuseArray.length; i++) {
                            if (inputTriangles[selectionIndex].diffuseArray[i] <= 1.0) {
                                inputTriangles[selectionIndex].diffuseArray[i] += .1;
                            }
                        }
                        for (var whichSet=0; whichSet<numTriangleSets; whichSet++) {
                            diffuseBuffers[whichSet] = gl.createBuffer(); // init empty vertex coord buffer
                            gl.bindBuffer(gl.ARRAY_BUFFER,diffuseBuffers[whichSet]); // activate that buffer
                            gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(inputTriangles[whichSet].diffuseArray),gl.STATIC_DRAW);
                        }
                    }
                    if (event.key === '3' && !!inputTriangles[selectionIndex].highlighted) {
                        for (var i = 0; i < inputTriangles[selectionIndex].diffuseArray.length; i++) {
                            if (inputTriangles[selectionIndex].specularArray[i] <= 1.0) {
                                inputTriangles[selectionIndex].specularArray[i] += .1;
                            }
                        }
                        for (var whichSet=0; whichSet<numTriangleSets; whichSet++) {
                            specularBuffers[whichSet] = gl.createBuffer(); // init empty vertex coord buffer
                            gl.bindBuffer(gl.ARRAY_BUFFER,specularBuffers[whichSet]); // activate that buffer
                            gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(inputTriangles[whichSet].specularArray),gl.STATIC_DRAW);
                        }
                    }
                    if (event.key === 'n' && !!inputTriangles[selectionIndex].highlighted) {
                        console.log("test");
                        for(var i = 0; i < inputTriangles[selectionIndex].nArray.length; i++) {
                            if (inputTriangles[selectionIndex].nArray[i] <= 20) {
                                inputTriangles[selectionIndex].nArray[i] += 1;
                            }
                        }
                        for (var whichSet=0; whichSet<numTriangleSets; whichSet++) {
                            nBuffers[whichSet] = gl.createBuffer(); // init empty vertex coord buffer
                            gl.bindBuffer(gl.ARRAY_BUFFER,nBuffers[whichSet]); // activate that buffer
                            gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(inputTriangles[whichSet].nArray),gl.STATIC_DRAW);
                        }
                        renderTriangles();
                    }
                    if (event.key === ';' && !!inputTriangles[selectionIndex].highlighted) {
                        mat4.multiply(
                            inputTriangles[selectionIndex].mMatrix,
                            mat4.fromTranslation(mat4.create(), vec3.fromValues(.01,0,0)),
                            inputTriangles[selectionIndex].mMatrix);
                    }
                    if (event.key === 'k' && !!inputTriangles[selectionIndex].highlighted) {
                        mat4.multiply(
                            inputTriangles[selectionIndex].mMatrix,
                            mat4.fromTranslation(mat4.create(), vec3.fromValues(-.01,0,0)),
                            inputTriangles[selectionIndex].mMatrix);
                    }
                    if (event.key === 'o' && !!inputTriangles[selectionIndex].highlighted) {
                        mat4.multiply(
                            inputTriangles[selectionIndex].mMatrix,
                            mat4.fromTranslation(mat4.create(), vec3.fromValues(0,0,.01)),
                            inputTriangles[selectionIndex].mMatrix);
                    }
                    if (event.key === 'l' && !!inputTriangles[selectionIndex].highlighted) {
                        mat4.multiply(
                            inputTriangles[selectionIndex].mMatrix,
                            mat4.fromTranslation(mat4.create(), vec3.fromValues(0,0,-.01)),
                            inputTriangles[selectionIndex].mMatrix);
                    }
                    if (event.key === 'i' && !!inputTriangles[selectionIndex].highlighted) {
                        mat4.multiply(
                            inputTriangles[selectionIndex].mMatrix,
                            mat4.fromTranslation(mat4.create(), vec3.fromValues(0,.01,0)),
                            inputTriangles[selectionIndex].mMatrix);
                    }
                    if (event.key === 'p' && !!inputTriangles[selectionIndex].highlighted) {
                        mat4.multiply(
                            inputTriangles[selectionIndex].mMatrix,
                            mat4.fromTranslation(mat4.create(), vec3.fromValues(0,-.01,0)),
                            inputTriangles[selectionIndex].mMatrix);
                    }
                    if (event.key === 'I' && !!inputTriangles[selectionIndex].highlighted) {
                        mat4.multiply(inputTriangles[selectionIndex].mMatrix,
                            mat4.fromRotation(mat4.create(),Math.PI/40,lookAt),
                            inputTriangles[selectionIndex].mMatrix);
                    }
                    if (event.key === 'P' && !!inputTriangles[selectionIndex].highlighted) {
                        mat4.multiply(inputTriangles[selectionIndex].mMatrix,
                            mat4.fromRotation(mat4.create(),-Math.PI/40,lookAt),
                            inputTriangles[selectionIndex].mMatrix);
                    }

                    var eyePosition = gl.getUniformLocation(shaderProgram, "eyePos");
                    gl.uniform4fv(eyePosition, Eye);
                    
                    renderTriangles();
                });

                
            } // end if no shader program link errors
        } // end if no compile errors
    } // end try 
    
    catch(e) {
        console.log(e);
    } // end catch
} // end setup shaders

// render the loaded model
function renderTriangles() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); // clear frame/depth buffers
    // bgColor = (bgColor < 1) ? (bgColor + 0.001) : 0;
    // bgColor = 0;
    // gl.clearColor(bgColor, 0, 0, 1.0);
    // requestAnimationFrame(renderTriangles);
    
    // vertex buffer: activate and feed into vertex shader
    
    for (var whichTriSet=0; whichTriSet<numTriangleSets; whichTriSet++) {
        gl.uniformMatrix4fv(modelMatrixULoc, false, inputTriangles[whichTriSet].mMatrix);
        gl.uniformMatrix4fv(pmatrix, false, projectionMatrix);
		gl.uniformMatrix4fv(lmatrix, false, lookAtMatrix);

        gl.bindBuffer(gl.ARRAY_BUFFER,vertexBuffers[whichTriSet]); // activate
        gl.vertexAttribPointer(vertexPositionAttrib,3,gl.FLOAT,false,0,0); // feed
        gl.bindBuffer(gl.ARRAY_BUFFER,normalBuffers[whichTriSet]);
        gl.vertexAttribPointer(normalVectorAttrib,3,gl.FLOAT,false,0,0); // feed
        gl.bindBuffer(gl.ARRAY_BUFFER,ambientBuffers[whichTriSet]);
        gl.vertexAttribPointer(ambientAttrib,3,gl.FLOAT,false,0,0); // feed
        gl.bindBuffer(gl.ARRAY_BUFFER,diffuseBuffers[whichTriSet]);
        gl.vertexAttribPointer(diffuseAttrib,3,gl.FLOAT,false,0,0); // feed
        gl.bindBuffer(gl.ARRAY_BUFFER,specularBuffers[whichTriSet]);
        gl.vertexAttribPointer(specularAttrib,3,gl.FLOAT,false,0,0); // feed
        gl.bindBuffer(gl.ARRAY_BUFFER,nBuffers[whichTriSet]);
        gl.vertexAttribPointer(nAttrib,1,gl.FLOAT,false,0,0); // feed
        // triangle buffer: activate and render
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,triangleBuffers[whichTriSet]); // activate
        gl.drawElements(gl.TRIANGLES,3*triSetSizes[whichTriSet],gl.UNSIGNED_SHORT,0); // render
    }
} // end render triangles

/* MAIN -- HERE is where execution begins after window load */

function main() {
  
  setupWebGL(); // set up the webGL environment
  loadTriangles(); // load in the triangles from tri file
  setupShaders(); // setup the webGL shaders
  renderTriangles(); // draw the triangles using webGL
  
} // end main
