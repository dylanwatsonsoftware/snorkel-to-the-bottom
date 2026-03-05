import Phaser from 'phaser';

export class UIManager {
    constructor(scene) {
        this.scene = scene;
        this.joystick = { base: null, thumb: null, active: false, x: 0, y: 0, distance: 0, angle: 0, pointer: null };
        this.mobileInputs = { slash: false };
    }

    create() {
        // Mobile controls container — stays in screen space, no zoom compensation
        this.mobileContainer = this.scene.add.container(0, 0);
        this.mobileContainer.setScrollFactor(0);
        this.mobileContainer.setDepth(100);

        this.scene.input.addPointer(2);
        this.setupMobileControls();
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
            .setInteractive();

        this.joystick.thumb = this.scene.add.circle(jX, jY, thumbRadius, 0xffffff, 0.3);

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

        this.actionBtn = this.scene.add.rectangle(fireX, fireY, btnSize, btnSize, 0xffffff, 0.2)
            .setScrollFactor(0)
            .setInteractive()
            .on('pointerdown', () => this.mobileInputs.slash = true)
            .on('pointerup', () => this.mobileInputs.slash = false)
            .on('pointerout', () => this.mobileInputs.slash = false);

        this.actionBtnText = this.scene.add.text(fireX, fireY, 'FIRE', { fontSize: '24px', fill: '#fff' })
            .setOrigin(0.5);

        // Add mobile controls to separate container (no zoom compensation)
        this.mobileContainer.add([
            this.joystick.base, this.joystick.thumb,
            this.actionBtn, this.actionBtnText
        ]);
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

    setActionLabel(label) {
        if (this.actionBtnText) this.actionBtnText.setText(label);
    }

    consumeSlash() {
        if (this.mobileInputs.slash) {
            this.mobileInputs.slash = false;
            return true;
        }
        return false;
    }

    getMovement() {
        if (!this.joystick.active) return { x: 0, y: 0 };
        return {
            x: Math.cos(this.joystick.angle) * (this.joystick.distance / 50),
            y: Math.sin(this.joystick.angle) * (this.joystick.distance / 50)
        };
    }
}
