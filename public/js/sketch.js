// Initialize variables

// Audio
let ball_seq;
let bpm = 72;
let spm;

let samplers = {  
  'water': null,
  'wind': null,
  'earth': null,
  'forest': null,
}
let scale_notes = ["F3", "Bb3", "C4", "D4", "Eb4", "Ab4"];
let firefly_speeds = ["slow", "med", "fast"];
let ball_scale_fract;

// Interaction
let spacebar = false;
let ready_to_add_hit = false;
let u, v;
let ripple_u = 0.0;
let ripple_v = 0.0;

// Layout
let global_pos;
let room_centers = {
  'water': new THREE.Vector3( 0, 0, 8 ),
  'wind': new THREE.Vector3( 8, 0, 0 ),
  'earth': new THREE.Vector3( -8, 0, 0 ),
  'forest': new THREE.Vector3( 0, 0, -5.4 ),
};

$(document).ready(function () {
  let sceneElement = document.querySelector("a-scene");

  ////////////////////////////////////////// 
  // CLOUD ROOM
  //////////////////////////////////////////
  const sketch = (p) => {
    let width = 512;
    let height = 512;

    let cols;
    let rows;
    let current; // = new float[cols][rows];
    let previous; // = new float[cols][rows];

    let dampening = 0.995;

    p.setup = () => {
      p.pixelDensity(1);
      c = p.createCanvas(width, height);
      cols = width;
      rows = height;
      // The following line initializes a 2D cols-by-rows array with zeroes
      // in every array cell, and is equivalent to this Processing line:
      // current = new float[cols][rows];
      current = new Array(cols).fill(0).map((n) => new Array(rows).fill(0));
      previous = new Array(cols).fill(0).map((n) => new Array(rows).fill(0));
    };

    p.draw = () => {
      // https://stackoverflow.com/questions/50966769/drawing-p5-js-canvas-inside-a-html-canvas-using-drawimage
      var HTMLcanvas = document.getElementById("ripple-canvas");
      var HTMLcontext = HTMLcanvas.getContext("2d");
      x_pix = Math.floor(ripple_u * width);
      z_pix = Math.floor(ripple_v * height);
      previous[x_pix][z_pix] = 500;
      p.background(0);

      p.loadPixels();
      for (let i = 1; i < cols - 1; i++) {
        for (let j = 1; j < rows - 1; j++) {
          current[i][j] =
            (previous[i - 1][j] +
              previous[i + 1][j] +
              previous[i][j - 1] +
              previous[i][j + 1]) /
              2 -
            current[i][j];
          current[i][j] = current[i][j] * dampening;
          // Unlike in Processing, the pixels array in p5.js has 4 entries
          // for each pixel, so we have to multiply the index by 4 and then
          // set the entries for each color component separately.
          let index = (i + j * cols) * 4;
          p.pixels[index + 0] = current[i][j];
          p.pixels[index + 1] = current[i][j];
          p.pixels[index + 2] = current[i][j];
        }
      }
      p.updatePixels();

      let temp = previous;
      previous = current;
      current = temp;

      HTMLcontext.drawImage(c.canvas, 0, 0);
    };
  };

  myp5 = new p5(sketch);

  // periodically check for raindrops falling through the floor
  setInterval(() => {
    let ripple_surface = document.querySelector("#ripple-surface");
    let raindrops = document.querySelectorAll("[raindrop]");
    for (let i = 0; i < raindrops.length; i++) {
      if (
        raindrops[i].object3D.position.y <
          ripple_surface.object3D.position.y + 0.1 &&
        !raindrops[i].struck
      ) {
        let note =
          scale_notes[Math.floor(Math.random() * scale_notes.length)];
          samplers['water'].triggerAttack(note);
          raindrops[i].struck = true;
      }
      if (raindrops[i].object3D.position.y < -200) {
        // HACK to help deleting object
        raindrops[i].remove();
      }
    }
  }, 20);

  ////////////////////////////////////////// 
  // FOREST ROOM
  //////////////////////////////////////////  
  var HTMLcanvas = document.getElementById("forest-canvas");
  var HTMLcontext = HTMLcanvas.getContext("2d");
  let img = document.getElementById("forest");
  console.log(img);
  HTMLcontext.drawImage(img, 0, 0);

  setInterval(() => {
    // forest_sampler.triggerAttack("Bb3");
    // console.log(forest_sampler.volume.value);
    let fireflies = document.querySelectorAll("[firefly]");
    let max_fireflies = 20;
    if (fireflies.length > max_fireflies) {
      // remove
    }
  }, 500);  

  ////////////////////////////////////////// 
  // WIND ROOM
  //////////////////////////////////////////   
  let num_cylinders = 8;
  let bubble_shooter_assy = document.createElement("a-entity");
  bubble_shooter_assy.setAttribute("id", "bubble-shooter");
  sceneElement.appendChild(bubble_shooter_assy);

  for (let i = 0; i < num_cylinders; i++) {
    let entity = document.createElement("a-entity");
    entity.setAttribute("position", room_centers['wind']);
    entity.setAttribute("id", i);
    let cyl = document.createElement("a-entity");
    entity.setAttribute("rotation", {
      x: 0,
      y: (360 / num_cylinders) * i,
      z: 0,
    });
    cyl.setAttribute("bubble-shooter", "");
    cyl.setAttribute("material", "side: double; opacity: 0.5");
    cyl.setAttribute("position", { x: 1, y: 0.8, z: 0 });
    let fan = document.createElement("a-entity");
    fan.setAttribute("fan", "");
    fan.setAttribute("id", i);
    fan.setAttribute("position", { x: 0, y: -0.4, z: 0 });
    fan.setAttribute("raycaster-listen", "");
    let ball = document.createElement("a-entity");
    ball.setAttribute("ball", "");
    ball.setAttribute("position", { x: 0, y: 0, z: 0 });
    ball.setAttribute("material", "color: #6df4ff; metalness: 0.8");
    cyl.appendChild(ball);
    cyl.appendChild(fan);
    entity.appendChild(cyl);
    bubble_shooter_assy.appendChild(entity);
  }

  ////////////////////////////////////////// 
  // TONE.JS
  //////////////////////////////////////////  
  Tone.Transport.bpm.value = bpm;
  Tone.Transport.start();

  let bps = bpm / 60.0;
  let spb = 1 / bps;
  spm = spb * 4.0;
  const synthOptions = {
    attackNoise: 1,
    dampening: 6000,
    resonance: 0.7,
    volume: -10,
  };

  ball_scale_fract = new Array(num_cylinders);
  ball_notes = [];
  for (let i = 0; i < ball_scale_fract.length; i++) {
    ball_scale_fract[i] = 0;
    ball_notes[i] = scale_notes[ball_scale_fract[i]];
  }
  const synth2 = new Tone.PolySynth(synthOptions);

  ball_seq = new Tone.Sequence(
    function (time, note) {
      // synth2.triggerAttackRelease(note, "16n", time);
    },
    ball_notes,
    "8n"
  ).start(0);
  ball_seq.loop = true;

  samplers['forest'] = new Tone.Sampler(
    {
      'F3': "assets/forest_F3_fast.mp3",
      "G#4": "assets/forest_Ab4_fast.mp3",
    },
    {
      volume: -20,
    }
  );
  samplers['water'] = new Tone.Sampler(
    {
      'F3': "assets/ripple_F3.mp3",
      "G#4": "assets/ripple_Ab4.mp3",
    },
    {
      volume: -20,
    }
  );  
  samplers['wind'] = new Tone.Sampler(
    {
      'F3': "assets/forest_F3_fast.mp3",
      "G#4": "assets/forest_Ab4_fast.mp3",
    },
    {
      volume: -20,
    }
  );  
  samplers['earth'] = new Tone.Sampler(
    {
      'F3': "assets/forest_F3_fast.mp3",
      "G#4": "assets/forest_Ab4_fast.mp3",
    },
    {
      volume: -20,
    }
  );    
  samplers['forest'].toMaster();
  samplers['water'].toMaster();

  setInterval(() => {
    // update sampler volumes based on distance from room
    if (global_pos){
      for (var key in samplers) {
        let dist = room_centers[key].distanceTo(global_pos);
        samplers[key].volume.value = Math.min(-0.7*dist*dist, -15);
        // console.log(key, dist, samplers[key].volume.value);
      }
    }
  }, 20);

});

