import Phaser from 'phaser';

export class Game extends Phaser.Scene {
    constructor() {
        super('Game');
        this.player = null;
        this.boat = null;
        this.cursors = null;
        this.air = 100;
        this.score = 0;
        this.money = 0;
        this.crystals = 0;
        this.isDiving = false;
        this.isGameOver = false;
        this.airText = null;
        this.scoreText = null;
        this.moneyText = null;
        this.crystalsText = null;
        this.lastShotTime = 0;
        this.difficulty = 1;
        this.isSwinging = false;
        this.joystick = { base: null, thumb: null, active: false, x: 0, y: 0, distance: 0, angle: 0 };
    }

    create() {
        const { width, height } = this.scale;

        // World bounds for deep diving
        this.physics.world.setBounds(0, 0, Math.max(width, 800), 3000);

        // Background
        // Sky depth: 20% of screen or 300px
        const skyHeight = 300;
        // Make background significantly wider than screen to prevent edges
        const bgWidth = Math.max(width * 3, 2400);
        this.add.rectangle(width / 2, 0, bgWidth, skyHeight, 0x87ceeb).setOrigin(0.5, 0).setDepth(-2);
        // Water
        this.add.rectangle(width / 2, skyHeight, bgWidth, 3000 - skyHeight, 0x004488).setOrigin(0.5, 0).setDepth(-1);

        // Boat
        this.boat = this.physics.add.sprite(width / 4, 280, 'boat');
        this.boat.setScale(0.5);
        this.boat.body.setAllowGravity(false);
        this.boat.body.setImmovable(true);

        // Player (Pirate Snorkeller)
        this.player = this.physics.add.sprite(width / 4, 220, 'snorkeller');
        this.player.setScale(0.35);
        this.player.body.setCollideWorldBounds(true);

        // Camera follow
        this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
        this.cameras.main.setBounds(0, 0, Math.max(width, 800), 3000);

        // Boat and Player Interaction
        this.boatCollider = this.physics.add.collider(this.player, this.boat);

        // Controls
        this.cursors = this.input.keyboard.createCursorKeys();

        // UI - Fix to camera
        const uiStyle = { fontSize: '20px', fill: '#fff', fontStyle: 'bold', stroke: '#000', strokeThickness: 3 };
        this.airText = this.add.text(16, 16, 'Air: 100%', uiStyle).setScrollFactor(0).setDepth(100);
        this.scoreText = this.add.text(16, 44, 'Score: 0', uiStyle).setScrollFactor(0).setDepth(100);
        this.moneyText = this.add.text(16, 72, 'Money: $0', uiStyle).setScrollFactor(0).setDepth(100);
        this.crystalsText = this.add.text(16, 100, 'Crystals: 0', uiStyle).setScrollFactor(0).setDepth(100);
        this.depthText = this.add.text(16, 128, 'Depth: 0m', uiStyle).setScrollFactor(0).setDepth(100);

        // Sword "Avatar" - Using a container for a better look
        this.sword = this.add.container(0, 0).setAlpha(0).setDepth(10);
        const blade = this.add.rectangle(10, 0, 40, 6, 0xcccccc).setOrigin(0, 0.5);
        const hiltVertical = this.add.rectangle(10, 0, 4, 16, 0x8b4513).setOrigin(0.5, 0.5);
        const hiltHorizontal = this.add.rectangle(5, 0, 10, 4, 0x8b4513).setOrigin(0.5, 0.5);
        this.sword.add([blade, hiltVertical, hiltHorizontal]);

        this.physics.add.existing(this.sword);
        this.sword.body.setSize(40, 10);
        this.sword.body.setAllowGravity(false);
        this.sword.body.setImmovable(true);

        // Groups
        this.treasures = this.physics.add.group();
        this.airBubbles = this.physics.add.group();
        this.scubaTanks = this.physics.add.group();
        this.pirates = this.physics.add.group();
        this.mermaids = this.physics.add.group();
        this.crystalsGroup = this.physics.add.group();

        // Mobile Controls
        this.setupMobileControls();

        // Initial World Generation
        this.generateWorldItems();

        // Spawn events (only for consumables and mobile entities)
        this.time.addEvent({ delay: 5000, callback: this.spawnAirBubble, callbackScope: this, loop: true });
        this.time.addEvent({ delay: 7000, callback: this.spawnPirate, callbackScope: this, loop: true });
        this.time.addEvent({ delay: 15000, callback: this.spawnMermaid, callbackScope: this, loop: true });

        // Collisions
        this.physics.add.overlap(this.player, this.treasures, this.collectTreasure, null, this);
        this.physics.add.overlap(this.player, this.airBubbles, this.collectAir, null, this);
        this.physics.add.overlap(this.player, this.scubaTanks, this.collectScuba, null, this);
        this.physics.add.overlap(this.player, this.mermaids, this.collectMermaid, null, this);
        this.physics.add.overlap(this.player, this.crystalsGroup, this.collectCrystal, null, this);
        this.physics.add.collider(this.player, this.pirates, this.hitByEnemy, null, this);

        // Timer for air depletion
        this.time.addEvent({ delay: 1000, callback: this.depleteAir, callbackScope: this, loop: true });
    }

