// The student groups and labs we recognize in the UTCS calendar. The feed has no "organization"
// field, so a group is found by looking for its keywords in an event's title (first) or description.
// Keep this table small and hand-made: a wrong match is worse than no match.
export type Group = {
  id: string;
  name: string;            // what we show
  description: string;     // one line for the Groups screen
  keywords: string[];      // whole words or phrases, any capitals
};

export const groups: Group[] = [
  { id: 'focs', name: 'FoCS', description: 'Shows up in event titles as "FoCS: …".', keywords: ['FoCS'] },
  { id: 'amaze', name: 'Project AMAZE', description: 'Project AMAZE (ECLAIR) meetings.', keywords: ['Project AMAZE', 'AMAZE', 'ECLAIR'] },
  { id: 'convergent', name: 'Texas Convergent', description: 'Texas Convergent team meetings.', keywords: ['Texas Convergent'] },
  { id: 'nll', name: 'NLL', description: 'The NLL reading group and meetings.', keywords: ['NLL'] },
  { id: 'larg', name: 'LARG', description: 'LARG meetings.', keywords: ['LARG'] },
  { id: 'amrl', name: 'AMRL', description: 'AMRL lab meetings.', keywords: ['AMRL'] },
  { id: 'robin', name: 'RobIn', description: 'RobIn lab meetings.', keywords: ['RobIn'] },
  { id: 'dirp', name: 'DiRP (Directed Reading Program)', description: 'Directed Reading Program (DiRP) sessions and reading groups.', keywords: ['DiRP', 'Directed Reading Program'] },
];