AFRAME.registerComponent("canvas-updater", {
  dependencies: ["geometry", "material"],

  tick: function () {
    var el = this.el;
    var material;

    material = el.getObject3D("mesh").material;
    if (!material.map) {
      return;
    }
    material.map.needsUpdate = true;
  },
});

AFRAME.registerComponent("collider-check", {
  dependencies: ["raycaster"],

  init: function () {
    this.el.addEventListener("raycaster-intersection", function () {
      console.log("Player hit something!");
    });
  },
});

// --------------------------
// RAYCASTING

// helps to get the properties of the intersected elements
// oscPort.on("ready", function () {
AFRAME.registerComponent("raycaster-listen", {
  init: function () {
    // Use events to figure out what raycaster is listening so we don't have to
    // hardcode the raycaster.
    this.el.addEventListener("raycaster-intersected", (evt) => {
      this.raycaster = evt.detail.el;
      // console.log("normal", this.raycaster);
    });
    this.el.addEventListener("raycaster-intersected-cleared", (evt) => {
      this.raycaster = null;
    });
  },

  tick: function () {
    if (!this.raycaster) {
      return;
    } // Not intersecting.

    let intersection = this.raycaster.components.raycaster.getIntersection(
      this.el
    );
    if (!intersection) {
      return;
    }
    if (intersection.uv) {
      u = 1.0 - intersection.uv["x"];
      v = intersection.uv["y"];
    }

    if (spacebar && ready_to_add_hit) {

      // CLOUD INTERACTION
      if (intersection.object.el.id == "cloud") {
        let pt = intersection.point;
        // console.log(this.el.object3D.worldToLocal(intersection.object.parent.parent.position));
        let raindrop = document.createElement("a-entity");
        raindrop.setAttribute("raindrop", "struck: false;");
        raindrop.setAttribute("position", pt);
        raindrop.setAttribute("material", "opacity: 0.5");

        let scene = document.querySelector("a-scene");
        // console.log(scene);
        scene.appendChild(raindrop);
      }

      // FAN INTERACTION
      if (intersection.object.el.attributes[0].name == "fan") {
        // https://aframe.io/docs/1.0.0/introduction/javascript-events-dom-apis.html#looping-over-entities-from-queryselectorall
        var fans = document.querySelectorAll("[fan]");
        var balls = document.querySelectorAll("[ball]");
        for (var i = 0; i < fans.length; i++) {
          if (i == intersection.object.el.id) {
            fans[i].components.fan.increase();
            balls[i].components.ball.raise();
            ball_scale_fract[i] = Math.floor(
              balls[i].object3D.position.y * scale_notes.length
            );
            ball_seq.at(i, scale_notes[ball_scale_fract[i]]);
          }
        }
      }

      // FOREST INTERACTION
      if (intersection.object.el.id == "forest-wall") {
        let pt = intersection.point;
        let firefly = document.createElement("a-entity");
        firefly.setAttribute("firefly", "");
        firefly.setAttribute("position", pt);
        let scene = document.querySelector("a-scene");
        let note =
          scale_notes[Math.floor(Math.random() * scale_notes.length)];
        samplers['forest'].triggerAttack(note);
        scene.appendChild(firefly);
      }
      ready_to_add_hit = false;
    }

    // EARTH INTERACTION
    if (spacebar) {
      var globes = document.querySelectorAll("[globe]");
      for (var i = 0; i < globes.length; i++) {
        if (i == intersection.object.el.id) {
          globes[i].components.globe.wind_up();
        }
      }
    }
  },
});