    update() {
        if (this.isGameOver) return;

        const speed = 200;

        // Difficulty increases over time
        this.difficulty += 0.0001;

        // Combine Keyboard and Mobile Input
        let moveX = 0;
        let moveY = 0;

        // Keyboard
        if (this.cursors.left.isDown) moveX = -1;
        else if (this.cursors.right.isDown) moveX = 1;

        if (this.cursors.up.isDown) moveY = -1;
        else if (this.cursors.down.isDown) moveY = 1;

        // Joystick (Mobile)
        if (this.joystick.active) {
            moveX = Math.cos(this.joystick.angle) * (this.joystick.distance / 50);
            moveY = Math.sin(this.joystick.angle) * (this.joystick.distance / 50);
        }

        // Set Velocities
        this.player.body.setVelocity(moveX * speed, moveY * speed);
        if (!this.isDiving) {
            this.boat.body.setVelocityX(moveX * speed);
        } else {
            this.boat.body.setVelocityX(0);
        }

        // Dive Animation and Transition Logic
        this.isDiving = this.player.y > 300;

        // Air Refill at surface
        if (!this.isDiving && this.air < 100) {
            this.air = 100;
        }

        // Swimming Wobble and Angle
        if (this.isDiving) {
            // Face direction
            if (moveX < 0) this.player.setFlipX(true);
            else if (moveX > 0) this.player.setFlipX(false);

            // Vertical Angle
            let targetAngle = 0;
            if (moveY < 0) targetAngle = this.player.flipX ? 45 : -45; // Swimming Up
            else if (moveY > 0) targetAngle = this.player.flipX ? -45 : 45; // Swimming Down

            // Smooth transition/Wobble
            const swimWobble = Math.sin(this.time.now / 150) * 10;
            this.player.setAngle(targetAngle + swimWobble);
        } else {
            this.player.setAngle(0);
            if (moveX < 0) this.player.setFlipX(true);
            else if (moveX > 0) this.player.setFlipX(false);
        }

        // Boat Collider Logic (allow re-boarding)
        // Only solid if player is above the boat deck and not swimming up
        if (this.player.y < this.boat.y - 40 && moveY >= 0) {
            this.boatCollider.active = true;
        } else {
            this.boatCollider.active = false;
        }

        // Shooting
        const firePressed = Phaser.Input.Keyboard.JustDown(this.cursors.space) || (this.mobileInputs?.fire && !this.lastFire);
        if (firePressed) {
            this.shoot();
        }
        this.lastFire = this.mobileInputs?.fire;

        // Update air bubbles
        this.airBubbles.getChildren().forEach(bubble => {
            const visual = bubble.getData('visual');
            if (visual) {
                visual.x = bubble.x;
                visual.y = bubble.y;
                if (bubble.y < 300) {
                    visual.destroy();
                    bubble.destroy();
                }
            }
        });

        // Update Depth
        const currentDepth = Math.max(0, Math.floor((this.player.y - 300) / 10)); // 1m per 10 pixels
        this.depthText.setText(`Depth: ${currentDepth}m`);

        // Update UI
        this.airText.setText(`Air: ${Math.floor(this.air)}%`);
        this.scoreText.setText(`Score: ${this.score}`);
        this.moneyText.setText(`Money: $${this.money}`);
        this.crystalsText.setText(`Crystals: ${this.crystals}`);
    }

    shoot() {
        this.swingSword();
    }

    swingSword() {
        if (this.isSwinging) return;
        this.isSwinging = true;

        this.sword.setAlpha(1);
        this.sword.x = this.player.x;
        this.sword.y = this.player.y;
        this.sword.setAngle(this.player.flipX ? 180 : 0);

        // Movement with player
        const swingTween = this.tweens.add({
            targets: this.sword,
            angle: this.player.flipX ? 270 : 90,
            duration: 150,
            ease: 'Power2',
            onUpdate: () => {
                this.sword.x = this.player.x;
                this.sword.y = this.player.y;
            },
            onComplete: () => {
                this.sword.setAlpha(0);
                this.isSwinging = false;
            }
        });

        // Check for hits
        this.physics.overlap(this.sword, this.pirates, (s, pirate) => {
            pirate.destroy();
            this.score += 200;
        });
    }

