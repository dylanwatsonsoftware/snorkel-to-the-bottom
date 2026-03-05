import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { Boat } from '../entities/Boat';
import { WorldManager } from '../managers/WorldManager';
import { UIManager } from '../managers/UIManager';
import { EffectsManager } from '../managers/EffectsManager';
import { CollectionManager } from '../managers/CollectionManager';
import { WORLD, PLAYER, CAMERA, COMBAT, SCORING, UPGRADES } from '../config/GameConfig';

export class Game extends Phaser.Scene {
    constructor() {
        super('Game');
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
    }

    create() {
        const { width } = this.scale;
        this.physics.world.setBounds(0, 0, Math.max(width, WORLD.MIN_WIDTH), WORLD.DEPTH);

        // Background
        const bgWidth = Math.max(width * 3, 2400);
        this.add.rectangle(width / 2, 0, bgWidth, WORLD.WATERLINE_Y, 0x87ceeb).setOrigin(0.5, 0).setDepth(-2);
        this.add.rectangle(width / 2, WORLD.WATERLINE_Y, bgWidth, WORLD.DEPTH - WORLD.WATERLINE_Y, 0x004488).setOrigin(0.5, 0).setDepth(-1);

        // Entities
        this.boat = new Boat(this, width / 4, 305);
        this.player = new Player(this, width / 4, 265);

        // Managers
        this.effectsManager = new EffectsManager(this);
        this.worldManager = new WorldManager(this);
        this.collectionManager = new CollectionManager(this, this.effectsManager);
        this.uiManager = new UIManager(this);
        this.setupSounds();

        this.worldManager.createGroups();
        this.uiManager.create();
        this.worldManager.generateWorldItems();
        this.worldManager.setupPeriodicSpawning();

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
            if (!e.getData('dying')) this.player.takeDamage();
        }, null, this);

        // Boat collider
        this.physics.add.collider(this.player, this.boat, null, (p, b) => {
            if (p.isDivingInitiated) return false;
            return p.y < b.y - 40 && p.body.velocity.y >= 0;
        }, this);

        // Surface combat
        this.physics.add.overlap(wm.cannonballs, wm.pirateShips, (ball, ship) => this.hitPirateShip(ball, ship), null, this);
        this.physics.add.overlap(this.boat, wm.pirateShips, (boat, ship) => {
            if (!ship.getData('dying')) {
                this.player.takeDamage();
                ship.setData('dying', true);
                this.effectsManager.playDeathAnimation(ship);
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

        const joystickMove = this.uiManager.getMovement();
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
        this.uiManager.update(this.air, this.score, this.money, this.crystals, this.player.y, this.player.health);
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
            this.player.setVisible(true);
            this.uiManager.setActionLabel('FIRE');
            this.soundManager.play('splash');
        }
        this.wasDiving = isDiving;

        // Dive
        if (!isDiving && !this.player.isDivingInitiated) {
            if (this.cursors.down.isDown || moveY > 0) {
                this.gameMode = 'diving';
                this.targetZoom = CAMERA.DIVING_ZOOM;
                this.cameras.main.startFollow(this.player, true, CAMERA.FOLLOW_LERP, CAMERA.FOLLOW_LERP);
                this.uiManager.setActionLabel('SLASH');
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
            if (Phaser.Input.Keyboard.JustDown(this.cursors.space) || this.uiManager.mobileInputs.slash) {
                this.fireCannonball();
            }
        }
        if (isDiving && (Phaser.Input.Keyboard.JustDown(this.cursors.space) || this.uiManager.mobileInputs.slash)) {
            this.player.swingSword();
        }
    }

    handleSwordOverlaps() {
        if (!this.player.isSwinging) return;
        const wm = this.worldManager;

        this.physics.overlap(this.player.sword, wm.pirates, (s, pirate) => {
            if (pirate.getData('dying')) return;
            pirate.setData('dying', true);
            pirate.body.setVelocity(0, 0);
            this.effectsManager.playDeathAnimation(pirate);
            this.score += SCORING.PIRATE_SCORE;
        });
        this.physics.overlap(this.player.sword, wm.swordfishGroup, (s, fish) => {
            if (fish.getData('dying')) return;
            fish.setData('dying', true);
            fish.body.setVelocity(0, 0);
            this.effectsManager.playDeathAnimation(fish);
            this.score += SCORING.SWORDFISH_SCORE;
        });
    }

    fireCannonball() {
        const dir = this.boat.flipX ? -1 : 1;
        const ball = this.worldManager.cannonballs.create(this.boat.x + dir * 40, this.boat.y - 10, 'cannonball');
        ball.body.setAllowGravity(false);
        ball.body.setVelocityX(dir * COMBAT.CANNONBALL_SPEED);
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

    updateLighting() {
        if (!this.lightingOverlay) return;
        const targetAlpha = Math.max(0, Math.min(0.8, (this.player.y - WORLD.WATERLINE_Y) / (WORLD.DEPTH - WORLD.WATERLINE_Y)));
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
