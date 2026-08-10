// Day 1 Recap – Canon
// Corrigez ce fichier.

const power = 42;
let angle = 47;
const wind = Math.round(Math.random()); // créez un vent de -5 à +5

// On initialise le canon avec les réglages de base
window.game.aim({ power: power, angle: angle, wind: wind });

const shots = [
  { power: power, angle: angle } // ajoutez 9 autres tirs avec des variations aléatoires de puissance et d'angle
];


const fireCannon = function (shot) {
  // On corrige ce qu'il faut...
  window.game.fire({
    power: "42",
    angle: shot.angle,
    wind: wind
  });
};

// On a parlé d'un soucis lorsque var et for sont utilisés ensemble, vous pouvez le corriger ici
for (var i = 0; i < shots.length; i++) {
  var shot = shots[i];
  setTimeout(function () {
    fireCannon(shot);
  }, i * 140);
}

// Assurez-vous que les boutons déclenchent les fonctions de tir et de barrage
document.getElementById("btn-fire").addEventListener("click", fireCannon());
document.getElementById("btn-barrage").addEventListener("click", startBarrage());