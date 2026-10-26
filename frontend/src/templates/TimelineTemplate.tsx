import React from 'react';
import type { TimelineInfographic, ThemeConfig, TimelineEvent } from '../types/infographic';

interface Props {
  data: TimelineInfographic;
  theme: ThemeConfig;
}

const EVENT_COLORS = [
  '#3b63f7', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899',
];

export const TimelineTemplate: React.FC<Props> = ({ data, theme }) => {
  return (
    <div
      style={{
        background: theme.bg,
        width: '840px',
        minHeight: '600px',
        fontFamily: "'Inter', 'Outfit', sans-serif",
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
        <div style={{
          position: 'absolute', top: '-30px', right: '-30px',
          width: '180px', height: '180px', borderRadius: '50%',
          background: theme.accent, opacity: 0.08,
        }} />
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '8px',
          background: 'rgba(255,255,255,0.08)', borderRadius: '100px',
          padding: '4px 14px', marginBottom: '16px',
        }}>
          <span style={{ fontSize: '10px', letterSpacing: '2px', textTransform: 'uppercase', color: theme.accentText, fontWeight: 700 }}>
            📅 Timeline
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

      {/* Timeline events */}
      <div style={{ padding: '36px 48px' }}>
        {/* Horizontal rule at top */}
        <div style={{
          position: 'relative',
          paddingLeft: '32px',
          borderLeft: `2px solid ${theme.border}`,
        }}>
          {data.events.map((event: TimelineEvent, idx: number) => {
            const color = EVENT_COLORS[idx % EVENT_COLORS.length];
            return (
              <div
                key={idx}
                style={{
                  position: 'relative',
                  marginBottom: idx < data.events.length - 1 ? '24px' : '0',
                  paddingLeft: '24px',
                }}
              >
                {/* Dot */}
                <div style={{
                  position: 'absolute', left: '-41px', top: '12px',
                  width: '18px', height: '18px', borderRadius: '50%',
                  background: color, border: `3px solid ${theme.bg}`,
                  boxShadow: `0 0 0 2px ${color}40`,
                }} />

                {/* Card */}
                <div style={{
                  background: theme.stepBg,
                  border: `1px solid ${theme.border}`,
                  borderRadius: '12px', padding: '16px 20px',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', marginBottom: '8px' }}>
                    <h3 style={{
                      fontSize: '14px', fontWeight: 700, color: theme.text,
                      margin: 0, flex: 1,
                    }}>
                      {event.label}
                    </h3>
                    {event.date && (
                      <span style={{
                        fontSize: '11px', fontWeight: 700, color: color,
                        background: `${color}20`, padding: '3px 10px',
                        borderRadius: '100px', whiteSpace: 'nowrap', flexShrink: 0,
                        border: `1px solid ${color}30`,
                      }}>
                        {event.date}
                      </span>
                    )}
                  </div>
                  <p style={{
                    fontSize: '13px', color: theme.subText,
                    margin: 0, lineHeight: 1.6,
                  }}>
                    {event.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Summary or Limitation Note */}
        {data.summary && (
          <div style={{
            marginTop: '24px',
            background: theme.stepBg,
            border: `1px solid ${theme.border}`,
            borderLeft: `3px solid ${theme.accentText}`,
            borderRadius: '10px',
            padding: '14px 18px',
          }}>
            <p style={{ fontSize: '12.5px', color: theme.subText, margin: 0, lineHeight: 1.6, fontStyle: 'italic' }}>
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
