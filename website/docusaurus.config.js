module.exports = {
  title: "Simulacrum",
  tagline: "Graph-based test data management",
  url: "https://frontside.com/",
  baseUrl: "/simulacrum/",
  onBrokenLinks: "throw",
  favicon: "images/favicon-simulacrum.png",
  organizationName: "thefrontside",
  projectName: "simulacrum",
  themeConfig: {
    colorMode: {
      disableSwitch: true,
      respectPrefersColorScheme: true,
    },
    prism: {
      theme: require("prism-react-renderer/themes/nightOwl"),
    },
    navbar: {
      title: "Simulacrum",
      logo: {
        alt: 'Simulacrum',
        src: 'images/simulacrum-logo.svg',
      },
      items: [
        {
          to: "/docs",
          label: "Docs",
          position: "right",
        },
        {
          href: "https://github.com/thefrontside/simulacrum",
          label: "GitHub",
          position: "right",
        },
        {
          href: "https://discord.gg/r6AvtnU",
          label: "Discord",
          position: "right",
        },
      ],
    },
    footer: {
      style: "light",
      links: [
        {
          title: 'About',
          items: [
            {
              label: "Maintained by Frontside",
              href: "https://fronside.com/",
            },
            {
              label: "Article: Beyond Mocking",
              href: "https://frontside.com/blog/2020-07-29-decoupling-teams-through-simulation/"
            }
          ]
        },
        {
          title: "OSS Projects",
          items: [
            {
              label: "Simulacrum",
              to: "/",
            },
            {
              label: "Interactors",
              href: "https://frontside.com/interactors",
            },
            {
              label: "Bigtest",
              href: "https://frontside.com/bigtest",
            },
            {
              label: "Effection",
              href: "https://frontside.com/effection",
            },
          ],
        },
        {
          title: "Community",
          items: [
            {
              label: "Discord",
              href: "https://discord.gg/r6AvtnU",
            },
            {
              label: "GitHub",
              href: "https://github.com/thefrontside/simulacrum",
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} The Frontside Software, Inc.`,
    },
    image: "images/meta-simulacrum.png",
  },
  presets: [
    [
      "@docusaurus/preset-classic",
      {
        docs: {
          sidebarPath: require.resolve("./sidebars.js"),
          versions: {
            current: {
              banner: "none",
            },
          },
        },
        theme: {
          customCss: require.resolve("./src/css/custom.css"),
        },
      },
    ],
  ],
  stylesheets: ["https://use.typekit.net/ugs0ewy.css"],
  plugins: [
    [
      require.resolve("./plugins/docusaurus-plugin-vanilla-extract"),
      {
        /* options */
      },
    ],
  ],
  scripts: [
    {
      src: "https://plausible.io/js/plausible.js",
      async: true,
      defer: true,
      "data-domain": "frontside.com",
    },
  ],
};
