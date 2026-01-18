/**
 * TUTORIAL AUTO-TRIGGERS
 * Detects critical game moments and automatically queues relevant tutorials
 */

import { TRIGGER_MAPPING } from './tutorialContent.js';

export class TutorialTriggers {
  constructor(tutorial, state, game) {
    this.tutorial = tutorial;
    this.state = state;
    this.game = game;
    this.lastCheckTime = 0;
    this.checkInterval = 100; // Check triggers every 100ms
  }

  /**
   * Register all auto-triggers
   */
  registerAllTriggers() {
    // TIER 1: Game Start
    this.tutorial.registerTrigger(
      'game_start',
      'welcome',
      () => this.state.time < 1 && !this.state.hasStartedTutorial
    );

    // TIER 2: First Combat
    this.tutorial.registerTrigger(
      'first_enemy_encounter',
      'combatBasics',
      () => this.hasEnemiesNearby() && !this.state.hasEncounteredEnemy
    );

    this.tutorial.registerTrigger(
      'first_ability_use',
      'abilityIntro',
      () => this.hasUsedAbility() && !this.state.hasUsedAbility
    );

    // TIER 3: First Loot
    this.tutorial.registerTrigger(
      'first_loot_drop',
      'lootSystem',
      () => this.hasLootOnGround() && !this.state.hasSeenLoot
    );

    this.tutorial.registerTrigger(
      'inventory_opening',
      'abilitySlots',
      () => this.state.showInventory === true && !this.state.hasOpenedInventory
    );

    this.tutorial.registerTrigger(
      'inventory_full',
      'inventory',
      () => this.isInventoryFull()
    );

    // TIER 4: Equipment
    this.tutorial.registerTrigger(
      'first_equipment_pickup',
      'equipmentSystem',
      () => this.hasEquipmentInInventory() && !this.state.hasSeenEquipment
    );

    // TIER 5: Leveling
    this.tutorial.registerTrigger(
      'first_level_up',
      'progressionSystem',
      () => this.state.player && this.state.player.level > 0 && !this.state.hasLeveledUp
    );

    // TIER 6: Groups
    this.tutorial.registerTrigger(
      'npc_recruitment',
      'groupSystem',
      () => this.hasRecruitedNPC() && !this.state.hasRecruitedNPC
    );

    this.tutorial.registerTrigger(
      'member_in_group',
      'abilityAssignment',
      () => this.state.friendlies && this.state.friendlies.length > 0 && !this.state.hasAssignedGroupAbility
    );

    // TIER 7: Buffs
    this.tutorial.registerTrigger(
      'first_buff_applied',
      'buffsDebuffs',
      () => this.hasActiveBuffs() && !this.state.hasSeenBuffs
    );

    // TIER 8: Outposts
    this.tutorial.registerTrigger(
      'outpost_area_reached',
      'outpostSystem',
      () => this.isNearOutpost() && !this.state.hasReachedOutpost
    );

    // TIER 9: Dungeons
    this.tutorial.registerTrigger(
      'dungeon_reached',
      'dungeonIntro',
      () => this.isNearDungeon() && !this.state.hasReachedDungeon
    );

    // TIER 10: Market
    this.tutorial.registerTrigger(
      'market_reached',
      'market',
      () => this.isNearMerchant() && !this.state.hasReachedMarket
    );

    // TIER 11: Guards
    this.tutorial.registerTrigger(
      'guard_slot_unlocked',
      'guardSystem',
      () => this.canDeployGuards() && !this.state.hasUnlockedGuards
    );

    // TIER 12: Advanced
    this.tutorial.registerTrigger(
      'combat_tactics_hint',
      'combatTactics',
      () => this.shouldShowCombatTips()
    );

    this.tutorial.registerTrigger(
      'farming_efficiency',
      'farmingGuide',
      () => this.hasBeenPlayingLong() && !this.state.hasSeenFarmingGuide
    );
  }

  /**
   * Update and check triggers each frame
   */
  update(now) {
    if (now - this.lastCheckTime < this.checkInterval) return;
    this.lastCheckTime = now;
    
    this.tutorial.checkTriggers();
  }

  // ==================== HELPER METHODS ====================

  /**
   * Check if there are enemies nearby
   */
  hasEnemiesNearby() {
    if (!this.state.enemies) return false;
    for (const enemy of this.state.enemies) {
      if (!enemy.dead && this.distanceTo(enemy) < 200) {
        return true;
      }
    }
    return false;
  }

