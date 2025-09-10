// src/components/StepCard.jsx
import React from "react";
import { Card, CardContent, Typography, Box } from "@mui/material";
import { InlineMath, BlockMath } from "react-katex";
import 'katex/dist/katex.min.css';

const StepCard = ({ step }) => {
  // Function to detect and render math expressions
  const renderTextWithMath = (text) => {
    if (!text) return text;
    
    try {
      // Check if text contains LaTeX patterns
      const latexPatterns = [
        /\$\$([^$]+)\$\$/g,           // $$...$$
        /\\\[([^\\]+)\\\]/g,         // \[...\]
        /\\\(([^\\]+)\\\)/g,         // \(...\)
        /\\frac\{[^}]+\}\{[^}]+\}/g, // \frac{}{} 
        /\\sqrt\{[^}]+\}/g,          // \sqrt{}
        /\^[{]?[^}]*[}]?/g,          // superscripts
        /_[{]?[^}]*[}]?/g,           // subscripts
        /\\[a-zA-Z]+/g               // LaTeX commands
      ];

      const hasLatex = latexPatterns.some(pattern => pattern.test(text));
      
      if (hasLatex) {
        // Split by block math first
        const blockMathRegex = /(\$\$[^$]+\$\$|\\\[[^\]]+\\\])/g;
        const parts = text.split(blockMathRegex);
        
        return parts.map((part, index) => {
          if (blockMathRegex.test(part)) {
            // Block math
            const mathContent = part.replace(/^\$\$|\$\$$|^\\\[|\\\]$/g, '');
            return (
              <Box key={index} sx={{ my: 1 }}>
                <BlockMath>{mathContent}</BlockMath>
              </Box>
            );
          } else {
            // Regular text with possible inline math
            const inlineMathRegex = /(\\\([^)]+\\\)|\$[^$]+\$)/g;
            const inlineParts = part.split(inlineMathRegex);
            
            return inlineParts.map((inlinePart, inlineIndex) => {
              if (inlineMathRegex.test(inlinePart)) {
                const mathContent = inlinePart.replace(/^\\\(|\\\)$|^\$|\$$/g, '');
                return <InlineMath key={`${index}-${inlineIndex}`}>{mathContent}</InlineMath>;
              }
              return inlinePart;
            });
          }
        });
      }
    } catch (error) {
      console.warn('Math rendering error:', error);
    }
    
    // No LaTeX found or error occurred, return plain text
    return text;
  };

  // Format the step text
  const formatStepText = (text) => {
    if (!text) return "";
    
    // Clean up common formatting issues
    return text
      .replace(/\*\*(.*?)\*\*/g, '$1')  // Remove bold markdown
      .replace(/^\d+[\.\)]\s*/, '')     // Remove step numbering
      .trim();
  };

  const stepNumber = step.step || 1;
  const stepText = formatStepText(step.text);
  const stepConcept = step.concept || `Step ${stepNumber}`;

  return (
    <Card 
      sx={{ 
        mb: 2, 
        transition: 'transform 0.2s, box-shadow 0.2s',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: 3
        }
      }}
    >
      <CardContent sx={{ pb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <Box
            sx={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              bgcolor: 'primary.main',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 600,
              mr: 2
            }}
          >
            {stepNumber}
          </Box>
          <Typography variant="h6" component="h3" sx={{ fontWeight: 500 }}>
            {stepConcept}
          </Typography>
        </Box>
        
        <Box sx={{ ml: 5 }}>
          <Typography 
            variant="body1" 
            sx={{ 
              lineHeight: 1.6,
              '& .katex': { fontSize: '1rem' }
            }}
          >
            {renderTextWithMath(stepText)}
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
};

export default StepCard;