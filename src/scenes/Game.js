import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { Boat } from '../entities/Boat';
import { WorldManager } from '../managers/WorldManager';
import { EffectsManager } from '../managers/EffectsManager';
import { CollectionManager } from '../managers/CollectionManager';
import { WORLD, PLAYER, CAMERA, COMBAT, SCORING, UPGRADES } from '../config/GameConfig';

export class Game extends Phaser.Scene {
    constructor() {
        super('Game');
    }

    create() {
        // Stop any existing HUD scene from a previous run
        if (this.scene.isActive('HUD')) {
            this.scene.stop('HUD');
        }

        // Reset all state (constructor only runs once, not on restart)
        this.air = PLAYER.MAX_AIR;
        this.score = 0;
        this.money = 0;
        this.crystals = 0;
        this.difficulty = 1;
        this.isGameOver = false;
        this.gameMode = 'surface';
        this.targetZoom = CAMERA.SURFACE_ZOOM;
        this.upgrades = { airCapacity: 0, swimSpeed: 0, swordReach: 0 };
        this.scoreMultiplier = 1;
        this.wasDiving = false;

        const { width } = this.scale;
        this.physics.world.setBounds(0, 0, Math.max(width, WORLD.MIN_WIDTH), WORLD.DEPTH);

        // Background
        const bgWidth = Math.max(width * 3, 2400);
        this.add.rectangle(width / 2, 0, bgWidth, WORLD.WATERLINE_Y, 0x87ceeb).setOrigin(0.5, 0).setDepth(-3);

        // Parallax sky layers (manual positioning — camera can't scroll at 0.7 zoom)
        const cloudPositions = [
            { x: 100, y: 80, s: 1.2 }, { x: 350, y: 50, s: 0.9 },
            { x: 600, y: 90, s: 1.0 }, { x: 900, y: 60, s: 1.3 },
            { x: 1200, y: 75, s: 1.1 }, { x: 1500, y: 45, s: 0.8 },
            { x: 1800, y: 85, s: 1.0 }, { x: 2100, y: 55, s: 1.2 },
        ];
        this.skyLayers = { far: [], near: [] };
        cloudPositions.forEach(({ x, y, s }) => {
            const c = this.add.image(x, y, 'cloud').setScale(s * 1.2).setAlpha(0.3).setDepth(-2);
            c.setData('baseX', x);
            this.skyLayers.far.push(c);
        });
        cloudPositions.forEach(({ x, y, s }, i) => {
            if (i % 2 === 0) return;
            const c = this.add.image(x + 150, y + 30, 'cloud').setScale(s * 0.8).setAlpha(0.6).setDepth(-2);
            c.setData('baseX', x + 150);
            this.skyLayers.near.push(c);
        });

        // Gradient underwater background
        const waterHeight = WORLD.DEPTH - WORLD.WATERLINE_Y;
        if (!this.textures.exists('waterGradient')) {
            const canvas = this.textures.createCanvas('waterGradient', 1, waterHeight);
            const ctx = canvas.getContext();
            const gradient = ctx.createLinearGradient(0, 0, 0, waterHeight);
            gradient.addColorStop(0, '#1a9fcc');
            gradient.addColorStop(0.15, '#0077aa');
            gradient.addColorStop(0.4, '#004488');
            gradient.addColorStop(0.7, '#001a33');
            gradient.addColorStop(1, '#000a14');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, 1, waterHeight);
            canvas.refresh();
        }
        this.add.image(width / 2, WORLD.WATERLINE_Y, 'waterGradient')
            .setOrigin(0.5, 0).setDisplaySize(bgWidth, waterHeight).setDepth(-1);

        // Entities
        this.boat = new Boat(this, width / 4, 305);
        this.player = new Player(this, width / 4, 265);
        this.player.setVisible(false);

        // Managers
        this.effectsManager = new EffectsManager(this);
        this.worldManager = new WorldManager(this);
        this.collectionManager = new CollectionManager(this, this.effectsManager);
        this.setupSounds();

        this.worldManager.createGroups();
        this.worldManager.generateWorldItems();
        this.worldManager.setupPeriodicSpawning();

