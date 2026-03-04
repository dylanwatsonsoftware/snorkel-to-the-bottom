import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { Boat } from '../entities/Boat';
import { WorldManager } from '../managers/WorldManager';
import { UIManager } from '../managers/UIManager';

export class Game extends Phaser.Scene {
    constructor() {
        super('Game');
        this.air = 100;
        this.score = 0;
        this.money = 0;
        this.crystals = 0;
        this.difficulty = 1;
        this.isGameOver = false;
    }

    create() {
        const { width, height } = this.scale;
        this.physics.world.setBounds(0, 0, Math.max(width, 800), 3000);

        // Background
        const bgWidth = Math.max(width * 3, 2400);
        this.add.rectangle(width / 2, 0, bgWidth, 300, 0x87ceeb).setOrigin(0.5, 0).setDepth(-2);
        this.add.rectangle(width / 2, 300, bgWidth, 2700, 0x004488).setOrigin(0.5, 0).setDepth(-1);

        // Groups
        this.treasures = this.physics.add.group();
        this.airBubbles = this.physics.add.group();
        this.scubaTanks = this.physics.add.group();
        this.pirates = this.physics.add.group();
        this.mermaids = this.physics.add.group();
        this.crystalsGroup = this.physics.add.group();

        // Entities
        this.boat = new Boat(this, width / 4, 305);
        this.player = new Player(this, width / 4, 265);

        // Managers
        this.worldManager = new WorldManager(this);
        this.uiManager = new UIManager(this);

        // Sound Manager (placeholder for basic SFX)
        this.setupSounds();

        this.uiManager.create();
        this.worldManager.generateWorldItems();
        this.worldManager.setupPeriodicSpawning();

        // Collisions
        this.physics.add.overlap(this.player, this.treasures, this.collectTreasure, null, this);
        this.physics.add.overlap(this.player, this.airBubbles, this.collectAir, null, this);
        this.physics.add.overlap(this.player, this.scubaTanks, this.collectScuba, null, this);
        this.physics.add.overlap(this.player, this.mermaids, this.collectMermaid, null, this);
        this.physics.add.overlap(this.player, this.crystalsGroup, this.collectCrystal, null, this);
        this.physics.add.overlap(this.player, this.pirates, (p, e) => this.player.takeDamage(), null, this);
        this.physics.add.collider(this.player, this.boat, null, (p, b) => {
            // Only solid if player is falling from above and NOT in the middle of a dive
            if (p.isDivingInitiated) return false;
            return p.y < b.y - 40 && p.body.velocity.y >= 0;
        }, this);

        this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
        this.cameras.main.setBounds(0, 0, Math.max(width, 800), 3000);

        this.cursors = this.input.keyboard.createCursorKeys();
        this.time.addEvent({ delay: 1000, callback: () => this.depleteAir(), loop: true });

        // Depth-Based Lighting Overlay
        this.setupLighting();
    }

    setupLighting() {
        const { width } = this.scale;
        const worldWidth = Math.max(width, 800);

        // Create a full-screen black rectangle covering the dive area
        // Starts at y=300 and extends to the bottom
        this.lightingOverlay = this.add.rectangle(worldWidth / 2, 1650, worldWidth, 2700, 0x000000)
            .setOrigin(0.5, 0.5)
            .setAlpha(0)
            .setDepth(50);

        // Flashlight Effect: Create a circle mask
        const graphics = this.make.graphics({ add: false });
        graphics.fillStyle(0xffffff, 1);
        graphics.fillCircle(100, 100, 100); // 100px radius
        graphics.generateTexture('flashlight-mask', 200, 200);

        this.flashlightMaskImage = this.add.image(0, 0, 'flashlight-mask').setVisible(false);
        const mask = this.flashlightMaskImage.createBitmapMask();
        mask.invertAlpha = true; // Make the circle a "hole" in the overlay
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

        const isDiving = this.player.y > 300;

        // Handle Dive Trigger — DOWN arrow or mobile dive button only
        if (!isDiving && !this.player.isDivingInitiated) {
            if (Phaser.Input.Keyboard.JustDown(this.cursors.down) ||
                this.uiManager.mobileInputs.dive) {

                this.player.dive(() => {
                    // Splash effect on water entry
                    this.createSplash(this.player.x, 300);
                });
            }
        }

        this.player.update(moveX, moveY, 200, isDiving);
        this.boat.update(isDiving, moveX, 200);

        if (!isDiving && !this.player.isDivingInitiated) {
            if (this.air < 100) this.air = 100;
            if (this.player.health < 3) this.player.health = 3;
            // Snap player to boat deck if not diving
            // This ensures they don't drift if the boat moves
            if (Math.abs(this.player.x - this.boat.x) > 50) {
                this.player.x = this.boat.x;
            }
        }

        // Sword swing only works once diving
        if (isDiving && (Phaser.Input.Keyboard.JustDown(this.cursors.space) || this.uiManager.mobileInputs.fire)) {
            this.player.swingSword();
        }

        if (this.player.isSwinging) {
            this.physics.overlap(this.player.sword, this.pirates, (s, pirate) => {
                pirate.destroy();
                this.score += 200;
            });
        }

        // Update air bubbles visuals
        this.airBubbles.getChildren().forEach(bubble => {
            const visual = bubble.getData('visual');
            if (visual) {
                visual.setPosition(bubble.x, bubble.y);
                if (bubble.y < 300) {
                    visual.destroy();
                    bubble.destroy();
                }
            }
        });

        // Update depth-based lighting
        this.updateLighting();

        this.uiManager.update(this.air, this.score, this.money, this.crystals, this.player.y, this.player.health);
    }

