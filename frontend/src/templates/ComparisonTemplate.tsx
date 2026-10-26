import React from 'react';
import type { ComparisonInfographic, ThemeConfig, ComparisonItem, ComparisonAttribute } from '../types/infographic';

interface Props {
  data: ComparisonInfographic;
  theme: ThemeConfig;
}

const ITEM_COLORS = ['#3b63f7', '#8b5cf6', '#06b6d4', '#10b981'];
const ITEM_BADGES = ['A', 'B', 'C', 'D'];

export const ComparisonTemplate: React.FC<Props> = ({ data, theme }) => {
  const itemNames = data.items.map((i: ComparisonItem) => i.name);

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
          padding: '36px 48px 28px',
          borderBottom: `1px solid ${theme.border}`,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div style={{
          position: 'absolute', top: '-40px', right: '-40px',
          width: '200px', height: '200px', borderRadius: '50%',
          background: theme.accent, opacity: 0.08,
        }} />
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '8px',
          background: 'rgba(255,255,255,0.08)', borderRadius: '100px',
          padding: '4px 14px', marginBottom: '14px',
        }}>
          <span style={{ fontSize: '10px', letterSpacing: '2px', textTransform: 'uppercase', color: theme.accentText, fontWeight: 700 }}>
            ⚖ Comparison
          </span>
        </div>
        <h1 style={{
          fontSize: '26px', fontWeight: 800, color: theme.text,
          margin: '0 0 6px', lineHeight: 1.2, fontFamily: "'Outfit', sans-serif",
        }}>
          {data.title}
        </h1>
        <p style={{ fontSize: '14px', color: theme.subText, margin: 0 }}>
          {data.subtitle}
        </p>
      </div>

      {/* Item headers */}
      <div style={{ padding: '24px 48px 0' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: `180px repeat(${data.items.length}, 1fr)`,
          gap: '8px',
          marginBottom: '8px',
        }}>
          <div /> {/* empty corner */}
          {data.items.map((item: ComparisonItem, idx: number) => (
            <div key={idx} style={{
              background: ITEM_COLORS[idx % ITEM_COLORS.length] + '18',
              border: `1px solid ${ITEM_COLORS[idx % ITEM_COLORS.length]}30`,
              borderRadius: '10px', padding: '12px 16px', textAlign: 'center',
            }}>
              <div style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                width: '28px', height: '28px', borderRadius: '50%',
                background: ITEM_COLORS[idx % ITEM_COLORS.length],
                fontSize: '12px', fontWeight: 800, color: '#fff',
                marginBottom: '6px',
              }}>
                {ITEM_BADGES[idx]}
              </div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: theme.text }}>
                {item.name}
              </div>
              {item.description && (
                <div style={{ fontSize: '11px', color: theme.subText, marginTop: '4px', lineHeight: 1.5 }}>
                  {item.description}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Attributes rows */}
        <div style={{ marginBottom: '24px' }}>
          {data.attributes.map((attr: ComparisonAttribute, idx: number) => (
            <div key={idx} style={{
              display: 'grid',
              gridTemplateColumns: `180px repeat(${data.items.length}, 1fr)`,
              gap: '8px',
              marginBottom: '6px',
            }}>
              {/* Attribute label */}
              <div style={{
                display: 'flex', alignItems: 'center',
                background: theme.stepBg,
                border: `1px solid ${theme.border}`,
                borderRadius: '8px', padding: '10px 14px',
              }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: theme.subText }}>
                  {attr.attribute}
                </span>
              </div>
              {/* Values */}
              {itemNames.map((name: string, iIdx: number) => (
                <div key={iIdx} style={{
                  background: idx % 2 === 0 ? theme.stepBg : 'transparent',
                  border: `1px solid ${theme.border}`,
                  borderRadius: '8px', padding: '10px 14px',
                  display: 'flex', alignItems: 'center',
                }}>
                  <span style={{
                    fontSize: '12px', color: theme.text, lineHeight: 1.5,
                    wordBreak: 'break-word',
                  }}>
                    {attr.values[name] || '—'}
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Summary */}
        {data.summary && (
          <div style={{
            background: theme.stepBg,
            border: `1px solid ${theme.border}`,
            borderLeft: `3px solid ${theme.accentText}`,
            borderRadius: '10px', padding: '14px 18px',
            marginBottom: '24px',
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