        // Launch HUD as a parallel scene (its own camera = crisp text, no zoom scaling)
        this.scene.launch('HUD');
        this.hudScene = this.scene.get('HUD');

        this.setupCollisions();

        // Camera
        this.cameras.main.startFollow(this.boat, true, CAMERA.FOLLOW_LERP, CAMERA.FOLLOW_LERP);
        this.cameras.main.setZoom(CAMERA.SURFACE_ZOOM);
        this.cameras.main.setBounds(0, 0, Math.max(width, WORLD.MIN_WIDTH), WORLD.DEPTH);

        this.cursors = this.input.keyboard.createCursorKeys();
        this.time.addEvent({ delay: 1000, callback: () => this.depleteAir(), loop: true });

        this.setupLighting();
    }

    setupCollisions() {
        const wm = this.worldManager;
        const cm = this.collectionManager;

        // Collectibles
        this.physics.add.overlap(this.player, wm.treasures, (p, t) => cm.collectTreasure(p, t), null, this);
        this.physics.add.overlap(this.player, wm.airBubbles, (p, b) => cm.collectAir(p, b), null, this);
        this.physics.add.overlap(this.player, wm.scubaTanks, (p, t) => cm.collectScuba(p, t), null, this);
        this.physics.add.overlap(this.player, wm.mermaids, (p, m) => cm.collectMermaid(p, m), null, this);
        this.physics.add.overlap(this.player, wm.crystalsGroup, (p, c) => cm.collectCrystal(p, c), null, this);

        // Enemy contact damage
        this.physics.add.overlap(this.player, wm.pirates, (p, e) => {
            if (!e.getData('dying')) this.player.takeDamage();
        }, null, this);
        this.physics.add.overlap(this.player, wm.swordfishGroup, (p, e) => {
            if (!e.getData('dying')) this.player.takeDamage(1);
        }, null, this);

        // Boat collider
        this.physics.add.collider(this.player, this.boat, null, (p, b) => {
            if (p.isDivingInitiated) return false;
            return p.y < b.y - 40 && p.body.velocity.y >= 0;
        }, this);

        // Surface combat
        this.physics.add.overlap(wm.cannonballs, wm.pirateShips, (ball, ship) => this.hitPirateShip(ball, ship), null, this);
        this.physics.add.overlap(this.boat, wm.pirateShips, (boat, ship) => {
            if (ship.getData('dying')) return;
            ship.setData('dying', true);
            this.effectsManager.playDeathAnimation(ship);
            if (!this.player.isInvincible) {
                this.player.takeDamage();
                this.tweens.add({
                    targets: this.boat,
                    alpha: 0.2, duration: 100,
                    yoyo: true, repeat: 5,
                    onComplete: () => { this.boat.alpha = 1; }
                });
            }
        }, null, this);
        this.physics.add.overlap(this.boat, wm.surfaceUpgrades, (b, u) => cm.collectUpgrade(b, u), null, this);
    }

    setupLighting() {
        const { width } = this.scale;
        const worldWidth = Math.max(width, WORLD.MIN_WIDTH);

        this.lightingOverlay = this.add.rectangle(worldWidth / 2, 1650, worldWidth * 3, WORLD.DEPTH - WORLD.WATERLINE_Y, 0x000000)
            .setOrigin(0.5, 0.5).setAlpha(0).setDepth(50);

        const maskSize = 300;
        const graphics = this.make.graphics({ add: false });
        const steps = 30;
        for (let i = steps; i >= 0; i--) {
            const r = (maskSize / 2) * (i / steps);
            graphics.fillStyle(0xffffff, 1 - (i / steps));
            graphics.fillCircle(maskSize / 2, maskSize / 2, r);
        }
        graphics.generateTexture('flashlight-mask', maskSize, maskSize);
        graphics.destroy();

        this.flashlightMaskImage = this.add.image(0, 0, 'flashlight-mask').setVisible(false);
        const mask = this.flashlightMaskImage.createBitmapMask();
        mask.invertAlpha = true;
        this.lightingOverlay.setMask(mask);
    }

    update() {
        if (this.isGameOver) return;
        this.difficulty += 0.0001;

        const joystickMove = this.hudScene ? this.hudScene.getMovement() : { x: 0, y: 0 };
        let moveX = joystickMove.x;
        let moveY = joystickMove.y;

        if (this.cursors.left.isDown) moveX = -1;
        else if (this.cursors.right.isDown) moveX = 1;
        if (this.cursors.up.isDown) moveY = -1;
        else if (this.cursors.down.isDown) moveY = 1;

        const isDiving = this.player.y > WORLD.WATERLINE_Y;

        this.handleModeTransitions(isDiving, moveY);
        this.updateCamera();

        const swimSpeed = PLAYER.SWIM_SPEED * (1 + this.upgrades.swimSpeed * UPGRADES.SWIM_BONUS_FACTOR);
        this.player.update(moveX, moveY, swimSpeed, isDiving);
        this.boat.update(isDiving, moveX, PLAYER.BOAT_SPEED);

        if (!isDiving && !this.player.isDivingInitiated) {
            const maxAir = PLAYER.MAX_AIR + this.upgrades.airCapacity * UPGRADES.AIR_BONUS_PER_LEVEL;
            if (this.air < maxAir) this.air = maxAir;
            if (this.player.health < PLAYER.MAX_HEALTH) this.player.health = PLAYER.MAX_HEALTH;
            if (Math.abs(this.player.x - this.boat.x) > 50) {
                this.player.x = this.boat.x;
            }
        }

        this.handleCombatInput(isDiving);
        this.handleSwordOverlaps();
        this.worldManager.update();
        this.updateLighting();
        this.updateParallax();
        if (this.hudScene && this.hudScene.scene.isActive()) {
            this.hudScene.updateHUD(this.air, this.score, this.money, this.crystals, this.player.y, this.player.health);
        }
    }

    handleModeTransitions(isDiving, moveY) {
        // Resurface
        if (this.wasDiving && !isDiving && this.player.isDivingInitiated) {
            this.player.isDivingInitiated = false;
            this.player.setAngle(0);
            this.player.y = 265;
            this.player.x = this.boat.x;
            this.player.body.setVelocity(0, 0);
            this.effectsManager.createSplash(this.player.x, WORLD.WATERLINE_Y);
            this.gameMode = 'surface';
            this.targetZoom = CAMERA.SURFACE_ZOOM;
            this.cameras.main.startFollow(this.boat, true, CAMERA.FOLLOW_LERP, CAMERA.FOLLOW_LERP);
            this.player.setVisible(false);
            this.hudScene.setActionLabel('FIRE');
            this.soundManager.play('splash');
            // Despawn underwater enemies when resurfacing
            this.worldManager.swordfishGroup.clear(true, true);
            this.worldManager.pirates.clear(true, true);
        }
        this.wasDiving = isDiving;

        // Dive
        if (!isDiving && !this.player.isDivingInitiated) {
            if (this.cursors.down.isDown || (moveY > 0 && moveY > Math.abs(moveX))) {
                this.gameMode = 'diving';
                this.targetZoom = CAMERA.DIVING_ZOOM;
                this.cameras.main.startFollow(this.player, true, CAMERA.FOLLOW_LERP, CAMERA.FOLLOW_LERP);
                this.hudScene.setActionLabel('SLASH');
                this.player.setVisible(true);
                this.player.dive(() => {
                    this.effectsManager.createSplash(this.player.x, WORLD.WATERLINE_Y);
                    this.soundManager.play('splash');
                });
            }
        }
    }

    updateCamera() {
        const currentZoom = this.cameras.main.zoom;
        if (Math.abs(currentZoom - this.targetZoom) > 0.01) {
            this.cameras.main.setZoom(Phaser.Math.Linear(currentZoom, this.targetZoom, CAMERA.LERP_SPEED));
        }
    }

    handleCombatInput(isDiving) {
        if (this.gameMode === 'surface' && !isDiving) {
            if (Phaser.Input.Keyboard.JustDown(this.cursors.space) || this.hudScene.consumeSlash()) {
                this.fireCannonball();
            }
        }
        if (isDiving && (Phaser.Input.Keyboard.JustDown(this.cursors.space) || this.hudScene.consumeSlash())) {
            this.player.swingSword();
        }
    }

    handleSwordOverlaps() {
        if (!this.player.isSwinging) return;

        const sx = this.player.sword.x;
        const sy = this.player.sword.y;
        const hitRange = 70 * 70;

        const checkHit = (enemy, score) => {
            if (enemy.getData('dying')) return;
            const dx = enemy.x - sx;
            const dy = enemy.y - sy;
            if (dx * dx + dy * dy < hitRange) {
                enemy.setData('dying', true);
                enemy.body.setVelocity(0, 0);
                this.effectsManager.playDeathAnimation(enemy);
                this.score += score;
            }
        };

        this.worldManager.pirates.getChildren().forEach(p => checkHit(p, SCORING.PIRATE_SCORE));
        this.worldManager.swordfishGroup.getChildren().forEach(f => checkHit(f, SCORING.SWORDFISH_SCORE));
    }

    fireCannonball() {
        const dir = this.boat.flipX ? -1 : 1;
        const ball = this.worldManager.cannonballs.create(this.boat.x + dir * 40, this.boat.y - 8, 'cannonball');
        ball.body.setVelocity(dir * COMBAT.CANNONBALL_SPEED, -20);
        ball.body.setGravityY(25);
        this.time.delayedCall(COMBAT.CANNONBALL_LIFETIME, () => { if (ball.active) ball.destroy(); });
        this.soundManager.play('cannon');
    }

    hitPirateShip(ball, ship) {
        if (ship.getData('dying')) return;
        ball.destroy();
        if (ship.takeDamage()) {
            ship.setData('dying', true);
            ship.body.setVelocity(0, 0);
            this.effectsManager.playDeathAnimation(ship);
            this.score += SCORING.PIRATE_SHIP_SCORE;
            this.collectionManager.dropUpgrade(ship.x, 290);
        }
    }

    updateParallax() {
        const worldCenter = this.physics.world.bounds.width / 2;
        const offset = this.boat.x - worldCenter;
        this.skyLayers.far.forEach(c => { c.x = c.getData('baseX') - offset * 0.15; });
        this.skyLayers.near.forEach(c => { c.x = c.getData('baseX') - offset * 0.4; });
    }

    updateLighting() {
        if (!this.lightingOverlay) return;
        const targetAlpha = Math.max(0, Math.min(0.6, (this.player.y - WORLD.WATERLINE_Y) / (WORLD.DEPTH - WORLD.WATERLINE_Y)));
        this.lightingOverlay.alpha = Phaser.Math.Linear(this.lightingOverlay.alpha, targetAlpha, 0.05);
        if (this.flashlightMaskImage) {
            this.flashlightMaskImage.x = this.player.x;
            this.flashlightMaskImage.y = this.player.y;
        }
    }

    depleteAir() {
        if (this.player.y > WORLD.WATERLINE_Y && !this.isGameOver) {
            this.air -= PLAYER.AIR_DEPLETION;
            if (this.air <= 0) this.gameOver();
        }
    }

    setupSounds() {
        this.soundManager = {
            play: (key) => console.log(`SFX: ${key}`)
        };
    }

    gameOver() {
        if (this.isGameOver) return;
        this.isGameOver = true;
        this.physics.pause();
        this.player.setTint(0xff0000);
        const cam = this.cameras.main;
        const x = cam.worldView.x + cam.width / 2;
        const y = cam.worldView.y + cam.height / 2;
        this.add.text(x, y - 50, 'GAME OVER', { fontSize: '64px', fill: '#ff0000', fontStyle: 'bold' }).setOrigin(0.5);
        this.add.text(x, y + 50, 'RESTART', { fontSize: '32px', fill: '#fff', backgroundColor: '#333', padding: { x: 20, y: 10 } })
            .setOrigin(0.5).setInteractive({ useHandCursor: true }).on('pointerdown', () => this.scene.restart());
        this.input.keyboard.once('keydown-SPACE', () => this.scene.restart());
    }
}
