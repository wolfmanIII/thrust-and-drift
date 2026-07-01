import '@testing-library/jest-dom'

// jsdom does not implement canvas 2D context — provide a no-op stub so
// components that use canvas (e.g. ShapePreview in AddShipModal) do not throw.
HTMLCanvasElement.prototype.getContext = function () {
  return {
    scale: () => {}, clearRect: () => {}, save: () => {}, restore: () => {},
    translate: () => {}, rotate: () => {}, fill: () => {}, stroke: () => {},
    beginPath: () => {}, closePath: () => {}, moveTo: () => {}, lineTo: () => {}, arc: () => {}, ellipse: () => {},
    quadraticCurveTo: () => {}, bezierCurveTo: () => {}, rect: () => {},
    set fillStyle(_) {}, set strokeStyle(_) {}, set lineWidth(_) {}, set globalAlpha(_) {},
  }
}
