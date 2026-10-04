import Link from "next/link";

const packs = [
  { name: "Portrait Pack", price: "$19", detail: "10 polished professional portraits", plan: "portrait-pack" },
  { name: "Professional", price: "$39", detail: "30 portraits + background and wardrobe refinement", plan: "professional", featured: true },
  { name: "Brand Kit", price: "$69", detail: "Professional set + social, banner and web exports", plan: "brand-kit" },
];

export default function Home() {
  const accountUrl = process.env.NEXT_PUBLIC_ACCOUNT_URL ?? "https://account.aerocoreos.com";
  return (
    <main>
      <header className="nav shell">
        <Link className="brand" href="/"><span className="brandMark">AV</span><span>Portrait</span></Link>
        <nav className="navActions">
          <a className="textLink" href="#how-it-works">How it works</a>
          <a className="textLink" href="#pricing">Pricing</a>
          <a className="textLink" href={accountUrl}>Account</a>
          <Link className="button small" href="/studio">Open studio</Link>
        </nav>
      </header>

      <section className="hero shell">
        <div className="eyebrow">AeroVista Visual Identity</div>
        <h1>Your face.<br />Your permission.<br /><em>Your identity.</em></h1>
        <p className="heroCopy">Turn authorized photos into a consistent professional portrait library with identity-preserving generation and clear user control.</p>
        <div className="heroActions"><Link className="button" href="/studio">Create your portrait set</Link><a className="button ghost" href="#how-it-works">See the workflow</a></div>
        <div className="trustLine"><span>Consent required</span><span>No public face search</span><span>Provider-agnostic generation</span></div>
      </section>

      <section className="featureBand" id="how-it-works">
        <div className="shell">
          <div className="sectionLabel">Identity first, generation second</div>
          <div className="steps">
            <article><span className="stepNum">01</span><h2>Authorize</h2><p>Confirm the subject is you or that you have explicit permission to create portraits for them.</p></article>
            <article><span className="stepNum">02</span><h2>Reference</h2><p>Upload clear source photos to guide identity-preserving generation.</p></article>
            <article><span className="stepNum">03</span><h2>Direct</h2><p>Choose professional setting, wardrobe and framing while keeping identity consistent.</p></article>
            <article><span className="stepNum">04</span><h2>Export</h2><p>Create a coherent set for profiles, websites, teams and brand materials.</p></article>
          </div>
        </div>
      </section>

      <section className="pricing shell" id="pricing">
        <div className="sectionLabel">Simple packs. No mystery credits.</div>
        <h2>Pay for the result you need.</h2>
        <div className="priceGrid">
          {packs.map((pack) => (
            <article className={pack.featured ? "priceCard featured" : "priceCard"} key={pack.plan}>
              <div><h3>{pack.name}</h3><p>{pack.detail}</p></div>
              <strong className="price">{pack.price}</strong>
              <Link className="button" href={`/studio?plan=${pack.plan}`}>Choose {pack.name}</Link>
            </article>
          ))}
        </div>
      </section>

      <footer className="footer shell"><span>AV Portrait · An AeroVista product</span><span>Consent-first professional image generation</span></footer>
    </main>
  );
}