// --------------------------
// KEYBOARD INTERACTION
// listen for keydown and keyup events
// https://www.w3schools.com/jsref/event_onkeydown.asp
document.addEventListener("keydown", function (event) {
  if (event.which == 32 && spacebar == false) {
    spacebar = true;
    ready_to_add_hit = true;
  }
});

document.addEventListener("keyup", function (event) {
  if (event.which == 32) {
    spacebar = false;
  }
});

// A frame components

AFRAME.registerComponent("bubble-shooter", {
  init: function () {
    let el = this.el;
    this.geometry = new THREE.CylinderGeometry(0.15, 0.15, 2.5, 32, 1, true);
    // this.material = new THREE.MeshBasicMaterial( {color: 0xffff00} );
    this.material = new THREE.MeshBasicMaterial();
    this.mesh = new THREE.Mesh(this.geometry, this.material);
    el.setObject3D("mesh", this.mesh);
  },
});

AFRAME.registerComponent("raindrop", {
  schema: {
    acc: { type: "vec3", default: { x: 0, y: -0.000001, z: 0 } },
    vel: { type: "vec3", default: { x: 0, y: 0, z: 0 } },
    struck: { type: "bool", default: false },
  },

  init: function () {
    let el = this.el;
    this.geometry = new THREE.SphereGeometry(0.007, 16, 16);
    this.material = new THREE.MeshBasicMaterial({ color: 0x6df4ff });
    this.mesh = new THREE.Mesh(this.geometry, this.material);
    el.setObject3D("mesh", this.mesh);
    this.data.struck = false;
  },

  tick: function (t, dt) {
    let pos = this.el.getAttribute("position");
    this.data.vel.y = this.data.vel.y + dt * this.data.acc.y;
    this.el.setAttribute("position", {
      x: pos.x,
      y: pos.y + this.data.vel.y * dt,
      z: pos.z,
    });
    let ripple_surface = document.querySelector("#ripple-surface");
    if (
      this.el.getAttribute("position").y < ripple_surface.object3D.position.y
    ) {
      let cloud_room_pos = document
        .querySelector("#cloud-room")
        .getAttribute("position");
      ripple_u =
        1.0 -
        ((cloud_room_pos.x - this.el.getAttribute("position").x) / 2.5 + 0.5);
      ripple_v =
        (cloud_room_pos.z - this.el.getAttribute("position").z) / 2.0 + 0.5;
    }
  },
});

