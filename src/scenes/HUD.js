import Phaser from 'phaser';
import { PLAYER } from '../config/GameConfig';

export class HUD extends Phaser.Scene {
    constructor() {
        super('HUD');
    }

    create() {
        const pad = 16;
        const dpr = Math.max(window.devicePixelRatio || 1, 2);

        // --- Mobile Controls ---
        this.joystick = { base: null, thumb: null, active: false, distance: 0, angle: 0, pointer: null };
        this.mobileInputs = { slash: false };
        this.input.addPointer(2);
        this.setupMobileControls();

        // --- Left Panel: Semi-transparent background ---
        const panelBg = this.add.graphics();
        panelBg.fillStyle(0x000011, 0.4);
        panelBg.fillRoundedRect(pad - 8, pad - 6, 196, 120, 8);
        panelBg.lineStyle(1, 0x335577, 0.5);
        panelBg.strokeRoundedRect(pad - 8, pad - 6, 196, 120, 8);

        // --- Air Bar ---
        this.airBarWidth = 152;
        const barH = 10;
        const airY = pad + 8;

        this.add.image(pad + 8, airY, 'icon-bubble');

        const airBarBg = this.add.rectangle(pad + 26, airY, this.airBarWidth, barH, 0x112233)
            .setOrigin(0, 0.5);
        this.airBarFill = this.add.rectangle(pad + 26, airY, this.airBarWidth, barH, 0x22aadd)
            .setOrigin(0, 0.5);

        const airBarFrame = this.add.graphics();
        airBarFrame.lineStyle(1, 0x4488aa, 0.8);
        airBarFrame.strokeRect(pad + 25, airY - barH / 2 - 1, this.airBarWidth + 2, barH + 2);

        // --- Stats Grid (2x2) with icons ---
        const valStyle = {
            fontSize: '16px', fill: '#ffffff', fontStyle: 'bold',
            stroke: '#000', strokeThickness: 1.5,
            resolution: dpr
        };

        const col1 = pad + 10;
        const col2 = pad + 108;
        const row1 = airY + 38;
        const row2 = row1 + 34;

        this.add.image(col1 + 8, row1 + 2, 'icon-star');
        this.scoreText = this.add.text(col1 + 20, row1 - 6, '0', valStyle);

        this.add.image(col2 + 8, row1 + 2, 'icon-coin');
        this.moneyText = this.add.text(col2 + 20, row1 - 6, '$0',
            { ...valStyle, fill: '#ffdd44' });

        this.add.image(col1 + 8, row2 + 2, 'icon-crystal');
        this.crystalsText = this.add.text(col1 + 20, row2 - 6, '0',
            { ...valStyle, fill: '#cc88ff' });

        this.add.image(col2 + 8, row2 + 2, 'icon-depth');
        this.depthText = this.add.text(col2 + 20, row2 - 6, '0m',
            { ...valStyle, fill: '#66ddff' });

        // --- Hearts (top-right) ---
        const { width } = this.scale;
        this.hearts = [];
        const maxHearts = Math.ceil(PLAYER.MAX_HEALTH / 2);
        const heartSpacing = 26;
        const heartsStartX = width - pad - maxHearts * heartSpacing + heartSpacing / 2;

        // Subtle panel behind hearts
        this.heartPanelBg = this.add.graphics();
        this.heartPanelBg.fillStyle(0x110000, 0.35);
        this.heartPanelBg.fillRoundedRect(
            heartsStartX - 16, pad - 6,
            maxHearts * heartSpacing + 18, 32, 8
        );

        for (let i = 0; i < maxHearts; i++) {
            const heart = this.add.image(
                heartsStartX + i * heartSpacing, pad + 10, 'heart-full'
            ).setScale(1.3);
            this.hearts.push(heart);
        }

        this.heartsVisible = true;
    }

    setupMobileControls() {
        const { width, height } = this.scale;
        const padding = 20;
        const baseRadius = 60;
        const thumbRadius = 30;

        const jX = padding + baseRadius + 20;
        const jY = height - padding - baseRadius - 90;

        this.joystick.base = this.add.circle(jX, jY, baseRadius, 0xffffff, 0.1)
            .setInteractive();

        this.joystick.thumb = this.add.circle(jX, jY, thumbRadius, 0xffffff, 0.3);

        this.joystick.base.on('pointerdown', (pointer) => {
            this.joystick.pointer = pointer;
            this.handleJoystickMove(pointer);
        });

        this.input.on('pointermove', (pointer) => {
            if (this.joystick.pointer && this.joystick.pointer.id === pointer.id) {
                this.handleJoystickMove(pointer);
            }
        });

        this.input.on('pointerup', (pointer) => {
            if (this.joystick.pointer && this.joystick.pointer.id === pointer.id) {
                this.resetJoystick();
            }
        });

        const btnSize = 80;
        const fireX = width - padding - btnSize / 2;
        const fireY = height - padding - btnSize / 2 - 80;

        this.actionIcon = this.add.image(fireX, fireY, 'btn-fire')
            .setAlpha(0.7)
            .setInteractive({ useHandCursor: true })
            .on('pointerdown', () => {
                this.mobileInputs.slash = true;
                this.actionIcon.setAlpha(1);
            })
            .on('pointerup', () => {
                this.mobileInputs.slash = false;
                this.actionIcon.setAlpha(0.7);
            })
            .on('pointerout', () => {
                this.mobileInputs.slash = false;
                this.actionIcon.setAlpha(0.7);
            });
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
        if (!this.actionIcon) return;
        const key = label === 'SLASH' ? 'btn-slash' : 'btn-fire';
        this.actionIcon.setTexture(key);
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

    updateHUD(air, score, money, crystals, playerY, health, gameMode) {
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

        // Show hearts only on surface, hide when diving
        const showHearts = gameMode === 'surface';
        if (showHearts !== this.heartsVisible) {
            this.heartsVisible = showHearts;
            this.heartPanelBg.setVisible(showHearts);
            this.hearts.forEach(h => h.setVisible(showHearts));
        }

        // Update heart textures (only when visible)
        if (showHearts) {
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
    }
}
