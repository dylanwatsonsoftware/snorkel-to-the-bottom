import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { Boat } from '../entities/Boat';
import { Swordfish } from '../entities/Swordfish';
import { PirateShip } from '../entities/PirateShip';
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
        this.gameMode = 'surface'; // 'surface' or 'diving'
        this.targetZoom = 0.7;
        this.upgrades = { airCapacity: 0, swimSpeed: 0, swordReach: 0 };
        this.scoreMultiplier = 1;
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
        this.swordfishGroup = this.physics.add.group();
        this.pirateShips = this.physics.add.group();
        this.cannonballs = this.physics.add.group();
        this.surfaceUpgrades = this.physics.add.group();

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
        this.physics.add.overlap(this.player, this.pirates, (p, e) => {
            if (!e.getData('dying')) this.player.takeDamage();
        }, null, this);
        this.physics.add.overlap(this.player, this.swordfishGroup, (p, e) => {
            if (!e.getData('dying')) this.player.takeDamage();
        }, null, this);
        this.physics.add.collider(this.player, this.boat, null, (p, b) => {
            if (p.isDivingInitiated) return false;
            return p.y < b.y - 40 && p.body.velocity.y >= 0;
        }, this);

        // Surface combat collisions
        this.physics.add.overlap(this.cannonballs, this.pirateShips, this.hitPirateShip, null, this);
        this.physics.add.overlap(this.boat, this.pirateShips, (boat, ship) => {
            if (!ship.getData('dying')) {
                this.player.takeDamage();
                ship.setData('dying', true);
                this.playDeathAnimation(ship);
            }
        }, null, this);
        this.physics.add.overlap(this.boat, this.surfaceUpgrades, this.collectUpgrade, null, this);

        // Camera starts in surface mode following boat
        this.cameras.main.startFollow(this.boat, true, 0.1, 0.1);
        this.cameras.main.setZoom(0.7);
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

        // Resurface detection: player swam back up above the waterline
        if (this.wasDiving && !isDiving && this.player.isDivingInitiated) {
            this.player.isDivingInitiated = false;
            this.player.setAngle(0);
            this.player.y = 265;
            this.player.x = this.boat.x;
            this.player.body.setVelocity(0, 0);
            this.createSplash(this.player.x, 300);
            // Switch to surface mode
            this.gameMode = 'surface';
            this.targetZoom = 0.7;
            this.cameras.main.startFollow(this.boat, true, 0.1, 0.1);
            this.player.setVisible(true);
        }
        this.wasDiving = isDiving;

        // Handle Dive Trigger
        if (!isDiving && !this.player.isDivingInitiated) {
            if (this.cursors.down.isDown || moveY > 0) {
                this.gameMode = 'diving';
                this.targetZoom = 1.0;
                this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
                this.player.dive(() => {
                    this.createSplash(this.player.x, 300);
                });
            }
        }

        // Smooth camera zoom
        const currentZoom = this.cameras.main.zoom;
        if (Math.abs(currentZoom - this.targetZoom) > 0.01) {
            this.cameras.main.setZoom(Phaser.Math.Linear(currentZoom, this.targetZoom, 0.05));
        }

        const swimSpeed = 200 * (1 + this.upgrades.swimSpeed * 0.15);
        this.player.update(moveX, moveY, swimSpeed, isDiving);
        this.boat.update(isDiving, moveX, 200);

        if (!isDiving && !this.player.isDivingInitiated) {
            const maxAir = 100 + this.upgrades.airCapacity * 10;
            if (this.air < maxAir) this.air = maxAir;
            if (this.player.health < 3) this.player.health = 3;
            if (Math.abs(this.player.x - this.boat.x) > 50) {
                this.player.x = this.boat.x;
            }
        }

        // Surface mode: slash fires cannonball
        if (this.gameMode === 'surface' && !isDiving) {
            if (Phaser.Input.Keyboard.JustDown(this.cursors.space) || this.uiManager.mobileInputs.slash) {
                this.fireCannonball();
            }
        }

        // Diving mode: slash swings sword
        if (isDiving && (Phaser.Input.Keyboard.JustDown(this.cursors.space) || this.uiManager.mobileInputs.slash)) {
            this.player.swingSword();
        }

        // Update pirate ships
        this.pirateShips.getChildren().forEach(ship => {
            if (ship.getData('dying')) return;
            // Sail toward the boat
            const dx = this.boat.x - ship.x;
            const speed = 60 * this.difficulty;
            ship.body.setVelocityX(dx > 0 ? speed : -speed);
            ship.setFlipX(dx < 0);
        });

        // Clean up off-screen cannonballs
        this.cannonballs.getChildren().forEach(ball => {
            if (ball.x < -100 || ball.x > this.physics.world.bounds.width + 100) {
                ball.destroy();
            }
        });

        if (this.player.isSwinging) {
            this.physics.overlap(this.player.sword, this.pirates, (s, pirate) => {
                if (pirate.getData('dying')) return;
                pirate.setData('dying', true);
                pirate.body.setVelocity(0, 0);
                this.playDeathAnimation(pirate);
                this.score += 200;
            });
            this.physics.overlap(this.player.sword, this.swordfishGroup, (s, fish) => {
                if (fish.getData('dying')) return;
                fish.setData('dying', true);
                fish.body.setVelocity(0, 0);
                this.playDeathAnimation(fish);
                this.score += 300;
            });
        }

        // Update swordfish tracking
        this.swordfishGroup.getChildren().forEach(fish => {
            if (fish.update) fish.update();
        });

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
        if (pos) {
            const t = this.treasures.create(pos.x, pos.y, 'treasure').setScale(0.25);
            t.body.setSize(t.width * 0.4, t.height * 0.4);
            t.body.setOffset(t.width * 0.3, t.height * 0.3);
        }
    }

    spawnCrystal(x, y) {
        if (x === undefined) {
            const pos = this.getSafeSpawnPos();
            if (!pos) return;
            x = pos.x; y = pos.y;
        }
        const c = this.crystalsGroup.create(x, y, 'crystal').setScale(0.25);
        c.body.setSize(c.width * 0.4, c.height * 0.4);
        c.body.setOffset(c.width * 0.3, c.height * 0.3);
        c.body.setVelocityX(Phaser.Math.Between(-20, 20));
        c.body.setAllowGravity(false);
    }

    spawnScubaTank() {
        const pos = this.getSafeSpawnPos();
        if (pos) {
            const t = this.scubaTanks.create(pos.x, pos.y, 'scuba').setScale(0.3);
            t.body.setSize(t.width * 0.4, t.height * 0.4);
            t.body.setOffset(t.width * 0.3, t.height * 0.3);
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
        p.body.setSize(p.width * 0.6, p.height * 0.3).setOffset(p.width * 0.2, p.height * 0.35);
        p.body.setVelocityX(-150 * this.difficulty);
    }

    spawnSwordfish() {
        if (this.player.y <= 300) return; // Only spawn while diving
        const cam = this.cameras.main;
        const side = Phaser.Math.Between(0, 1);
        const x = side === 0 ? cam.worldView.left - 100 : cam.worldView.right + 100;
        const y = Phaser.Math.Between(Math.max(400, cam.worldView.top), Math.min(2800, cam.worldView.bottom));
        const fish = new Swordfish(this, x, y);
        this.swordfishGroup.add(fish);
    }

    spawnMermaid() {
        const cam = this.cameras.main;
        const x = cam.worldView.right + 200;
        const y = Phaser.Math.Between(Math.max(400, cam.worldView.top), Math.min(2800, cam.worldView.bottom));
        const m = this.mermaids.create(x, y, 'mermaid').setScale(0.3);
        m.body.setSize(m.width * 0.5, m.height * 0.5);
        m.body.setOffset(m.width * 0.25, m.height * 0.25);
        m.body.setVelocityX(-100);
        if (Phaser.Math.Between(0, 1) === 1) this.spawnCrystal(x, y);
    }

    fireCannonball() {
        const dir = this.boat.flipX ? -1 : 1;
        const ball = this.cannonballs.create(this.boat.x + dir * 40, this.boat.y - 10, 'cannonball');
        ball.body.setAllowGravity(false);
        ball.body.setVelocityX(dir * 400);
        this.time.delayedCall(3000, () => { if (ball.active) ball.destroy(); });
        this.soundManager.play('cannon');
    }

    hitPirateShip(ball, ship) {
        if (ship.getData('dying')) return;
        ball.destroy();
        if (ship.takeDamage()) {
            ship.setData('dying', true);
            ship.body.setVelocity(0, 0);
            this.playDeathAnimation(ship);
            this.score += 500;
            this.dropUpgrade(ship.x, 290);
        }
    }

    spawnPirateShip() {
        if (this.gameMode !== 'surface') return;
        const cam = this.cameras.main;
        const side = Phaser.Math.Between(0, 1);
        const x = side === 0 ? cam.worldView.left - 100 : cam.worldView.right + 100;
        const ship = new PirateShip(this, x, 300);
        this.pirateShips.add(ship);
    }

    dropUpgrade(x, y) {
        const types = [
            { key: 'airCapacity', label: '+AIR', color: 0x00ccff, permanent: true },
            { key: 'swimSpeed', label: '+SPD', color: 0x00ff88, permanent: true },
            { key: 'swordReach', label: '+SWD', color: 0xff8800, permanent: true },
            { key: 'doubleScore', label: '2xSCR', color: 0xffff00, permanent: false },
            { key: 'invincible', label: 'SHIELD', color: 0xff00ff, permanent: false },
            { key: 'speedBurst', label: 'RUSH', color: 0x00ffff, permanent: false },
        ];
        const type = Phaser.Math.RND.pick(types);
        const u = this.surfaceUpgrades.create(x, y, 'upgrade').setScale(1);
        u.body.setAllowGravity(false);
        u.setData('upgradeType', type);

        // Label
        const label = this.add.text(x, y - 16, type.label, {
            fontSize: '10px', fill: '#fff', fontStyle: 'bold', stroke: '#000', strokeThickness: 2
        }).setOrigin(0.5).setDepth(u.depth + 1);
        u.setData('label', label);

        // Bob on the water
        this.tweens.add({
            targets: [u, label],
            y: '-=6',
            duration: 600,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.inOut'
        });

        // Tint
        u.setTint(type.color);

        // Despawn after 15s
        this.time.delayedCall(15000, () => {
            if (u.active) { const l = u.getData('label'); if (l) l.destroy(); u.destroy(); }
        });
    }

    collectUpgrade(boat, u) {
        if (u.getData('collected')) return;
        u.setData('collected', true);
        const type = u.getData('upgradeType');
        const label = u.getData('label');
        if (label) label.destroy();

        if (type.permanent) {
            if (this.upgrades[type.key] < 3) {
                this.upgrades[type.key]++;
            }
        } else {
            // Temporary power-ups (30s)
            if (type.key === 'doubleScore') {
                this.scoreMultiplier = 2;
                this.time.delayedCall(30000, () => { this.scoreMultiplier = 1; });
            } else if (type.key === 'invincible') {
                this.player.isInvincible = true;
                this.time.delayedCall(30000, () => { this.player.isInvincible = false; });
            } else if (type.key === 'speedBurst') {
                this.upgrades.swimSpeed += 2;
                this.time.delayedCall(30000, () => { this.upgrades.swimSpeed = Math.max(0, this.upgrades.swimSpeed - 2); });
            }
        }

        // Show floating text
        const msg = this.add.text(u.x, u.y - 20, type.label, {
            fontSize: '16px', fill: '#ffff00', fontStyle: 'bold', stroke: '#000', strokeThickness: 3
        }).setOrigin(0.5).setDepth(200);
        this.tweens.add({
            targets: msg,
            y: msg.y - 40,
            alpha: 0,
            duration: 1000,
            onComplete: () => msg.destroy()
        });

        u.destroy();
        this.soundManager.play('upgrade');
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

    playCollectAnimation(item) {
        if (item.body) item.body.enable = false;
        this.tweens.add({
            targets: item,
            scaleX: { value: 0, duration: 150, yoyo: true, repeat: 2 },
            scale: { value: 0, duration: 600 },
            y: item.y - 30,
            alpha: { value: 0, duration: 600, delay: 300 },
            onComplete: () => item.destroy()
        });
    }

    collectTreasure(p, t) {
        if (t.getData('collected')) return;
        t.setData('collected', true);
        this.playCollectAnimation(t);
        this.money += 200; this.score += 500;
        this.soundManager.play('collect');
    }
    collectAir(p, b) {
        if (b.getData('collected')) return;
        b.setData('collected', true);
        const v = b.getData('visual'); if (v) v.destroy(); b.destroy();
        this.air = Math.min(100, this.air + 5);
        this.soundManager.play('bubble');
    }
    collectScuba(p, t) {
        if (t.getData('collected')) return;
        t.setData('collected', true);
        this.playCollectAnimation(t);
        this.air = 100; this.score += 100;
        this.soundManager.play('scuba');
    }
    collectMermaid(p, m) {
        if (m.getData('collected')) return;
        m.setData('collected', true);
        this.playCollectAnimation(m);
        this.crystals += 1; this.money += 100; this.score += 500;
        p.health = Math.min(3, p.health + 1);
        this.soundManager.play('mermaid');
    }
    collectCrystal(p, c) {
        if (c.getData('collected')) return;
        c.setData('collected', true);
        this.playCollectAnimation(c);
        this.crystals += 1; this.score += 1000;
        this.soundManager.play('crystal');
    }

    setupSounds() {
        // Placeholders for sound effects
        this.soundManager = {
            play: (key) => console.log(`SFX: ${key}`)
        };
    }

    playDeathAnimation(enemy) {
        // Spawn burst particles
        for (let i = 0; i < 6; i++) {
            const p = this.add.circle(enemy.x, enemy.y, Phaser.Math.Between(3, 6),
                Phaser.Math.RND.pick([0xff4400, 0xff8800, 0xffcc00]), 0.9);
            p.setDepth(enemy.depth + 1);
            this.tweens.add({
                targets: p,
                x: p.x + Phaser.Math.Between(-60, 60),
                y: p.y + Phaser.Math.Between(-60, 60),
                alpha: 0,
                scale: 0.1,
                duration: Phaser.Math.Between(300, 500),
                onComplete: () => p.destroy()
            });
        }

        // Flash white, spin, shrink, fade
        enemy.setTint(0xffffff);
        this.tweens.add({
            targets: enemy,
            angle: 360,
            scaleX: 0,
            scaleY: 0,
            alpha: 0,
            duration: 500,
            ease: 'Power2',
            onComplete: () => enemy.destroy()
        });
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
