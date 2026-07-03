import Journey from "@/components/Journey";
import Hero from "@/components/Hero";
import About from "@/components/About";
import Experience from "@/components/Experience";
import Projects from "@/components/Projects";
import Contact from "@/components/Contact";

// Breathing room between stations: stretches of trail where the
// forest has the stage to itself.
function Trail() {
  return <div aria-hidden className="h-[55vh]" />;
}

export default function Home() {
  return (
    <Journey>
      <Hero />
      <Trail />
      <About />
      <Trail />
      <Experience />
      <Trail />
      <Projects />
      <Trail />
      <Contact />
    </Journey>
  );
}
