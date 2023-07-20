import adapter from '@sveltejs/adapter-node';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  kit: {
    adapter: adapter({
      envPrefix: "STUDIO_",
    }),
    paths: {
      base: "/studio",
    }
  },
};

export default config;
