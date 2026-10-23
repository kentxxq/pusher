import { defineConfig } from "vitepress";

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: "pusher",
  description: "pusher-简单好用的推送工具",
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    nav: [
      { text: "主页", link: "/" },
      // { icon: "github", link: "https://github.com/kentxxq/pusher" },
    ],

    sidebar: [
      {
        text: "入门",
        items: [{ text: "快速上手", link: "/quick-start" }],
      },
      {
        text: "高级玩法",
        items: [
          { text: "管道配置", link: "/channels" },
          { text: "字符串模板", link: "/string-template" },
          { text: "部署", link: "/deploy" },
          { text: "FAQ", link: "/faq" },
        ],
      },
    ],

    socialLinks: [
      { icon: "github", link: "https://github.com/kentxxq/pusher" },
      // { icon: "github", link: "https://github.com/kentxxq/pusher-docs" },
      // { icon: "github", link: "https://github.com/kentxxq/pusher-docs" },
    ],
  },
});
