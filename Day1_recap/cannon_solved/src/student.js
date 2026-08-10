// Day 1 Recap – Canon (version corrigée)

const power = 42;
const angle = 47;
const wind = Math.round(Math.random() * 10) - 5;

// Le canon adopte les réglages de base
window.game.aim({ power, angle, wind });

// Tableau de configurations de tir
const shots = [];

for (let i = 0; i < 10; i++) {
  const powerOffset = Math.floor(Math.random() * 9) - 4; // -4 → +4
  const angleOffset = Math.floor(Math.random() * 9) - 4;

  shots.push({
    power: power + powerOffset,
    angle: angle + angleOffset
  });
}

function fireCannon(shot) {
  window.game.fire({
    power: shot.power,
    angle: shot.angle,
    wind: wind
  });
}

function startBarrage() {
  for (let i = 0; i < shots.length; i++) {
    setTimeout(() => fireCannon(shots[i]), i * 140);
  }
}

document.getElementById("btn-fire").addEventListener("click", () => fireCannon({ power, angle }));
document.getElementById("btn-barrage").addEventListener("click", () => startBarrage());