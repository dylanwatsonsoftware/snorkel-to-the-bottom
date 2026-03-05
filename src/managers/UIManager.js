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

        // UI container - counter-scales camera zoom so HUD stays fixed size
        this.uiContainer = this.scene.add.container(0, 0);
        this.uiContainer.setScrollFactor(0);
        this.uiContainer.setDepth(100);

        // Air bar
        this.airBarWidth = 150;
        const barHeight = 14;
        this.airBarBg = this.scene.add.rectangle(16, 20, this.airBarWidth, barHeight, 0x222244)
            .setOrigin(0, 0.5);
        this.airBarFill = this.scene.add.rectangle(16, 20, this.airBarWidth, barHeight, 0x2288dd)
            .setOrigin(0, 0.5);
        this.airBubble = this.scene.add.circle(16 + this.airBarWidth, 20, 8, 0x66ccff, 0.9);
        this.airBubbleInner = this.scene.add.circle(16 + this.airBarWidth - 2, 18, 3, 0xffffff, 0.6);

        this.scoreText = this.scene.add.text(16, 44, 'Score: 0', uiStyle);
        this.moneyText = this.scene.add.text(16, 72, 'Money: $0', uiStyle);
        this.crystalsText = this.scene.add.text(16, 100, 'Crystals: 0', uiStyle);
        this.depthText = this.scene.add.text(16, 128, 'Depth: 0m', uiStyle);

        const { width } = this.scene.scale;
        this.healthText = this.scene.add.text(width - 16, 16, '❤️❤️❤️', uiStyle)
            .setOrigin(1, 0);

        this.uiContainer.add([
            this.airBarBg, this.airBarFill, this.airBubble, this.airBubbleInner,
            this.scoreText, this.moneyText, this.crystalsText, this.depthText,
            this.healthText
        ]);

        // Support multi-touch
        this.scene.input.addPointer(2);
        this.setupMobileControls();
    }

    update(air, score, money, crystals, playerY, health) {
        // Counter-scale and reposition UI container to negate camera zoom
        const cam = this.scene.cameras.main;
        const zoom = cam.zoom;
        const centerX = cam.width / 2;
        const centerY = cam.height / 2;
        this.uiContainer.setScale(1 / zoom);
        this.uiContainer.setPosition(centerX * (1 - 1 / zoom), centerY * (1 - 1 / zoom));

        // Update air bar
        const airPct = Math.max(0, Math.min(100, air));
        const fillW = this.airBarWidth * (airPct / 100);
        this.airBarFill.width = fillW;
        if (airPct > 25) this.airBarFill.setFillStyle(0x2288dd);
        else this.airBarFill.setFillStyle(0xcc3333);
        // Move bubble to end of fill
        const bubbleX = 16 + fillW;
        this.airBubble.setPosition(bubbleX, 20);
        this.airBubbleInner.setPosition(bubbleX - 2, 18);
        if (airPct <= 25) {
            this.airBubble.setFillStyle(0xff6666, 0.9);
        } else {
            this.airBubble.setFillStyle(0x66ccff, 0.9);
        }

        this.scoreText.setText(`Score: ${score}`);
        this.moneyText.setText(`Money: $${money}`);
        this.crystalsText.setText(`Crystals: ${crystals}`);

        const hearts = '❤️'.repeat(Math.max(0, health));
        this.healthText.setText(`${hearts}`);

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
            .setInteractive()
            .on('pointerdown', () => this.mobileInputs.slash = true)
            .on('pointerup', () => this.mobileInputs.slash = false)
            .on('pointerout', () => this.mobileInputs.slash = false);

        this.actionBtnText = this.scene.add.text(fireX, fireY, 'FIRE', { fontSize: '24px', fill: '#fff' })
            .setOrigin(0.5);

        this.uiContainer.add([
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

    getMovement() {
        if (!this.joystick.active) return { x: 0, y: 0 };
        return {
            x: Math.cos(this.joystick.angle) * (this.joystick.distance / 50),
            y: Math.sin(this.joystick.angle) * (this.joystick.distance / 50)
        };
    }
}