    updateLighting() {
        if (!this.lightingOverlay) return;

        // target_alpha = Math.min(0.8, (player.y - 300) / 2700)
        const targetAlpha = Math.max(0, Math.min(0.8, (this.player.y - 300) / 2700));

        // Lerp the rectangle's alpha toward target_alpha
        this.lightingOverlay.alpha = Phaser.Math.Linear(this.lightingOverlay.alpha, targetAlpha, 0.05);

        // Update flashlight position
        if (this.flashlightMaskImage) {
            this.flashlightMaskImage.x = this.player.x;
            this.flashlightMaskImage.y = this.player.y;
        }
    }

    depleteAir() {
        if (this.player.y > 300 && !this.isGameOver) {
            this.air -= 2;
            if (this.air <= 0) this.gameOver();
        }
    }

    spawnTreasure() {
        const pos = this.getSafeSpawnPos();
        if (pos) this.treasures.create(pos.x, pos.y, 'treasure').setScale(0.25);
    }

    spawnCrystal(x, y) {
        if (x === undefined) {
            const pos = this.getSafeSpawnPos();
            if (!pos) return;
            x = pos.x; y = pos.y;
        }
        const c = this.crystalsGroup.create(x, y, 'crystal').setScale(0.25);
        c.body.setVelocityX(Phaser.Math.Between(-20, 20));
        c.body.setAllowGravity(false);
    }

    spawnScubaTank() {
        const pos = this.getSafeSpawnPos();
        if (pos) {
            const t = this.scubaTanks.create(pos.x, pos.y, 'scuba').setScale(0.3);
            t.body.setVelocityX(Phaser.Math.Between(-10, 10));
            t.body.setAllowGravity(false);
        }
    }

    spawnAirBubble() {
        const pos = this.getSafeSpawnPos();
        if (!pos) return;
        const b = this.airBubbles.create(pos.x, pos.y, null);
        b.setVisible(false);
        const container = this.add.container(pos.x, pos.y);
        container.add([this.add.circle(0, 0, 12, 0xadd8e6, 0.4), this.add.circle(-4, -4, 4, 0xffffff, 0.6)]);
        b.setData('visual', container);
        b.body.setSize(24, 24).setAllowGravity(false).setVelocityY(-30);
    }

    spawnPirate() {
        const cam = this.cameras.main;
        const x = cam.worldView.right + 200;
        const y = Phaser.Math.Between(Math.max(400, cam.worldView.top), Math.min(2800, cam.worldView.bottom));
        const safeY = (Math.abs(y - this.player.y) < 100) ? y + 200 : y;
        const p = this.pirates.create(x, Math.min(2900, safeY), 'pirate').setScale(0.4);
        // Shrink hitbox vertically by even more (to 30% of height)
        p.body.setSize(p.width * 0.6, p.height * 0.3).setOffset(p.width * 0.2, p.height * 0.35);
        p.body.setVelocityX(-150 * this.difficulty);
    }

    spawnMermaid() {
        const cam = this.cameras.main;
        const x = cam.worldView.right + 200;
        const y = Phaser.Math.Between(Math.max(400, cam.worldView.top), Math.min(2800, cam.worldView.bottom));
        const m = this.mermaids.create(x, y, 'mermaid').setScale(0.3);
        m.body.setVelocityX(-100);
        if (Phaser.Math.Between(0, 1) === 1) this.spawnCrystal(x, y);
    }

    getSafeSpawnPos() {
        let attempts = 0;
        const worldWidth = Math.max(this.scale.width, 800);
        while (attempts < 10) {
            const x = Phaser.Math.Between(50, worldWidth - 50);
            const y = Phaser.Math.Between(400, 2900);
            if (Phaser.Math.Distance.Between(x, y, this.player.x, this.player.y) < 300) { attempts++; continue; }
            if (this.physics.overlapCirc(x, y, 50).length === 0) return { x, y };
            attempts++;
        }
        return null;
    }

    collectTreasure(p, t) {
        t.destroy(); this.money += 200; this.score += 500;
        this.soundManager.play('collect');
    }
    collectAir(p, b) {
        const v = b.getData('visual'); if (v) v.destroy(); b.destroy();
        this.air = Math.min(100, this.air + 5);
        this.soundManager.play('bubble');
    }
    collectScuba(p, t) {
        t.destroy(); this.air = 100; this.score += 100;
        this.soundManager.play('scuba');
    }
    collectMermaid(p, m) {
        m.destroy(); this.crystals += 1; this.money += 100; this.score += 500;
        p.health = Math.min(3, p.health + 1);
        this.soundManager.play('mermaid');
    }
    collectCrystal(p, c) {
        c.destroy(); this.crystals += 1; this.score += 1000;
        this.soundManager.play('crystal');
    }

    setupSounds() {
        // Placeholders for sound effects
        this.soundManager = {
            play: (key) => console.log(`SFX: ${key}`)
        };
    }

    createSplash(x, y) {
        for (let i = 0; i < 8; i++) {
            const circle = this.add.circle(x, y, Phaser.Math.Between(2, 5), 0xffffff, 0.8);
            this.physics.add.existing(circle);
            circle.body.setVelocity(Phaser.Math.Between(-100, 100), Phaser.Math.Between(-50, -150));
            circle.body.setGravityY(300);

            this.tweens.add({
                targets: circle,
                alpha: 0,
                scale: 0.1,
                duration: Phaser.Math.Between(500, 800),
                onComplete: () => circle.destroy()
            });
        }
        if (this.soundManager) this.soundManager.play('splash');
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