    spawnPirate() {
        const cam = this.cameras.main;
        const x = cam.worldView.right + 200;
        const y = Phaser.Math.Between(Math.max(400, cam.worldView.top), Math.min(2800, cam.worldView.bottom));

        // Ensure not too close to player Y if possible
        const safeY = (Math.abs(y - this.player.y) < 100) ? y + 200 : y;

        const pirate = this.pirates.create(x, Math.min(2900, safeY), 'pirate');
        pirate.setScale(0.4);
        // Shrink hitbox for fair play
        pirate.body.setSize(pirate.width * 0.6, pirate.height * 0.5);
        pirate.body.setOffset(pirate.width * 0.2, pirate.height * 0.25);
        pirate.body.setVelocityX(-150 * this.difficulty);
    }

    spawnMermaid() {
        const cam = this.cameras.main;
        const x = cam.worldView.right + 200;
        const y = Phaser.Math.Between(Math.max(400, cam.worldView.top), Math.min(2800, cam.worldView.bottom));

        const mermaid = this.mermaids.create(x, y, 'mermaid');
        mermaid.setScale(0.3);
        mermaid.body.setVelocityX(-100);

        if (Phaser.Math.Between(0, 1) === 1) {
            this.spawnCrystal(x, y);
        }
    }

    spawnCrystal(x, y) {
        // If x and y are not provided, find a safe spot (for world gen)
        if (x === undefined || y === undefined) {
            const pos = this.getSafeSpawnPos();
            if (!pos) return;
            x = pos.x;
            y = pos.y;
        }
        const crystal = this.crystalsGroup.create(x, y, 'crystal');
        crystal.setScale(0.25); // Larger
        crystal.body.setVelocityX(Phaser.Math.Between(-20, 20)); // Subtle drift
        crystal.body.setAllowGravity(false);
    }

    generateWorldItems() {
        // Deterministic distribution based on depth
        // More treasures and crystals deeper down
        const treasureCount = 25;
        const crystalCount = 15;
        const scubaCount = 8;

        for (let i = 0; i < treasureCount; i++) {
            this.spawnTreasure();
        }

        for (let i = 0; i < crystalCount; i++) {
            this.spawnCrystal();
        }

        for (let i = 0; i < scubaCount; i++) {
            this.spawnScubaTank();
        }
    }

    depleteAir() {
        if (!this.isDiving || this.isGameOver) return;
        this.air -= 2;
        if (this.air <= 0) {
            this.air = 0;
            this.gameOver();
        }
    }

    spawnTreasure() {
        const pos = this.getSafeSpawnPos();
        if (!pos) return;
        const treasure = this.treasures.create(pos.x, pos.y, 'treasure');
        treasure.setScale(0.25);
        treasure.setDepth(0);
    }

    spawnAirBubble() {
        const pos = this.getSafeSpawnPos();
        if (!pos) return;

        // Use an invisible sprite for physics overlap, added to the airBubbles group
        const bubble = this.airBubbles.create(pos.x, pos.y, null);
        bubble.setVisible(false);
        bubble.setAlpha(0);

        // Multi-layered visual for a better bubble look
        const container = this.add.container(pos.x, pos.y);
        const main = this.add.circle(0, 0, 12, 0xadd8e6, 0.4);
        const highlight = this.add.circle(-4, -4, 4, 0xffffff, 0.6);
        container.add([main, highlight]);

        bubble.setData('visual', container);
        bubble.body.setSize(24, 24);
        bubble.body.setAllowGravity(false);
        bubble.body.setVelocityY(-30);
    }

    spawnScubaTank() {
        const pos = this.getSafeSpawnPos();
        if (!pos) return;
        const tank = this.scubaTanks.create(pos.x, pos.y, 'scuba');
        tank.setScale(0.3);
        tank.body.setVelocityX(Phaser.Math.Between(-10, 10)); // Very subtle drift
        tank.body.setAllowGravity(false);
    }

    getSafeSpawnPos() {
        let attempts = 0;
        const { width } = this.scale;
        const worldWidth = Math.max(width, 800);

        while (attempts < 10) {
            const x = Phaser.Math.Between(50, worldWidth - 50);
            const y = Phaser.Math.Between(400, 2900);

            // Proximity to player check
            const distToPlayer = Phaser.Math.Distance.Between(x, y, this.player.x, this.player.y);
            if (distToPlayer < 300) {
                attempts++;
                continue;
            }

            // Minimal overlap check with other items
            const nearby = this.physics.overlapCirc(x, y, 50);
            if (nearby.length === 0) {
                return { x, y };
            }
            attempts++;
        }
        return null;
    }

    collectTreasure(player, treasure) {
        treasure.destroy();
        this.money += 200;
        this.score += 500;
    }

