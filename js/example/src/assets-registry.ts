// react-native-svg's <Image> support imports React Native's asset registry, which has
// no web build. Chord diagrams never use bundled image assets, so nothing is registered.
export function getAssetByID(_id: number): undefined {
  return undefined;
}

export function registerAsset(_asset: unknown): number {
  return 0;
}
