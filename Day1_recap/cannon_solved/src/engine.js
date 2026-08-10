const WORLD_WIDTH = 960;
const WORLD_HEIGHT = 540;
const GROUND_Y = 520;
const GROUND_HEIGHT = 40;
const REFERENCE_ANGLE = 48;
const CANNON_PIVOT_X = 124;
const CANNON_PIVOT_Y = 453;
const BARREL_LENGTH = 52;
const PROJECTILE_RADIUS = 11;
const SPEED_FACTOR = 0.3;
const WIND_FORCE = 0.00001;
const AIM_LEAD_TIME = 100;

let activeScene = null;
let pendingAim = null;

function clamp(value, minimum, maximum) {
  return Math.min(Math.max(value, minimum), maximum);
}

function readConfig(config) {
  if (!config || typeof config !== "object") {
    return null;
  }

  const { power, angle, wind } = config;

  if (![power, angle, wind].every((value) => (
    typeof value === "number" && Number.isFinite(value)
  ))) {
    return null;
  }

  return {
    power: clamp(power, 0, 100),
    angle: clamp(angle, 0, 90),
    wind: clamp(wind, -10, 10)
  };
}

class CannonScene extends Phaser.Scene {
  constructor() {
    super("cannon");
    this.projectiles = new Map();
    this.hitTimer = null;
    this.cannonDestroyed = false;
  }

  create() {
    this.createLandscape();
    this.createCannon();
    this.createTarget();
    this.createProjectileTexture();

    this.hitText = this.add.text(WORLD_WIDTH / 2, 190, "TOUCHÉ !", {
      color: "#fef08a",
      fontFamily: "system-ui, sans-serif",
      fontSize: "64px",
      fontStyle: "bold",
      stroke: "#7c2d12",
      strokeThickness: 8
    }).setOrigin(0.5).setDepth(20).setVisible(false);

    this.matter.world.on("collisionstart", this.handleCollision, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.matter.world.off("collisionstart", this.handleCollision, this);
      if (activeScene === this) {
        activeScene = null;
      }
    });

