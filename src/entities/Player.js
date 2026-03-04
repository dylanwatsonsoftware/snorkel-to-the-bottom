import Phaser from 'phaser';

export class Player extends Phaser.GameObjects.Sprite {
    constructor(scene, x, y) {
        super(scene, x, y, 'snorkeller');
        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.setScale(0.35);
        this.body.setCollideWorldBounds(true);

        this.scene = scene;
        this.isSwinging = false;
        this.health = 3;
        this.isInvincible = false;
        this.setupSword();
    }

    setupSword() {
        this.sword = this.scene.add.container(0, 0).setAlpha(0).setDepth(10);

        // Massive blade for huge reach
        const blade = this.scene.add.rectangle(10, 0, 85, 8, 0xeeeeee).setOrigin(0, 0.5);
        const hilt = this.scene.add.rectangle(8, 0, 4, 18, 0x8b4513).setOrigin(0.5, 0.5);
        const guard = this.scene.add.circle(5, 0, 8, 0xffd700).setAlpha(0.8);
        const handle = this.scene.add.rectangle(0, 0, 12, 6, 0x333333).setOrigin(0.5, 0.5);

        this.sword.add([blade, guard, hilt, handle]);

        this.scene.physics.add.existing(this.sword);
        // Massive hitbox to match the huge sweep
        this.sword.body.setSize(120, 120);
        this.sword.body.setAllowGravity(false);
        this.sword.body.setImmovable(true);
    }

    update(moveX, moveY, speed, isDiving) {
        this.body.setVelocity(moveX * speed, moveY * speed);

        if (isDiving) {
            if (moveX < 0) this.setFlipX(true);
            else if (moveX > 0) this.setFlipX(false);

            const isMoving = moveX !== 0 || moveY !== 0;

            if (isMoving) {
                let targetAngle = 0;
                if (moveY < 0) targetAngle = this.flipX ? 45 : -45;
                else if (moveY > 0) targetAngle = this.flipX ? -45 : 45;

                const swimWobble = Math.sin(this.scene.time.now / 150) * 10;
                this.setAngle(targetAngle + swimWobble);
            } else {
                this.setAngle(0);
            }
        } else {
            this.setAngle(0);
            if (moveX < 0) this.setFlipX(true);
            else if (moveX > 0) this.setFlipX(false);
        }

        if (this.isSwinging) {
            // Unified offset so it looks like it's in the hand
            const offsetX = this.flipX ? -20 : 20;
            const offsetY = 5;
            this.sword.x = this.x + offsetX;
            this.sword.y = this.y + offsetY;
            // Sync hitbox position
            this.sword.body.x = this.sword.x - 60;
            this.sword.body.y = this.sword.y - 60;
        }
    }

    swingSword() {
        if (this.isSwinging) return;
        this.isSwinging = true;

        this.sword.setAlpha(1);
        const offsetX = this.flipX ? -20 : 20;
        const offsetY = 5;
        this.sword.x = this.x + offsetX;
        this.sword.y = this.y + offsetY;

        // Start angle for a massive centered arc
        // Facing Right: -90 to +90 (sweeping across the front)
        // Facing Left: 270 to 90 (or 90 to 270)
        const startAngle = this.flipX ? 270 : -90;
        const endAngle = this.flipX ? 90 : 90;

        this.sword.setAngle(startAngle);
        this.sword.setScale(this.flipX ? -1 : 1, 1);

        this.scene.tweens.add({
            targets: this.sword,
            angle: endAngle,
            duration: 250,
            ease: 'Back.out',
            onComplete: () => {
                this.sword.setAlpha(0);
                this.isSwinging = false;
            }
        });

        if (this.scene.soundManager) this.scene.soundManager.play('swing');
    }

    takeDamage() {
        if (this.isInvincible || this.health <= 0) return;

        this.health--;
        this.isInvincible = true;

        if (this.scene.soundManager) this.scene.soundManager.play('hurt');

        // Flicker effect
        this.scene.tweens.add({
            targets: this,
            alpha: 0.2,
            duration: 100,
            yoyo: true,
            repeat: 10,
            onComplete: () => {
                this.alpha = 1;
                this.isInvincible = false;
            }
        });

        if (this.health <= 0) {
            this.scene.gameOver();
        }
    }
}
