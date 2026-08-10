const APPLE = /mac|iphone|ipad|ipod/i;

export function isApplePlatform(): boolean {
  if (typeof navigator === "undefined") return false;
  return APPLE.test(navigator.platform) || APPLE.test(navigator.userAgent);
}

export function modifierKeyLabel(): string {
  return isApplePlatform() ? "⌘" : "Ctrl";
}
