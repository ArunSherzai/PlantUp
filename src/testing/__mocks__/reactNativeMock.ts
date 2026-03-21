// Minimal react-native mock for Jest
export const Platform = { OS: 'android', select: (obj: any) => obj.android ?? obj.default };
export const StyleSheet = { create: (styles: any) => styles };
export const View = 'View';
export const Text = 'Text';
export const Image = 'Image';
export type ImageSourcePropType = any;
