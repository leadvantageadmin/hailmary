import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/middleware';

export const GET = withAuth(async (req: AuthenticatedRequest) => {
  try {
    // Return the standardized job title level definitions
    // These are static and match our database JobTitleLevelDefinition table
    const definitions = [
      { level: 1, jobTitleLevel: 'C-Level Executive', examples: 'CEO, CFO, COO, CTO, CMO, CIO, CSO, CHRO, Chief Growth Officer', description: 'Chief officers and C-level executives who lead entire organizations or major divisions' },
      { level: 2, jobTitleLevel: 'Board / Governance', examples: 'Board Member, Chairman, Chairperson, Director (Board), Advisor', description: 'Board members and governance roles responsible for organizational oversight and strategic direction' },
      { level: 3, jobTitleLevel: 'President / Partner / Founder', examples: 'President, Partner, Founder, Co-Founder, Managing Partner', description: 'Senior leadership roles in organizations, partnerships, or founding positions' },
      { level: 4, jobTitleLevel: 'Executive VP (EVP)', examples: 'Executive Vice President, EVP', description: 'Executive vice presidents reporting directly to C-level executives' },
      { level: 5, jobTitleLevel: 'Senior VP (SVP)', examples: 'Senior Vice President, SVP', description: 'Senior vice presidents with significant organizational responsibility' },
      { level: 6, jobTitleLevel: 'Vice President (VP)', examples: 'Vice President, VP', description: 'Vice presidents with departmental or functional responsibility' },
      { level: 7, jobTitleLevel: 'Assistant VP (AVP)', examples: 'Assistant Vice President, AVP, Associate Vice President', description: 'Assistant or associate vice presidents supporting VP-level roles' },
      { level: 8, jobTitleLevel: 'Director / Senior Director', examples: 'Director, Senior Director', description: 'Directors and senior directors managing departments or major functions' },
      { level: 9, jobTitleLevel: 'Associate Director / Senior Manager', examples: 'Associate Director, Senior Manager', description: 'Associate directors and senior managers with team leadership responsibilities' },
      { level: 10, jobTitleLevel: 'Manager / Lead', examples: 'Manager, Lead, Team Lead, Project Manager', description: 'Managers and team leads responsible for day-to-day team operations' },
      { level: 11, jobTitleLevel: 'Principal / Senior Staff', examples: 'Principal, Senior Staff, Senior Specialist', description: 'Senior individual contributors with significant expertise and influence' },
      { level: 12, jobTitleLevel: 'Individual Contributor', examples: 'Analyst, Specialist, Coordinator, Representative', description: 'Individual contributors performing specialized work without direct reports' },
      { level: 13, jobTitleLevel: 'Associate / Coordinator / Executive', examples: 'Associate, Coordinator, Executive Assistant', description: 'Supporting roles including associates, coordinators, and executive assistants' },
      { level: 14, jobTitleLevel: 'Entry Level / Intern', examples: 'Intern, Junior, Entry Level, Trainee', description: 'Entry-level positions and internship roles' },
      { level: 15, jobTitleLevel: 'Freelancer / Advisor / Undefined', examples: 'Freelancer, Consultant, Advisor, Contractor', description: 'Non-employee roles including freelancers, consultants, and undefined positions' }
    ];

    return NextResponse.json({
      definitions,
      total: definitions.length
    });

  } catch (error) {
    console.error('Error fetching job title level definitions:', error);
    return NextResponse.json({ error: 'Failed to fetch job title level definitions' }, { status: 500 });
  }
});
