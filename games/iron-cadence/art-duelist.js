import { TAU, path, line, ellipse, glow, gradient } from './art-primitives.js';

// sword uses paint.js's existing angle convention. Additional flags are visual only.
export function drawDuelist(
  c,
  {
    x,
    y = 452,
    dir = 1,
    color = '#79d9d0',
    sword = -0.3,
    enemy = false,
    time = 0,
    guard = false,
    attack = false,
    windup = 0,
    empowered = false
  } = {}
) {
  c.save();
  c.translate(x, y);
  c.scale(dir, 1);
  ellipse(c, 0, 5, 58, 10, '#020812aa');
  // Distorted reflection does not cover status text beneath the action.
  c.save();
  c.translate(0, 12);
  c.scale(1, -0.21);
  c.globalAlpha = 0.13;
  body(c, { enemy, color, sword, time, guard, attack, windup, empowered });
  c.restore();
  for (let i = 0; i < 3; i++) {
    c.beginPath();
    c.ellipse(
      0,
      8 + i * 3,
      38 + i * 13 + Math.sin(time * 2 + i) * 3,
      3 + i * 2,
      0,
      0,
      TAU
    );
    c.strokeStyle = '#a5d7d21c';
    c.lineWidth = 1;
    c.stroke();
  }
  body(c, { enemy, color, sword, time, guard, attack, windup, empowered });
  c.restore();
}
function body(
  c,
  { enemy, color, sword, time, guard, attack, windup, empowered }
) {
  const breath = Math.sin(time * 2.4 + (enemy ? 2 : 0)) * 1.4,
    lean = guard ? -5 : attack ? 9 : windup ? -5 : 0,
    flutter = Math.sin(time * 3.2) * 5;
  c.save();
  c.translate(lean, breath);
  // Layered cloak, articulated greaves and heavy boots give a grounded silhouette.
  path(
    c,
    [
      [-19, -131],
      [-35, -110],
      [-44 + flutter, -38],
      [-61 + flutter, -15],
      [-21, -28],
      [8, -85]
    ],
    enemy ? '#322b30' : '#122a3a',
    '#78959c33'
  );
  path(
    c,
    [
      [-23, -77],
      [-7, -72],
      [-17, -37],
      [-22, -5],
      [-37, -5],
      [-35, -38]
    ],
    '#111c29',
    '#7b8c9233'
  );
  path(
    c,
    [
      [6, -73],
      [24, -68],
      [27, -39],
      [38, -7],
      [23, -4],
      [9, -34]
    ],
    '#192633',
    '#8b9a9c44'
  );
  path(
    c,
    [
      [-37, -13],
      [-22, -13],
      [-20, 0],
      [-46, 0],
      [-47, -5]
    ],
    '#080e17',
    '#62788055'
  );
  path(
    c,
    [
      [24, -13],
      [37, -15],
      [49, -5],
      [47, 0],
      [21, 0]
    ],
    '#0b111a',
    '#62788055'
  );
  line(
    c,
    [
      [-30, -34],
      [-29, -15]
    ],
    enemy ? '#a48a6755' : '#6eb3b455',
    3
  );
  line(
    c,
    [
      [22, -34],
      [29, -16]
    ],
    '#a9b5b555',
    3
  );
  path(
    c,
    [
      [-24, -131],
      [18, -135],
      [29, -109],
      [24, -78],
      [35, -38],
      [8, -51],
      [-1, -39],
      [-30, -45],
      [-24, -88]
    ],
    gradient(c, -30, -120, 35, -40, [
      [0, enemy ? '#6b5547' : '#305363'],
      [0.5, enemy ? '#3a3435' : '#1d3347'],
      [1, '#111e2c']
    ]),
    '#bac3b23b'
  );
  for (let i = 0; i < 3; i++)
    line(
      c,
      [
        [-17 + i * 16, -75],
        [-22 + i * 19, -46]
      ],
      '#b4c7c22b'
    );
  path(
    c,
    [
      [-24, -123],
      [13, -131],
      [24, -113],
      [-18, -104]
    ],
    enemy ? '#a38559' : '#517c85',
    '#cad4bf55'
  );
  line(
    c,
    [
      [-15, -115],
      [3, -101],
      [17, -113]
    ],
    '#e4d0a16b',
    2
  );
  path(
    c,
    [
      [-25, -85],
      [25, -89],
      [25, -79],
      [-24, -77]
    ],
    '#0a1420',
    '#ac95624d'
  );
  c.fillStyle = '#c5ad78';
  c.fillRect(-3, -88, 9, 10);
  // Flowing sash communicates direction and faction without relying on head dots.
  path(
    c,
    [
      [-19, -127],
      [-32, -119],
      [-58, -127 + flutter],
      [-82, -118 + flutter],
      [-61, -133 + flutter],
      [-34, -135]
    ],
    color + '99'
  );
  // Helmet/hood, neck protection and narrow luminous visor.
  path(
    c,
    [
      [-14, -132],
      [-20, -155],
      [-13, -174],
      [8, -181],
      [24, -167],
      [27, -144],
      [13, -131]
    ],
    enemy ? '#34323a' : '#182a3b',
    '#a6c4c266'
  );
  if (enemy) {
    path(
      c,
      [
        [-14, -169],
        [-20, -184],
        [3, -177],
        [11, -195],
        [19, -174],
        [30, -175],
        [23, -158]
      ],
      '#8d7959',
      '#ccb98966'
    );
    path(
      c,
      [
        [-12, -158],
        [25, -162],
        [22, -143],
        [7, -136],
        [-9, -144]
      ],
      '#4c4b48',
      '#c1b79555'
    );
    line(
      c,
      [
        [3, -158],
        [6, -141]
      ],
      '#111c28',
      3
    );
  } else {
    path(
      c,
      [
        [-16, -158],
        [-8, -170],
        [10, -175],
        [22, -162],
        [8, -163],
        [1, -150]
      ],
      '#42606a'
    );
    path(
      c,
      [
        [-3, -150],
        [24, -155],
        [20, -140],
        [7, -133]
      ],
      '#0b1726'
    );
  }
  line(
    c,
    [
      [7, -156],
      [23, -158]
    ],
    color,
    2.4
  );
  // Rear arm plus front armor plates, with an elbow that follows weapon position.
  line(
    c,
    [
      [-19, -118],
      [-30, -95],
      [-10, -87]
    ],
    '#101a27',
    15
  );
  line(
    c,
    [
      [-20, -119],
      [-29, -96]
    ],
    enemy ? '#6d6050' : '#3f606c',
    10
  );
  const handX = guard ? 27 : attack ? 54 : 43,
    handY = guard ? -115 : windup ? -112 : -101;
  line(
    c,
    [
      [15, -119],
      [29, -103],
      [handX, handY]
    ],
    '#0a1320',
    18
  );
  line(
    c,
    [
      [15, -119],
      [29, -103],
      [handX, handY]
    ],
    enemy ? '#746954' : '#547983',
    11
  );
  ellipse(c, 17, -121, 13, 10, enemy ? '#978464' : '#719598');
  line(
    c,
    [
      [7, -125],
      [24, -125]
    ],
    '#d8d3b275',
    2
  );
  c.save();
  c.translate(handX, handY);
  c.rotate(sword);
  if (empowered) glow(c, 60, 0, 70, '#edb04c44');
  // Forged blade has a dark edge, a light cutting plane, fuller, grip and pommel.
  path(
    c,
    [
      [0, -6],
      [enemy ? 111 : 100, -4],
      [enemy ? 125 : 115, 0],
      [enemy ? 111 : 100, 5],
      [0, 5]
    ],
    '#17303c',
    '#071321',
    2
  );
  path(
    c,
    [
      [0, -4],
      [enemy ? 110 : 99, -3],
      [enemy ? 123 : 113, 0],
      [0, 0]
    ],
    empowered ? '#ffe2a0' : '#d3e0da'
  );
  path(
    c,
    [
      [0, 0],
      [enemy ? 123 : 113, 0],
      [enemy ? 110 : 99, 3],
      [0, 4]
    ],
    '#658b98'
  );
  line(
    c,
    [
      [8, -1],
      [91, -1]
    ],
    '#f2f5dc99'
  );
  path(
    c,
    [
      [-9, -16],
      [-2, -13],
      [1, 13],
      [-5, 17],
      [-10, 5],
      [-13, -8]
    ],
    '#bd9b61',
    '#f4d29366'
  );
  line(
    c,
    [
      [-29, 0],
      [-10, 0]
    ],
    '#121e2a',
    9
  );
  for (let i = 0; i < 4; i++)
    line(
      c,
      [
        [-26 + i * 4, -4],
        [-24 + i * 4, 4]
      ],
      '#8b7d63',
      1
    );
  ellipse(c, -31, 0, 4, 5, '#bc9e65');
  ellipse(c, -15, 0, 7, 6, enemy ? '#61584b' : '#3b5a67');
  c.restore();
  c.restore();
}
