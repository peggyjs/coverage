/** @type {import('typedoc').TypeDocOptions} */
const config = {
  entryPoints: [
    "lib/index.js",
  ],
  out: "docs",
  cleanOutputDir: true,
  includeVersion: true,
  sidebarLinks: {
    GitHub: "https://github.com/peggyjs/coverage",
    Documentation: "http://peggyjs.github.io/coverage/",
  },
  navigation: {
    includeCategories: false,
    includeGroups: false,
  },
  categorizeByGroup: false,
  sort: ["static-first", "alphabetical"],
};

export default config;
