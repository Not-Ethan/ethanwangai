import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import About from "@/components/About";
import Experience from "@/components/Experience";
import Projects from "@/components/Projects";
import Skills from "@/components/Skills";
import Contact from "@/components/Contact";

function SectionDivider() {
  return (
    <div className="max-w-6xl mx-auto px-6 py-2">
      <svg viewBox="0 0 800 20" className="w-full h-5 text-accent/20" fill="none" preserveAspectRatio="xMidYMid meet">
        <path d="M0 10 Q200 10 400 10 Q600 10 800 10" stroke="currentColor" strokeWidth="0.5" />
        <path d="M150 10 Q155 4 165 6 Q158 8 150 10 Z" fill="currentColor" />
        <path d="M300 10 Q295 16 285 14 Q292 12 300 10 Z" fill="currentColor" />
        <path d="M500 10 Q505 4 515 6 Q508 8 500 10 Z" fill="currentColor" />
        <path d="M650 10 Q645 16 635 14 Q642 12 650 10 Z" fill="currentColor" />
      </svg>
    </div>
  );
}

export default function Home() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <SectionDivider />
        <About />
        <SectionDivider />
        <Experience />
        <SectionDivider />
        <Projects />
        <SectionDivider />
        <Skills />
        <SectionDivider />
        <Contact />
      </main>
    </>
  );
}
