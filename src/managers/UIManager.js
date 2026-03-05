import Phaser from 'phaser';

export class UIManager {
    constructor(scene) {
        this.scene = scene;
        this.airText = null;
        this.crystalsText = null;
        this.depthText = null;
        this.healthText = null;
        this.joystick = { base: null, thumb: null, active: false, x: 0, y: 0, distance: 0, angle: 0, pointer: null };
        this.mobileInputs = { slash: false };
    }

    create() {
        const uiStyle = { fontSize: '20px', fill: '#fff', fontStyle: 'bold', stroke: '#000', strokeThickness: 3 };

        // Air bar
        const barWidth = 150;
        const barHeight = 16;
        this.airBarBg = this.scene.add.rectangle(16, 20, barWidth, barHeight, 0x333333)
            .setOrigin(0, 0.5).setScrollFactor(0).setDepth(100);
        this.airBarFill = this.scene.add.rectangle(16, 20, barWidth, barHeight, 0x00cc44)
            .setOrigin(0, 0.5).setScrollFactor(0).setDepth(100);
        this.airText = this.scene.add.text(16 + barWidth + 8, 20, '100%', { fontSize: '14px', fill: '#fff', fontStyle: 'bold', stroke: '#000', strokeThickness: 2 })
            .setOrigin(0, 0.5).setScrollFactor(0).setDepth(100);

        this.scoreText = this.scene.add.text(16, 44, 'Score: 0', uiStyle).setScrollFactor(0).setDepth(100);
        this.moneyText = this.scene.add.text(16, 72, 'Money: $0', uiStyle).setScrollFactor(0).setDepth(100);
        this.crystalsText = this.scene.add.text(16, 100, 'Crystals: 0', uiStyle).setScrollFactor(0).setDepth(100);
        this.depthText = this.scene.add.text(16, 128, 'Depth: 0m', uiStyle).setScrollFactor(0).setDepth(100);

        const { width } = this.scene.scale;
        this.healthText = this.scene.add.text(width - 16, 16, 'Health: ❤️❤️❤️', uiStyle)
            .setScrollFactor(0)
            .setOrigin(1, 0)
            .setDepth(100);

        // Support multi-touch
        this.scene.input.addPointer(2);
        this.setupMobileControls();
    }

    update(air, score, money, crystals, playerY, health) {
        // Update air bar
        const airPct = Math.max(0, Math.min(100, air));
        const barWidth = 150;
        this.airBarFill.width = barWidth * (airPct / 100);
        if (airPct > 50) this.airBarFill.setFillStyle(0x00cc44);
        else if (airPct > 25) this.airBarFill.setFillStyle(0xcccc00);
        else this.airBarFill.setFillStyle(0xcc2200);
        this.airText.setText(`${Math.floor(airPct)}%`);

        this.scoreText.setText(`Score: ${score}`);
        this.moneyText.setText(`Money: $${money}`);
        this.crystalsText.setText(`Crystals: ${crystals}`);

        const hearts = '❤️'.repeat(Math.max(0, health));
        this.healthText.setText(`Health: ${hearts}`);

        const currentDepth = Math.max(0, Math.floor((playerY - 300) / 10));
        this.depthText.setText(`Depth: ${currentDepth}m`);
    }

    setupMobileControls() {
        const { width, height } = this.scene.scale;
        const padding = 20;
        const baseRadius = 60;
        const thumbRadius = 30;

        const jX = padding + baseRadius + 20;
        const jY = height - padding - baseRadius - 90;

        this.joystick.base = this.scene.add.circle(jX, jY, baseRadius, 0xffffff, 0.1)
            .setScrollFactor(0)
            .setDepth(100)
            .setInteractive();

        this.joystick.thumb = this.scene.add.circle(jX, jY, thumbRadius, 0xffffff, 0.3)
            .setScrollFactor(0)
            .setDepth(101);

        this.joystick.base.on('pointerdown', (pointer) => {
            this.joystick.pointer = pointer;
            this.handleJoystickMove(pointer);
        });

        this.scene.input.on('pointermove', (pointer) => {
            if (this.joystick.pointer && this.joystick.pointer.id === pointer.id) {
                this.handleJoystickMove(pointer);
            }
        });

        this.scene.input.on('pointerup', (pointer) => {
            if (this.joystick.pointer && this.joystick.pointer.id === pointer.id) {
                this.resetJoystick();
            }
        });

        const btnSize = 80;
        const fireX = width - padding - btnSize / 2;
        const fireY = height - padding - btnSize / 2 - 80;

        this.scene.add.rectangle(fireX, fireY, btnSize, btnSize, 0xffffff, 0.2)
            .setScrollFactor(0)
            .setInteractive()
            .setDepth(100)
            .on('pointerdown', () => this.mobileInputs.slash = true)
            .on('pointerup', () => this.mobileInputs.slash = false)
            .on('pointerout', () => this.mobileInputs.slash = false);

        this.scene.add.text(fireX, fireY, 'SLASH', { fontSize: '24px', fill: '#fff' })
            .setOrigin(0.5)
            .setScrollFactor(0)
            .setDepth(101);
    }

    handleJoystickMove(pointer) {
        const base = this.joystick.base;
        const dx = pointer.x - base.x;
        const dy = pointer.y - base.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const maxDistance = 60;

        this.joystick.active = true;
        this.joystick.distance = Math.min(distance, maxDistance);
        this.joystick.angle = Math.atan2(dy, dx);

        const thumbX = base.x + Math.cos(this.joystick.angle) * this.joystick.distance;
        const thumbY = base.y + Math.sin(this.joystick.angle) * this.joystick.distance;

        this.joystick.thumb.setPosition(thumbX, thumbY);
    }

    resetJoystick() {
        this.joystick.active = false;
        this.joystick.distance = 0;
        this.joystick.pointer = null;
        this.joystick.thumb.setPosition(this.joystick.base.x, this.joystick.base.y);
    }

    getMovement() {
        if (!this.joystick.active) return { x: 0, y: 0 };
        return {
            x: Math.cos(this.joystick.angle) * (this.joystick.distance / 50),
            y: Math.sin(this.joystick.angle) * (this.joystick.distance / 50)
        };
    }
}