    collectAir(player, bubble) {
        const visual = bubble.getData('visual');
        if (visual) visual.destroy();
        bubble.destroy();
        this.air = Math.min(100, this.air + 5);
    }

    collectScuba(player, tank) {
        tank.destroy();
        this.air = 100;
        this.score += 100;
    }

    hitByEnemy(player, enemy) {
        this.gameOver();
    }

    collectMermaid(player, mermaid) {
        mermaid.destroy();
        this.crystals += 1;
        this.money += 100;
        this.score += 500;
    }

    collectCrystal(player, crystal) {
        crystal.destroy();
        this.crystals += 1;
        this.score += 1000;
    }

    killEnemy(bullet, enemy) {
        bullet.destroy();
        enemy.destroy();
        this.score += 200;
    }

    gameOver() {
        if (this.isGameOver) return;
        this.isGameOver = true;
        this.physics.pause();
        this.player.setTint(0xff0000);

        const screenCenterX = this.cameras.main.worldView.x + this.cameras.main.width / 2;
        const screenCenterY = this.cameras.main.worldView.y + this.cameras.main.height / 2;

        this.add.text(screenCenterX, screenCenterY - 50, 'GAME OVER', { fontSize: '64px', fill: '#ff0000', fontStyle: 'bold' }).setOrigin(0.5);

        const restartBtn = this.add.text(screenCenterX, screenCenterY + 50, 'RESTART', { fontSize: '32px', fill: '#fff', backgroundColor: '#333', padding: { x: 20, y: 10 } })
            .setOrigin(0.5)
            .setInteractive({ useHandCursor: true })
            .on('pointerdown', () => {
                this.isGameOver = false;
                this.scene.restart();
            });

        this.input.keyboard.once('keydown-SPACE', () => {
            this.isGameOver = false;
            this.scene.restart();
        });
    }

    setupMobileControls() {
        const { width, height } = this.scale;
        this.mobileInputs = { fire: false };

        const padding = 20;
        const baseRadius = 60;
        const thumbRadius = 30;

        // Joystick Base
        const jX = padding + baseRadius + 20;
        const jY = height - padding - baseRadius - 20 - 40; // Lifted by 40px

        this.joystick.base = this.add.circle(jX, jY, baseRadius, 0xffffff, 0.1)
            .setScrollFactor(0)
            .setDepth(100)
            .setInteractive();

        this.joystick.thumb = this.add.circle(jX, jY, thumbRadius, 0xffffff, 0.3)
            .setScrollFactor(0)
            .setDepth(101);

        this.joystick.base.on('pointerdown', (pointer) => {
            this.joystick.pointer = pointer;
            this.handleJoystickMove(pointer);
        });

        this.input.on('pointermove', (pointer) => {
            if (this.joystick.pointer && this.joystick.pointer.id === pointer.id) {
                this.handleJoystickMove(pointer);
            }
        });

        this.input.on('pointerup', (pointer) => {
            if (this.joystick.pointer && this.joystick.pointer.id === pointer.id) {
                this.resetJoystick();
            }
        });

        // Fire Button
        const btnSize = 80;
        const fireX = width - padding - btnSize / 2;
        const fireY = height - padding - btnSize / 2 - 40; // Lifted by 40px

        const fireBtn = this.add.rectangle(fireX, fireY, btnSize, btnSize, 0xffffff, 0.2)
            .setScrollFactor(0)
            .setInteractive()
            .setDepth(100)
            .on('pointerdown', () => this.mobileInputs.fire = true)
            .on('pointerup', () => this.mobileInputs.fire = false)
            .on('pointerout', () => this.mobileInputs.fire = false);

        this.add.text(fireX, fireY, 'FIRE', { fontSize: '24px', fill: '#fff' })
            .setOrigin(0.5)
            .setScrollFactor(0)
            .setDepth(101);
    }

    handleJoystickMove(pointer) {
        if (!pointer.isDown) return;

        const base = this.joystick.base;
        const dx = pointer.x - base.x;
        const dy = pointer.y - base.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const maxDistance = 60;

        this.joystick.active = true;
        this.joystick.distance = Math.min(distance, maxDistance);
        this.joystick.angle = Math.atan2(dy, dx);

        const thumbX = base.x + Math.cos(this.joystick.angle) * this.joystick.distance;
        const thumbY = base.y + Math.sin(this.joystick.angle) * this.joystick.distance;

        this.joystick.thumb.setPosition(thumbX, thumbY);
    }

    resetJoystick() {
        this.joystick.active = false;
        this.joystick.distance = 0;
        this.joystick.thumb.setPosition(this.joystick.base.x, this.joystick.base.y);
    }
}
