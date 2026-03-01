import ZoomNavigator from "@/components/ZoomNavigator";
import Hero from "@/components/Hero";
import About from "@/components/About";
import Experience from "@/components/Experience";
import Projects from "@/components/Projects";
import Contact from "@/components/Contact";

export default function Home() {
  return (
    <ZoomNavigator>
      <Hero />
      <About />
      <Experience />
      <Projects />
      <Contact />
    </ZoomNavigator>
  );
}
