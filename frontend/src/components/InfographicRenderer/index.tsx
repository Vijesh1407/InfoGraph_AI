import React from 'react';
import type { InfographicData, ThemeConfig } from '../../types/infographic';
import { ProcessTemplate } from '../../templates/ProcessTemplate';
import { TimelineTemplate } from '../../templates/TimelineTemplate';
import { ComparisonTemplate } from '../../templates/ComparisonTemplate';
import { ConceptMapTemplate } from '../../templates/ConceptMapTemplate';

interface Props {
  data: InfographicData;
  theme: ThemeConfig;
}

export const InfographicRenderer: React.FC<Props> = ({ data, theme }) => {
  switch (data.type) {
    case 'process':
      return <ProcessTemplate data={data} theme={theme} />;
    case 'timeline':
      return <TimelineTemplate data={data} theme={theme} />;
    case 'comparison':
      return <ComparisonTemplate data={data} theme={theme} />;
    case 'concept_map':
      return <ConceptMapTemplate data={data} theme={theme} />;
    default:
      return <div className="text-white/50 p-8">Unknown infographic type.</div>;
  }
};
