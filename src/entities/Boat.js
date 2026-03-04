import Phaser from 'phaser';

export class Boat extends Phaser.GameObjects.Sprite {
    constructor(scene, x, y) {
        super(scene, x, y, 'boat');
        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.setScale(0.5);
        this.body.setAllowGravity(false);
        this.body.setImmovable(true);
    }

    update(isDiving, moveX, speed) {
        if (!isDiving) {
            this.body.setVelocityX(moveX * speed);
        } else {
            this.body.setVelocityX(0);
        }
    }
}