  /**
   * Check if player has used an ability recently
   */
  hasUsedAbility() {
    if (!this.state.player) return false;
    return (this.state.player.lastAbilityTime || 0) > (this.state.time || 0) - 5;
  }

  /**
   * Check if there's loot on the ground
   */
  hasLootOnGround() {
    if (!this.game.itemDrops) return false;
    return this.game.itemDrops.some(item => 
      !item.pickedUp && this.distanceTo(item) < 100
    );
  }

  /**
   * Check if inventory is full
   */
  isInventoryFull() {
    if (!this.state.player) return false;
    const inventory = this.state.player.inventory || [];
    const maxSlots = 20;
    return inventory.length >= maxSlots;
  }

  /**
   * Check if player has equipment in inventory
   */
  hasEquipmentInInventory() {
    if (!this.state.player) return false;
    const inventory = this.state.player.inventory || [];
    return inventory.some(item => 
      item && item.type && ['helmet', 'chest', 'legs', 'boots', 'weapon'].includes(item.type)
    );
  }

  /**
   * Check if player has recruited an NPC
   */
  hasRecruitedNPC() {
    return this.state.friendlies && this.state.friendlies.length > 0;
  }

  /**
   * Check if player has active buffs
   */
  hasActiveBuffs() {
    if (!this.state.player || !this.state.player.buffs) return false;
    const now = this.state.time || Date.now() / 1000;
    return this.state.player.buffs.some(buff => buff.expiresAt > now);
  }

  /**
   * Check if player is near an outpost
   */
  isNearOutpost() {
    if (!this.state.sites) return false;
    for (const site of this.state.sites) {
      if (site.id && site.id.startsWith('site_') && this.distanceTo(site) < 150) {
        return true;
      }
    }
    return false;
  }

  /**
   * Check if player is near a dungeon entrance
   */
  isNearDungeon() {
    if (!this.state.dungeons) return false;
    for (const dungeon of this.state.dungeons) {
      if (this.distanceTo(dungeon) < 150) {
        return true;
      }
    }
    return false;
  }

  /**
   * Check if player is near a merchant
   */
  isNearMerchant() {
    if (!this.state.npcs) return false;
    for (const npc of this.state.npcs) {
      if (npc.role === 'merchant' && this.distanceTo(npc) < 100) {
        return true;
      }
    }
    return false;
  }

  /**
   * Check if player can deploy guards (guard slot unlocked)
   */
  canDeployGuards() {
    return this.state.guardSlotUnlocked === true;
  }

  /**
   * Check if we should show combat tips
   */
  shouldShowCombatTips() {
    if (!this.state.player) return false;
    // Show after 10+ combat encounters
    return (this.state.player.combatEncounters || 0) === 10;
  }

  /**
   * Check if player has been playing long enough
   */
  hasBeenPlayingLong() {
    if (!this.state.startTime) return false;
    const playTime = (this.state.time || 0) - this.state.startTime;
    return playTime > 3600; // 1 hour
  }

  /**
   * Calculate distance between player and target
   */
  distanceTo(target) {
    if (!this.state.player || !target) return Infinity;
    const dx = this.state.player.x - target.x;
    const dy = this.state.player.y - target.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Mark tutorial flags after showing
   */
  markTutorialSeen(tutorialId) {
    switch(tutorialId) {
      case 'welcome':
        this.state.hasStartedTutorial = true;
        break;
      case 'combatBasics':
        this.state.hasEncounteredEnemy = true;
        break;
      case 'abilityIntro':
        this.state.hasUsedAbility = true;
        break;
      case 'lootSystem':
        this.state.hasSeenLoot = true;
        break;
      case 'equipmentSystem':
        this.state.hasSeenEquipment = true;
        break;
      case 'progressionSystem':
        this.state.hasLeveledUp = true;
        break;
      case 'groupSystem':
        this.state.hasRecruitedNPC = true;
        break;
      case 'abilityAssignment':
        this.state.hasAssignedGroupAbility = true;
        break;
      case 'buffsDebuffs':
        this.state.hasSeenBuffs = true;
        break;
      case 'outpostSystem':
        this.state.hasReachedOutpost = true;
        break;
      case 'dungeonIntro':
        this.state.hasReachedDungeon = true;
        break;
      case 'market':
        this.state.hasReachedMarket = true;
        break;
      case 'guardSystem':
        this.state.hasUnlockedGuards = true;
        break;
      case 'farmingGuide':
        this.state.hasSeenFarmingGuide = true;
        break;
    }
  }
}

export default TutorialTriggers;
