# Feature Specifications: Snorkel to the Bottom

This document outlines the technical requirements and implementation details for proposed improvements.

## Mechanical Specifications

### 1. Weight & Encumbrance System
*   **Trigger:** Accumulation of Money and Crystals during a dive.
*   **Logic:**
    *   `base_weight = 0`
    *   `current_weight = (money / 100) + (crystals * 10)`
    *   `weight_penalty_factor = current_weight / max_weight_capacity`
*   **Impact:**
    *   `actual_speed = base_speed * (1 - (0.5 * weight_penalty_factor))` (Minimum 50% speed).
    *   `air_depletion_rate = base_depletion * (1 + weight_penalty_factor)` (Up to 2x depletion).
*   **UI:** Add a "Weight" bar or numerical weight indicator near the Money display.

### 2. Surface Upgrade Shop
*   **Trigger:** Interaction with the boat while at the surface (y < 300).
*   **Upgrades:**
    *   **Air Tank (Level 1-5):** Increases `max_air` by 25 per level (Base 100).
    *   **Fins (Level 1-5):** Increases `base_speed` by 20 per level (Base 200).
    *   **Steel Sword (Level 1-3):** Increases sword hitbox size by 15% and swing duration by 5% per level.
*   **Persistence:** Level state must be stored in a `GameStateManager` or simple global object.

### 3. Harpoon Launcher
*   **Input:** Aim with mouse/joystick; fire with 'F' or a new 'HARPOON' mobile button.
*   **Physics:**
    *   Launches a `Harpoon` sprite at `speed = 400`.
    *   Destroys enemies on contact.
    *   Disappears after travel distance of 500px.
*   **Cooldown:** 1.5 seconds between shots.

### 4. Dash Mechanic
*   **Input:** Shift (Keyboard) or Double-Tap joystick (Mobile).
*   **Cost:** Instantly consumes 10 Air units.
*   **Benefit:** Velocity multiplier of 2.5x for 200ms.
*   **Cooldown:** 3 seconds.

### 5. Banking Mechanic
*   **Goal:** Create a loop of "Dive, Loot, Return, Upgrade".
*   **Logic:**
    *   `collected_loot` is temporary while underwater.
    *   If the player dies, 50% of temporary loot is lost.
    *   Touching the Boat at y < 300 "Banks" the loot, converting it to permanent currency.

## Visual Specifications

### 1. Parallax Backgrounds
*   **Layer 1 (Sky):** Scroll Factor `(1.0, 1.0)`.
*   **Layer 2 (Far Background):** Distant silhouettes of large sea life or rock formations. Scroll Factor `(0.1, 0.1)`.
*   **Layer 3 (Mid Background):** Seaweed clumps and bubble streams. Scroll Factor `(0.4, 0.4)`.
*   **Layer 4 (Play Area):** Treasure, Pirates, and the Player. Scroll Factor `(1.0, 1.0)`.
*   **Implementation:** Use `this.add.tileSprite()` for repeating textures.

### 2. Depth-Based Lighting
*   **Technique:** Alpha Overlay.
*   **Logic:**
    *   Create a full-screen black rectangle covering the dive area.
    *   Set initial alpha to `0.0`.
    *   `target_alpha = Math.min(0.8, (player.y - 300) / 2700)`
    *   Lerp the rectangle's alpha toward `target_alpha` in the `update()` loop.
*   **Flashlight Effect (Optional):** Attach a Graphics object with a mask to the player to create a circle of "light" (clearing the alpha overlay) around the player.

### 3. Particle Effects
*   **Snorkel Bubbles:**
    *   **Emitter Type:** Gravity-based (upward velocity).
    *   **Trigger:** Constant while `isDiving = true`.
    *   **Frequency:** 1 particle every 500ms (standard), every 100ms (while moving fast).
*   **Combat Hit Effects:**
    *   **Burst:** 10-15 small white/silver particles.
    *   **Easing:** Explosive out.
    *   **Duration:** 300ms.
