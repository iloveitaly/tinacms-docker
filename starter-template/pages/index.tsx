import Head from 'next/head';

export default function Home() {
  return (
    <>
      <Head>
        <title>TinaCMS Docker Starter</title>
        <meta name="description" content="TinaCMS with Docker and MongoDB" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main style={{ padding: '2rem', fontFamily: 'system-ui, sans-serif' }}>
        <h1>Welcome to TinaCMS Docker Starter! 🎉</h1>
        <p>Your TinaCMS site is running successfully with MongoDB and Docker.</p>

        <div style={{ marginTop: '2rem' }}>
          <h2>Next Steps:</h2>
          <ul>
            <li>Visit <a href="/admin" style={{ color: 'blue' }}>/admin</a> to access the CMS</li>
            <li>Edit content in the CMS</li>
            <li>Create pages and blog posts</li>
            <li>Customize your site in <code>pages/index.tsx</code></li>
          </ul>
        </div>

        <div style={{ marginTop: '2rem', padding: '1rem', background: '#f0f0f0', borderRadius: '8px' }}>
          <h3>Configuration:</h3>
          <ul>
            <li><strong>Database:</strong> MongoDB</li>
            <li><strong>Git Provider:</strong> GitHub</li>
            <li><strong>Authentication:</strong> NextAuth.js</li>
            <li><strong>Framework:</strong> Next.js</li>
          </ul>
        </div>
      </main>
    </>
  );
}
