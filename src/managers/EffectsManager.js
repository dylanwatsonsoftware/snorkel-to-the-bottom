import Phaser from 'phaser';

export class EffectsManager {
    constructor(scene) {
        this.scene = scene;
    }

    playDeathAnimation(enemy) {
        for (let i = 0; i < 6; i++) {
            const p = this.scene.add.circle(enemy.x, enemy.y, Phaser.Math.Between(3, 6),
                Phaser.Math.RND.pick([0xff4400, 0xff8800, 0xffcc00]), 0.9);
            p.setDepth(enemy.depth + 1);
            this.scene.tweens.add({
                targets: p,
                x: p.x + Phaser.Math.Between(-60, 60),
                y: p.y + Phaser.Math.Between(-60, 60),
                alpha: 0,
                scale: 0.1,
                duration: Phaser.Math.Between(300, 500),
                onComplete: () => p.destroy()
            });
        }

        enemy.setTint(0xffffff);
        this.scene.tweens.add({
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

    playCollectAnimation(item) {
        if (item.body) item.body.enable = false;
        this.scene.tweens.add({
            targets: item,
            scaleX: { value: 0, duration: 150, yoyo: true, repeat: 2 },
            scale: { value: 0, duration: 600 },
            y: item.y - 30,
            alpha: { value: 0, duration: 600, delay: 300 },
            onComplete: () => item.destroy()
        });
    }

    createSplash(x, y) {
        for (let i = 0; i < 8; i++) {
            const circle = this.scene.add.circle(x, y, Phaser.Math.Between(2, 5), 0xffffff, 0.8);
            this.scene.physics.add.existing(circle);
            circle.body.setVelocity(Phaser.Math.Between(-100, 100), Phaser.Math.Between(-50, -150));
            circle.body.setGravityY(300);

            this.scene.tweens.add({
                targets: circle,
                alpha: 0,
                scale: 0.1,
                duration: Phaser.Math.Between(500, 800),
                onComplete: () => circle.destroy()
            });
        }
    }

    showFloatingText(x, y, text, color = '#ffff00') {
        const msg = this.scene.add.text(x, y - 20, text, {
            fontSize: '16px', fill: color, fontStyle: 'bold', stroke: '#000', strokeThickness: 3
        }).setOrigin(0.5).setDepth(200);
        this.scene.tweens.add({
            targets: msg,
            y: msg.y - 40,
            alpha: 0,
            duration: 1000,
            onComplete: () => msg.destroy()
        });
    }
}
