module.exports = {
  preset: "jest-expo",
  setupFiles: ["./jest.setup.js"],
  testPathIgnorePatterns: ["/node_modules/", "/dist/"],
};
