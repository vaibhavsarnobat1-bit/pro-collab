import React from 'react';
import LandingNavbar from '../components/landing/LandingNavbar';
import InteractiveGrid from '../components/landing/InteractiveGrid';
import Hero from '../components/landing/Hero';
import LogoCloud from '../components/landing/LogoCloud';
import Features from '../components/landing/Features';
import HowItWorks from '../components/landing/HowItWorks';
import Showcase from '../components/landing/Showcase';
import Testimonials from '../components/landing/Testimonials';
import Projects from '../components/landing/Projects';
import FAQ from '../components/landing/FAQ';
import FinalCta from '../components/landing/FinalCta';
import LandingFooter from '../components/landing/LandingFooter';

const HomePage = () => {
  const handleStarted = () => {
    const el = document.getElementById('projects');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="lp-page">
      <InteractiveGrid />
      <div style={{ position: 'relative', zIndex: 1 }}>
        <LandingNavbar onStarted={handleStarted} />
        <Hero />
        <LogoCloud />
        <Features />
        <HowItWorks />
        <Showcase />
        <Testimonials />
        <Projects />
        <FAQ />
        <FinalCta onStarted={handleStarted} />
        <LandingFooter />
      </div>
    </div>
  );
};

export default HomePage;
