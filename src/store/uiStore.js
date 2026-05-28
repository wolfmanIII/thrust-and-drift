/**
 * UI state store — modal visibility, selection, context menu.
 * Covers only transient UI state; no game mechanics.
 */

import { create } from 'zustand'

/**
 * @typedef {'shipProfile'|'addShip'|'thrust'|'attack'|'shipDetail'|'action'|'initiative'|null} ModalId
 */

/**
 * @typedef {{ x: number, y: number, type: 'empty'|'ship'|'missile', targetId: string|null }} ContextMenuState
 */

const useUiStore = create((set) => ({
  // === SCREEN ===
  /**
   * Top-level application screen.
   * 'dashboard' = pre-battle lobby; 'battle' = active combat map.
   * @type {'dashboard'|'battle'}
   */
  screen: 'dashboard',

  /** @param {'dashboard'|'battle'} screen */
  gotoScreen: (screen) => set({ screen }),

  // === MODAL ===
  /** @type {ModalId} */
  activeModal: null,
  /** @type {object|null} Context payload passed when opening a modal */
  modalPayload: null,

  /**
   * Open a modal with an optional payload.
   * @param {ModalId} id
   * @param {object} [payload]
   */
  openModal: (id, payload = null) => set({ activeModal: id, modalPayload: payload }),

  /** Close the currently active modal and clear its payload. */
  closeModal: () => set({ activeModal: null, modalPayload: null }),

  // === SELECTION ===
  /** @type {string|null} ID of the currently selected ShipInstance */
  selectedShipId: null,

  /** @param {string|null} id */
  selectShip: (id) => set({ selectedShipId: id }),
  clearSelection: () => set({ selectedShipId: null }),

  // === CONTEXT MENU ===
  /** @type {ContextMenuState|null} */
  contextMenu: null,

  /**
   * Show context menu at canvas pixel position.
   * @param {ContextMenuState} ctx
   */
  showContextMenu: (ctx) => set({ contextMenu: ctx }),
  hideContextMenu: () => set({ contextMenu: null }),

  // === PLACEMENT MODE ===
  /**
   * When not null, the UI is in "place ship" mode.
   * The user must click a hex cell to place this profile.
   * @type {{ profile: object, faction: string, color: string }|null}
   */
  pendingPlacement: null,

  /** @param {{ profile: object, faction: string, color: string }} placement */
  startPlacement: (placement) => set({ pendingPlacement: placement }),
  cancelPlacement: () => set({ pendingPlacement: null }),

  // === SHIP HOVER TOOLTIP ===
  /**
   * Ship currently hovered on the canvas, with its viewport position.
   * @type {{ shipId: string, x: number, y: number }|null}
   */
  hoveredShip: null,

  /** @param {{ shipId: string, x: number, y: number }} state */
  setHoveredShip: (state) => set({ hoveredShip: state }),
  clearHoveredShip: () => set({ hoveredShip: null }),
}))

export { useUiStore }
