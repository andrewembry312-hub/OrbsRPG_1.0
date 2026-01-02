export const INV_SIZE=24;
export const LOOT_TTL=30.0;
export const KEYBIND_VERSION = 5; // Increment to force keybind reset

export const ARMOR_SLOTS=['weapon','helm','shoulders','chest','hands','belt','legs','feet','neck','accessory1','accessory2'];
export const SLOT_LABEL={
  weapon:'Weapon',
  helm:'Helm', shoulders:'Shoulders', chest:'Chest', hands:'Hands', belt:'Belt', legs:'Legs', feet:'Feet',
  neck:'Necklace', accessory1:'Accessory 1', accessory2:'Accessory 2'
};

export const DEFAULT_BINDS = {
  moveUp: 'KeyW', moveDown: 'KeyS', moveLeft: 'KeyA', moveRight: 'KeyD',
  interact: 'KeyF', inventory: 'KeyI', menu:'Escape', sprint:'ShiftLeft',
  abil1:'KeyQ', abil2:'KeyE', abil3:'Digit3', abil4:'KeyR', abil5:'KeyT',
  level:'KeyP', potion:'KeyG', map:'KeyM', skills:'KeyK',
  garrisonFlag1:'Digit1', garrisonFlag2:'Digit2', garrisonFlag3:'Digit3', garrisonFlag4:'Digit4', garrisonFlag5:'Digit5', garrisonFlag6:'Digit6',
  garrisonUnassignAll:'Digit7',
  groupInviteAll:'Digit8', groupDisband:'Digit9'
};

export const ACTION_LABELS = {
  moveUp:'Move Forward', moveDown:'Move Back', moveLeft:'Move Left', moveRight:'Move Right',
  interact:'Interact', inventory:'Inventory', menu:'Menu', sprint:'Sprint',
  abil1:'Ability Slot 1', abil2:'Ability Slot 2', abil3:'Ability Slot 3', abil4:'Ability Slot 4', abil5:'Ability Slot 5',
  level:'Level Up Screen', potion:'Use Potion', map:'Map', skills:'Skills',
  attack:'Attack (Left Click)', heavyAttack:'Heavy Attack (Hold Left Click)', block:'Block (Right Click)',
  garrisonFlag1:'Assign Allies to Flag 1', garrisonFlag2:'Assign Allies to Flag 2', garrisonFlag3:'Assign Allies to Flag 3',
  garrisonFlag4:'Assign Allies to Flag 4', garrisonFlag5:'Assign Allies to Flag 5', garrisonFlag6:'Assign Allies to Flag 6',
  garrisonUnassignAll:'Unassign All Garrison',
  groupInviteAll:'Invite All Allies to Group', groupDisband:'Disband Group'
};
