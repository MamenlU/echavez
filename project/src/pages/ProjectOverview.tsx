import { ProjectNavbar } from '../components/ProjectNavbar';
import { ProjectHero } from '../components/ProjectHero';
import { ProjectFooter } from '../components/ProjectFooter';
import { Overview } from '../components/Overview';
import { CustomerFeatures } from '../components/CustomerFeatures';
import { AdminFeatures } from '../components/AdminFeatures';
import { Capabilities } from '../components/Capabilities';
import { Process } from '../components/Process';
import { TechStack } from '../components/TechStack';
import { ColorSystem } from '../components/ColorSystem';
import { useReveal } from '../hooks/useReveal';

export function ProjectOverview() {
  const ref = useReveal<HTMLDivElement>();

  return (
    <div ref={ref} className="min-h-screen bg-steel-50">
      <ProjectNavbar />
      <main>
        <ProjectHero />
        <Overview />
        <CustomerFeatures />
        <AdminFeatures />
        <Capabilities />
        <Process />
        <TechStack />
        <ColorSystem />
      </main>
      <ProjectFooter />
    </div>
  );
}
