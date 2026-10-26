import React from 'react';
import type { ConceptMapInfographic, ThemeConfig, ConceptSubtopic } from '../types/infographic';

interface Props {
  data: ConceptMapInfographic;
  theme: ThemeConfig;
}

const SUBTOPIC_ACCENTS = [
  '#3b82f6', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ec4899', '#6366f1', '#14b8a6',
];

export const ConceptMapTemplate: React.FC<Props> = ({ data, theme }) => {
  return (
    <div
      style={{
        background: theme.bg,
        width: '840px',
        minHeight: '620px',
        fontFamily: "'Inter', 'Outfit', sans-serif",
        borderRadius: '16px',
        overflow: 'hidden',
        boxShadow: '0 25px 60px rgba(0,0,0,0.45)',
        border: `1px solid ${theme.border}`,
        color: theme.text,
      }}
    >
      {/* Header */}
      <div
        style={{
          background: theme.headerBg,
          padding: '36px 44px 28px',
          borderBottom: `1px solid ${theme.border}`,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: '-50px',
            right: '-50px',
            width: '220px',
            height: '220px',
            borderRadius: '50%',
            background: theme.accent,
            opacity: 0.12,
            filter: 'blur(20px)',
          }}
        />

        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(255,255,255,0.08)',
            borderRadius: '100px',
            padding: '5px 14px',
            marginBottom: '14px',
            border: `1px solid ${theme.border}`,
          }}
        >
          <span style={{ fontSize: '11px', letterSpacing: '2px', textTransform: 'uppercase', color: theme.accentText, fontWeight: 700 }}>
            🗺️ Concept Map & Overview
          </span>
        </div>

        <h1
          style={{
            fontSize: '26px',
            fontWeight: 800,
            color: theme.text,
            margin: '0 0 8px',
            lineHeight: 1.25,
            fontFamily: "'Outfit', sans-serif",
            maxWidth: '680px',
          }}
        >
          {data.title}
        </h1>
        <p style={{ fontSize: '14px', color: theme.subText, margin: 0, lineHeight: 1.5 }}>
          {data.subtitle}
        </p>
      </div>

      {/* Central Hub & Core Concept */}
      <div style={{ padding: '32px 44px 12px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '28px',
          }}
        >
          <div
            style={{
              background: theme.headerBg,
              border: `2px solid ${theme.accentText}40`,
              borderRadius: '100px',
              padding: '12px 28px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '12px',
              boxShadow: `0 8px 30px ${theme.accentText}25`,
            }}
          >
            <div
              style={{
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                background: theme.accent,
                boxShadow: `0 0 10px ${theme.accentText}`,
              }}
            />
            <span
              style={{
                fontSize: '11px',
                textTransform: 'uppercase',
                letterSpacing: '2px',
                fontWeight: 700,
                color: theme.subText,
              }}
            >
              Core Concept:
            </span>
            <span
              style={{
                fontSize: '16px',
                fontWeight: 800,
                color: theme.text,
                fontFamily: "'Outfit', sans-serif",
              }}
            >
              {data.main_concept}
            </span>
          </div>
        </div>

        {/* Subtopics Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '16px',
            marginBottom: '24px',
          }}
        >
          {data.subtopics.map((sub: ConceptSubtopic, idx: number) => {
            const accentColor = SUBTOPIC_ACCENTS[idx % SUBTOPIC_ACCENTS.length];
            return (
              <div
                key={sub.id || idx}
                style={{
                  background: theme.stepBg,
                  border: `1px solid ${theme.border}`,
                  borderTop: `3px solid ${accentColor}`,
                  borderRadius: '12px',
                  padding: '18px 20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  transition: 'transform 0.2s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div
                      style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: accentColor,
                      }}
                    />
                    <h3
                      style={{
                        fontSize: '14px',
                        fontWeight: 700,
                        color: theme.text,
                        margin: 0,
                        fontFamily: "'Outfit', sans-serif",
                      }}
                    >
                      {sub.name}
                    </h3>
                  </div>
                  {sub.relationship_to_main && (
                    <span
                      style={{
                        fontSize: '10px',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '1px',
                        color: accentColor,
                        background: `${accentColor}18`,
                        padding: '3px 8px',
                        borderRadius: '6px',
                        border: `1px solid ${accentColor}30`,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {sub.relationship_to_main}
                    </span>
                  )}
                </div>

                <p
                  style={{
                    fontSize: '12.5px',
                    color: theme.subText,
                    margin: 0,
                    lineHeight: 1.6,
                  }}
                >
                  {sub.description}
                </p>
              </div>
            );
          })}
        </div>

        {/* Summary Card */}
        {data.summary && (
          <div
            style={{
              background: theme.stepBg,
              border: `1px solid ${theme.border}`,
              borderLeft: `4px solid ${theme.accentText}`,
              borderRadius: '10px',
              padding: '14px 20px',
              marginBottom: '20px',
            }}
          >
            <p style={{ fontSize: '13px', color: theme.subText, margin: 0, lineHeight: 1.6, fontStyle: 'italic' }}>
              💡 <strong style={{ color: theme.text, fontStyle: 'normal' }}>Takeaway:</strong> {data.summary}
            </p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div
        style={{
          background: theme.footerBg,
          borderTop: `1px solid ${theme.border}`,
          padding: '12px 44px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <span style={{ fontSize: '11px', color: theme.subText, opacity: 0.7 }}>
          Generated with InfoGraph AI · Structured Knowledge Architecture
        </span>
        <span style={{ fontSize: '11px', color: theme.accentText, opacity: 0.9, fontWeight: 600 }}>
          infograph.ai
        </span>
      </div>
    </div>
  );
};
