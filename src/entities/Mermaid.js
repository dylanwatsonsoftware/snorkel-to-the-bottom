import Phaser from 'phaser';

export class Mermaid extends Phaser.GameObjects.Sprite {
    constructor(scene, x, y, velocityX) {
        super(scene, x, y, 'mermaid');
        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.setScale(0.3);
        this.body.setSize(this.width * 0.5, this.height * 0.5);
        this.body.setOffset(this.width * 0.25, this.height * 0.25);
        this.body.setAllowGravity(false);
        this.body.setVelocityX(velocityX);

        // Sprite faces left by default; flip when swimming right
        this.setFlipX(velocityX < 0);

        this.scene = scene;
    }
}
