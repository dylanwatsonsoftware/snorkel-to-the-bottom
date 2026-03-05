import Phaser from 'phaser';
import { PLAYER } from '../config/GameConfig';

export class UIManager {
    constructor(scene) {
        this.scene = scene;
        this.joystick = { base: null, thumb: null, active: false, x: 0, y: 0, distance: 0, angle: 0, pointer: null };
        this.mobileInputs = { slash: false };
    }

    create() {
        // HUD container — counter-scaled each frame to negate camera zoom
        this.uiContainer = this.scene.add.container(0, 0);
        this.uiContainer.setScrollFactor(0);
        this.uiContainer.setDepth(100);

        // Mobile controls container — stays in screen space, no zoom compensation
        this.mobileContainer = this.scene.add.container(0, 0);
        this.mobileContainer.setScrollFactor(0);
        this.mobileContainer.setDepth(100);

        this.createHUD();

        this.scene.input.addPointer(2);
        this.setupMobileControls();
    }

    createHUD() {
        const pad = 16;

        // --- Left Panel: Semi-transparent background ---
        const panelBg = this.scene.add.graphics();
        panelBg.fillStyle(0x000011, 0.4);
        panelBg.fillRoundedRect(pad - 8, pad - 6, 196, 126, 8);
        panelBg.lineStyle(1, 0x335577, 0.5);
        panelBg.strokeRoundedRect(pad - 8, pad - 6, 196, 126, 8);

        // --- Air Bar ---
        this.airBarWidth = 152;
        const barH = 10;
        const airY = pad + 8;

        const airLabel = this.scene.add.text(pad, pad - 4, 'O\u2082', {
            fontSize: '12px', fill: '#66ccff', fontStyle: 'bold',
            stroke: '#000', strokeThickness: 2
        });

        const airBarBg = this.scene.add.rectangle(pad + 26, airY, this.airBarWidth, barH, 0x112233)
            .setOrigin(0, 0.5);
        this.airBarFill = this.scene.add.rectangle(pad + 26, airY, this.airBarWidth, barH, 0x22aadd)
            .setOrigin(0, 0.5);

        const airBarFrame = this.scene.add.graphics();
        airBarFrame.lineStyle(1, 0x4488aa, 0.8);
        airBarFrame.strokeRect(pad + 25, airY - barH / 2 - 1, this.airBarWidth + 2, barH + 2);

        // --- Stats Grid (2x2) ---
        const labelStyle = { fontSize: '10px', fill: '#8899aa', fontStyle: 'bold', stroke: '#000', strokeThickness: 1 };
        const valStyle = { fontSize: '16px', fill: '#ffffff', fontStyle: 'bold', stroke: '#000', strokeThickness: 3 };

        const col1 = pad;
        const col2 = pad + 98;
        const row1 = airY + 14;
        const row2 = row1 + 36;

        const scoreLabel = this.scene.add.text(col1, row1, 'SCORE', labelStyle);
        this.scoreText = this.scene.add.text(col1, row1 + 12, '0', valStyle);

        const goldLabel = this.scene.add.text(col2, row1, 'GOLD', labelStyle);
        this.moneyText = this.scene.add.text(col2, row1 + 12, '$0',
            { ...valStyle, fill: '#ffdd44' });

        const crystalsLabel = this.scene.add.text(col1, row2, 'CRYSTALS', labelStyle);
        this.crystalsText = this.scene.add.text(col1, row2 + 12, '0',
            { ...valStyle, fill: '#cc88ff' });

        const depthLabel = this.scene.add.text(col2, row2, 'DEPTH', labelStyle);
        this.depthText = this.scene.add.text(col2, row2 + 12, '0m',
            { ...valStyle, fill: '#66ddff' });

        // --- Hearts (top-right) ---
        const { width } = this.scene.scale;
        this.hearts = [];
        const maxHearts = Math.ceil(PLAYER.MAX_HEALTH / 2);
        const heartSpacing = 26;
        const heartsStartX = width - pad - maxHearts * heartSpacing + heartSpacing / 2;

        // Subtle panel behind hearts
        const heartPanelBg = this.scene.add.graphics();
        heartPanelBg.fillStyle(0x110000, 0.35);
        heartPanelBg.fillRoundedRect(
            heartsStartX - 16, pad - 6,
            maxHearts * heartSpacing + 18, 32, 8
        );

        for (let i = 0; i < maxHearts; i++) {
            const heart = this.scene.add.image(
                heartsStartX + i * heartSpacing, pad + 10, 'heart-full'
            ).setScale(1.3);
            this.hearts.push(heart);
        }

        // Add everything to HUD container
        this.uiContainer.add([
            panelBg,
            airLabel, airBarBg, this.airBarFill, airBarFrame,
            scoreLabel, this.scoreText,
            goldLabel, this.moneyText,
            crystalsLabel, this.crystalsText,
            depthLabel, this.depthText,
            heartPanelBg, ...this.hearts
        ]);
    }

    update(air, score, money, crystals, playerY, health) {
        // Counter-scale HUD to negate camera zoom
        const cam = this.scene.cameras.main;
        const zoom = cam.zoom;
        const centerX = cam.width / 2;
        const centerY = cam.height / 2;
        this.uiContainer.setScale(1 / zoom);
        this.uiContainer.setPosition(centerX * (1 - 1 / zoom), centerY * (1 - 1 / zoom));

        // Air bar
        const airPct = Math.max(0, Math.min(100, air));
        this.airBarFill.width = this.airBarWidth * (airPct / 100);
        this.airBarFill.setFillStyle(airPct > 25 ? 0x22aadd : 0xcc3333);

        // Stats
        this.scoreText.setText(`${score}`);
        this.moneyText.setText(`$${money}`);
        this.crystalsText.setText(`${crystals}`);

        const currentDepth = Math.max(0, Math.floor((playerY - 300) / 10));
        this.depthText.setText(`${currentDepth}m`);

        // Hearts
        this.updateHearts(health);
    }

    updateHearts(health) {
        for (let i = 0; i < this.hearts.length; i++) {
            const threshold = (i + 1) * 2;
            if (health >= threshold) {
                this.hearts[i].setTexture('heart-full');
            } else if (health >= threshold - 1) {
                this.hearts[i].setTexture('heart-half');
            } else {
                this.hearts[i].setTexture('heart-empty');
            }
        }
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
