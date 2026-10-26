import React from 'react';
import type { ProcessInfographic, ThemeConfig, ProcessStep } from '../types/infographic';

interface Props {
  data: ProcessInfographic;
  theme: ThemeConfig;
}

export const ProcessTemplate: React.FC<Props> = ({ data, theme }) => {
  return (
    <div
      style={{
        background: theme.bg,
        width: '840px',
        minHeight: '600px',
        fontFamily: "'Inter', 'Outfit', sans-serif",
        padding: '0',
        borderRadius: '16px',
        overflow: 'hidden',
        boxShadow: '0 25px 60px rgba(0,0,0,0.5)',
      }}
    >
      {/* Header */}
      <div
        style={{
          background: theme.headerBg,
          padding: '40px 48px 32px',
          borderBottom: `1px solid ${theme.border}`,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Decorative circles */}
        <div style={{
          position: 'absolute', top: '-40px', right: '-40px',
          width: '200px', height: '200px', borderRadius: '50%',
          background: theme.accent, opacity: 0.08,
        }} />
        <div style={{
          position: 'absolute', bottom: '-60px', left: '60%',
          width: '150px', height: '150px', borderRadius: '50%',
          background: theme.accent, opacity: 0.05,
        }} />

        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '8px',
          background: 'rgba(255,255,255,0.08)', borderRadius: '100px',
          padding: '4px 14px', marginBottom: '16px',
        }}>
          <span style={{ fontSize: '10px', letterSpacing: '2px', textTransform: 'uppercase', color: theme.accentText, fontWeight: 700 }}>
            ⚙ Process Flow
          </span>
        </div>

        <h1 style={{
          fontSize: '28px', fontWeight: 800, color: theme.text,
          margin: '0 0 8px', lineHeight: 1.2, fontFamily: "'Outfit', sans-serif",
          maxWidth: '600px',
        }}>
          {data.title}
        </h1>
        <p style={{ fontSize: '15px', color: theme.subText, margin: 0, lineHeight: 1.5 }}>
          {data.subtitle}
        </p>
      </div>

      {/* Steps */}
      <div style={{ padding: '32px 48px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
          {data.steps.map((step: ProcessStep, idx: number) => (
            <div key={step.step_number} style={{ display: 'flex', gap: '0', alignItems: 'stretch' }}>
              {/* Left: number + connector */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '52px', flexShrink: 0 }}>
                {/* Circle */}
                <div style={{
                  width: '44px', height: '44px', borderRadius: '50%',
                  background: theme.accent, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '16px', fontWeight: 800, color: '#fff',
                  flexShrink: 0, boxShadow: '0 4px 16px rgba(59,99,247,0.35)',
                  zIndex: 1,
                }}>
                  {step.step_number}
                </div>
                {/* Connector line */}
                {idx < data.steps.length - 1 && (
                  <div style={{
                    width: '2px', flex: 1, minHeight: '24px',
                    background: `linear-gradient(to bottom, ${theme.accentText}40, ${theme.accentText}10)`,
                    margin: '4px 0',
                  }} />
                )}
              </div>

              {/* Right: content */}
              <div style={{
                flex: 1, marginLeft: '16px',
                paddingBottom: idx < data.steps.length - 1 ? '20px' : '0',
              }}>
                <div style={{
                  background: theme.stepBg,
                  border: `1px solid ${theme.border}`,
                  borderRadius: '12px', padding: '16px 20px',
                }}>
                  <h3 style={{
                    fontSize: '14px', fontWeight: 700, color: theme.text,
                    margin: '0 0 6px', letterSpacing: '0.01em',
                  }}>
                    {step.title}
                  </h3>
                  <p style={{
                    fontSize: '13px', color: theme.subText,
                    margin: 0, lineHeight: 1.6,
                  }}>
                    {step.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Summary */}
        {data.summary && (
          <div style={{
            marginTop: '24px',
            background: theme.stepBg,
            border: `1px solid ${theme.border}`,
            borderLeft: `3px solid ${theme.accentText}`,
            borderRadius: '10px', padding: '16px 20px',
          }}>
            <p style={{ fontSize: '13px', color: theme.subText, margin: 0, lineHeight: 1.6, fontStyle: 'italic' }}>
              💡 {data.summary}
            </p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{
        background: theme.footerBg,
        borderTop: `1px solid ${theme.border}`,
        padding: '12px 48px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <span style={{ fontSize: '11px', color: theme.subText, opacity: 0.6 }}>
          Created with InfoGraph AI
        </span>
        <span style={{ fontSize: '11px', color: theme.accentText, opacity: 0.8, fontWeight: 600 }}>
          infograph.ai
        </span>
      </div>
    </div>
  );
};