AFRAME.registerComponent("ball", {
  multiple: true,

  init: function () {
    let el = this.el;
    this.geometry = new THREE.SphereGeometry(0.15, 16, 16);
    this.material = new THREE.MeshBasicMaterial();
    this.mesh = new THREE.Mesh(this.geometry, this.material);
    el.setObject3D("mesh", this.mesh);
  },

  tick: function (t, dt) {
    let rand_incr = 0; // Math.random() * 2.0 - 1.0;
    let noise_factor = 5e-5;
    let pos = this.el.getAttribute("position");
    this.el.setAttribute("position", {
      x: 0,
      y: Math.max(pos.y + rand_incr * noise_factor * dt, -0.4),
      z: 0,
    });
  },

  raise: function () {
    let raise_incr = 0.05;
    let pos = this.el.getAttribute("position");
    this.el.setAttribute("position", {
      x: 0,
      y: Math.min(pos.y + raise_incr, 1.0),
      z: 0,
    }); // TODO slerp
  },
});

AFRAME.registerComponent("firefly", {
  init: function () {
    let el = this.el;
    this.geometry = new THREE.SphereGeometry(0.01, 16, 16);
    this.material = new THREE.MeshBasicMaterial({ color: 0xc7c34d });
    this.mesh = new THREE.Mesh(this.geometry, this.material);
    el.setObject3D("mesh", this.mesh);
  },

  tick: function (t, dt) {
    this.el.object3D.el.components.firefly.material.opacity =
      (Math.sin(t * 0.002) + 1.0) / 2.0; // .color too
    // console.log(this.el);
  },
});

AFRAME.registerComponent("fan", {
  schema: {
    omega: { type: "vec3", default: { x: 0, y: 0.1, z: 0 } },
  },
  multiple: true,
  init: function () {
    this.el.setAttribute("scale", { x: 0.2, y: 0.2, z: 0.2 });
    this.el.setAttribute("rotation", { x: 0, y: 0, z: 0 });
    this.el.setAttribute("obj-model", "obj: #fan; mtl: #fan;");
  },
  tick: function (t, dt) {
    let omega = this.data.omega;
    let rot = this.el.getAttribute("rotation");
    this.el.setAttribute("rotation", { x: 0, y: rot.y + omega.y * dt, z: 0 });
  },
  increase: function () {
    this.data.omega.y += 0.03;
  },
});

AFRAME.registerComponent("globe", {
  schema: {
    omega: { type: "vec3", default: { x: 0, y: 0.0, z: 0 } },
  },
  multiple: true,
  init: function () {
    this.el.setAttribute("rotation", { x: 0, y: 0, z: 0 });
  },
  tick: function (t, dt) {
    let rot = this.el.getAttribute("rotation");
    let k = 0.000003;
    let c = 0.99;
    let fx = spacebar ? 0 : -k * rot.x;
    this.data.omega.x += fx * dt;
    this.data.omega.x *= c;
    this.el.setAttribute("rotation", {
      x: rot.x + this.data.omega.x * dt,
      y: rot.y + this.data.omega.y * dt,
      z: 0,
    });
  },
  wind_up: function () {
    console.log("winding up");
    let rot = this.el.getAttribute("rotation");
    this.el.setAttribute("rotation", { x: rot.x + 0.5, y: rot.y, z: 0 });
  },
});

AFRAME.registerComponent("position-reader", {
  tick: function () {
    var position = new THREE.Vector3();
    this.el.object3D.getWorldPosition(position);
    global_pos = position;
  },
});