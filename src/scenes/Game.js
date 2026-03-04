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
        this.player.setScale(0.1); // Adjust scale if needed
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
        const speed = 200;
        this.player.body.setVelocity(0);

        // Difficulty increases over time
        this.difficulty += 0.0001;

        if (this.cursors.left.isDown) {
            this.player.body.setVelocityX(-speed);
            if (!this.isDiving) this.boat.body.setVelocityX(-speed);
        } else if (this.cursors.right.isDown) {
            this.player.body.setVelocityX(speed);
            if (!this.isDiving) this.boat.body.setVelocityX(speed);
        } else {
            if (!this.isDiving) this.boat.body.setVelocityX(0);
        }

        if (this.cursors.up.isDown) {
            this.player.body.setVelocityY(-speed);
        } else if (this.cursors.down.isDown) {
            this.player.body.setVelocityY(speed);
        }

        // Shooting
        if (this.cursors.space.isDown && this.time.now > this.lastShotTime + 500) {
            this.shoot();
            this.lastShotTime = this.time.now;
        }

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
        pirate.setScale(0.1);
        pirate.body.setVelocityX(-150 * this.difficulty);
    }

    spawnMermaid() {
        const x = 850;
        const y = Phaser.Math.Between(400, 2800);
        const mermaid = this.mermaids.create(x, y, 'mermaid');
        mermaid.setScale(0.1);
        mermaid.body.setVelocityX(-100);

        // Sometimes drop a crystal
        if (Phaser.Math.Between(0, 1) === 1) {
            this.spawnCrystal(x, y);
        }
    }

    spawnCrystal(x, y) {
        const crystal = this.crystalsGroup.create(x, y, 'crystal');
        crystal.setScale(0.05);
        crystal.body.setVelocityX(-100);
    }

    collectMermaid(player, mermaid) {
        mermaid.destroy();
        this.crystals += 1;
        this.money += 100;
        this.score += 500;
    }

    hitByEnemy(player, enemy) {
        this.gameOver();
    }

    killEnemy(bullet, enemy) {
        bullet.destroy();
        enemy.destroy();
        this.score += 200;
    }

    spawnTreasure() {
        const x = Phaser.Math.Between(50, 750);
        const y = Phaser.Math.Between(400, 2900);
        const treasure = this.treasures.create(x, y, 'treasure');
        treasure.setScale(0.05);
    }

    spawnAirBubble() {
        const x = Phaser.Math.Between(50, 750);
        const y = Phaser.Math.Between(400, 2900);
        const bubble = this.airBubbles.create(x, y, null);
        this.add.circle(x, y, 5, 0x00ffff, 0.5);
        bubble.body.setSize(10, 10);
    }

    spawnScubaTank() {
        const x = Phaser.Math.Between(50, 750);
        const y = Phaser.Math.Between(400, 2900);
        const tank = this.scubaTanks.create(x, y, 'scuba');
        tank.setScale(0.05);
    }

    collectTreasure(player, treasure) {
        treasure.destroy();
        this.score += 100;
        this.money += 50;
    }

    collectAir(player, bubble) {
        bubble.destroy();
        this.air = Math.min(100, this.air + 5);
    }

    collectScuba(player, tank) {
        tank.destroy();
        this.air = Math.min(100, this.air + 30);
    }

    depleteAir() {
        if (this.isDiving) {
            this.air -= 2; // Drains faster when diving
        } else {
            this.air -= 0.5; // Drains slowly on the boat
        }

        if (this.air <= 0) {
            this.air = 0;
            this.gameOver();
        }
    }

    gameOver() {
        this.physics.pause();
        this.add.text(400, 300, 'GAME OVER', { fontSize: '64px', fill: '#ff0000' }).setOrigin(0.5);
        this.input.on('pointerdown', () => this.scene.restart());
    }
}
