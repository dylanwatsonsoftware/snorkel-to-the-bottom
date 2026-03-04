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

        // Slightly longer blade for wider arc
        const bladeTop = this.scene.add.rectangle(10, -2, 55, 3, 0xeeeeee).setOrigin(0, 0.5);
        const bladeBottom = this.scene.add.rectangle(10, 1, 50, 3, 0xcccccc).setOrigin(0, 0.5);
        const hilt = this.scene.add.rectangle(8, 0, 4, 14, 0x8b4513).setOrigin(0.5, 0.5);
        const guard = this.scene.add.circle(5, 0, 6, 0xffd700).setAlpha(0.8);
        const handle = this.scene.add.rectangle(0, 0, 10, 5, 0x333333).setOrigin(0.5, 0.5);

        this.sword.add([bladeTop, bladeBottom, guard, hilt, handle]);

        this.scene.physics.add.existing(this.sword);
        // Wider hitbox to match the swing arc
        this.sword.body.setSize(60, 60);
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
            this.sword.x = this.x;
            this.sword.y = this.y;
            // Sync hitbox position
            this.sword.body.x = this.x - 30;
            this.sword.body.y = this.y - 30;
        }
    }

    swingSword() {
        if (this.isSwinging) return;
        this.isSwinging = true;

        this.sword.setAlpha(1);
        this.sword.x = this.x;
        this.sword.y = this.y;

        // Start angle for a wide arc (e.g., -80 to +80 relative to facing)
        const startAngle = this.flipX ? 100 : -80;
        const endAngle = this.flipX ? 260 : 80;

        this.sword.setAngle(startAngle);

        this.scene.tweens.add({
            targets: this.sword,
            angle: endAngle,
            duration: 200,
            ease: 'Cubic.out',
            onUpdate: () => {
                this.sword.x = this.x;
                this.sword.y = this.y;
            },
            onComplete: () => {
                this.sword.setAlpha(0);
                this.isSwinging = false;
            }
        });
    }

    takeDamage() {
        if (this.isInvincible || this.health <= 0) return;

        this.health--;
        this.isInvincible = true;

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