    activeScene = this;
    if (pendingAim) {
      this.aim(pendingAim);
    }
  }

  createLandscape() {
    this.add.rectangle(WORLD_WIDTH / 2, GROUND_Y, WORLD_WIDTH, GROUND_HEIGHT, 0x334155);
    this.groundBody = this.matter.add.rectangle(
      WORLD_WIDTH / 2,
      GROUND_Y,
      WORLD_WIDTH,
      GROUND_HEIGHT,
      { isStatic: true, label: "sol" }
    );
  }

  createCannon() {
    const leftWheel = this.add.circle(72, 487, 19, 0x1e293b)
      .setStrokeStyle(4, 0x94a3b8)
      .setDepth(1);
    const rightWheel = this.add.circle(124, 487, 19, 0x1e293b)
      .setStrokeStyle(4, 0x94a3b8)
      .setDepth(1);
    const carriage = this.add.rectangle(98, 462, 92, 42, 0x475569)
      .setStrokeStyle(3, 0x0f172a)
      .setDepth(2);
    this.cannonBarrel = this.add.rectangle(
      CANNON_PIVOT_X,
      CANNON_PIVOT_Y,
      BARREL_LENGTH,
      18,
      0x64748b
    ).setOrigin(0, 0.5).setStrokeStyle(3, 0x0f172a).setDepth(3);
    this.aimCannon(REFERENCE_ANGLE);
    const breech = this.add.circle(CANNON_PIVOT_X, CANNON_PIVOT_Y, 11, 0x334155)
      .setStrokeStyle(3, 0x0f172a)
      .setDepth(4);

    this.cannonParts = [leftWheel, rightWheel, carriage, this.cannonBarrel, breech];
    this.cannonBody = this.matter.add.rectangle(98, 462, 92, 42, {
      isStatic: true,
      isSensor: true,
      label: "canon"
    });
  }

  aimCannon(angle) {
    const radians = Phaser.Math.DegToRad(angle);
    this.cannonBarrel.setRotation(-radians);

    return {
      radians,
      x: CANNON_PIVOT_X + Math.cos(radians) * BARREL_LENGTH,
      y: CANNON_PIVOT_Y - Math.sin(radians) * BARREL_LENGTH
    };
  }

  aim(config) {
    const shot = readConfig(config);
    if (!shot) {
      return;
    }

    this.currentShot = shot;
    this.currentMuzzle = this.aimCannon(shot.angle);
    this.updateShotLabels(shot);
  }

  createTarget() {
    this.add.rectangle(820, 442, 16, 116, 0x92400e).setStrokeStyle(2, 0x451a03);
    this.matter.add.rectangle(820, 442, 16, 116, {
      isStatic: true,
      label: "poteau"
    });

    this.add.circle(820, 395, 30, 0xf8fafc).setStrokeStyle(4, 0x7f1d1d);
    this.add.circle(820, 395, 20, 0xdc2626);
    this.add.circle(820, 395, 8, 0xfef08a);
    this.targetBody = this.matter.add.circle(820, 395, 30, {
      isStatic: true,
      isSensor: true,
      label: "cible"
    });
  }

  createProjectileTexture() {
    const graphics = this.make.graphics({ add: false });
    graphics.fillStyle(0x111827, 1);
    graphics.fillCircle(PROJECTILE_RADIUS, PROJECTILE_RADIUS, PROJECTILE_RADIUS);
    graphics.lineStyle(2, 0x94a3b8, 1);
    graphics.strokeCircle(PROJECTILE_RADIUS, PROJECTILE_RADIUS, PROJECTILE_RADIUS - 1);
    graphics.generateTexture("boulet", PROJECTILE_RADIUS * 2, PROJECTILE_RADIUS * 2);
    graphics.destroy();
  }

  fire(config) {
    if (this.cannonDestroyed) {
      return;
    }

    const shot = readConfig(config);
    if (!shot) {
      return;
    }

    const angleChanged = !this.currentShot || this.currentShot.angle !== shot.angle;
    const configChanged = (
      !this.currentShot ||
      this.currentShot.power !== shot.power ||
      this.currentShot.angle !== shot.angle ||
      this.currentShot.wind !== shot.wind
    );

    if (configChanged) {
      this.aim(shot);
    }

    const aim = { ...this.currentMuzzle };
    if (angleChanged) {
      this.time.delayedCall(AIM_LEAD_TIME, () => this.launch(shot, aim));
      return;
    }

    this.launch(shot, aim);
  }

  launch(shot, aim) {
    if (this.cannonDestroyed) {
      return;
    }

    const projectile = this.matter.add.image(
      aim.x,
      aim.y,
      "boulet",
      undefined,
      {
        shape: { type: "circle", radius: PROJECTILE_RADIUS },
        label: "projectile",
        friction: 0,
        frictionAir: 0,
        restitution: 0,
        collisionFilter: { group: -1 }
      }
    ).setDepth(5);

    const speed = shot.power * SPEED_FACTOR;
    projectile.setVelocity(
      Math.cos(aim.radians) * speed,
      -Math.sin(aim.radians) * speed
    );

    this.projectiles.set(projectile.body.id, {
      object: projectile,
      wind: shot.wind
    });
  }

  updateShotLabels(shot) {
    const values = {
      "power-value": String(shot.power),
      "angle-value": `${shot.angle}°`,
      "wind-value": shot.wind > 0 ? `+${shot.wind}` : String(shot.wind)
    };

    for (const [id, value] of Object.entries(values)) {
      const output = document.getElementById(id);
      if (output && output.textContent !== value) {
        output.textContent = value;
      }
    }
  }

  update() {
    for (const projectile of this.projectiles.values()) {
      const gameObject = projectile.object;

      gameObject.applyForce({
        x: projectile.wind * WIND_FORCE,
        y: 0
      });

      if (
        gameObject.x < -80 ||
        gameObject.x > WORLD_WIDTH + 80 ||
        gameObject.y < -200 ||
        gameObject.y > WORLD_HEIGHT + 80
      ) {
        this.destroyProjectile(gameObject);
      }
    }
  }

  handleCollision(event) {
    for (const pair of event.pairs) {
      this.handlePair(pair.bodyA, pair.bodyB);
      this.handlePair(pair.bodyB, pair.bodyA);
    }
  }

  handlePair(projectileBody, otherBody) {
    const projectile = this.projectiles.get(projectileBody.id);
    if (!projectile) {
      return;
    }

    if (otherBody === this.targetBody) {
      this.showHit();
      this.destroyProjectile(projectile.object);
      return;
    }

    if (otherBody === this.cannonBody) {
      this.destroyProjectile(projectile.object);
      this.explodeCannon();
      return;
    }

    if (otherBody === this.groundBody) {
      this.destroyProjectile(projectile.object);
    }
  }

  destroyProjectile(projectile) {
    if (!projectile.body || !this.projectiles.has(projectile.body.id)) {
      return;
    }

    this.projectiles.delete(projectile.body.id);
    projectile.destroy();
  }

  explodeCannon() {
    if (this.cannonDestroyed) {
      return;
    }

    this.cannonDestroyed = true;
    this.cameras.main.shake(450, 0.025);
    this.cameras.main.flash(180, 255, 130, 30);
    this.cannonParts.forEach((part) => part.setVisible(false));

    const blast = this.add.circle(CANNON_PIVOT_X, CANNON_PIVOT_Y, 18, 0xf97316)
      .setDepth(30);
    const flash = this.add.circle(CANNON_PIVOT_X, CANNON_PIVOT_Y, 9, 0xfef08a)
      .setDepth(31);
    const boom = this.add.text(CANNON_PIVOT_X + 20, CANNON_PIVOT_Y - 55, "BOUM !", {
      color: "#fef08a",
      fontFamily: "system-ui, sans-serif",
      fontSize: "34px",
      fontStyle: "bold",
      stroke: "#7c2d12",
      strokeThickness: 6
    }).setOrigin(0.5).setDepth(32);

    this.tweens.add({
      targets: blast,
      scale: 4,
      alpha: 0,
      duration: 500,
      ease: "Cubic.Out",
      onComplete: () => blast.destroy()
    });
    this.tweens.add({
      targets: flash,
      scale: 5,
      alpha: 0,
      duration: 320,
      ease: "Quad.Out",
      onComplete: () => flash.destroy()
    });
    this.tweens.add({
      targets: boom,
      y: boom.y - 30,
      alpha: 0,
      delay: 120,
      duration: 650,
      ease: "Cubic.Out",
      onComplete: () => boom.destroy()
    });

    for (let index = 0; index < 8; index += 1) {
      const direction = (Math.PI * 2 * index) / 8;
      const distance = 55 + (index % 3) * 12;
      const fragment = this.add.rectangle(
        CANNON_PIVOT_X,
        CANNON_PIVOT_Y,
        10,
        6,
        index % 2 === 0 ? 0x475569 : 0x94a3b8
      ).setDepth(29).setRotation(direction);

      this.tweens.add({
        targets: fragment,
        x: CANNON_PIVOT_X + Math.cos(direction) * distance,
        y: CANNON_PIVOT_Y + Math.sin(direction) * distance - 24,
        rotation: direction + Math.PI,
        alpha: 0,
        duration: 650,
        ease: "Cubic.Out",
        onComplete: () => fragment.destroy()
      });
    }
  }

  showHit() {
    this.hitText.setVisible(true);

    if (this.hitTimer) {
      this.hitTimer.remove(false);
    }

    this.hitTimer = this.time.delayedCall(1500, () => {
      this.hitText.setVisible(false);
      this.hitTimer = null;
    });
  }
}

new Phaser.Game({
  type: Phaser.AUTO,
  parent: "game-container",
  width: WORLD_WIDTH,
  height: WORLD_HEIGHT,
  backgroundColor: "#263442",
  physics: {
    default: "matter",
    matter: {
      gravity: { y: 1 },
      debug: false
    }
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  scene: CannonScene
});

window.game = Object.freeze({
  aim(config) {
    const shot = readConfig(config);
    if (!shot) {
      return;
    }

    pendingAim = shot;
    if (activeScene) {
      activeScene.aim(shot);
    }
  },
  fire(config) {
    if (activeScene) {
      activeScene.fire(config);
    }
  }
});
