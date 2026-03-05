import Phaser from 'phaser';

export class Mermaid extends Phaser.GameObjects.Sprite {
    constructor(scene, x, y, velocityX) {
        super(scene, x, y, 'mermaid');
        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.setScale(0.45);
        this.body.setSize(this.width * 0.5, this.height * 0.5);
        this.body.setOffset(this.width * 0.25, this.height * 0.25);
        this.body.setAllowGravity(false);

        // Sprite faces left by default; flip when swimming right
        this.setFlipX(velocityX < 0);

        this.scene = scene;
        this.swimVelocity = velocityX;
    }

    swim() {
        this.body.setVelocityX(this.swimVelocity);
    }

    update() {
        // Swim wobble — same style as the player
        const swimWobble = Math.sin(this.scene.time.now / 150) * 8;
        this.setAngle(swimWobble);
    }

    swimAway() {
        // Reverse direction and speed up
        this.swimVelocity = -this.swimVelocity * 1.5;
        this.setFlipX(this.swimVelocity < 0);
        this.body.setVelocity(this.swimVelocity, 40);

        // Cooldown — re-enable collision after a delay
        this.onCooldown = true;
        this.scene.time.delayedCall(5000, () => {
            if (!this.active) return;
            this.onCooldown = false;
            // Resume normal swim speed
            this.swimVelocity = this.swimVelocity > 0
                ? Math.abs(this.swimVelocity / 1.5)
                : -Math.abs(this.swimVelocity / 1.5);
            this.body.setVelocity(this.swimVelocity, 0);
        });
    }
}
