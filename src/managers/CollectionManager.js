import { PLAYER, SCORING, UPGRADE_TYPES, UPGRADES } from '../config/GameConfig';
import Phaser from 'phaser';

export class CollectionManager {
    constructor(scene, effectsManager) {
        this.scene = scene;
        this.effects = effectsManager;
    }

    collectTreasure(p, t) {
        if (t.getData('collected')) return;
        t.setData('collected', true);
        this.effects.playCollectAnimation(t);
        this.scene.money += SCORING.TREASURE_MONEY;
        this.scene.score += SCORING.TREASURE_SCORE;
        this.scene.soundManager.play('collect');
    }

    collectAir(p, b) {
        if (b.getData('collected')) return;
        b.setData('collected', true);
        const v = b.getData('visual'); if (v) v.destroy(); b.destroy();
        this.scene.air = Math.min(PLAYER.MAX_AIR, this.scene.air + PLAYER.AIR_BUBBLE_RESTORE);
        this.scene.soundManager.play('bubble');
    }

    collectScuba(p, t) {
        if (t.getData('collected')) return;
        t.setData('collected', true);
        this.effects.playCollectAnimation(t);
        this.scene.air = PLAYER.MAX_AIR;
        this.scene.score += SCORING.SCUBA_SCORE;
        this.scene.soundManager.play('scuba');
    }

    collectMermaid(p, m) {
        if (m.onCooldown) return;

        // Rewards
        this.scene.crystals += 1;
        this.scene.money += SCORING.MERMAID_MONEY;
        this.scene.score += SCORING.MERMAID_SCORE;
        p.health = Math.min(PLAYER.MAX_HEALTH, p.health + 1);
        this.scene.soundManager.play('mermaid');

        // Floating heart animation
        const heart = this.scene.add.image(m.x, m.y - 20, 'heart-full')
            .setScale(0.8).setDepth(200);
        this.scene.tweens.add({
            targets: heart,
            y: heart.y - 50,
            alpha: 0,
            scale: 1.4,
            duration: 800,
            ease: 'Cubic.easeOut',
            onComplete: () => heart.destroy()
        });

        // Disable collision and swim away (cooldown re-enables after 5s)
        if (m.body) m.body.enable = false;
        m.swimAway();
    }

    collectCrystal(p, c) {
        if (c.getData('collected')) return;
        c.setData('collected', true);
        this.effects.playCollectAnimation(c);
        this.scene.crystals += 1;
        this.scene.score += SCORING.CRYSTAL_SCORE;
        this.scene.soundManager.play('crystal');
    }

    collectUpgrade(boat, u) {
        if (u.getData('collected')) return;
        u.setData('collected', true);
        const type = u.getData('upgradeType');
        const label = u.getData('label');
        if (label) label.destroy();

        if (type.permanent) {
            if (this.scene.upgrades[type.key] < UPGRADES.MAX_PERMANENT) {
                this.scene.upgrades[type.key]++;
            }
        } else {
            this.applyTemporaryUpgrade(type);
        }

        this.effects.showFloatingText(u.x, u.y, type.label);
        u.destroy();
        this.scene.soundManager.play('upgrade');
    }

    applyTemporaryUpgrade(type) {
        const scene = this.scene;
        if (type.key === 'doubleScore') {
            scene.scoreMultiplier = 2;
            scene.time.delayedCall(UPGRADES.TEMP_DURATION, () => { scene.scoreMultiplier = 1; });
        } else if (type.key === 'invincible') {
            scene.player.isInvincible = true;
            scene.time.delayedCall(UPGRADES.TEMP_DURATION, () => { scene.player.isInvincible = false; });
        } else if (type.key === 'speedBurst') {
            scene.upgrades.swimSpeed += UPGRADES.SPEED_BURST_BONUS;
            scene.time.delayedCall(UPGRADES.TEMP_DURATION, () => {
                scene.upgrades.swimSpeed = Math.max(0, scene.upgrades.swimSpeed - UPGRADES.SPEED_BURST_BONUS);
            });
        }
    }

    dropUpgrade(x, y) {
        const type = Phaser.Math.RND.pick(UPGRADE_TYPES);
        const u = this.scene.worldManager.surfaceUpgrades.create(x, y, 'upgrade').setScale(1);
        u.body.setAllowGravity(false);
        u.setData('upgradeType', type);

        const label = this.scene.add.text(x, y - 16, type.label, {
            fontSize: '10px', fill: '#fff', fontStyle: 'bold', stroke: '#000', strokeThickness: 2
        }).setOrigin(0.5).setDepth(u.depth + 1);
        u.setData('label', label);

        this.scene.tweens.add({
            targets: [u, label],
            y: '-=6',
            duration: 600,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.inOut'
        });

        u.setTint(type.color);

        this.scene.time.delayedCall(UPGRADES.DESPAWN_TIME, () => {
            if (u.active) { const l = u.getData('label'); if (l) l.destroy(); u.destroy(); }
        });
    }
}
