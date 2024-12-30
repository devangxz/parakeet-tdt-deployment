import nextra from 'nextra'

const nextConfig = {
  webpack: (config) => {
    config.resolve.alias.canvas = false
    return config
  },
  reactStrictMode: false,
}

const withNextra = nextra({
  theme: 'nextra-theme-docs',
  themeConfig: './theme.config.jsx',
})

export default withNextra(nextConfig)
