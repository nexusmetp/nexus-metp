const nextConfig = {
  output: process.env.VERCEL ? undefined : 'standalone',
  images: {
    unoptimized: true,
    remotePatterns: [
      { protocol: 'https', hostname: 'avatars.githubusercontent.com', pathname: '/**' },
      { protocol: 'https', hostname: 'customer-assets-4nw71qhi.emergentagent.net', pathname: '/**' },
      { protocol: 'https', hostname: 'images.unsplash.com', pathname: '/**' },
    ],
  },
  // Renamed from experimental.serverComponentsExternalPackages in Next 15
  serverExternalPackages: ['mongodb'],
  // Next 16 refuse par défaut de servir ses ressources de développement à une
  // origine autre que celle qu'il a inscrite. Le serveur écoute sur 0.0.0.0
  // pour être joignable depuis un autre poste du service ; sans cette liste,
  // la page arrive mais React ne s'y attache jamais, et l'écran reste figé
  // sans un mot. Ne vaut qu'en développement.
  allowedDevOrigins: ['127.0.0.1', 'localhost', '0.0.0.0'],

  // `next dev` ajoute sinon, à chaque lancement, un bloc en anglais à la fin
  // de CLAUDE.md et d'AGENTS.md. CLAUDE.md est le document de conventions du
  // dépôt, écrit en français et relu : il n'appartient pas à l'outillage.
  // Ce que ce bloc avait d'utile est repris dans la section « Conventions ».
  agentRules: false,

  // Depuis Next 16, Turbopack assemble le projet par défaut. La configuration
  // webpack qui vivait ici ne servait qu'à remplacer la surveillance des
  // fichiers par une scrutation toutes les deux secondes, pour épargner le
  // processeur ; le surveillant natif de Turbopack rend cela inutile. La
  // laisser ferait échouer la construction : Next refuse une configuration
  // webpack sans configuration Turbopack en regard.
  //
  // `npm run dev:webpack` garde l'ancien moteur sous la main, au cas où.
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "ALLOWALL" },
          { key: "Content-Security-Policy", value: "frame-ancestors *;" },
          { key: "Access-Control-Allow-Origin", value: process.env.CORS_ORIGINS || "*" },
          { key: "Access-Control-Allow-Methods", value: "GET, POST, PUT, DELETE, OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "*" },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
