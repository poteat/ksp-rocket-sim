import { createCanvas } from "canvas";
import open from "open";
import { writeFileSync } from "fs";

const radius = 6e5;

const sidelength = 1200;
const zoom = 0.8;

const scale = sidelength / (radius * zoom);

const canvas = createCanvas(sidelength, sidelength);
const ctx = canvas.getContext("2d");

// Draw planet
ctx.strokeStyle = "white";
ctx.beginPath();
ctx.arc(
  sidelength / 2,
  sidelength / 2,
  (sidelength / 2) * zoom,
  0,
  2 * Math.PI
);
ctx.stroke();

const html = `<body style="background-color: #222222"><img src="${canvas.toDataURL()}"/></body>`;

writeFileSync("./render/chart.html", html);
open("./render/chart.html");
