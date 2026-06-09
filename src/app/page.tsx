import Navbar from "@/components/Navbar";
import Fireflies from "@/components/Fireflies";
import TrailProgress from "@/components/TrailProgress";
import Hero from "@/components/Hero";
import About from "@/components/About";
import LanternPath from "@/components/LanternPath";
import Experience from "@/components/Experience";
import Projects from "@/components/Projects";
import Skills from "@/components/Skills";
import Contact from "@/components/Contact";

export default function Home() {
  return (
    <div className="bg-journey relative">
      {/* Film grain over everything so the dark gradient doesn't band */}
      <div
        aria-hidden
        className="bg-noise pointer-events-none fixed inset-0 z-[80] opacity-[0.05] mix-blend-soft-light"
      />

      <Fireflies />
      <TrailProgress />
      <Navbar />

      <main className="relative z-10">
        <Hero />
        <About />
        <LanternPath />
        <Experience />
        <Projects />
        <Skills />
        <Contact />
      </main>
    </div>
  );
}
