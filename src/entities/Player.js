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
        this.isDivingInitiated = false;
        this.setupSword();
    }

    setupSword() {
        this.sword = this.scene.add.image(0, 0, 'cutlass')
            .setOrigin(0.03, 0.5)
            .setAlpha(0)
            .setDepth(10);
    }

    dive(onComplete) {
        if (this.isDivingInitiated) return;
        this.isDivingInitiated = true;

        // Jump up and dive down
        this.scene.tweens.add({
            targets: this,
            y: this.y - 60,
            angle: this.flipX ? 45 : -45,
            duration: 300,
            ease: 'Power1.out',
            onComplete: () => {
                this.scene.tweens.add({
                    targets: this,
                    y: 320,
                    angle: this.flipX ? 135 : -135,
                    duration: 400,
                    ease: 'Power1.in',
                    onComplete: () => {
                        this.angle = 0;
                        if (onComplete) onComplete();
                    }
                });
            }
        });
    }

    update(moveX, moveY, speed, isDiving) {
        if (this.isDivingInitiated && !isDiving) {
            this.body.setVelocity(0, 0);
            return;
        }

        if (isDiving) {
            this.body.setVelocity(moveX * speed, moveY * speed);
            if (!this.isSwinging) {
                if (moveX < 0) this.setFlipX(true);
                else if (moveX > 0) this.setFlipX(false);
            }

            const isMoving = moveX !== 0 || moveY !== 0;

            if (this.isSwinging) {
                this.setAngle(0);
            } else if (isMoving) {
                let targetAngle = 0;
                if (moveY < 0) targetAngle = this.flipX ? 45 : -45;
                else if (moveY > 0) targetAngle = this.flipX ? -45 : 45;

                const swimWobble = Math.sin(this.scene.time.now / 150) * 10;
                this.setAngle(targetAngle + swimWobble);
            } else {
                this.setAngle(0);
            }
        } else {
            this.body.setVelocity(moveX * speed, 0);
            this.setAngle(0);
            if (moveX < 0) this.setFlipX(true);
            else if (moveX > 0) this.setFlipX(false);
        }

        if (this.isSwinging) {
            const offsetX = this.swingFacingLeft ? -50 : 50;
            this.sword.x = this.x + offsetX;
            this.sword.y = this.y;
        }
    }

    swingSword() {
        if (this.isSwinging) return;
        this.isSwinging = true;
        this.swingFacingLeft = this.flipX;

        this.sword.setAlpha(1);
        this.sword.x = this.x + (this.swingFacingLeft ? -50 : 50);
        this.sword.y = this.y;

        this.sword.setAngle(-90);
        this.sword.setFlipX(this.swingFacingLeft);
        this.sword.setOrigin(this.swingFacingLeft ? 0.97 : 0.03, 1.0);

        this.scene.tweens.add({
            targets: this.sword,
            angle: 90,
            duration: 250,
            ease: 'Power2',
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
