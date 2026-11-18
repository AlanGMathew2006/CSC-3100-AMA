// Screens read safe-area insets; tests have no native provider, so use the library's mock
// (all insets 0, 390x844 frame).
jest.mock("react-native-safe-area-context", () =>
  require("react-native-safe-area-context/jest/mock").default,
);
