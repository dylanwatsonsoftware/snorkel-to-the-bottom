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
        this.mobileButtons = {};
        this.treasures = null;
        this.airBubbles = null;
        this.scubaTanks = null;
        this.pirates = null;
        this.mermaids = null;
        this.bullets = null;
        this.lastShotTime = 0;
        this.difficulty = 1;
    }

    create() {
        // World bounds for deep diving
        this.physics.world.setBounds(0, 0, 800, 3000);

        // Background
        // Sky
        this.add.rectangle(400, 0, 800, 300, 0x87ceeb).setOrigin(0.5, 0);
        // Water
        this.add.rectangle(400, 300, 800, 2700, 0x004488).setOrigin(0.5, 0);

        // Boat
        this.boat = this.physics.add.sprite(100, 280, 'boat');
        this.boat.setScale(0.5); // Adjust scale if needed
        this.boat.body.setAllowGravity(false);
        this.boat.body.setImmovable(true);

        // Player (Pirate Snorkeller)
        // Starts on the boat
        this.player = this.physics.add.sprite(100, 220, 'snorkeller');
        this.player.setScale(0.5); // Increased scale
        this.player.body.setCollideWorldBounds(true);

        // Camera follow
        this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
        this.cameras.main.setBounds(0, 0, 800, 3000);

        // Boat and Player Interaction
        this.physics.add.collider(this.player, this.boat);

        // Controls
        this.cursors = this.input.keyboard.createCursorKeys();
        // spaceBar is already included in cursors, but we can add it explicitly if needed
        // or just use this.cursors.space.isDown

        // UI - Fix to camera
        this.airText = this.add.text(16, 16, 'Air: 100%', { fontSize: '24px', fill: '#fff' }).setScrollFactor(0);
        this.scoreText = this.add.text(16, 48, 'Score: 0', { fontSize: '24px', fill: '#fff' }).setScrollFactor(0);
        this.moneyText = this.add.text(16, 80, 'Money: 0', { fontSize: '24px', fill: '#fff' }).setScrollFactor(0);
        this.crystalsText = this.add.text(16, 112, 'Crystals: 0', { fontSize: '24px', fill: '#fff' }).setScrollFactor(0);

        // Groups
        this.treasures = this.physics.add.group();
        this.airBubbles = this.physics.add.group();
        this.scubaTanks = this.physics.add.group();
        this.pirates = this.physics.add.group();
        this.mermaids = this.physics.add.group();
        this.bullets = this.physics.add.group();
        this.crystalsGroup = this.physics.add.group();

        // Mobile Controls
        this.setupMobileControls();
        this.crystalsGroup = this.physics.add.group();

        // Mobile Controls
        this.setupMobileControls();

        // Spawn items
        this.time.addEvent({ delay: 3000, callback: this.spawnTreasure, callbackScope: this, loop: true });
        this.time.addEvent({ delay: 5000, callback: this.spawnAirBubble, callbackScope: this, loop: true });
        this.time.addEvent({ delay: 10000, callback: this.spawnScubaTank, callbackScope: this, loop: true });
        this.time.addEvent({ delay: 7000, callback: this.spawnPirate, callbackScope: this, loop: true });
        this.time.addEvent({ delay: 15000, callback: this.spawnMermaid, callbackScope: this, loop: true });

        // Collisions
        this.physics.add.overlap(this.player, this.treasures, this.collectTreasure, null, this);
        this.physics.add.overlap(this.player, this.airBubbles, this.collectAir, null, this);
        this.physics.add.overlap(this.player, this.scubaTanks, this.collectScuba, null, this);
        this.physics.add.overlap(this.player, this.mermaids, this.collectMermaid, null, this);
        this.physics.add.overlap(this.player, this.crystalsGroup, this.collectCrystal, null, this);
        this.physics.add.collider(this.player, this.pirates, this.hitByEnemy, null, this);
        this.physics.add.overlap(this.bullets, this.pirates, this.killEnemy, null, this);

        // Timer for air depletion
        this.time.addEvent({
            delay: 1000,
            callback: this.depleteAir,
            callbackScope: this,
            loop: true
        });
    }

    update() {
        if (this.isGameOver) return;

        const speed = 200;
        this.player.body.setVelocity(0);

        // Difficulty increases over time
        this.difficulty += 0.0001;

        // Combine Keyboard and Mobile Input
        let moveX = 0;
        let moveY = 0;

        if (this.cursors.left.isDown || this.mobileInputs?.left) moveX = -1;
        else if (this.cursors.right.isDown || this.mobileInputs?.right) moveX = 1;

        if (this.cursors.up.isDown || this.mobileInputs?.up) moveY = -1;
        else if (this.cursors.down.isDown || this.mobileInputs?.down) moveY = 1;

        if (moveX !== 0) {
            this.player.body.setVelocityX(moveX * speed);
            if (!this.isDiving) this.boat.body.setVelocityX(moveX * speed);
        } else {
            if (!this.isDiving) this.boat.body.setVelocityX(0);
        }

        if (moveY !== 0) {
            this.player.body.setVelocityY(moveY * speed);
        }

        // Shooting
        const firePressed = Phaser.Input.Keyboard.JustDown(this.cursors.space) || (this.mobileInputs?.fire && !this.lastFire);
        if (firePressed) {
            this.shoot();
        }
        this.lastFire = this.mobileInputs?.fire;

        // Check if player is diving
        if (this.player.y > 300) {
            this.isDiving = true;
        } else {
            this.isDiving = false;
        }

        // Update UI
        this.airText.setText(`Air: ${Math.floor(this.air)}%`);
        this.scoreText.setText(`Score: ${this.score}`);
        this.moneyText.setText(`Money: $${this.money}`);
        this.crystalsText.setText(`Crystals: ${this.crystals}`);
    }

    shoot() {
        const bullet = this.bullets.create(this.player.x, this.player.y, null);
        this.add.rectangle(this.player.x, this.player.y, 10, 5, 0xff0000);
        bullet.body.setVelocityX(400);
        bullet.body.setAllowGravity(false);
    }

    spawnPirate() {
        const x = 850;
        const y = Phaser.Math.Between(400, 2800);
        const pirate = this.pirates.create(x, y, 'pirate');
        pirate.setScale(0.3); // Increased scale
        pirate.body.setVelocityX(-150 * this.difficulty);
    }

    spawnMermaid() {
        const x = 850;
        const y = Phaser.Math.Between(400, 2800);
        const mermaid = this.mermaids.create(x, y, 'mermaid');
        mermaid.setScale(0.3); // Increased scale
        mermaid.body.setVelocityX(-100);

        // Sometimes drop a crystal
        if (Phaser.Math.Between(0, 1) === 1) {
            this.spawnCrystal(x, y);
        }
    }

    spawnCrystal(x, y) {
        const crystal = this.crystalsGroup.create(x, y, 'crystal');
        crystal.setScale(0.15); // Increased scale
        crystal.body.setVelocityX(-100);
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
        this.mobileInputs = { left: false, right: false, up: false, down: false, fire: false };

        const bottomY = this.cameras.main.height - 80;

        const createBtn = (x, y, label, callbackDown, callbackUp) => {
            const btn = this.add.rectangle(x, y, 70, 70, 0xffffff, 0.2)
                .setScrollFactor(0)
                .setInteractive()
                .on('pointerdown', callbackDown)
                .on('pointerup', callbackUp)
                .on('pointerout', callbackUp);
            this.add.text(x, y, label, { fontSize: '24px', fill: '#fff' }).setOrigin(0.5).setScrollFactor(0);
            return btn;
        };

        createBtn(60, bottomY, 'L', () => this.mobileInputs.left = true, () => this.mobileInputs.left = false);
        createBtn(140, bottomY, 'R', () => this.mobileInputs.right = true, () => this.mobileInputs.right = false);
        createBtn(this.cameras.main.width / 2 - 40, bottomY, 'U', () => this.mobileInputs.up = true, () => this.mobileInputs.up = false);
        createBtn(this.cameras.main.width / 2 + 40, bottomY, 'D', () => this.mobileInputs.down = true, () => this.mobileInputs.down = false);
        createBtn(this.cameras.main.width - 60, bottomY, 'F', () => this.mobileInputs.fire = true, () => this.mobileInputs.fire = false);
    }
}
