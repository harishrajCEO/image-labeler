/** @type {import('next').NextConfig} */
const nextConfig: import('next').NextConfig = {
  images: {
    domains: ['localhost'],
  },
  webpack: (config: any, { isServer }: { isServer: boolean }) => {
    // Handle GeoTIFF files
    config.module.rules.push({
      test: /\.tif$/,
      use: [
        {
          loader: 'file-loader',
          options: {
            publicPath: '/_next/static/files',
            outputPath: 'static/files',
          },
        },
      ],
    });

    return config;
  },
}

export default nextConfig
